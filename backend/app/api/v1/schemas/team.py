"""Schemas for team-related endpoints."""
from __future__ import annotations
from typing import Optional, List
from pydantic import BaseModel, Field


class PlayerBase(BaseModel):
    """Base player schema."""
    id: int
    name: str
    position: str
    team: str
    price: float


class PlayerDetail(PlayerBase):
    """Detailed player schema."""
    fpl_code: Optional[int] = None
    team_fpl_code: Optional[int] = None  # FPL team code for shirt images
    team_short_name: Optional[str] = None
    status: str = "a"
    is_starting: Optional[bool] = None
    is_captain: Optional[bool] = None
    is_vice_captain: Optional[bool] = None
    multiplier: Optional[int] = None
    gw_points_raw: Optional[float] = None
    gw_points: Optional[float] = None
    total_points: float = 0.0
    goals_scored: int = 0
    assists: int = 0
    clean_sheets: int = 0


class TeamEvaluationRequest(BaseModel):
    """Request schema for team evaluation."""
    season: str = Field(..., description="Season identifier, e.g., '2024-25'")
    team_id: Optional[int] = Field(None, description="FPL team ID")
    squad_json: Optional[dict] = Field(None, description="Custom squad JSON payload")
    gameweek: Optional[int] = Field(None, description="Target gameweek for evaluation")


class SquadMember(BaseModel):
    """Squad member schema."""
    player_id: int
    position: str
    is_starting_xi: bool = True
    is_captain: bool = False
    is_vice_captain: bool = False


class TeamEvaluationResponse(BaseModel):
    """Response schema for team evaluation."""
    season: str
    gameweek: Optional[int]
    overall_points: Optional[float] = None
    gw_rank: Optional[int] = None
    transfers: Optional[int] = None
    active_chip: Optional[str] = None
    total_points: float
    expected_points: float
    risk_score: float = Field(..., ge=0.0, le=1.0, description="Risk score 0-1")
    fixture_difficulty: float = Field(..., ge=1.0, le=5.0, description="Fixture difficulty 1-5")
    squad_value: float
    bank: float
    players: List[PlayerDetail]
    captain_id: Optional[int] = None
    vice_captain_id: Optional[int] = None


class XGScoreRequest(BaseModel):
    """Request schema for XG Score calculation."""
    season: str
    squad: List[SquadMember]
    gameweek: Optional[int] = None


class XGScoreResponse(BaseModel):
    """Response schema for XG Score."""
    xg_score: float = Field(..., description="Computed XG Score")
    components: dict = Field(..., description="Score component breakdown")
    ml_prediction_score: float
    fixture_adjusted_score: float
    captaincy_bonus: float
    risk_adjusted_score: float
    monte_carlo_mean: float
    monte_carlo_std: float
    percentile_rank: float = Field(..., ge=0.0, le=100.0)

