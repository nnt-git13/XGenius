"""
ML model training service.
Supports Ridge Regression, Gradient Boosting, and Random Forest.
"""
from __future__ import annotations
import os
import joblib
import numpy as np
import pandas as pd
from pathlib import Path
from typing import Dict, Any, List
from sklearn.compose import ColumnTransformer
from sklearn.preprocessing import OneHotEncoder, StandardScaler
from sklearn.linear_model import Ridge
from sklearn.ensemble import GradientBoostingRegressor, RandomForestRegressor
from sklearn.pipeline import Pipeline
from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.metrics import mean_squared_error, mean_absolute_error, r2_score
from sqlalchemy.orm import Session

from app.core.config import settings


class MLTrainer:
    """Trains ML models for FPL point prediction."""
    
    NUMERICAL_FEATURES = ["minutes", "expected_goals", "expected_assists", "shots", "key_passes"]
    CATEGORICAL_FEATURES = ["position", "team_id"]
    TARGET = "points"
    
    def __init__(self, db: Session):
        self.db = db
        self.model_dir = Path(settings.MODEL_DIR)
        self.model_dir.mkdir(exist_ok=True, parents=True)
    
    async def train(
        self,
        model_name: str,
        seasons: List[str],
        hyperparameters: Dict[str, Any] = None,
    ) -> Dict[str, Any]:
        """Train a model on historical data."""
        hyperparameters = hyperparameters or {}
        
        # Load training data
        df = self._load_training_data(seasons)
        
        if df.empty:
            raise ValueError("No training data found")
        
        # Prepare features and target
        X = df[self.NUMERICAL_FEATURES + self.CATEGORICAL_FEATURES]
        y = df[self.TARGET]
        
        # Remove rows with missing target
        mask = ~y.isna()
        X = X[mask]
        y = y[mask]
        
        # Build preprocessing pipeline
        preprocessor = ColumnTransformer(
            transformers=[
                ("num", StandardScaler(), self.NUMERICAL_FEATURES),
                ("cat", OneHotEncoder(handle_unknown="ignore", sparse_output=False), self.CATEGORICAL_FEATURES),
            ]
        )
        
        # Select model
        if model_name == "ridge":
            model = Ridge(alpha=hyperparameters.get("alpha", 1.5), random_state=42)
        elif model_name == "xgboost":
            model = GradientBoostingRegressor(
                n_estimators=hyperparameters.get("n_estimators", 100),
                max_depth=hyperparameters.get("max_depth", 5),
                learning_rate=hyperparameters.get("learning_rate", 0.1),
                random_state=42,
            )
        elif model_name == "random_forest":
            model = RandomForestRegressor(
                n_estimators=hyperparameters.get("n_estimators", 100),
                max_depth=hyperparameters.get("max_depth", 10),
                random_state=42,
            )
        else:
            raise ValueError(f"Unknown model: {model_name}")
        
        # Build full pipeline
        pipeline = Pipeline([
            ("preprocessor", preprocessor),
            ("model", model),
        ])
        
        # Train
        pipeline.fit(X, y)
        
        # Evaluate
        y_pred = pipeline.predict(X)
        rmse = float(np.sqrt(mean_squared_error(y, y_pred)))
        mae = float(mean_absolute_error(y, y_pred))
        r2 = float(r2_score(y, y_pred))
        
        # Cross-validation
        cv_scores = cross_val_score(pipeline, X, y, cv=5, scoring="neg_mean_squared_error")
        cv_rmse = float(np.sqrt(-cv_scores.mean()))
        
        # Save model
        model_path = self.model_dir / f"{model_name}_points.joblib"
        joblib.dump({
            "model": pipeline,
            "rmse": rmse,
            "mae": mae,
            "r2": r2,
            "cv_rmse": cv_rmse,
            "features": self.NUMERICAL_FEATURES + self.CATEGORICAL_FEATURES,
            "target": self.TARGET,
            "model_name": model_name,
        }, model_path)
        
        return {
            "model_name": model_name,
            "model_path": str(model_path),
            "rmse": rmse,
            "mae": mae,
            "r2": r2,
            "cv_rmse": cv_rmse,
            "n_samples": len(X),
        }
    
    def _load_training_data(self, seasons: List[str]) -> pd.DataFrame:
        """Load training data from database."""
        from app.models import WeeklyScore, Player
        
        query = (
            self.db.query(WeeklyScore)
            .join(Player, WeeklyScore.player_id == Player.id)
            .filter(WeeklyScore.season.in_(seasons))
            .filter(WeeklyScore.minutes > 0)  # Only players who played
        )
        
        data = []
        for ws in query.all():
            data.append({
                "player_id": ws.player_id,
                "season": ws.season,
                "gw": ws.gw,
                "minutes": ws.minutes,
                "expected_goals": ws.expected_goals or 0.0,
                "expected_assists": ws.expected_assists or 0.0,
                "shots": ws.shots or 0,
                "key_passes": ws.key_passes or 0,
                "position": ws.player.position,
                "team_id": ws.player.team_id or 0,
                "points": ws.points,
            })
        
        return pd.DataFrame(data)

