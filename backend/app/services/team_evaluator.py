"""
Team evaluation service.
"""
from __future__ import annotations
from typing import Optional, Dict, Any, List
from sqlalchemy.orm import Session
import requests
import logging

from app.api.v1.schemas.team import TeamEvaluationResponse, PlayerDetail
from app.models import Player, WeeklyScore
from app.models.fixture import Team
from app.core.config import settings

logger = logging.getLogger(__name__)

def _pos_from_element_type(element_type: int) -> str:
    return {1: "GK", 2: "DEF", 3: "MID", 4: "FWD"}.get(element_type, "MID")

def _latest_gw_from_bootstrap(bootstrap_data: Dict[str, Any]) -> int:
    """
    Resolve the most appropriate "latest" gameweek from FPL bootstrap-static payload.

    FPL bootstrap-static exposes `events` (list) with fields like:
      - id
      - is_current
      - is_next
      - finished

    Strategy:
      - If there is a current GW, use it.
      - Else if there are finished GWs, use the max finished id.
      - Else if there is a next GW, use max(1, next_id - 1).
      - Else fallback to 1.
    """
    events = bootstrap_data.get("events") or []
    try:
        current = next((e.get("id") for e in events if e.get("is_current")), None)
        if isinstance(current, int) and current > 0:
            return current

        finished_ids = [e.get("id") for e in events if e.get("finished") and isinstance(e.get("id"), int)]
        if finished_ids:
            return max(finished_ids)

        next_id = next((e.get("id") for e in events if e.get("is_next")), None)
        if isinstance(next_id, int) and next_id > 1:
            return next_id - 1
    except Exception:
        # Defensive: never crash evaluation because bootstrap parsing is off
        pass

    return 1


