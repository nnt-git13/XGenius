"""
Tool Registry - Defines tools the copilot can use with typed schemas.
Enhanced with FPL data fetching capabilities.
"""
from __future__ import annotations
from typing import Dict, Any, List, Optional, Callable
from dataclasses import dataclass
from enum import Enum
import json
from sqlalchemy.orm import Session
import logging
import httpx

logger = logging.getLogger(__name__)


class ToolRisk(str, Enum):
    """Tool risk levels."""
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


@dataclass
class ToolDefinition:
    """Definition of a tool."""
    name: str
    description: str
    parameters: Dict[str, Any]  # JSON Schema
    risk_level: ToolRisk
    requires_confirmation: bool
    handler: Callable
    category: str = "general"


class ToolRegistry:
    """Registry of available tools for the copilot."""
    
    FPL_API_BASE = "https://fantasy.premierleague.com/api"
    
    def __init__(self, db: Session):
        self.db = db
        self.tools: Dict[str, ToolDefinition] = {}
        self._fpl_cache: Dict[str, Any] = {}
        self._register_default_tools()
    
    def _register_default_tools(self):
        """Register default tools."""
        # Search players
        self.register(
            ToolDefinition(
                name="search_players",
                description="Search for players by name, position, team, or attributes. Returns player stats, form, price, and expected points.",
                parameters={
                    "type": "object",
                    "properties": {
                        "query": {"type": "string", "description": "Player name to search for"},
                        "position": {"type": "string", "enum": ["GK", "DEF", "MID", "FWD"], "description": "Filter by position"},
                        "team": {"type": "string", "description": "Filter by team name"},
                        "min_price": {"type": "number", "description": "Minimum price in millions"},
                        "max_price": {"type": "number", "description": "Maximum price in millions"},
                        "sort_by": {"type": "string", "enum": ["form", "total_points", "price", "selected_by_percent"], "default": "total_points"},
                        "limit": {"type": "integer", "default": 10},
                    },
                    "required": [],
                },
                risk_level=ToolRisk.LOW,
                requires_confirmation=False,
                handler=self._search_players,
                category="search",
            )
        )
        
        # Get player details
        self.register(
            ToolDefinition(
                name="get_player_details",
                description="Get comprehensive details for a specific player including stats, history, fixtures, and predictions.",
                parameters={
                    "type": "object",
                    "properties": {
                        "player_name": {"type": "string", "description": "Player name to look up"},
                        "player_id": {"type": "integer", "description": "FPL player ID (if known)"},
                    },
                    "required": [],
                },
                risk_level=ToolRisk.LOW,
                requires_confirmation=False,
                handler=self._get_player_details,
                category="data",
            )
        )
        
        # Get team fixtures
        self.register(
            ToolDefinition(
                name="get_team_fixtures",
                description="Get upcoming fixtures for a team with fixture difficulty ratings (FDR).",
                parameters={
                    "type": "object",
                    "properties": {
                        "team_name": {"type": "string", "description": "Team name (e.g., 'Arsenal', 'Liverpool')"},
                        "num_gameweeks": {"type": "integer", "default": 5, "description": "Number of upcoming gameweeks to show"},
                    },
                    "required": ["team_name"],
                },
                risk_level=ToolRisk.LOW,
                requires_confirmation=False,
                handler=self._get_team_fixtures,
                category="analysis",
            )
        )
        
        # Get top players by position
        self.register(
            ToolDefinition(
                name="get_top_players",
                description="Get top performing players by position based on form, points, or value.",
                parameters={
                    "type": "object",
                    "properties": {
                        "position": {"type": "string", "enum": ["GK", "DEF", "MID", "FWD"], "description": "Player position"},
                        "metric": {"type": "string", "enum": ["form", "total_points", "value", "expected_points"], "default": "form"},
                        "max_price": {"type": "number", "description": "Maximum price filter"},
                        "limit": {"type": "integer", "default": 10},
                    },
                    "required": ["position"],
                },
                risk_level=ToolRisk.LOW,
                requires_confirmation=False,
                handler=self._get_top_players,
                category="analysis",
            )
        )
        
        # Get gameweek info
        self.register(
            ToolDefinition(
                name="get_gameweek_info",
                description="Get information about the current or upcoming gameweek including deadline, fixtures, and status.",
                parameters={
                    "type": "object",
                    "properties": {
                        "gameweek": {"type": "integer", "description": "Specific gameweek number (optional, defaults to current/next)"},
                    },
                },
                risk_level=ToolRisk.LOW,
                requires_confirmation=False,
                handler=self._get_gameweek_info,
                category="data",
            )
        )
        
        # Compare players
        self.register(
            ToolDefinition(
                name="compare_players",
                description="Compare two players side-by-side on stats, form, fixtures, and value.",
                parameters={
                    "type": "object",
                    "properties": {
                        "player1": {"type": "string", "description": "First player name"},
                        "player2": {"type": "string", "description": "Second player name"},
                    },
                    "required": ["player1", "player2"],
                },
                risk_level=ToolRisk.LOW,
                requires_confirmation=False,
                handler=self._compare_players,
                category="analysis",
            )
        )
        
        # Get transfer suggestions
        self.register(
            ToolDefinition(
                name="get_transfer_suggestions",
                description="Get AI-powered transfer suggestions based on form, fixtures, and value.",
                parameters={
                    "type": "object",
                    "properties": {
                        "position": {"type": "string", "enum": ["GK", "DEF", "MID", "FWD"]},
                        "budget": {"type": "number", "description": "Available budget in millions"},
                        "exclude_teams": {"type": "array", "items": {"type": "string"}, "description": "Teams to exclude"},
                    },
                },
                risk_level=ToolRisk.LOW,
                requires_confirmation=False,
                handler=self._get_transfer_suggestions,
                category="optimization",
            )
        )
        
        # Get captain picks
        self.register(
            ToolDefinition(
                name="get_captain_picks",
                description="Get recommended captain picks for the upcoming gameweek based on form and fixtures.",
                parameters={
                    "type": "object",
                    "properties": {
                        "from_players": {"type": "array", "items": {"type": "string"}, "description": "List of player names to consider (optional)"},
                    },
                },
                risk_level=ToolRisk.LOW,
                requires_confirmation=False,
                handler=self._get_captain_picks,
                category="optimization",
            )
        )
        
        # Get differential picks
        self.register(
            ToolDefinition(
                name="get_differential_picks",
                description="Find low-ownership players with high potential (differentials).",
                parameters={
                    "type": "object",
                    "properties": {
                        "position": {"type": "string", "enum": ["GK", "DEF", "MID", "FWD"]},
                        "max_ownership": {"type": "number", "default": 10.0, "description": "Maximum ownership percentage"},
                        "min_form": {"type": "number", "default": 4.0, "description": "Minimum form rating"},
                    },
                },
                risk_level=ToolRisk.LOW,
                requires_confirmation=False,
                handler=self._get_differential_picks,
                category="analysis",
            )
        )
    
    def register(self, tool: ToolDefinition):
        """Register a tool."""
        self.tools[tool.name] = tool
    
    def get_tool(self, name: str) -> Optional[ToolDefinition]:
        """Get a tool by name."""
        return self.tools.get(name)
    
    def list_tools(self) -> List[Dict[str, Any]]:
        """List all tools in OpenAI function calling format."""
        return [
            {
                "type": "function",
                "function": {
                    "name": tool.name,
                    "description": tool.description,
                    "parameters": tool.parameters,
                }
            }
            for tool in self.tools.values()
        ]
    
    async def execute_tool(
        self,
        tool_name: str,
        parameters: Dict[str, Any],
        dry_run: bool = False
    ) -> Dict[str, Any]:
        """Execute a tool."""
        tool = self.get_tool(tool_name)
        if not tool:
            raise ValueError(f"Unknown tool: {tool_name}")
        
        if dry_run:
            return {
                "tool": tool_name,
                "parameters": parameters,
                "preview": f"Would execute {tool_name} with parameters: {json.dumps(parameters, indent=2)}",
                "risk_level": tool.risk_level.value,
                "requires_confirmation": tool.requires_confirmation,
            }
        
        try:
            result = await tool.handler(parameters)
            return {
                "tool": tool_name,
                "success": True,
                "result": result,
            }
        except Exception as e:
            logger.error(f"Tool execution error: {e}", exc_info=True)
            return {
                "tool": tool_name,
                "success": False,
                "error": str(e),
            }
    
    async def _fetch_fpl_bootstrap(self) -> Dict[str, Any]:
        """Fetch and cache FPL bootstrap-static data."""
        if "bootstrap" in self._fpl_cache:
            return self._fpl_cache["bootstrap"]
        
        async with httpx.AsyncClient() as client:
            response = await client.get(f"{self.FPL_API_BASE}/bootstrap-static/")
            data = response.json()
            self._fpl_cache["bootstrap"] = data
            return data
    
    async def _fetch_fixtures(self) -> List[Dict[str, Any]]:
        """Fetch and cache FPL fixtures."""
        if "fixtures" in self._fpl_cache:
            return self._fpl_cache["fixtures"]
        
        async with httpx.AsyncClient() as client:
            response = await client.get(f"{self.FPL_API_BASE}/fixtures/")
            data = response.json()
            self._fpl_cache["fixtures"] = data
            return data
    
    async def _fetch_player_history(self, player_id: int) -> Dict[str, Any]:
        """Fetch player history."""
        async with httpx.AsyncClient() as client:
            response = await client.get(f"{self.FPL_API_BASE}/element-summary/{player_id}/")
            return response.json()
    
    # Tool handlers
    async def _search_players(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """Search players using FPL API data."""
        bootstrap = await self._fetch_fpl_bootstrap()
        elements = bootstrap.get("elements", [])
        teams = {t["id"]: t for t in bootstrap.get("teams", [])}
        
        query = (params.get("query") or "").lower()
        position = params.get("position")
        team = (params.get("team") or "").lower()
        min_price = (params.get("min_price") or 0) * 10  # Convert to FPL format
        max_price = (params.get("max_price") or 100) * 10
        sort_by = params.get("sort_by") or "total_points"
        limit = params.get("limit") or 10
        
        position_map = {"GK": 1, "DEF": 2, "MID": 3, "FWD": 4}
        reverse_position_map = {1: "GK", 2: "DEF", 3: "MID", 4: "FWD"}
        
        results = []
        for p in elements:
            # Filter by query
            if query and query not in p.get("web_name", "").lower() and query not in f"{p.get('first_name', '')} {p.get('second_name', '')}".lower():
                continue
            
            # Filter by position
            if position and p.get("element_type") != position_map.get(position):
                continue
            
            # Filter by team
            if team:
                team_info = teams.get(p.get("team"))
                if team_info and team.lower() not in team_info.get("name", "").lower():
                    continue
            
            # Filter by price
            if p.get("now_cost", 0) < min_price or p.get("now_cost", 0) > max_price:
                continue
            
            team_info = teams.get(p.get("team"), {})
            results.append({
                "id": p.get("id"),
                "name": p.get("web_name"),
                "full_name": f"{p.get('first_name')} {p.get('second_name')}",
                "position": reverse_position_map.get(p.get("element_type"), "?"),
                "team": team_info.get("name", "Unknown"),
                "team_short": team_info.get("short_name", "?"),
                "price": p.get("now_cost", 0) / 10,
                "total_points": p.get("total_points", 0),
                "form": float(p.get("form", 0)),
                "selected_by_percent": float(p.get("selected_by_percent", 0)),
                "expected_points": float(p.get("ep_next", 0)),
                "goals": p.get("goals_scored", 0),
                "assists": p.get("assists", 0),
                "clean_sheets": p.get("clean_sheets", 0),
                "minutes": p.get("minutes", 0),
                "status": p.get("status", "a"),
            })
        
        # Sort
        if sort_by == "form":
            results.sort(key=lambda x: x["form"], reverse=True)
        elif sort_by == "total_points":
            results.sort(key=lambda x: x["total_points"], reverse=True)
        elif sort_by == "price":
            results.sort(key=lambda x: x["price"], reverse=True)
        elif sort_by == "selected_by_percent":
            results.sort(key=lambda x: x["selected_by_percent"], reverse=True)
        
        return {
            "players": results[:limit],
            "total_found": len(results),
            "showing": min(limit, len(results)),
        }
    
    async def _get_player_details(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """Get detailed player information."""
        bootstrap = await self._fetch_fpl_bootstrap()
        elements = bootstrap.get("elements", [])
        teams = {t["id"]: t for t in bootstrap.get("teams", [])}
        
        player_name = params.get("player_name", "").lower()
        player_id = params.get("player_id")
        
        player = None
        if player_id:
            player = next((p for p in elements if p.get("id") == player_id), None)
        elif player_name:
            player = next((p for p in elements if player_name in p.get("web_name", "").lower() or 
                          player_name in f"{p.get('first_name', '')} {p.get('second_name', '')}".lower()), None)
        
        if not player:
            return {"error": "Player not found", "suggestion": "Try searching with a different name or check spelling"}
        
        reverse_position_map = {1: "GK", 2: "DEF", 3: "MID", 4: "FWD"}
        team_info = teams.get(player.get("team"), {})
        
        # Fetch player history for recent form
        try:
            history = await self._fetch_player_history(player.get("id"))
            recent_matches = history.get("history", [])[-5:]
            fixtures = history.get("fixtures", [])[:5]
        except:
            recent_matches = []
            fixtures = []
        
        return {
            "id": player.get("id"),
            "name": player.get("web_name"),
            "full_name": f"{player.get('first_name')} {player.get('second_name')}",
            "position": reverse_position_map.get(player.get("element_type"), "?"),
            "team": team_info.get("name", "Unknown"),
            "price": player.get("now_cost", 0) / 10,
            "total_points": player.get("total_points", 0),
            "form": float(player.get("form", 0)),
            "selected_by_percent": float(player.get("selected_by_percent", 0)),
            "expected_points_next_gw": float(player.get("ep_next", 0)),
            "goals": player.get("goals_scored", 0),
            "assists": player.get("assists", 0),
            "clean_sheets": player.get("clean_sheets", 0),
            "minutes": player.get("minutes", 0),
            "bonus": player.get("bonus", 0),
            "bps": player.get("bps", 0),
            "status": "Available" if player.get("status") == "a" else player.get("news", "Unavailable"),
            "ict_index": float(player.get("ict_index", 0)),
            "influence": float(player.get("influence", 0)),
            "creativity": float(player.get("creativity", 0)),
            "threat": float(player.get("threat", 0)),
            "recent_matches": [
                {
                    "gameweek": m.get("round"),
                    "opponent": m.get("opponent_team"),
                    "points": m.get("total_points"),
                    "minutes": m.get("minutes"),
                    "goals": m.get("goals_scored"),
                    "assists": m.get("assists"),
                }
                for m in recent_matches
            ],
            "upcoming_fixtures": [
                {
                    "gameweek": f.get("event"),
                    "opponent": f.get("team_h") if f.get("is_home") else f.get("team_a"),
                    "is_home": f.get("is_home"),
                    "difficulty": f.get("difficulty"),
                }
                for f in fixtures
            ],
        }
    
    async def _get_team_fixtures(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """Get upcoming fixtures for a team."""
        bootstrap = await self._fetch_fpl_bootstrap()
        fixtures = await self._fetch_fixtures()
        teams = {t["id"]: t for t in bootstrap.get("teams", [])}
        events = bootstrap.get("events", [])
        
        team_name = params.get("team_name", "").lower()
        num_gameweeks = params.get("num_gameweeks", 5)
        
        # Find team
        team = next((t for t in teams.values() if team_name in t.get("name", "").lower() or 
                    team_name in t.get("short_name", "").lower()), None)
        
        if not team:
            return {"error": f"Team '{params.get('team_name')}' not found"}
        
        team_id = team.get("id")
        
        # Get current gameweek
        current_gw = next((e.get("id") for e in events if e.get("is_current")), 1)
        
        # Get upcoming fixtures
        upcoming = []
        for f in fixtures:
            if f.get("event") and f.get("event") >= current_gw and f.get("event") < current_gw + num_gameweeks:
                if f.get("team_h") == team_id:
                    opponent = teams.get(f.get("team_a"), {})
                    upcoming.append({
                        "gameweek": f.get("event"),
                        "opponent": opponent.get("name", "Unknown"),
                        "opponent_short": opponent.get("short_name", "?"),
                        "is_home": True,
                        "difficulty": f.get("team_h_difficulty", 3),
                        "kickoff": f.get("kickoff_time"),
                    })
                elif f.get("team_a") == team_id:
                    opponent = teams.get(f.get("team_h"), {})
                    upcoming.append({
                        "gameweek": f.get("event"),
                        "opponent": opponent.get("name", "Unknown"),
                        "opponent_short": opponent.get("short_name", "?"),
                        "is_home": False,
                        "difficulty": f.get("team_a_difficulty", 3),
                        "kickoff": f.get("kickoff_time"),
                    })
        
        upcoming.sort(key=lambda x: x["gameweek"])
        
        return {
            "team": team.get("name"),
            "team_short": team.get("short_name"),
            "fixtures": upcoming[:num_gameweeks],
            "average_difficulty": sum(f["difficulty"] for f in upcoming[:num_gameweeks]) / len(upcoming[:num_gameweeks]) if upcoming else 0,
        }
    
    async def _get_top_players(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """Get top players by position."""
        result = await self._search_players({
            "position": params.get("position"),
            "max_price": params.get("max_price"),
            "sort_by": params.get("metric", "form"),
            "limit": params.get("limit", 10),
        })
        
        return {
            "position": params.get("position"),
            "metric": params.get("metric", "form"),
            "players": result.get("players", []),
        }
    
    async def _get_gameweek_info(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """Get gameweek information."""
        bootstrap = await self._fetch_fpl_bootstrap()
        events = bootstrap.get("events", [])
        
        gw_num = params.get("gameweek")
        
        if gw_num:
            gw = next((e for e in events if e.get("id") == gw_num), None)
        else:
            gw = next((e for e in events if e.get("is_next")), None) or \
                 next((e for e in events if e.get("is_current")), None)
        
        if not gw:
            return {"error": "Gameweek not found"}
        
        return {
            "gameweek": gw.get("id"),
            "name": gw.get("name"),
            "deadline": gw.get("deadline_time"),
            "is_current": gw.get("is_current", False),
            "is_next": gw.get("is_next", False),
            "finished": gw.get("finished", False),
            "average_points": gw.get("average_entry_score"),
            "highest_points": gw.get("highest_score"),
            "most_captained": gw.get("most_captained"),
            "most_transferred_in": gw.get("most_transferred_in"),
            "chip_plays": {
                "bench_boost": gw.get("chip_plays", [{}])[0].get("num_played", 0) if gw.get("chip_plays") else 0,
            },
        }
    
    async def _compare_players(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """Compare two players."""
        player1_data = await self._get_player_details({"player_name": params.get("player1")})
        player2_data = await self._get_player_details({"player_name": params.get("player2")})
        
        if "error" in player1_data:
            return {"error": f"Player 1 not found: {params.get('player1')}"}
        if "error" in player2_data:
            return {"error": f"Player 2 not found: {params.get('player2')}"}
        
        comparison = {
            "player1": {
                "name": player1_data.get("name"),
                "team": player1_data.get("team"),
                "position": player1_data.get("position"),
                "price": player1_data.get("price"),
                "total_points": player1_data.get("total_points"),
                "form": player1_data.get("form"),
                "goals": player1_data.get("goals"),
                "assists": player1_data.get("assists"),
                "expected_points": player1_data.get("expected_points_next_gw"),
            },
            "player2": {
                "name": player2_data.get("name"),
                "team": player2_data.get("team"),
                "position": player2_data.get("position"),
                "price": player2_data.get("price"),
                "total_points": player2_data.get("total_points"),
                "form": player2_data.get("form"),
                "goals": player2_data.get("goals"),
                "assists": player2_data.get("assists"),
                "expected_points": player2_data.get("expected_points_next_gw"),
            },
            "verdict": "",
        }
        
        # Simple verdict
        p1_score = player1_data.get("form", 0) + player1_data.get("expected_points_next_gw", 0)
        p2_score = player2_data.get("form", 0) + player2_data.get("expected_points_next_gw", 0)
        
        if p1_score > p2_score:
            comparison["verdict"] = f"{player1_data.get('name')} is currently in better form"
        elif p2_score > p1_score:
            comparison["verdict"] = f"{player2_data.get('name')} is currently in better form"
        else:
            comparison["verdict"] = "Both players are performing similarly"
        
        return comparison
    
    async def _get_transfer_suggestions(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """Get transfer suggestions."""
        position = params.get("position")
        budget = params.get("budget", 15.0)
        exclude_teams = params.get("exclude_teams", [])
        
        result = await self._search_players({
            "position": position,
            "max_price": budget,
            "sort_by": "form",
            "limit": 20,
        })
        
        suggestions = []
        for p in result.get("players", []):
            if p.get("team") in exclude_teams:
                continue
            if p.get("form", 0) >= 4.0:  # Good form threshold
                suggestions.append({
                    **p,
                    "reason": f"Strong form ({p.get('form')}) at good value (£{p.get('price')}m)",
                })
        
        return {
            "suggestions": suggestions[:5],
            "filters_applied": {
                "position": position,
                "max_budget": budget,
                "excluded_teams": exclude_teams,
            },
        }
    
    async def _get_captain_picks(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """Get captain recommendations."""
        bootstrap = await self._fetch_fpl_bootstrap()
        elements = bootstrap.get("elements", [])
        teams = {t["id"]: t for t in bootstrap.get("teams", [])}
        
        from_players = params.get("from_players", [])
        
        # Get players with high form and good expected points
        candidates = []
        for p in elements:
            # If specific players provided, filter to those
            if from_players:
                name_match = any(
                    fp.lower() in p.get("web_name", "").lower() or
                    fp.lower() in f"{p.get('first_name', '')} {p.get('second_name', '')}".lower()
                    for fp in from_players
                )
                if not name_match:
                    continue
            
            form = float(p.get("form", 0))
            ep = float(p.get("ep_next", 0))
            
            if form >= 4.0 or ep >= 4.0:
                team_info = teams.get(p.get("team"), {})
                candidates.append({
                    "name": p.get("web_name"),
                    "team": team_info.get("name", "Unknown"),
                    "position": {1: "GK", 2: "DEF", 3: "MID", 4: "FWD"}.get(p.get("element_type"), "?"),
                    "form": form,
                    "expected_points": ep,
                    "score": form * 0.5 + ep * 0.5,
                })
        
        candidates.sort(key=lambda x: x["score"], reverse=True)
        
        # Get current/next gameweek info
        events = bootstrap.get("events", [])
        current_gw = next((e for e in events if e.get("is_current")), None)
        next_gw = next((e for e in events if e.get("is_next")), None)
        
        gw_info = {}
        if current_gw:
            gw_info["current_gw"] = current_gw.get("id")
            gw_info["current_gw_finished"] = current_gw.get("finished", False)
        if next_gw:
            gw_info["next_gw"] = next_gw.get("id")
            gw_info["deadline"] = next_gw.get("deadline_time")
        
        return {
            "recommendations": candidates[:5],
            "top_pick": candidates[0] if candidates else None,
            "gameweek_info": gw_info,
            "reasoning": f"Based on form and expected points for GW{gw_info.get('next_gw', gw_info.get('current_gw', '?'))}",
        }
    
    async def _get_differential_picks(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """Get differential picks (low ownership, high potential)."""
        position = params.get("position")
        max_ownership = params.get("max_ownership", 10.0)
        min_form = params.get("min_form", 4.0)
        
        result = await self._search_players({
            "position": position,
            "sort_by": "form",
            "limit": 50,
        })
        
        differentials = []
        for p in result.get("players", []):
            if p.get("selected_by_percent", 100) <= max_ownership and p.get("form", 0) >= min_form:
                differentials.append({
                    **p,
                    "differential_score": p.get("form", 0) / max(p.get("selected_by_percent", 1), 0.1),
                })
        
        differentials.sort(key=lambda x: x["differential_score"], reverse=True)
        
        return {
            "differentials": differentials[:5],
            "criteria": {
                "max_ownership": max_ownership,
                "min_form": min_form,
                "position": position,
            },
        }
