"""
Tool Registry - Defines tools the copilot can use with typed schemas.
"""
from __future__ import annotations
from typing import Dict, Any, List, Optional, Callable
from dataclasses import dataclass
from enum import Enum
import json
from sqlalchemy.orm import Session
import logging

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
    
    def __init__(self, db: Session):
        self.db = db
        self.tools: Dict[str, ToolDefinition] = {}
        self._register_default_tools()
    
    def _register_default_tools(self):
        """Register default tools."""
        # Search entities
        self.register(
            ToolDefinition(
                name="search_players",
                description="Search for players by name, position, team, or attributes",
                parameters={
                    "type": "object",
                    "properties": {
                        "query": {"type": "string", "description": "Search query"},
                        "position": {"type": "string", "enum": ["GK", "DEF", "MID", "FWD"]},
                        "team": {"type": "string"},
                        "limit": {"type": "integer", "default": 10},
                    },
                    "required": ["query"],
                },
                risk_level=ToolRisk.LOW,
                requires_confirmation=False,
                handler=self._search_players,
                category="search",
            )
        )
        
        # Get player data
        self.register(
            ToolDefinition(
                name="get_player_data",
                description="Get detailed data for a specific player",
                parameters={
                    "type": "object",
                    "properties": {
                        "player_id": {"type": "integer", "description": "Player ID"},
                        "include_stats": {"type": "boolean", "default": True},
                    },
                    "required": ["player_id"],
                },
                risk_level=ToolRisk.LOW,
                requires_confirmation=False,
                handler=self._get_player_data,
                category="data",
            )
        )
        
        # Analyze team
        self.register(
            ToolDefinition(
                name="analyze_team",
                description="Analyze a team's composition, strengths, and weaknesses",
                parameters={
                    "type": "object",
                    "properties": {
                        "team_id": {"type": "integer"},
                        "season": {"type": "string"},
                        "gameweek": {"type": "integer"},
                    },
                    "required": ["team_id"],
                },
                risk_level=ToolRisk.LOW,
                requires_confirmation=False,
                handler=self._analyze_team,
                category="analysis",
            )
        )
        
        # Optimize squad
        self.register(
            ToolDefinition(
                name="optimize_squad",
                description="Optimize a squad with given constraints",
                parameters={
                    "type": "object",
                    "properties": {
                        "budget": {"type": "number"},
                        "exclude_players": {"type": "array", "items": {"type": "integer"}},
                        "lock_players": {"type": "array", "items": {"type": "integer"}},
                        "season": {"type": "string"},
                    },
                    "required": ["budget", "season"],
                },
                risk_level=ToolRisk.MEDIUM,
                requires_confirmation=True,
                handler=self._optimize_squad,
                category="optimization",
            )
        )
        
        # Get fixture difficulty
        self.register(
            ToolDefinition(
                name="get_fixture_difficulty",
                description="Get fixture difficulty for teams or players",
                parameters={
                    "type": "object",
                    "properties": {
                        "team_ids": {"type": "array", "items": {"type": "integer"}},
                        "gameweeks": {"type": "array", "items": {"type": "integer"}},
                    },
                },
                risk_level=ToolRisk.LOW,
                requires_confirmation=False,
                handler=self._get_fixture_difficulty,
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
    
    # Tool handlers
    async def _search_players(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """Search players."""
        from app.models.player import Player
        
        query = params.get("query", "")
        position = params.get("position")
        team = params.get("team")
        limit = params.get("limit", 10)
        
        query_obj = self.db.query(Player)
        
        if query:
            query_obj = query_obj.filter(Player.name.ilike(f"%{query}%"))
        if position:
            query_obj = query_obj.filter(Player.position == position)
        if team:
            query_obj = query_obj.filter(Player.team == team)
        
        players = query_obj.limit(limit).all()
        
        return {
            "players": [
                {
                    "id": p.id,
                    "name": p.name,
                    "position": p.position,
                    "team": p.team,
                    "price": float(p.price) if hasattr(p, 'price') else None,
                }
                for p in players
            ],
            "count": len(players),
        }
    
    async def _get_player_data(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """Get player data."""
        from app.models.player import Player
        
        player_id = params["player_id"]
        player = self.db.query(Player).filter(Player.id == player_id).first()
        
        if not player:
            return {"error": f"Player {player_id} not found"}
        
        return {
            "id": player.id,
            "name": player.name,
            "position": player.position,
            "team": player.team,
        }
    
    async def _analyze_team(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """Analyze team."""
        # Placeholder - would call team evaluation service
        return {
            "team_id": params.get("team_id"),
            "analysis": "Team analysis placeholder",
        }
    
    async def _optimize_squad(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """Optimize squad."""
        # Placeholder - would call optimization service
        return {
            "optimized_squad": [],
            "expected_points": 0.0,
        }
    
    async def _get_fixture_difficulty(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """Get fixture difficulty."""
        # Placeholder
        return {
            "fixtures": [],
        }

