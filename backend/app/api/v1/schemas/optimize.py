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
    current_squad: Optional[List[int]] = Field(None, description="Current squad player IDs (FPL element IDs)")
    free_transfers: int = Field(1, ge=0, le=2, description="Number of free transfers available")
    target_gameweek: Optional[int] = Field(None, description="Target gameweek for optimization (defaults to next GW)")


class UpcomingFixture(BaseModel):
    """Upcoming fixture details for a player."""
    gameweek: int
    opponent: str
    opponent_short: str
    is_home: bool
    difficulty: int = Field(3, ge=1, le=5, description="Fixture difficulty 1-5")
    kickoff_time: Optional[str] = None


class OptimizedPlayer(BaseModel):
    """Optimized player in squad."""
    id: int
    name: str
    position: str
    team: str
    team_short: str = ""
    price: float
    score: float
    expected_points: float
    is_starting_xi: bool = True
    is_captain: bool = False
    is_vice_captain: bool = False
    upcoming_fixtures: List[UpcomingFixture] = Field(default_factory=list)


class SquadOption(BaseModel):
    """A single squad optimization option."""
    squad: List[OptimizedPlayer]
    starting_xi: List[OptimizedPlayer]
    bench: List[OptimizedPlayer]
    total_cost: float
    total_score: float  # Raw expected points (XI only, no multipliers)
    xg_score: float = Field(..., description="Normalized score out of 100")
    formation: str
    transfers_made: Optional[List[dict]] = None
    transfer_cost: int = Field(0, description="Points cost for transfers")
    transfers_count: int = Field(0, description="Number of transfers made")
    # Calculated totals
    xi_points: float = Field(0.0, description="Starting XI expected points")
    bench_points: float = Field(0.0, description="Bench expected points")
    captain_points: float = Field(0.0, description="Captain bonus points (captain's points doubled)")
    effective_points: float = Field(0.0, description="Net points after all adjustments")
    chip: Optional[str] = None


class OptimizeSquadResponse(BaseModel):
    """Response schema for squad optimization - returns multiple options."""
    options: List[SquadOption] = Field(..., description="Multiple squad options with different formations")
    optimization_metadata: dict = Field(default_factory=dict)
