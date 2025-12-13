"""Schemas for squad optimization endpoints."""
from __future__ import annotations
from typing import Optional, List
from pydantic import BaseModel, Field


class OptimizeSquadRequest(BaseModel):
    """Request schema for squad optimization."""
    season: str = Field(..., description="Season identifier")
    budget: float = Field(100.0, ge=0.0, le=200.0, description="Budget in millions")
    exclude_players: List[int] = Field(default_factory=list, description="Player IDs to exclude")
    lock_players: List[int] = Field(default_factory=list, description="Player IDs to lock in")
    chip: Optional[str] = Field(None, description="Chip: wildcard, free_hit, bench_boost, triple_captain")
    horizon_gw: int = Field(1, ge=1, le=5, description="Optimization horizon in gameweeks")
    current_squad: Optional[List[int]] = Field(None, description="Current squad player IDs for comparison")


class OptimizedPlayer(BaseModel):
    """Optimized player in squad."""
    id: int
    name: str
    position: str
    team: str
    price: float
    score: float
    expected_points: float
    is_starting_xi: bool = True
    is_captain: bool = False
    is_vice_captain: bool = False


class OptimizeSquadResponse(BaseModel):
    """Response schema for squad optimization."""
    squad: List[OptimizedPlayer]
    starting_xi: List[OptimizedPlayer]
    bench: List[OptimizedPlayer]
    total_cost: float
    total_score: float
    xg_score: float
    formation: str
    transfers_made: Optional[List[dict]] = None
    optimization_metadata: dict = Field(default_factory=dict)

