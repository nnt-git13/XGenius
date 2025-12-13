"""
ML prediction service for player points.
"""
from __future__ import annotations
import joblib
from pathlib import Path
from typing import List, Dict, Any
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models import Player, WeeklyScore


class MLPredictor:
    """Predicts player points using trained ML models."""
    
    def __init__(self, db: Session):
        self.db = db
        self.model_dir = Path(settings.MODEL_DIR)
    
    async def predict(
        self,
        player_ids: List[int],
        season: str,
        gameweek: int,
        model_name: str = "xgboost",
    ) -> Dict[str, Any]:
        """Predict points for players."""
        # Load model
        model_path = self.model_dir / f"{model_name}_points.joblib"
        if not model_path.exists():
            raise FileNotFoundError(f"Model not found: {model_path}")
        
        model_data = joblib.load(model_path)
        pipeline = model_data["model"]
        features = model_data["features"]
        
        # Fetch player data for prediction
        predictions = []
        for player_id in player_ids:
            player = self.db.query(Player).filter(Player.id == player_id).first()
            if not player:
                continue
            
            # Get recent stats (last 5 gameweeks)
            recent_scores = (
                self.db.query(WeeklyScore)
                .filter(WeeklyScore.player_id == player_id)
                .filter(WeeklyScore.season == season)
                .filter(WeeklyScore.gw < gameweek)
                .order_by(WeeklyScore.gw.desc())
                .limit(5)
                .all()
            )
            
            # Aggregate recent stats
            avg_minutes = sum(ws.minutes for ws in recent_scores) / max(len(recent_scores), 1)
            avg_xg = sum(ws.expected_goals or 0.0 for ws in recent_scores) / max(len(recent_scores), 1)
            avg_xa = sum(ws.expected_assists or 0.0 for ws in recent_scores) / max(len(recent_scores), 1)
            avg_shots = sum(ws.shots or 0 for ws in recent_scores) / max(len(recent_scores), 1)
            avg_key_passes = sum(ws.key_passes or 0 for ws in recent_scores) / max(len(recent_scores), 1)
            
            # Prepare feature vector
            import pandas as pd
            
            feature_dict = {
                "minutes": avg_minutes,
                "expected_goals": avg_xg,
                "expected_assists": avg_xa,
                "shots": avg_shots,
                "key_passes": avg_key_passes,
                "position": player.position,
                "team_id": player.team_id or 0,
            }
            
            # Convert to DataFrame
            X = pd.DataFrame([feature_dict])
            
            # Predict
            predicted_points = float(pipeline.predict(X)[0])
            
            predictions.append({
                "player_id": player_id,
                "player_name": player.name,
                "predicted_points": max(0.0, predicted_points),  # Points can't be negative
                "model_name": model_name,
                "gameweek": gameweek,
            })
        
        import pandas as pd
        from datetime import datetime
        
        return {
            "predictions": predictions,
            "model_name": model_name,
            "model_version": "1.0",
            "prediction_timestamp": datetime.now().isoformat(),
        }

