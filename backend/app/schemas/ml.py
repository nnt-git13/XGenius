"""ML prediction schemas."""
from pydantic import BaseModel, Field
from typing import List, Optional


class PredictRequest(BaseModel):
    """ML prediction request."""
    player_ids: List[int]
    season: str = Field(default="2024-25")
    gameweek: Optional[int] = None
    horizon: int = Field(default=1, ge=1, le=5)


class PredictResponse(BaseModel):
    """ML prediction response."""
    predictions: List[dict]  # List of {player_id, predicted_points, confidence, risk_score}

