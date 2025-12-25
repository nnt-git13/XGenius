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
    CACHE_TTL_SECONDS = 60  # Cache expires after 60 seconds for fresh data
    
    def __init__(self, db: Session):
        self.db = db
        self.tools: Dict[str, ToolDefinition] = {}
        self._fpl_cache: Dict[str, Any] = {}
        self._fpl_cache_timestamps: Dict[str, float] = {}
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
        
        # Find player replacements
        self.register(
            ToolDefinition(
                name="find_player_replacements",
                description="Find replacement options for a specific player. ALWAYS use this tool when user asks for replacements or alternatives to a player.",
                parameters={
                    "type": "object",
                    "properties": {
                        "player_name": {"type": "string", "description": "Name of the player to replace"},
                        "max_price": {"type": "number", "description": "Maximum price for replacement (optional, defaults to current player price + 1.0)"},
                        "min_form": {"type": "number", "default": 3.0, "description": "Minimum form rating"},
                        "limit": {"type": "integer", "default": 5, "description": "Number of replacements to return"},
                    },
                    "required": ["player_name"],
                },
                risk_level=ToolRisk.LOW,
                requires_confirmation=False,
                handler=self._find_player_replacements,
                category="optimization",
            )
        )
        
        # Get user's squad
        self.register(
            ToolDefinition(
                name="get_my_squad",
                description="Get the user's current FPL squad with detailed player information. Use this when user asks about 'my team', 'my squad', or 'my players'.",
                parameters={
                    "type": "object",
                    "properties": {
                        "team_id": {"type": "integer", "description": "FPL team ID"},
                    },
                    "required": ["team_id"],
                },
                risk_level=ToolRisk.LOW,
                requires_confirmation=False,
                handler=self._get_my_squad,
                category="team",
            )
        )
        
        # Analyze user's squad
        self.register(
            ToolDefinition(
                name="analyze_my_squad",
                description="Analyze the user's squad for issues, weak points, and improvement opportunities. Use when user asks for squad analysis, team review, or advice on their team.",
                parameters={
                    "type": "object",
                    "properties": {
                        "team_id": {"type": "integer", "description": "FPL team ID"},
                    },
                    "required": ["team_id"],
                },
                risk_level=ToolRisk.LOW,
                requires_confirmation=False,
                handler=self._analyze_my_squad,
                category="analysis",
            )
        )
        
        # Get squad issues
        self.register(
            ToolDefinition(
                name="get_squad_issues",
                description="Find specific issues in the user's squad (injuries, suspensions, poor form, upcoming blanks). Use when user asks about problems with their team.",
                parameters={
                    "type": "object",
                    "properties": {
                        "team_id": {"type": "integer", "description": "FPL team ID"},
                    },
                    "required": ["team_id"],
                },
                risk_level=ToolRisk.LOW,
                requires_confirmation=False,
                handler=self._get_squad_issues,
                category="analysis",
            )
        )
        
        # Get user's transfer history
        self.register(
            ToolDefinition(
                name="get_my_transfer_history",
                description="Get the user's recent FPL transfers. Use when user asks about their transfer history or past moves.",
                parameters={
                    "type": "object",
                    "properties": {
                        "team_id": {"type": "integer", "description": "FPL team ID"},
                        "limit": {"type": "integer", "default": 10, "description": "Number of transfers to return"},
                    },
                    "required": ["team_id"],
                },
                risk_level=ToolRisk.LOW,
                requires_confirmation=False,
                handler=self._get_my_transfer_history,
                category="team",
            )
        )
        
        # Get FPL entry/dashboard info
        self.register(
            ToolDefinition(
                name="get_my_fpl_summary",
                description="Get the user's FPL dashboard summary including rank, points, chips, and team value. Use when user asks about their overall FPL status, rank, or performance.",
                parameters={
                    "type": "object",
                    "properties": {
                        "team_id": {"type": "integer", "description": "FPL team ID"},
                    },
                    "required": ["team_id"],
                },
                risk_level=ToolRisk.LOW,
                requires_confirmation=False,
                handler=self._get_my_fpl_summary,
                category="team",
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
        """Fetch and cache FPL bootstrap-static data with TTL."""
        import time
        current_time = time.time()
        
        # Check if cache is valid
        if "bootstrap" in self._fpl_cache:
            cache_time = self._fpl_cache_timestamps.get("bootstrap", 0)
            if current_time - cache_time < self.CACHE_TTL_SECONDS:
                return self._fpl_cache["bootstrap"]
        
        # Fetch fresh data
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(f"{self.FPL_API_BASE}/bootstrap-static/", timeout=15)
                data = response.json()
                self._fpl_cache["bootstrap"] = data
                self._fpl_cache_timestamps["bootstrap"] = current_time
                logger.info(f"Fetched fresh FPL bootstrap data: {len(data.get('elements', []))} players")
                return data
        except Exception as e:
            logger.error(f"Failed to fetch FPL bootstrap: {e}")
            # Return cached data if available, even if expired
            if "bootstrap" in self._fpl_cache:
                return self._fpl_cache["bootstrap"]
            return {}
    
    async def _fetch_fixtures(self) -> List[Dict[str, Any]]:
        """Fetch and cache FPL fixtures with TTL."""
        import time
        current_time = time.time()
        
        # Check if cache is valid
        if "fixtures" in self._fpl_cache:
            cache_time = self._fpl_cache_timestamps.get("fixtures", 0)
            if current_time - cache_time < self.CACHE_TTL_SECONDS:
                return self._fpl_cache["fixtures"]
        
        # Fetch fresh data
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(f"{self.FPL_API_BASE}/fixtures/", timeout=15)
                data = response.json()
                self._fpl_cache["fixtures"] = data
                self._fpl_cache_timestamps["fixtures"] = current_time
                return data
        except Exception as e:
            logger.error(f"Failed to fetch FPL fixtures: {e}")
            if "fixtures" in self._fpl_cache:
                return self._fpl_cache["fixtures"]
            return []
    
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
    
    async def _find_player_replacements(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """Find replacement options for a specific player using ONLY current FPL data."""
        player_name = params.get("player_name", "")
        
        # First, find the player to be replaced
        bootstrap = await self._fetch_fpl_bootstrap()
        elements = bootstrap.get("elements", [])
        teams = {t["id"]: t for t in bootstrap.get("teams", [])}
        
        # Search for the player
        player_name_lower = player_name.lower()
        original_player = None
        for p in elements:
            if (player_name_lower in p.get("web_name", "").lower() or 
                player_name_lower in f"{p.get('first_name', '')} {p.get('second_name', '')}".lower()):
                original_player = p
                break
        
        if not original_player:
            # Player not found in current FPL data - they might not be in the league
            return {
                "error": f"Player '{player_name}' not found in current FPL data",
                "suggestion": "This player may not be in the Premier League this season. Please check the spelling or try a different player.",
                "note": "Only players currently registered in FPL can be searched."
            }
        
        # Get player details
        reverse_position_map = {1: "GK", 2: "DEF", 3: "MID", 4: "FWD"}
        position = reverse_position_map.get(original_player.get("element_type"), "?")
        original_price = original_player.get("now_cost", 0) / 10
        original_team = teams.get(original_player.get("team"), {})
        
        # Determine max price for replacements
        max_price = params.get("max_price", original_price + 1.0)
        min_form = params.get("min_form", 3.0)
        limit = params.get("limit", 5)
        
        # Find replacements - same position, different player, within budget
        replacements = []
        for p in elements:
            # Skip the original player
            if p.get("id") == original_player.get("id"):
                continue
            
            # Must be same position
            if p.get("element_type") != original_player.get("element_type"):
                continue
            
            # Must be within budget
            price = p.get("now_cost", 0) / 10
            if price > max_price:
                continue
            
            # Check form
            form = float(p.get("form", 0))
            if form < min_form:
                continue
            
            # Must be available (not injured/suspended)
            status = p.get("status", "a")
            if status not in ["a", "d"]:  # 'a' = available, 'd' = doubtful but might play
                continue
            
            team_info = teams.get(p.get("team"), {})
            ep_next = float(p.get("ep_next", 0))
            
            # Calculate replacement score
            replacement_score = form * 0.4 + ep_next * 0.4 + (p.get("total_points", 0) / 10) * 0.2
            
            replacements.append({
                "id": p.get("id"),
                "name": p.get("web_name"),
                "full_name": f"{p.get('first_name')} {p.get('second_name')}",
                "position": position,
                "team": team_info.get("name", "Unknown"),
                "team_short": team_info.get("short_name", "?"),
                "price": price,
                "price_diff": round(price - original_price, 1),
                "form": form,
                "total_points": p.get("total_points", 0),
                "expected_points": ep_next,
                "goals": p.get("goals_scored", 0),
                "assists": p.get("assists", 0),
                "minutes": p.get("minutes", 0),
                "selected_by_percent": float(p.get("selected_by_percent", 0)),
                "status": "Available" if status == "a" else p.get("news", "Doubtful"),
                "replacement_score": round(replacement_score, 2),
            })
        
        # Sort by replacement score
        replacements.sort(key=lambda x: x["replacement_score"], reverse=True)
        
        return {
            "original_player": {
                "name": original_player.get("web_name"),
                "full_name": f"{original_player.get('first_name')} {original_player.get('second_name')}",
                "position": position,
                "team": original_team.get("name", "Unknown"),
                "price": original_price,
                "form": float(original_player.get("form", 0)),
                "total_points": original_player.get("total_points", 0),
                "status": "Available" if original_player.get("status") == "a" else original_player.get("news", "Unavailable"),
            },
            "replacements": replacements[:limit],
            "search_criteria": {
                "max_price": max_price,
                "min_form": min_form,
                "position": position,
            },
            "note": f"Found {len(replacements)} potential replacements. Showing top {min(limit, len(replacements))} by form and expected points."
        }
    
    async def _get_my_squad(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """Get the user's current FPL squad with detailed player information."""
        team_id = params.get("team_id")
        if not team_id:
            return {"error": "No team ID provided. Please ensure you're logged in with your FPL team."}
        
        bootstrap = await self._fetch_fpl_bootstrap()
        elements = {e["id"]: e for e in bootstrap.get("elements", [])}
        teams = {t["id"]: t for t in bootstrap.get("teams", [])}
        events = bootstrap.get("events", [])
        
        # Get current gameweek
        current_gw = next((e for e in events if e.get("is_current")), None)
        gw_number = current_gw.get("id", 1) if current_gw else 1
        
        try:
            async with httpx.AsyncClient() as client:
                # Get team entry
                entry_response = await client.get(
                    f"{self.FPL_API_BASE}/entry/{team_id}/",
                    timeout=10
                )
                if entry_response.status_code != 200:
                    return {"error": f"Could not fetch team {team_id}. Please check the team ID."}
                
                team_data = entry_response.json()
                
                # Get current picks
                picks_response = await client.get(
                    f"{self.FPL_API_BASE}/entry/{team_id}/event/{gw_number}/picks/",
                    timeout=10
                )
                if picks_response.status_code != 200:
                    return {"error": f"Could not fetch squad for GW{gw_number}"}
                
                picks_data = picks_response.json()
                picks = picks_data.get("picks", [])
                entry_history = picks_data.get("entry_history", {})
                
                # Build squad
                starters = []
                bench = []
                captain = None
                vice_captain = None
                
                reverse_position_map = {1: "GK", 2: "DEF", 3: "MID", 4: "FWD"}
                
                for pick in picks:
                    element_id = pick.get("element")
                    player = elements.get(element_id, {})
                    team_info = teams.get(player.get("team", 0), {})
                    
                    player_info = {
                        "id": element_id,
                        "name": player.get("web_name", "Unknown"),
                        "full_name": f"{player.get('first_name', '')} {player.get('second_name', '')}",
                        "position": reverse_position_map.get(player.get("element_type"), "?"),
                        "team": team_info.get("name", "Unknown"),
                        "team_short": team_info.get("short_name", "?"),
                        "price": player.get("now_cost", 0) / 10,
                        "total_points": player.get("total_points", 0),
                        "form": float(player.get("form", 0)),
                        "expected_points": float(player.get("ep_next", 0)),
                        "is_captain": pick.get("is_captain", False),
                        "is_vice_captain": pick.get("is_vice_captain", False),
                        "news": player.get("news", ""),
                        "status": player.get("status", "a"),
                        "chance_of_playing": player.get("chance_of_playing_next_round"),
                    }
                    
                    if pick.get("position", 12) <= 11:
                        starters.append(player_info)
                    else:
                        bench.append(player_info)
                    
                    if pick.get("is_captain"):
                        captain = player_info["name"]
                    if pick.get("is_vice_captain"):
                        vice_captain = player_info["name"]
                
                # Calculate expected points
                total_ep = sum(p["expected_points"] for p in starters)
                captain_ep = next((p["expected_points"] for p in starters if p["is_captain"]), 0)
                total_ep_with_captain = total_ep + captain_ep  # Captain points are doubled
                
                return {
                    "team_name": team_data.get("name"),
                    "manager": f"{team_data.get('player_first_name', '')} {team_data.get('player_last_name', '')}",
                    "gameweek": gw_number,
                    "starters": starters,
                    "bench": bench,
                    "captain": captain,
                    "vice_captain": vice_captain,
                    "total_expected_points": round(total_ep_with_captain, 1),
                    "bank": entry_history.get("bank", 0) / 10,
                    "team_value": entry_history.get("value", 0) / 10,
                    "free_transfers": max(1, 2 - entry_history.get("event_transfers", 0)),
                    "active_chip": picks_data.get("active_chip"),
                }
                
        except Exception as e:
            logger.error(f"Error fetching squad: {e}")
            return {"error": f"Failed to fetch squad: {str(e)}"}
    
    async def _analyze_my_squad(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """Analyze the user's squad for issues, weak points, and improvement opportunities."""
        # First get the squad
        squad_data = await self._get_my_squad(params)
        if "error" in squad_data:
            return squad_data
        
        bootstrap = await self._fetch_fpl_bootstrap()
        fixtures = await self._fetch_fixtures()
        teams = {t["id"]: t for t in bootstrap.get("teams", [])}
        events = bootstrap.get("events", [])
        
        current_gw = next((e for e in events if e.get("is_current")), None)
        gw_number = current_gw.get("id", 1) if current_gw else 1
        
        analysis = {
            "squad_summary": {
                "team_name": squad_data.get("team_name"),
                "gameweek": gw_number,
                "expected_points": squad_data.get("total_expected_points"),
                "bank": squad_data.get("bank"),
            },
            "strengths": [],
            "weaknesses": [],
            "recommendations": [],
            "position_breakdown": {"GK": [], "DEF": [], "MID": [], "FWD": []},
        }
        
        all_players = squad_data.get("starters", []) + squad_data.get("bench", [])
        
        # Analyze by position
        for player in all_players:
            pos = player.get("position", "?")
            if pos in analysis["position_breakdown"]:
                analysis["position_breakdown"][pos].append({
                    "name": player["name"],
                    "form": player["form"],
                    "ep": player["expected_points"],
                    "is_starter": player in squad_data.get("starters", []),
                })
        
        # Find strengths
        high_form_players = [p for p in all_players if p["form"] >= 5.0]
        if high_form_players:
            analysis["strengths"].append({
                "type": "high_form",
                "message": f"Strong form from: {', '.join([p['name'] for p in high_form_players[:3]])}",
                "players": [p["name"] for p in high_form_players],
            })
        
        # Find weaknesses
        low_form_starters = [p for p in squad_data.get("starters", []) if p["form"] < 3.0]
        if low_form_starters:
            analysis["weaknesses"].append({
                "type": "low_form",
                "message": f"Poor form from starters: {', '.join([p['name'] for p in low_form_starters])}",
                "players": [p["name"] for p in low_form_starters],
            })
        
        # Find injury concerns
        injury_concerns = [p for p in all_players if p.get("status") != "a" or (p.get("chance_of_playing") and p.get("chance_of_playing") < 75)]
        if injury_concerns:
            concern_list = [p["name"] + " (" + p.get("news", "flagged") + ")" for p in injury_concerns[:3]]
            analysis["weaknesses"].append({
                "type": "availability",
                "message": "Availability concerns: " + ", ".join(concern_list),
                "players": [p["name"] for p in injury_concerns],
            })
        
        # Captain analysis
        captain = next((p for p in squad_data.get("starters", []) if p["is_captain"]), None)
        if captain:
            if captain["form"] < 4.0:
                analysis["recommendations"].append({
                    "type": "captain",
                    "message": f"Consider changing captain from {captain['name']} (form: {captain['form']})",
                    "priority": "medium",
                })
        
        # Bench analysis - good players benched
        bench = squad_data.get("bench", [])
        strong_bench = [p for p in bench if p["form"] >= 5.0]
        if strong_bench:
            analysis["recommendations"].append({
                "type": "lineup",
                "message": f"Strong bench options: {', '.join([p['name'] for p in strong_bench])} - consider starting",
                "priority": "low",
            })
        
        # Transfer recommendations
        worst_starter = min(squad_data.get("starters", [{}]), key=lambda x: x.get("form", 0), default=None)
        if worst_starter and worst_starter.get("form", 0) < 2.0:
            analysis["recommendations"].append({
                "type": "transfer",
                "message": f"Consider replacing {worst_starter['name']} (form: {worst_starter.get('form', 0)}, {worst_starter.get('position')})",
                "priority": "high",
            })
        
        return analysis
    
    async def _get_squad_issues(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """Find specific issues in the user's squad."""
        squad_data = await self._get_my_squad(params)
        if "error" in squad_data:
            return squad_data
        
        issues = {
            "injured": [],
            "suspended": [],
            "doubtful": [],
            "poor_form": [],
            "no_fixture": [],
            "total_issues": 0,
        }
        
        all_players = squad_data.get("starters", []) + squad_data.get("bench", [])
        
        for player in all_players:
            is_starter = player in squad_data.get("starters", [])
            player_info = {
                "name": player["name"],
                "position": player["position"],
                "team": player["team_short"],
                "is_starter": is_starter,
            }
            
            status = player.get("status", "a")
            news = player.get("news", "")
            chance = player.get("chance_of_playing")
            
            if status == "i":
                issues["injured"].append({**player_info, "news": news})
                issues["total_issues"] += 1
            elif status == "s":
                issues["suspended"].append({**player_info, "news": news})
                issues["total_issues"] += 1
            elif status == "d" or (chance and chance < 75):
                issues["doubtful"].append({**player_info, "news": news, "chance": chance})
                issues["total_issues"] += 1
            
            # Poor form for starters
            if is_starter and player.get("form", 0) < 2.0:
                issues["poor_form"].append({
                    **player_info,
                    "form": player.get("form", 0),
                    "expected_points": player.get("expected_points", 0),
                })
                issues["total_issues"] += 1
        
        # Summary
        if issues["total_issues"] == 0:
            issues["summary"] = "No major issues found in your squad!"
        else:
            issue_types = []
            if issues["injured"]:
                issue_types.append(f"{len(issues['injured'])} injured")
            if issues["suspended"]:
                issue_types.append(f"{len(issues['suspended'])} suspended")
            if issues["doubtful"]:
                issue_types.append(f"{len(issues['doubtful'])} doubtful")
            if issues["poor_form"]:
                issue_types.append(f"{len(issues['poor_form'])} in poor form")
            issues["summary"] = f"Found {issues['total_issues']} issues: {', '.join(issue_types)}"
        
        return issues
    
    async def _get_my_transfer_history(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """Get the user's recent FPL transfers."""
        team_id = params.get("team_id")
        limit = params.get("limit", 10)
        
        if not team_id:
            return {"error": "No team ID provided"}
        
        bootstrap = await self._fetch_fpl_bootstrap()
        elements = {e["id"]: e for e in bootstrap.get("elements", [])}
        
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{self.FPL_API_BASE}/entry/{team_id}/transfers/",
                    timeout=10
                )
                if response.status_code != 200:
                    return {"error": f"Could not fetch transfer history for team {team_id}"}
                
                transfers = response.json()
                
                # Format transfers
                formatted_transfers = []
                for t in transfers[:limit]:
                    player_in = elements.get(t.get("element_in"), {})
                    player_out = elements.get(t.get("element_out"), {})
                    
                    formatted_transfers.append({
                        "gameweek": t.get("event"),
                        "player_in": player_in.get("web_name", "Unknown"),
                        "player_in_cost": t.get("element_in_cost", 0) / 10,
                        "player_out": player_out.get("web_name", "Unknown"),
                        "player_out_cost": t.get("element_out_cost", 0) / 10,
                        "time": t.get("time"),
                    })
                
                return {
                    "team_id": team_id,
                    "transfers": formatted_transfers,
                    "total_transfers": len(transfers),
                    "showing": min(limit, len(transfers)),
                }
                
        except Exception as e:
            logger.error(f"Error fetching transfer history: {e}")
            return {"error": f"Failed to fetch transfer history: {str(e)}"}
    
    async def _get_my_fpl_summary(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """Get the user's FPL dashboard summary."""
        team_id = params.get("team_id")
        
        if not team_id:
            return {"error": "No team ID provided"}
        
        bootstrap = await self._fetch_fpl_bootstrap()
        events = bootstrap.get("events", [])
        current_gw = next((e for e in events if e.get("is_current")), None)
        
        try:
            async with httpx.AsyncClient() as client:
                # Get team entry data
                entry_response = await client.get(
                    f"{self.FPL_API_BASE}/entry/{team_id}/",
                    timeout=10
                )
                if entry_response.status_code != 200:
                    return {"error": f"Could not fetch team {team_id}"}
                
                team_data = entry_response.json()
                
                # Get history for chip usage
                history_response = await client.get(
                    f"{self.FPL_API_BASE}/entry/{team_id}/history/",
                    timeout=10
                )
                chips_used = []
                season_history = []
                if history_response.status_code == 200:
                    history_data = history_response.json()
                    chips_used = [
                        {"name": c.get("name"), "gameweek": c.get("event")}
                        for c in history_data.get("chips", [])
                    ]
                    # Recent gameweek performance
                    season_history = history_data.get("current", [])[-5:]
                
                # Available chips
                used_chip_names = [c["name"] for c in chips_used]
                all_chips = ["wildcard", "freehit", "bboost", "3xc"]
                available_chips = [c for c in all_chips if c not in used_chip_names]
                
                return {
                    "team_id": team_id,
                    "team_name": team_data.get("name"),
                    "manager_name": f"{team_data.get('player_first_name', '')} {team_data.get('player_last_name', '')}",
                    "overall_rank": team_data.get("summary_overall_rank"),
                    "total_points": team_data.get("summary_overall_points"),
                    "gameweek_points": team_data.get("summary_event_points"),
                    "current_gameweek": current_gw.get("id") if current_gw else None,
                    "bank": team_data.get("last_deadline_bank", 0) / 10,
                    "team_value": team_data.get("last_deadline_value", 0) / 10,
                    "chips_used": chips_used,
                    "chips_available": available_chips,
                    "recent_gameweeks": [
                        {
                            "gw": h.get("event"),
                            "points": h.get("points"),
                            "rank": h.get("rank"),
                            "overall_rank": h.get("overall_rank"),
                        }
                        for h in season_history
                    ],
                    "leagues": {
                        "classic": team_data.get("leagues", {}).get("classic", [])[:3],
                    },
                }
                
        except Exception as e:
            logger.error(f"Error fetching FPL summary: {e}")
            return {"error": f"Failed to fetch FPL summary: {str(e)}"}
