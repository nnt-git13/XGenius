"""Schemas for ML prediction endpoints."""
from __future__ import annotations
from typing import Optional, List
from pydantic import BaseModel, Field


class MLPredictRequest(BaseModel):
    """Request schema for ML predictions."""
    player_ids: List[int] = Field(..., description="Player IDs to predict for")
    season: str
    gameweek: int = Field(..., ge=1, le=38)
    model_name: Optional[str] = Field("xgboost", description="Model to use: ridge, xgboost, random_forest")


class MLPredictResponse(BaseModel):
    """Response schema for ML predictions."""
    predictions: List[dict] = Field(..., description="List of player predictions")
    model_name: str
    model_version: str
    prediction_timestamp: str


class MLTrainRequest(BaseModel):
    """Request schema for ML model training."""
    model_name: str = Field(..., description="Model to train")
    seasons: List[str] = Field(..., description="Seasons to train on")
    hyperparameters: Optional[dict] = None