class TeamEvaluator:
    """Evaluates FPL teams."""
    
    def __init__(self, db: Session):
        self.db = db
    
    async def evaluate(
        self,
        season: str,
        team_id: Optional[int] = None,
        squad_json: Optional[dict] = None,
        gameweek: Optional[int] = None,
    ) -> TeamEvaluationResponse:
        """Evaluate a team."""
        player_ids = []
        picks_by_element = {}  # Store picks data for ordering
        
        if squad_json:
            player_ids = squad_json.get("players", [])
            logger.info(f"Using squad_json with {len(player_ids)} player IDs")
        elif team_id:
            # Fetch from FPL API using team_id
            try:
                # First verify the team exists and get the latest gameweek
                team_info_url = f"{settings.FPL_API_BASE_URL}/entry/{team_id}/"
                team_info_response = requests.get(team_info_url, timeout=10)
                
                if team_info_response.status_code == 404:
                    raise ValueError(f"Team {team_id} not found in FPL API (404)")
                elif team_info_response.status_code != 200:
                    logger.warning(f"Could not verify team {team_id} (HTTP {team_info_response.status_code})")
                
                # Get current gameweek if not provided
                if not gameweek:
                    # Get the latest gameweek from bootstrap-static
                    bootstrap_response = requests.get(f"{settings.FPL_API_BASE_URL}/bootstrap-static/", timeout=10)
                    bootstrap_data = bootstrap_response.json()
                    gameweek = _latest_gw_from_bootstrap(bootstrap_data)
                    logger.info(f"Resolved latest gameweek from bootstrap-static: {gameweek}")
                
                # Fetch team picks - always try current gameweek first, only fallback if it truly has no picks
                picks_response = None
                found_valid_picks = False
                original_gameweek = gameweek
                
                # First, try the current/latest gameweek
                picks_url = f"{settings.FPL_API_BASE_URL}/entry/{team_id}/event/{gameweek}/picks/"
                logger.info(f"Fetching team picks from: {picks_url} (current gameweek)")
                temp_response = requests.get(picks_url, timeout=10)
                
                if temp_response.status_code == 200:
                    temp_picks_data = temp_response.json()
                    temp_picks = temp_picks_data.get("picks", [])
                    if temp_picks and len(temp_picks) > 0:
                        # Found valid picks for current gameweek - use it!
                        picks_response = temp_response
                        found_valid_picks = True
                        logger.info(f"✓ Found {len(temp_picks)} picks for current gameweek {gameweek}")
                    else:
                        # Current gameweek has no picks - might be set for next gameweek
                        # Check if there's a next_event that's different
                        next_event = next((e.get("id") for e in (bootstrap_data.get("events") or []) if e.get("is_next")), None)
                        if isinstance(next_event, int) and next_event == gameweek:
                            # Current gameweek is the "next" event (hasn't started), try previous
                            logger.info(f"Current gameweek {gameweek} is the next event (not started), trying previous gameweek {gameweek - 1}")
                            if gameweek > 1:
                                prev_picks_url = f"{settings.FPL_API_BASE_URL}/entry/{team_id}/event/{gameweek - 1}/picks/"
                                prev_response = requests.get(prev_picks_url, timeout=10)
                                if prev_response.status_code == 200:
                                    prev_picks_data = prev_response.json()
                                    prev_picks = prev_picks_data.get("picks", [])
                                    if prev_picks and len(prev_picks) > 0:
                                        gameweek = gameweek - 1
                                        picks_response = prev_response
                                        found_valid_picks = True
                                        logger.info(f"✓ Using previous gameweek {gameweek} with {len(prev_picks)} picks")
                        else:
                            # Current gameweek should have picks but doesn't - still use it or try previous?
                            # For now, try previous gameweek as fallback
                            logger.warning(f"Current gameweek {gameweek} has no picks, trying previous gameweek {gameweek - 1}")
                            if gameweek > 1:
                                prev_picks_url = f"{settings.FPL_API_BASE_URL}/entry/{team_id}/event/{gameweek - 1}/picks/"
                                prev_response = requests.get(prev_picks_url, timeout=10)
                                if prev_response.status_code == 200:
                                    prev_picks_data = prev_response.json()
                                    prev_picks = prev_picks_data.get("picks", [])
                                    if prev_picks and len(prev_picks) > 0:
                                        gameweek = gameweek - 1
                                        picks_response = prev_response
                                        found_valid_picks = True
                                        logger.info(f"✓ Using previous gameweek {gameweek} with {len(prev_picks)} picks")
                else:
                    # Current gameweek request failed
                    logger.warning(f"Failed to fetch current gameweek {gameweek} (HTTP {temp_response.status_code})")
                
                if not found_valid_picks or not picks_response:
                    error_msg = f"Failed to fetch team picks for team {team_id} for gameweek {original_gameweek}"
                    logger.error(error_msg)
                elif picks_response and picks_response.status_code == 200:
                    picks_data = picks_response.json()
                    # Extract player element IDs from picks
                    picks = picks_data.get("picks", [])
                    # Store picks data for later use (to determine starting XI vs bench)
                    picks_by_element = {pick.get("element"): pick for pick in picks if pick.get("element")}
                    element_ids = [pick.get("element") for pick in picks if pick.get("element")]
                    logger.info(f"Found {len(element_ids)} FPL element IDs in picks")

                    # Build a response directly from FPL bootstrap-static for accuracy (GW points, multipliers, order)
                    # This avoids mismatches when the local DB is missing/behind on WeeklyScore/player mappings.
                    try:
                        if "bootstrap_data" not in locals():
                            bootstrap_response = requests.get(f"{settings.FPL_API_BASE_URL}/bootstrap-static/", timeout=10)
                            bootstrap_data = bootstrap_response.json()

                        elements_by_id = {e.get("id"): e for e in (bootstrap_data.get("elements") or []) if e.get("id")}
                        teams_by_id = {t.get("id"): t for t in (bootstrap_data.get("teams") or []) if t.get("id")}

                        entry_history = picks_data.get("entry_history") or {}
                        active_chip = picks_data.get("active_chip") or entry_history.get("active_chip")
                        
                        # Determine if this is a historical gameweek (not current)
                        latest_gw = _latest_gw_from_bootstrap(bootstrap_data)
                        # Only treat as "historical" if the requested GW is in the past.
                        # Upcoming GWs (gameweek > latest_gw) should NOT trigger per-player element-summary calls.
                        is_historical_gw = gameweek is not None and gameweek < latest_gw

                        # Sort picks into FPL UI order: 1-11 starting XI, 12-15 bench
                        picks_sorted = sorted(picks, key=lambda p: p.get("position", 99))

                        players_data: List[PlayerDetail] = []
                        captain_id: Optional[int] = None
                        vice_captain_id: Optional[int] = None
                        expected_points_total = 0.0

                        for pick in picks_sorted:
                            element_id = pick.get("element")
                            if not element_id:
                                continue

                            el = elements_by_id.get(element_id)
                            if not el:
                                continue

                            team_id_fpl = el.get("team")
                            team_info = teams_by_id.get(team_id_fpl, {}) if team_id_fpl else {}

                            element_type = int(el.get("element_type") or 3)
                            position = _pos_from_element_type(element_type)
                            price = float(el.get("now_cost") or 0) / 10.0

                            multiplier = int(pick.get("multiplier") or 1)
                            is_captain = bool(pick.get("is_captain"))
                            is_vice_captain = bool(pick.get("is_vice_captain"))
                            is_starting = (pick.get("position") or 99) <= 11

                            # For historical gameweeks, fetch points from element history
                            # For current/latest gameweek, use event_points from bootstrap-static
                            gw_points_raw = 0.0
                            if is_historical_gw and gameweek:
                                # Historical gameweek - fetch from element summary
                                try:
                                    element_summary_url = f"{settings.FPL_API_BASE_URL}/element-summary/{element_id}/"
                                    element_summary_response = requests.get(element_summary_url, timeout=5)
                                    if element_summary_response.status_code == 200:
                                        element_summary = element_summary_response.json()
                                        history = element_summary.get("history", [])
                                        # Find points for this specific gameweek
                                        gw_history = next((h for h in history if h.get("round") == gameweek), None)
                                        if gw_history:
                                            gw_points_raw = float(gw_history.get("total_points") or 0)
                                        else:
                                            # Fallback: use event_points (will be 0 for past gameweeks)
                                            gw_points_raw = float(el.get("event_points") or 0)
                                    else:
                                        gw_points_raw = float(el.get("event_points") or 0)
                                except Exception as e:
                                    logger.warning(f"Failed to fetch element summary for {element_id} GW {gameweek}: {str(e)}")
                                    gw_points_raw = float(el.get("event_points") or 0)
                            else:
                                # Current/latest gameweek - use event_points from bootstrap-static
                                gw_points_raw = float(el.get("event_points") or 0)
                            
                            gw_points = gw_points_raw * multiplier

                            # Expected points (projected) from bootstrap ep_this; multiply for captain/triple.
                            ep_this = el.get("ep_this")
                            try:
                                ep_this_f = float(ep_this) if ep_this is not None else 0.0
                            except Exception:
                                ep_this_f = 0.0
                            if is_starting:
                                expected_points_total += ep_this_f * multiplier

                            if is_captain:
                                captain_id = element_id
                            if is_vice_captain:
                                vice_captain_id = element_id

                            players_data.append(PlayerDetail(
                                # Use FPL element id as stable identifier for UI selection
                                id=int(element_id),
                                fpl_id=int(element_id),
                                fpl_code=int(el.get("code")) if el.get("code") is not None else None,
                                db_id=None,
                                name=str(el.get("web_name") or f"{el.get('first_name','')} {el.get('second_name','')}".strip()),
                                position=position,
                                team=str(team_info.get("name") or "Unknown"),
                                team_short_name=str(team_info.get("short_name") or None),
                                team_fpl_code=int(team_id_fpl) if team_id_fpl else None,
                                price=price,
                                status=str(el.get("status") or "a"),
                                is_starting=is_starting,
                                is_captain=is_captain,
                                is_vice_captain=is_vice_captain,
                                multiplier=multiplier,
                                gw_points_raw=gw_points_raw,
                                gw_points=gw_points,
                                total_points=float(el.get("total_points") or 0.0),  # season points from FPL
                                goals_scored=int(el.get("goals_scored") or 0),
                                assists=int(el.get("assists") or 0),
                                clean_sheets=int(el.get("clean_sheets") or 0),
                            ))

                        # Team-level points/value/rank from entry_history (authoritative)
                        gw_points_total = float(entry_history.get("points") or 0.0)
                        overall_points = entry_history.get("total_points")
                        gw_rank = entry_history.get("rank")
                        transfers = entry_history.get("event_transfers")
                        squad_value = float(entry_history.get("value") or 0) / 10.0
                        bank = float(entry_history.get("bank") or 0) / 10.0

                        risk_score = self._calculate_risk_score(players_data)
                        fixture_difficulty = 3.0

                        return TeamEvaluationResponse(
                            season=season,
                            gameweek=gameweek,
                            overall_points=float(overall_points) if overall_points is not None else None,
                            gw_rank=int(gw_rank) if isinstance(gw_rank, int) else None,
                            transfers=int(transfers) if isinstance(transfers, int) else None,
                            active_chip=str(active_chip) if active_chip else None,
                            total_points=gw_points_total,
                            expected_points=expected_points_total,
                            risk_score=risk_score,
                            fixture_difficulty=fixture_difficulty,
                            squad_value=squad_value,
                            bank=bank,
                            players=players_data,
                            captain_id=captain_id,
                            vice_captain_id=vice_captain_id,
                        )
                    except Exception as e:
                        logger.warning(f"FPL bootstrap-derived evaluation failed; falling back to DB mapping: {str(e)}", exc_info=True)
                    
                    # Convert FPL element IDs to internal player IDs by matching players.fpl_id
                    if element_ids:
                        players = self.db.query(Player).filter(Player.fpl_id.in_(element_ids)).all()
                        matched_ids = [p.id for p in players]
                        logger.info(f"Matched {len(matched_ids)} players by fpl_id")
                        
                        # If we didn't match all players, try using bootstrap-static to get player names
                        if len(matched_ids) < len(element_ids):
                            logger.warning(f"Only matched {len(matched_ids)}/{len(element_ids)} players by fpl_id. Trying name-based fallback matching.")
                            # Try to get player info from bootstrap-static for unmatched codes
                            try:
                                bootstrap_response = requests.get(f"{settings.FPL_API_BASE_URL}/bootstrap-static/", timeout=10)
                                bootstrap_data = bootstrap_response.json()
                                elements = {e["id"]: e for e in bootstrap_data.get("elements", [])}
                                
                                unmatched_element_ids = set(element_ids) - {p.fpl_id for p in players if p.fpl_id}
                                logger.info(f"Attempting to match {len(unmatched_element_ids)} players by name")
                                
                                for element_id in unmatched_element_ids:
                                    element = elements.get(element_id)
                                    if element:
                                        # Try to find by name - try multiple name formats
                                        web_name = element.get("web_name", "").lower().strip()
                                        first_name = element.get("first_name", "").strip()
                                        second_name = element.get("second_name", "").strip()
                                        full_name = f"{first_name} {second_name}".strip()
                                        full_name_lower = full_name.lower()
                                        
                                        # Try matching by various name formats
                                        # First try exact match
                                        player = self.db.query(Player).filter(
                                            Player.name.ilike(full_name)
                                        ).first()
                                        
                                        # If not found, try web_name
                                        if not player and web_name:
                                            player = self.db.query(Player).filter(
                                                Player.name.ilike(f"%{web_name}%")
                                            ).first()
                                        
                                        # If still not found, try partial match on full name
                                        if not player:
                                            # Try matching by last name (second_name)
                                            if second_name:
                                                player = self.db.query(Player).filter(
                                                    Player.name.ilike(f"%{second_name}%")
                                                ).first()
                                        
                                        if player and player.id not in matched_ids:
                                            matched_ids.append(player.id)
                                            # Update fpl_id so future lookups match by element id
                                            if not player.fpl_id:
                                                player.fpl_id = int(element_id)
                                                logger.info(f"✓ Matched and updated fpl_id for player '{player.name}' (ID: {player.id}) = {element_id}")
                                            else:
                                                logger.info(f"✓ Matched player '{player.name}' (ID: {player.id}) by name for FPL element id {element_id}")
                                        else:
                                            # Player not found - create it on-the-fly if we have enough info
                                            logger.warning(f"✗ Could not match FPL element id {element_id} (FPL name: '{full_name}', web_name: '{web_name}')")
                                            
                                            # Try to create the player if we have team info
                                            try:
                                                # Get team from bootstrap data
                                                team_id_fpl = element.get("team")
                                                if team_id_fpl:
                                                    team = self.db.query(Team).filter(Team.fpl_id == team_id_fpl).first()
                                                    
                                                    # Create team if it doesn't exist
                                                    if not team:
                                                        # Get team info from bootstrap data
                                                        teams_data = bootstrap_data.get("teams", [])
                                                        team_info = next((t for t in teams_data if t["id"] == team_id_fpl), None)
                                                        if team_info:
                                                            team = Team(
                                                                fpl_id=team_id_fpl,
                                                                fpl_code=team_info.get("code"),
                                                                name=team_info.get("name", "Unknown"),
                                                                short_name=team_info.get("short_name", "UNK"),
                                                            )
                                                            self.db.add(team)
                                                            self.db.flush()
                                                            logger.info(f"Created new team '{team.name}' (ID: {team.id}) with fpl_id {team_id_fpl}")
                                                    
                                                    if team:
                                                        # Map element_type to position
                                                        element_type = element.get("element_type", 3)
                                                        position_map = {1: "GK", 2: "DEF", 3: "MID", 4: "FWD"}
                                                        position = position_map.get(element_type, "MID")
                                                        
                                                        # Create new player
                                                        new_player = Player(
                                                            fpl_id=int(element_id),
                                                            fpl_code=element.get("code"),
                                                            name=full_name,
                                                            first_name=first_name,
                                                            second_name=second_name,
                                                            team_id=team.id,
                                                            position=position,
                                                            price=element.get("now_cost", 0) / 10.0,
                                                            status=element.get("status", "a"),
                                                            element_type=element_type,
                                                        )
                                                        self.db.add(new_player)
                                                        self.db.flush()  # Get the ID
                                                        matched_ids.append(new_player.id)
                                                        logger.info(f"✓ Created new player '{full_name}' (ID: {new_player.id}) with fpl_id {element_id}")
                                            except Exception as e:
                                                logger.debug(f"Could not create player for element_id {element_id}: {str(e)}")
                                
                                # Commit any fpl_code updates and new players
                                try:
                                    self.db.commit()
                                    logger.info(f"Committed {len(matched_ids)} matched players (including any newly created)")
                                except Exception as e:
                                    logger.warning(f"Could not commit updates: {str(e)}")
                                    self.db.rollback()
                                
                                additional_matches = len(matched_ids) - len([p.id for p in players])
                                logger.info(f"Name-based matching found {additional_matches} additional players")
                            except Exception as e:
                                logger.error(f"Error in bootstrap-static fallback: {str(e)}", exc_info=True)
                        
                        player_ids = matched_ids
                        logger.info(f"Total matched players: {len(player_ids)}")
                    else:
                        logger.warning(f"No picks found for team {team_id} in gameweek {gameweek}")
                else:
                    error_msg = f"Failed to fetch team picks: HTTP {picks_response.status_code}"
                    if picks_response.status_code == 404:
                        error_msg += f" - Team {team_id} not found or not accessible"
                    logger.error(error_msg)
            except requests.exceptions.RequestException as e:
                logger.error(f"Network error fetching team from FPL API: {str(e)}")
            except Exception as e:
                logger.error(f"Error fetching team from FPL API: {str(e)}", exc_info=True)
                # Continue with empty player_ids - will return default response
        else:
            logger.warning("No team_id or squad_json provided")
        
        # Fetch players - preserve order from FPL picks if available
        players_data = []
        total_value = 0.0
        total_points = 0.0
        
        # Create a mapping of fpl_code to player_id for ordering
        fpl_to_pid = {}
        for pid in player_ids:
            player = self.db.query(Player).filter(Player.id == pid).first()
            if player and player.fpl_id:
                fpl_to_pid[player.fpl_id] = pid
        
        # If we have picks data, use it to order players (starting XI first, then bench)
        ordered_pids = player_ids
        if picks_by_element:
            # Sort by position (1-11 = starting XI, 12-15 = bench)
            sorted_picks = sorted(
                picks_by_element.items(),
                key=lambda x: picks_by_element.get(x[0], {}).get("position", 99)
            )
            ordered_pids = [fpl_to_pid.get(element_id) for element_id, _ in sorted_picks if element_id in fpl_to_pid]
            # Add any players not in picks (shouldn't happen, but safety)
            for pid in player_ids:
                if pid not in ordered_pids:
                    ordered_pids.append(pid)
        
        for pid in ordered_pids:
            if not pid:
                continue
            player = self.db.query(Player).filter(Player.id == pid).first()
            if player:
                # Get current season points
                points_query = (
                    self.db.query(WeeklyScore.points)
                    .filter(WeeklyScore.player_id == pid)
                    .filter(WeeklyScore.season == season)
                )
                if gameweek:
                    points_query = points_query.filter(WeeklyScore.gw <= gameweek)
                
                season_points = sum(p[0] for p in points_query.all())
                
                players_data.append(PlayerDetail(
                    # Use element id for UI + routing stability; keep DB PK separately
                    id=int(player.fpl_id or player.id),
                    fpl_id=int(player.fpl_id) if player.fpl_id is not None else None,
                    db_id=int(player.id),
                    name=player.name,
                    position=player.position,
                    team=player.team.name if player.team else "Unknown",
                    price=player.price,
                    fpl_code=player.fpl_code,
                    team_fpl_code=player.team.fpl_code if player.team else None,
                    status=player.status,
                    total_points=season_points,
                    goals_scored=player.goals_scored,
                    assists=player.assists,
                    clean_sheets=player.clean_sheets,
                ))
                
                total_value += player.price
                total_points += season_points
        
        # Calculate risk score (simplified)
        risk_score = self._calculate_risk_score(players_data)
        
        # Calculate fixture difficulty (simplified)
        fixture_difficulty = 3.0  # Would calculate from upcoming fixtures
        
        # Return default response if no players (for empty squad)
        if not players_data:
            if team_id and not player_ids:
                logger.warning(f"Team {team_id} found but no players could be matched. This may indicate:")
                logger.warning("  1. The team_id is invalid or the team is private")
                logger.warning("  2. Players in the database don't have fpl_code populated")
                logger.warning("  3. The FPL API returned picks but they don't match any players in the database")
            elif not team_id and not squad_json:
                logger.info("No team_id or squad_json provided - returning empty squad")
            return TeamEvaluationResponse(
                season=season,
                gameweek=gameweek,
                total_points=0.0,
                expected_points=0.0,
                risk_score=0.5,
                fixture_difficulty=3.0,
                squad_value=0.0,
                bank=100.0,
                players=[],
            )
        
        return TeamEvaluationResponse(
            season=season,
            gameweek=gameweek,
            total_points=total_points,
            expected_points=total_points * 0.95,  # Simplified
            risk_score=risk_score,
            fixture_difficulty=fixture_difficulty,
            squad_value=total_value,
            bank=max(0.0, 100.0 - total_value),
            players=players_data,
        )
    
    def _calculate_risk_score(self, players: List[PlayerDetail]) -> float:
        """Calculate risk score (0-1)."""
        if not players:
            return 0.5
        
        # Risk factors:
        # - Injured/suspended players
        # - Low form players
        # - High price variance
        injured_count = sum(1 for p in players if p.status != "a")
        risk = min(1.0, injured_count / len(players) * 2)
        
        return float(risk)

