"""Team evaluation schemas."""
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any


class TeamPlayer(BaseModel):
    """Player in a team."""
    id: int
    name: str
    position: str
    team: str
    price: float
    is_captain: bool = False
    is_vice_captain: bool = False
    is_bench: bool = False


class TeamEvaluateRequest(BaseModel):
    """Request to evaluate a team."""
    team_id: Optional[int] = None  # FPL team ID
    players: Optional[List[TeamPlayer]] = None  # Custom team JSON
    season: str = Field(default="2024-25")
    gameweek: Optional[int] = None


class TeamEvaluateResponse(BaseModel):
    """Team evaluation response."""
    total_points: float
    expected_points: float
    risk_score: float
    fixture_difficulty: float
    players: List[Dict[str, Any]]
    recommendations: List[str]


class XGScoreResponse(BaseModel):
    """XG Score response."""
    xg_score: float
    breakdown: Dict[str, float]
    confidence: float
    factors: List[str]

