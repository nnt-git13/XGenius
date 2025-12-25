"""ML prediction and training endpoints."""
from __future__ import annotations
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session

from app.db import get_db
from app.api.v1.schemas.ml import MLPredictRequest, MLPredictResponse, MLTrainRequest
from app.services.ml.predictor import MLPredictor
from app.services.ml.trainer import MLTrainer

router = APIRouter()


@router.post("/predict", response_model=MLPredictResponse)
async def predict_points(
    request: MLPredictRequest,
    db: Session = Depends(get_db),
):
    """Get ML predictions for player points."""
    try:
        predictor = MLPredictor(db)
        result = await predictor.predict(
            player_ids=request.player_ids,
            season=request.season,
            gameweek=request.gameweek,
            model_name=request.model_name,
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/train")
async def train_model(
    request: MLTrainRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    """Train an ML model (runs in background)."""
    try:
        trainer = MLTrainer(db)
        # Run training in background
        background_tasks.add_task(
            trainer.train,
            model_name=request.model_name,
            seasons=request.seasons,
            hyperparameters=request.hyperparameters,
        )
        return {"status": "training_started", "model": request.model_name}
    except ImportError as e:
        raise HTTPException(
            status_code=503,
            detail=f"ML training requires optional dependencies (sklearn, numpy, pandas). {str(e)}"
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

