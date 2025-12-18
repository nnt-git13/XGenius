"""
Context Builder - Assembles user, team, app state, and knowledge context.
"""
from __future__ import annotations
from typing import Dict, Any, Optional, List
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
import logging

from app.models.copilot import CopilotPreference
from app.models.player import Player
from app.models.squad import Squad

logger = logging.getLogger(__name__)


class ContextBuilder:
    """Builds comprehensive context for the copilot."""
    
    def __init__(self, db: Session):
        self.db = db
    
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
            Context dict with user, team, app_state, and knowledge sections
        """
        context = {
            "user": await self._build_user_context(user_id),
            "team": await self._build_team_context(team_id),
            "app_state": await self._build_app_state_context(app_state, route),
            "knowledge": {},  # Will be populated by retrieval
            "timestamp": datetime.utcnow().isoformat(),
        }
        
        return context
    
    async def _build_user_context(self, user_id: Optional[int]) -> Dict[str, Any]:
        """Build user-specific context."""
        if not user_id:
            return {}
        
        # Get user preferences
        preferences = self.db.query(CopilotPreference).filter(
            CopilotPreference.user_id == user_id,
            CopilotPreference.scope == "user"
        ).all()
        
        prefs_dict = {p.preference_key: p.preference_value for p in preferences}
        
        # Get recent activity (last 7 days)
        # This would query recent actions, views, etc.
        recent_activity = []  # Placeholder
        
        return {
            "user_id": user_id,
            "preferences": prefs_dict,
            "recent_activity": recent_activity,
        }
    
    async def _build_team_context(self, team_id: Optional[int]) -> Dict[str, Any]:
        """Build team/organization context."""
        if not team_id:
            return {}
        
        # Get team preferences
        team_prefs = self.db.query(CopilotPreference).filter(
            CopilotPreference.team_id == team_id,
            CopilotPreference.scope == "team"
        ).all()
        
        prefs_dict = {p.preference_key: p.preference_value for p in team_prefs}
        
        # Get team squad if available
        squad = self.db.query(Squad).filter(Squad.id == team_id).first()
        squad_context = {}
        if squad:
            squad_context = {
                "squad_id": squad.id,
                "season": squad.season,
                "gameweek": squad.gameweek,
            }
        
        return {
            "team_id": team_id,
            "preferences": prefs_dict,
            "squad": squad_context,
        }
    
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
        
        if app_state:
            # Extract relevant app state
            context.update({
                "selected_players": app_state.get("selected_players", []),
                "selected_team": app_state.get("selected_team"),
                "active_filters": app_state.get("filters", {}),
                "view_mode": app_state.get("view_mode"),
                "timeframe": app_state.get("timeframe"),
            })
        
        return context
    
    def format_context_for_prompt(self, context: Dict[str, Any]) -> str:
        """Format context as a string for LLM prompt."""
        parts = []
        
        # User context
        if context.get("user"):
            user = context["user"]
            parts.append("## User Context")
            if user.get("preferences"):
                parts.append(f"Preferences: {user['preferences']}")
            if user.get("recent_activity"):
                parts.append(f"Recent activity: {len(user['recent_activity'])} items")
        
        # Team context
        if context.get("team"):
            team = context["team"]
            parts.append("## Team Context")
            if team.get("preferences"):
                parts.append(f"Team preferences: {team['preferences']}")
            if team.get("squad"):
                parts.append(f"Current squad: Season {team['squad'].get('season')}, GW {team['squad'].get('gameweek')}")
        
        # App state
        if context.get("app_state"):
            app = context["app_state"]
            parts.append("## Current App State")
            if app.get("route"):
                parts.append(f"Current page: {app['route']}")
            if app.get("selected_players"):
                parts.append(f"Selected players: {len(app['selected_players'])}")
        
        # Knowledge (retrieved data)
        if context.get("knowledge"):
            knowledge = context["knowledge"]
            parts.append("## Retrieved Knowledge")
            if knowledge.get("entities"):
                parts.append(f"Relevant entities: {len(knowledge['entities'])}")
            if knowledge.get("documents"):
                parts.append(f"Relevant documents: {len(knowledge['documents'])}")
        
        return "\n".join(parts) if parts else "No additional context available."

