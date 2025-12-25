"""
Context Builder - Assembles user, team, app state, and FPL knowledge context.
Enhanced to automatically fetch relevant FPL data.
"""
from __future__ import annotations
from typing import Dict, Any, Optional, List
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
import logging
import httpx

from app.models.copilot import CopilotPreference
from app.models.player import Player
from app.models.squad import Squad

logger = logging.getLogger(__name__)


class ContextBuilder:
    """Builds comprehensive context for the copilot."""
    
    FPL_API_BASE = "https://fantasy.premierleague.com/api"
    CACHE_TTL_SECONDS = 60  # Cache FPL data for 1 minute max
    
    def __init__(self, db: Session):
        self.db = db
        self._fpl_cache: Dict[str, Any] = {}
        self._cache_timestamp: float = 0
    
    async def build_context(
        self,
        user_id: Optional[int] = None,
        team_id: Optional[int] = None,
        app_state: Optional[Dict[str, Any]] = None,
        route: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Build comprehensive context for copilot.
        
        Returns:
            Context dict with user, team, app_state, fpl_data, and knowledge sections
        """
        context = {
            "user": await self._build_user_context(user_id),
            "team": await self._build_team_context(team_id),
            "app_state": await self._build_app_state_context(app_state, route),
            "fpl": await self._build_fpl_context(),
            "knowledge": {},  # Will be populated by retrieval
            "timestamp": datetime.utcnow().isoformat(),
        }
        
        return context
    
    async def _fetch_fpl_bootstrap(self) -> Dict[str, Any]:
        """Fetch FPL bootstrap data with TTL-based caching."""
        import time
        current_time = time.time()
        
        # Check if cache is valid
        if "bootstrap" in self._fpl_cache and (current_time - self._cache_timestamp) < self.CACHE_TTL_SECONDS:
            return self._fpl_cache["bootstrap"]
        
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(f"{self.FPL_API_BASE}/bootstrap-static/", timeout=10)
                if response.status_code == 200:
                    data = response.json()
                    self._fpl_cache["bootstrap"] = data
                    self._cache_timestamp = current_time
                    return data
        except Exception as e:
            logger.warning(f"Failed to fetch FPL bootstrap: {e}")
        
        return {}
    
    async def _build_user_context(self, user_id: Optional[int]) -> Dict[str, Any]:
        """Build user-specific context."""
        if not user_id:
            return {}
        
        # Get user preferences
        try:
            preferences = self.db.query(CopilotPreference).filter(
                CopilotPreference.user_id == user_id,
                CopilotPreference.scope == "user"
            ).all()
            
            prefs_dict = {p.preference_key: p.preference_value for p in preferences}
        except:
            prefs_dict = {}
        
        return {
            "user_id": user_id,
            "preferences": prefs_dict,
        }
    
    async def _build_team_context(self, team_id: Optional[int]) -> Dict[str, Any]:
        """Build comprehensive FPL team context with squad data."""
        if not team_id:
            return {}
        
        context = {"team_id": team_id}
        bootstrap = await self._fetch_fpl_bootstrap()
        elements = {e["id"]: e for e in bootstrap.get("elements", [])}
        teams = {t["id"]: t for t in bootstrap.get("teams", [])}
        
        # Get current and next gameweek
        events = bootstrap.get("events", [])
        current_gw = next((e for e in events if e.get("is_current")), None)
        next_gw = next((e for e in events if e.get("is_next")), None)
        gw_number = current_gw.get("id", 1) if current_gw else 1
        
        # Add gameweek info to context
        context["current_gameweek"] = gw_number
        context["current_gw_finished"] = current_gw.get("finished", False) if current_gw else True
        if next_gw:
            context["next_gameweek"] = next_gw.get("id")
            context["next_deadline"] = next_gw.get("deadline_time")
        
        try:
            async with httpx.AsyncClient() as client:
                # Get team entry data
                entry_response = await client.get(
                    f"{self.FPL_API_BASE}/entry/{team_id}/",
                    timeout=10
                )
                if entry_response.status_code == 200:
                    team_data = entry_response.json()
                    context.update({
                        "manager_name": f"{team_data.get('player_first_name', '')} {team_data.get('player_last_name', '')}",
                        "team_name": team_data.get("name", ""),
                        "overall_rank": team_data.get("summary_overall_rank"),
                        "total_points": team_data.get("summary_overall_points"),
                        "gameweek_points": team_data.get("summary_event_points"),
                        "bank": team_data.get("last_deadline_bank", 0) / 10,
                        "team_value": team_data.get("last_deadline_value", 0) / 10,
                    })
                
                # Get current squad picks
                picks_response = await client.get(
                    f"{self.FPL_API_BASE}/entry/{team_id}/event/{gw_number}/picks/",
                    timeout=10
                )
                if picks_response.status_code == 200:
                    picks_data = picks_response.json()
                    picks = picks_data.get("picks", [])
                    
                    # Build squad with player details
                    squad = []
                    captain_id = None
                    vice_captain_id = None
                    
                    for pick in picks:
                        element_id = pick.get("element")
                        player = elements.get(element_id, {})
                        team_info = teams.get(player.get("team", 0), {})
                        
                        player_info = {
                            "name": player.get("web_name", "Unknown"),
                            "team": team_info.get("short_name", "?"),
                            "position": ["GKP", "DEF", "MID", "FWD"][player.get("element_type", 1) - 1],
                            "price": player.get("now_cost", 0) / 10,
                            "total_points": player.get("total_points", 0),
                            "form": float(player.get("form", 0)),
                            "expected_points": float(player.get("ep_next", 0)),
                            "is_starter": pick.get("position", 12) <= 11,
                            "is_captain": pick.get("is_captain", False),
                            "is_vice_captain": pick.get("is_vice_captain", False),
                            "news": player.get("news", ""),
                            "chance_of_playing": player.get("chance_of_playing_next_round"),
                        }
                        squad.append(player_info)
                        
                        if pick.get("is_captain"):
                            captain_id = player.get("web_name")
                        if pick.get("is_vice_captain"):
                            vice_captain_id = player.get("web_name")
                    
                    context["squad"] = squad
                    context["captain"] = captain_id
                    context["vice_captain"] = vice_captain_id
                    context["starters"] = [p for p in squad if p["is_starter"]]
                    context["bench"] = [p for p in squad if not p["is_starter"]]
                    
                    # Entry history for chips
                    entry_history = picks_data.get("entry_history", {})
                    context["free_transfers"] = entry_history.get("event_transfers", 0)
                    context["transfers_cost"] = entry_history.get("event_transfers_cost", 0)
                    
                    # Active chip
                    context["active_chip"] = picks_data.get("active_chip")
                    
                # Get transfer history
                transfers_response = await client.get(
                    f"{self.FPL_API_BASE}/entry/{team_id}/transfers/",
                    timeout=10
                )
                if transfers_response.status_code == 200:
                    transfers = transfers_response.json()
                    recent_transfers = transfers[:5] if transfers else []
                    context["recent_transfers"] = [
                        {
                            "in": elements.get(t.get("element_in"), {}).get("web_name", "?"),
                            "out": elements.get(t.get("element_out"), {}).get("web_name", "?"),
                            "gameweek": t.get("event"),
                        }
                        for t in recent_transfers
                    ]
                    
        except Exception as e:
            logger.warning(f"Failed to fetch team data: {e}")
        
        return context
    
    async def _build_app_state_context(
        self,
        app_state: Optional[Dict[str, Any]],
        route: Optional[str]
    ) -> Dict[str, Any]:
        """Build application state context."""
        context = {
            "route": route,
            "timestamp": datetime.utcnow().isoformat(),
        }
        
        # Add route-specific context hints
        route_hints = {
            "/team": "User is viewing their current FPL team",
            "/optimize": "User is on the squad optimizer page",
            "/transfers": "User is browsing the transfer market",
            "/copilot": "User is in the dedicated AI assistant chat",
            "/player": "User is viewing player details",
            "/compare": "User is comparing players",
        }
        
        if route:
            for route_prefix, hint in route_hints.items():
                if route.startswith(route_prefix):
                    context["page_context"] = hint
                    break
        
        if app_state:
            context.update({
                "selected_players": app_state.get("selected_players", []),
                "selected_team": app_state.get("selected_team"),
                "active_filters": app_state.get("filters", {}),
                "view_mode": app_state.get("view_mode"),
                "current_gameweek": app_state.get("gameweek"),
            })
        
        return context
    
    async def _build_fpl_context(self) -> Dict[str, Any]:
        """Build FPL-specific context (gameweek info, top players, etc.)."""
        bootstrap = await self._fetch_fpl_bootstrap()
        if not bootstrap:
            return {}
        
        events = bootstrap.get("events", [])
        elements = bootstrap.get("elements", [])
        teams = {t["id"]: t for t in bootstrap.get("teams", [])}
        
        # Get current/next gameweek
        current_gw = next((e for e in events if e.get("is_current")), None)
        next_gw = next((e for e in events if e.get("is_next")), None)
        
        # Get top form players
        sorted_by_form = sorted(elements, key=lambda x: float(x.get("form", 0)), reverse=True)[:5]
        top_form = []
        for p in sorted_by_form:
            team_info = teams.get(p.get("team"), {})
            top_form.append({
                "name": p.get("web_name"),
                "team": team_info.get("short_name", "?"),
                "form": float(p.get("form", 0)),
                "expected_points": float(p.get("ep_next", 0)),
            })
        
        # Get most transferred in
        sorted_by_transfers = sorted(elements, key=lambda x: x.get("transfers_in_event", 0), reverse=True)[:3]
        trending = []
        for p in sorted_by_transfers:
            team_info = teams.get(p.get("team"), {})
            trending.append({
                "name": p.get("web_name"),
                "team": team_info.get("short_name", "?"),
                "transfers_in": p.get("transfers_in_event", 0),
            })
        
        context = {
            "season": "2024-25",
            "top_form_players": top_form,
            "trending_players": trending,
        }
        
        if current_gw:
            context["current_gameweek"] = {
                "number": current_gw.get("id"),
                "name": current_gw.get("name"),
                "finished": current_gw.get("finished", False),
                "average_score": current_gw.get("average_entry_score"),
                "highest_score": current_gw.get("highest_score"),
            }
        
        if next_gw:
            context["next_gameweek"] = {
                "number": next_gw.get("id"),
                "name": next_gw.get("name"),
                "deadline": next_gw.get("deadline_time"),
            }
        
        return context
    
    def format_context_for_prompt(self, context: Dict[str, Any], max_length: int = 2000) -> str:
        """Format context as a concise string for LLM prompt (limited to max_length chars)."""
        from datetime import datetime
        parts = []
        
        # Current date for reference
        parts.append(f"Today: {datetime.now().strftime('%A, %B %d, %Y')}")
        
        # FPL Season Context (brief)
        if context.get("fpl"):
            fpl = context["fpl"]
            if fpl.get("current_gameweek"):
                gw = fpl["current_gameweek"]
                status = "finished" if gw.get("finished") else "in progress"
                parts.append(f"GW{gw.get('number')} ({status}), avg: {gw.get('average_score', '?')} pts")
            if fpl.get("next_gameweek"):
                next_gw = fpl["next_gameweek"]
                parts.append(f"Next: GW{next_gw.get('number')}, deadline: {next_gw.get('deadline', '?')}")
        
        # Team Context (concise)
        if context.get("team") and context["team"].get("team_name"):
            team = context["team"]
            parts.append(f"\nTeam: {team.get('team_name')} | Rank: {team.get('overall_rank', '?'):,} | Pts: {team.get('total_points', '?')} | Bank: £{team.get('bank', 0)}m")
            
            if team.get("captain"):
                parts.append(f"Captain: {team.get('captain')} | VC: {team.get('vice_captain', '?')}")
            
            # Starting XI (names only with key info)
            if team.get("starters"):
                starters_str = ", ".join([
                    f"{p['name']}({'C' if p.get('is_captain') else 'V' if p.get('is_vice_captain') else p['position'][0]})"
                    for p in team["starters"]
                ])
                parts.append(f"XI: {starters_str}")
            
            # Bench (names only)
            if team.get("bench"):
                bench_str = ", ".join([p['name'] for p in team["bench"]])
                parts.append(f"Bench: {bench_str}")
            
            # Calculate expected points
            total_ep = sum(float(p.get('expected_points', 0)) for p in team.get("starters", []))
            parts.append(f"Expected Points: {total_ep:.1f}")
        
        # App State (brief)
        if context.get("app_state") and context["app_state"].get("page_context"):
            parts.append(f"\nPage: {context['app_state']['page_context']}")
        
        result = "\n".join(parts) if parts else "Use tools to fetch data."
        
        # Truncate if too long
        if len(result) > max_length:
            result = result[:max_length - 3] + "..."
        
        return result
