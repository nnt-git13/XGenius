"""ML training pipeline."""
import os
from pathlib import Path
from typing import Dict, List, Tuple

# Make ML dependencies optional for Vercel deployment
try:
    import joblib
    import numpy as np
    import pandas as pd
    from sklearn.compose import ColumnTransformer
    from sklearn.preprocessing import StandardScaler, OneHotEncoder
    from sklearn.linear_model import Ridge
    from sklearn.ensemble import RandomForestRegressor, GradientBoostingRegressor
    from sklearn.pipeline import Pipeline
    from sklearn.model_selection import cross_val_score
    from sklearn.metrics import mean_squared_error, mean_absolute_error
    ML_AVAILABLE = True
except ImportError:
    ML_AVAILABLE = False
    joblib = None  # type: ignore
    np = None  # type: ignore
    pd = None  # type: ignore
    ColumnTransformer = None  # type: ignore
    StandardScaler = None  # type: ignore
    OneHotEncoder = None  # type: ignore
    Ridge = None  # type: ignore
    RandomForestRegressor = None  # type: ignore
    GradientBoostingRegressor = None  # type: ignore
    Pipeline = None  # type: ignore
    cross_val_score = None  # type: ignore
    mean_squared_error = None  # type: ignore
    mean_absolute_error = None  # type: ignore

from app.core.config import settings
from app.core.logging import logger


FEATURES_NUM = [
    "form",
    "avg_points_3",
    "avg_points_5",
    "avg_xg",
    "avg_xa",
    "avg_minutes",
    "price",
]
FEATURES_CAT = ["position", "team_hash"]
TARGET = "points"


def build_ridge_pipeline(alpha: float = 1.5) -> Pipeline:
    """Build Ridge regression pipeline."""
    preprocessor = ColumnTransformer(
        transformers=[
            ("num", StandardScaler(), FEATURES_NUM),
            ("cat", OneHotEncoder(handle_unknown="ignore", sparse_output=False), FEATURES_CAT),
        ]
    )
    model = Ridge(alpha=alpha, random_state=42)
    return Pipeline(steps=[("preprocessor", preprocessor), ("model", model)])


def build_rf_pipeline(n_estimators: int = 100) -> Pipeline:
    """Build Random Forest pipeline."""
    preprocessor = ColumnTransformer(
        transformers=[
            ("num", StandardScaler(), FEATURES_NUM),
            ("cat", OneHotEncoder(handle_unknown="ignore", sparse_output=False), FEATURES_CAT),
        ]
    )
    model = RandomForestRegressor(n_estimators=n_estimators, random_state=42, n_jobs=-1)
    return Pipeline(steps=[("preprocessor", preprocessor), ("model", model)])


def build_gb_pipeline(n_estimators: int = 100) -> Pipeline:
    """Build Gradient Boosting pipeline."""
    preprocessor = ColumnTransformer(
        transformers=[
            ("num", StandardScaler(), FEATURES_NUM),
            ("cat", OneHotEncoder(handle_unknown="ignore", sparse_output=False), FEATURES_CAT),
        ]
    )
    model = GradientBoostingRegressor(n_estimators=n_estimators, random_state=42)
    return Pipeline(steps=[("preprocessor", preprocessor), ("model", model)])


def train_models(
    X: pd.DataFrame,
    y: pd.Series,
    model_dir: Path = None,
) -> Dict[str, Dict]:
    """Train multiple models and save them."""
    if not ML_AVAILABLE:
        raise ImportError("ML dependencies (joblib, sklearn, numpy, pandas) are not available. ML training requires these packages.")
    
    if model_dir is None:
        model_dir = settings.MODEL_DIR
    
    model_dir.mkdir(parents=True, exist_ok=True)
    
    results = {}
    
    # Train Ridge
    logger.info("Training Ridge model...")
    ridge_pipe = build_ridge_pipeline()
    ridge_pipe.fit(X, y)
    ridge_pred = ridge_pipe.predict(X)
    ridge_rmse = np.sqrt(mean_squared_error(y, ridge_pred))
    ridge_mae = mean_absolute_error(y, ridge_pred)
    
    ridge_path = model_dir / "ridge_points.joblib"
    joblib.dump({"model": ridge_pipe, "rmse": ridge_rmse, "mae": ridge_mae}, ridge_path)
    results["ridge"] = {"rmse": ridge_rmse, "mae": ridge_mae, "path": str(ridge_path)}
    
    # Train Random Forest
    logger.info("Training Random Forest model...")
    rf_pipe = build_rf_pipeline()
    rf_pipe.fit(X, y)
    rf_pred = rf_pipe.predict(X)
    rf_rmse = np.sqrt(mean_squared_error(y, rf_pred))
    rf_mae = mean_absolute_error(y, rf_pred)
    
    rf_path = model_dir / "rf_points.joblib"
    joblib.dump({"model": rf_pipe, "rmse": rf_rmse, "mae": rf_mae}, rf_path)
    results["random_forest"] = {"rmse": rf_rmse, "mae": rf_mae, "path": str(rf_path)}
    
    # Train Gradient Boosting
    logger.info("Training Gradient Boosting model...")
    gb_pipe = build_gb_pipeline()
    gb_pipe.fit(X, y)
    gb_pred = gb_pipe.predict(X)
    gb_rmse = np.sqrt(mean_squared_error(y, gb_pred))
    gb_mae = mean_absolute_error(y, gb_pred)
    
    gb_path = model_dir / "gb_points.joblib"
    joblib.dump({"model": gb_pipe, "rmse": gb_rmse, "mae": gb_mae}, gb_path)
    results["gradient_boosting"] = {"rmse": gb_rmse, "mae": gb_mae, "path": str(gb_path)}
    
    logger.info("Model training complete", results=results)
    return results


def load_model(model_name: str = "ridge", model_dir: Path = None):
    """Load a trained model."""
    if model_dir is None:
        model_dir = settings.MODEL_DIR
    
    model_map = {
        "ridge": "ridge_points.joblib",
        "random_forest": "rf_points.joblib",
        "gradient_boosting": "gb_points.joblib",
    }
    
    model_path = model_dir / model_map.get(model_name, "ridge_points.joblib")
    
    if not model_path.exists():
        raise FileNotFoundError(f"Model not found: {model_path}")
    
    blob = joblib.load(model_path)
    return blob["model"], blob.get("rmse", None), blob.get("mae", None)
