"""Trade advice schemas."""
from pydantic import BaseModel, Field
from typing import Optional


class TradeAdviceRequest(BaseModel):
    """Trade advice request."""
    season: str = Field(default="2024-25")
    out_player_id: int
    in_player_id: int
    gameweek: Optional[int] = None


class TradeAdviceResponse(BaseModel):
    """Trade advice response."""
    delta_ev: float
    delta_long_term: float
    out: dict
    in_player: dict = Field(alias="in")
    reason: str
    recommendation: str  # "STRONG_BUY", "BUY", "HOLD", "SELL", "STRONG_SELL"
    
    class Config:
        allow_population_by_field_name = True

