"""Squad and optimization schemas."""
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime


class SquadBase(BaseModel):
    """Base squad schema."""
    season: str
    gameweek: Optional[int] = None
    budget: float = Field(default=100.0, ge=0, le=200.0)


class SquadCreate(SquadBase):
    """Schema for creating a squad."""
    serialized: List[Dict[str, Any]]
    starting_xi: Optional[List[Dict[str, Any]]] = None
    formation: Optional[str] = None


class SquadResponse(SquadBase):
    """Schema for squad response."""
    id: int
    total_cost: float
    total_score: float
    xg_score: float
    serialized: List[Dict[str, Any]]
    starting_xi: Optional[List[Dict[str, Any]]] = None
    formation: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


class OptimizeRequest(BaseModel):
    """Request schema for squad optimization."""
    season: str = Field(default="2024-25")
    budget: float = Field(default=100.0, ge=0, le=200.0)
    gameweek: Optional[int] = None
    horizon: int = Field(default=1, ge=1, le=5)  # Number of GWs to optimize for
    exclude_players: List[int] = Field(default_factory=list)
    lock_players: List[int] = Field(default_factory=list)
    
    # Chip options
    use_wildcard: bool = False
    use_free_hit: bool = False
    use_bench_boost: bool = False
    use_triple_captain: bool = False
    
    # Constraints
    max_players_per_team: int = Field(default=3, ge=1, le=3)
    risk_tolerance: float = Field(default=0.5, ge=0.0, le=1.0)  # 0 = conservative, 1 = aggressive


class PlayerInSquad(BaseModel):
    """Player in optimized squad."""
    id: int
    name: str
    team: str
    position: str
    price: float
    score: float
    predicted_points: Optional[float] = None
    risk_score: Optional[float] = None


class OptimizeResponse(BaseModel):
    """Response schema for squad optimization."""
    squad: List[PlayerInSquad]
    starting_xi: List[PlayerInSquad]
    bench: List[PlayerInSquad]
    formation: str
    total_cost: float
    total_score: float
    xg_score: float
    predicted_points: float
    risk_score: float
    budget_remaining: float

