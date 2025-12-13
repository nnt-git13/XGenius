"""Optimization schemas."""
from pydantic import BaseModel, Field
from typing import List, Optional, Literal


class SquadPlayer(BaseModel):
    """Player in optimized squad."""
    id: int
    name: str
    team: str
    position: str
    price: float
    score: float
    predicted_points: Optional[float] = None


class OptimizeRequest(BaseModel):
    """Squad optimization request."""
    season: str = Field(default="2024-25")
    budget: float = Field(default=100.0, ge=0, le=200.0)
    exclude_players: List[int] = Field(default_factory=list)
    lock_players: List[int] = Field(default_factory=list)
    gameweek: Optional[int] = None
    horizon: int = Field(default=1, ge=1, le=5)  # number of GWs to optimize for
    chip: Optional[Literal["WILDCARD", "FREEHIT", "BENCH_BOOST", "TRIPLE_CAPTAIN"]] = None
    formation: Optional[str] = Field(default=None, pattern="^(3-4-3|3-5-2|4-4-2|4-3-3|4-5-1|5-3-2|5-4-1)$")


class OptimizeResponse(BaseModel):
    """Optimization response."""
    squad: List[SquadPlayer]
    starting_xi: List[SquadPlayer]
    captain: Optional[SquadPlayer] = None
    vice_captain: Optional[SquadPlayer] = None
    total_cost: float
    total_score: float
    xg_score: float
    expected_points: float
    risk_score: float

