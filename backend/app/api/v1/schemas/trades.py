"""Schemas for trade-related endpoints."""
from __future__ import annotations
from typing import Optional
from pydantic import BaseModel, Field


class TradeAdviceRequest(BaseModel):
    """Request schema for trade advice."""
    season: str
    out_player_id: int = Field(..., description="Player ID to sell")
    in_player_id: int = Field(..., description="Player ID to buy")
    current_squad: Optional[list[int]] = None
    budget: float = Field(100.0, ge=0.0)


class TradeAdviceResponse(BaseModel):
    """Response schema for trade advice."""
    recommended: bool
    expected_points_gain: float
    cost_impact: float
    reasoning: str
    risk_assessment: str
    alternative_suggestions: list[dict] = Field(default_factory=list)

