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
                    current_event = bootstrap_data.get("current_event", 1)
                    next_event = bootstrap_data.get("next_event")
                    
                    # If current_event is the same as next_event, it means the current gameweek hasn't started yet
                    # In that case, we want to use the previous gameweek (current_event - 1)
                    if next_event and next_event == current_event:
                        # Current event is actually the next event (hasn't started), use previous
                        gameweek = max(1, current_event - 1)
                        logger.info(f"Current event {current_event} is the next event (not started), using previous gameweek: {gameweek}")
                    else:
                        # Current event is the active gameweek, use it
                        gameweek = current_event
                        logger.info(f"Using current active gameweek: {gameweek} (next_event: {next_event})")
                
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
                        next_event = bootstrap_data.get("next_event", None)
                        if next_event and next_event == gameweek:
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
                    # Extract player element IDs (FPL codes) from picks
                    picks = picks_data.get("picks", [])
                    # Store picks data for later use (to determine starting XI vs bench)
                    picks_by_element = {pick.get("element"): pick for pick in picks if pick.get("element")}
                    fpl_codes = [pick.get("element") for pick in picks if pick.get("element")]
                    logger.info(f"Found {len(fpl_codes)} FPL element IDs in picks")
                    
                    # Convert FPL codes to internal player IDs by matching fpl_code
                    if fpl_codes:
                        # First try matching by fpl_code
                        players = self.db.query(Player).filter(Player.fpl_code.in_(fpl_codes)).all()
                        matched_ids = [p.id for p in players]
                        logger.info(f"Matched {len(matched_ids)} players by fpl_code")
                        
                        # If we didn't match all players, try using bootstrap-static to get player names
                        if len(matched_ids) < len(fpl_codes):
                            logger.warning(f"Only matched {len(matched_ids)}/{len(fpl_codes)} players by fpl_code. Trying name-based fallback matching.")
                            # Try to get player info from bootstrap-static for unmatched codes
                            try:
                                bootstrap_response = requests.get(f"{settings.FPL_API_BASE_URL}/bootstrap-static/", timeout=10)
                                bootstrap_data = bootstrap_response.json()
                                elements = {e["id"]: e for e in bootstrap_data.get("elements", [])}
                                
                                unmatched_codes = set(fpl_codes) - {p.fpl_code for p in players if p.fpl_code}
                                logger.info(f"Attempting to match {len(unmatched_codes)} players by name")
                                
                                for code in unmatched_codes:
                                    element = elements.get(code)
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
                                            # Update fpl_code for future matches
                                            if not player.fpl_code:
                                                player.fpl_code = code
                                                logger.info(f"✓ Matched and updated fpl_code for player '{player.name}' (ID: {player.id}) = {code}")
                                            else:
                                                logger.info(f"✓ Matched player '{player.name}' (ID: {player.id}) by name for FPL code {code}")
                                        else:
                                            # Player not found - create it on-the-fly if we have enough info
                                            logger.warning(f"✗ Could not match FPL code {code} (FPL name: '{full_name}', web_name: '{web_name}')")
                                            
                                            # Try to create the player if we have team info
                                            try:
                                                # Get team from bootstrap data
                                                team_id_fpl = element.get("team")
                                                if team_id_fpl:
                                                    team = self.db.query(Team).filter(Team.fpl_code == team_id_fpl).first()
                                                    
                                                    # Create team if it doesn't exist
                                                    if not team:
                                                        # Get team info from bootstrap data
                                                        teams_data = bootstrap_data.get("teams", [])
                                                        team_info = next((t for t in teams_data if t["id"] == team_id_fpl), None)
                                                        if team_info:
                                                            team = Team(
                                                                fpl_code=team_id_fpl,
                                                                name=team_info.get("name", "Unknown"),
                                                                short_name=team_info.get("short_name", "UNK"),
                                                            )
                                                            self.db.add(team)
                                                            self.db.flush()
                                                            logger.info(f"Created new team '{team.name}' (ID: {team.id}) with fpl_code {team_id_fpl}")
                                                    
                                                    if team:
                                                        # Map element_type to position
                                                        element_type = element.get("element_type", 3)
                                                        position_map = {1: "GK", 2: "DEF", 3: "MID", 4: "FWD"}
                                                        position = position_map.get(element_type, "MID")
                                                        
                                                        # Create new player
                                                        new_player = Player(
                                                            fpl_code=code,
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
                                                        logger.info(f"✓ Created new player '{full_name}' (ID: {new_player.id}) with fpl_code {code}")
                                            except Exception as e:
                                                logger.debug(f"Could not create player for code {code}: {str(e)}")
                                
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
            if player and player.fpl_code:
                fpl_to_pid[player.fpl_code] = pid
        
        # If we have picks data, use it to order players (starting XI first, then bench)
        ordered_pids = player_ids
        if picks_by_element:
            # Sort by position (1-11 = starting XI, 12-15 = bench)
            sorted_picks = sorted(
                picks_by_element.items(),
                key=lambda x: picks_by_element.get(x[0], {}).get("position", 99)
            )
            ordered_pids = [fpl_to_pid.get(fpl_code) for fpl_code, _ in sorted_picks if fpl_code in fpl_to_pid]
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
                    id=player.id,
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

