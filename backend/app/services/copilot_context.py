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
    
    def __init__(self, db: Session):
        self.db = db
        self._fpl_cache: Dict[str, Any] = {}
    
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
        """Fetch and cache FPL bootstrap data."""
        if "bootstrap" in self._fpl_cache:
            return self._fpl_cache["bootstrap"]
        
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(f"{self.FPL_API_BASE}/bootstrap-static/", timeout=10)
                if response.status_code == 200:
                    data = response.json()
                    self._fpl_cache["bootstrap"] = data
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
        """Build FPL team context."""
        if not team_id:
            return {}
        
        context = {"team_id": team_id}
        
        # Try to fetch team data from FPL API
        try:
            async with httpx.AsyncClient() as client:
                # Get team picks (current team)
                picks_response = await client.get(
                    f"{self.FPL_API_BASE}/entry/{team_id}/",
                    timeout=10
                )
                if picks_response.status_code == 200:
                    team_data = picks_response.json()
                    context.update({
                        "manager_name": f"{team_data.get('player_first_name', '')} {team_data.get('player_last_name', '')}",
                        "team_name": team_data.get("name", ""),
                        "overall_rank": team_data.get("summary_overall_rank"),
                        "total_points": team_data.get("summary_overall_points"),
                        "gameweek_points": team_data.get("summary_event_points"),
                        "bank": team_data.get("last_deadline_bank", 0) / 10,
                        "team_value": team_data.get("last_deadline_value", 0) / 10,
                    })
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
    
    def format_context_for_prompt(self, context: Dict[str, Any]) -> str:
        """Format context as a string for LLM prompt."""
        parts = []
        
        # FPL Season Context
        if context.get("fpl"):
            fpl = context["fpl"]
            parts.append("## Current FPL Season")
            parts.append(f"Season: {fpl.get('season', '2024-25')}")
            
            if fpl.get("current_gameweek"):
                gw = fpl["current_gameweek"]
                status = "Finished" if gw.get("finished") else "In Progress"
                parts.append(f"Current Gameweek: {gw.get('number')} ({status})")
                if gw.get("average_score"):
                    parts.append(f"Average Score: {gw.get('average_score')} pts")
            
            if fpl.get("next_gameweek"):
                next_gw = fpl["next_gameweek"]
                parts.append(f"Next Gameweek: {next_gw.get('number')} - Deadline: {next_gw.get('deadline')}")
            
            if fpl.get("top_form_players"):
                parts.append("\nTop Form Players:")
                for p in fpl["top_form_players"][:3]:
                    parts.append(f"  - {p['name']} ({p['team']}): Form {p['form']}, EP {p['expected_points']}")
        
        # Team Context
        if context.get("team") and context["team"].get("team_name"):
            team = context["team"]
            parts.append(f"\n## User's FPL Team")
            parts.append(f"Team Name: {team.get('team_name')}")
            parts.append(f"Manager: {team.get('manager_name')}")
            if team.get("overall_rank"):
                parts.append(f"Overall Rank: {team.get('overall_rank'):,}")
            if team.get("total_points"):
                parts.append(f"Total Points: {team.get('total_points')}")
            if team.get("bank"):
                parts.append(f"Bank: £{team.get('bank')}m")
        
        # App State
        if context.get("app_state"):
            app = context["app_state"]
            if app.get("page_context"):
                parts.append(f"\n## Current Page")
                parts.append(app["page_context"])
            if app.get("selected_players"):
                parts.append(f"Selected players: {len(app['selected_players'])}")
        
        # User Preferences
        if context.get("user") and context["user"].get("preferences"):
            prefs = context["user"]["preferences"]
            if prefs:
                parts.append(f"\n## User Preferences")
                for key, value in prefs.items():
                    parts.append(f"  - {key}: {value}")
        
        return "\n".join(parts) if parts else "No additional context available - use tools to fetch relevant data."
