"""ML prediction service."""
from typing import List, Dict, Any
from sqlalchemy.orm import Session
from app.services.ml.feature_engineering import build_features
from app.services.ml.pipeline import load_model
from app.core.logging import logger


def predict_points(
    db: Session,
    player_ids: List[int],
    season: str,
    gameweek: int,
    horizon: int = 1,
    model_name: str = "ridge",
) -> Dict[str, Any]:
    """Predict points for players."""
    try:
        # Build features
        features_df = build_features(db, player_ids, season, gameweek)
        
        if features_df.empty:
            return {"predictions": []}
        
        # Load model
        model, rmse, mae = load_model(model_name=model_name)
        
        # Prepare features
        feature_cols = [
            "form",
            "avg_points_3",
            "avg_points_5",
            "avg_xg",
            "avg_xa",
            "avg_minutes",
            "price",
            "position",
            "team_hash",
        ]
        
        X = features_df[feature_cols]
        
        # Predict
        predictions = model.predict(X)
        
        # Build response
        results = []
        for idx, row in features_df.iterrows():
            player_id = int(row["player_id"])
            pred_points = float(predictions[idx])
            
            # Simple uncertainty estimate (could be improved with ensemble)
            uncertainty = abs(pred_points * 0.2)  # 20% uncertainty
            
            results.append({
                "player_id": player_id,
                "predicted_points": round(pred_points, 2),
                "confidence": max(0.0, min(1.0, 1.0 - (uncertainty / 10.0))),
                "risk_score": min(1.0, uncertainty / 5.0),
            })
        
        return {"predictions": results}
    
    except Exception as e:
        logger.error("Prediction failed", error=str(e), exc_info=True)
        raise
