"""
Neural Network based player points predictor.
Uses multi-dimensional features for prediction.
"""
from __future__ import annotations
from typing import List, Dict, Any, Optional, Tuple
from sqlalchemy.orm import Session

# Make numpy/pandas optional for Vercel deployment (large dependencies ~50-80MB)
try:
    import numpy as np
    NUMPY_AVAILABLE = True
except ImportError:
    NUMPY_AVAILABLE = False
    np = None  # type: ignore

try:
    import pandas as pd
    PANDAS_AVAILABLE = True
except ImportError:
    PANDAS_AVAILABLE = False
    pd = None  # type: ignore

# Make sklearn optional for Vercel deployment (large dependency)
try:
    from sklearn.preprocessing import StandardScaler, MinMaxScaler
    from sklearn.neural_network import MLPRegressor
    from sklearn.ensemble import GradientBoostingRegressor
    import joblib
    SKLEARN_AVAILABLE = True
except ImportError:
    SKLEARN_AVAILABLE = False
    StandardScaler = None  # type: ignore
    MinMaxScaler = None  # type: ignore
    MLPRegressor = None  # type: ignore
    GradientBoostingRegressor = None  # type: ignore
    joblib = None  # type: ignore

from pathlib import Path

from app.services.ml.advanced_features import AdvancedFeatureBuilder, get_feature_columns
from app.core.config import settings
from app.core.logging import logger


class NeuralPointsPredictor:
    """
    Neural network-based predictor for player expected points.
    
    Uses a multi-layer perceptron with features from:
    - Season performance
    - Recent form trends
    - Fixture difficulty
    - Historical patterns
    - Injury/fitness indicators
    - Contextual factors (price, position, etc.)
    """
    
    def __init__(self, db: Session):
        self.db = db
        self.feature_builder = AdvancedFeatureBuilder(db)
        self.model_dir = Path(settings.MODEL_DIR) if hasattr(settings, 'MODEL_DIR') else Path("models_store")
        self.model: Optional[MLPRegressor] = None
        self.scaler: Optional[StandardScaler] = None
        self.numerical_features, self.categorical_features = get_feature_columns()
        
    def predict(
        self,
        player_ids: List[int],
        season: str,
        gameweek: int,
        horizon: int = 1,
    ) -> Dict[str, Any]:
        """
        Predict expected points for players.
        
        Args:
            player_ids: List of player IDs
            season: Season identifier
            gameweek: Target gameweek
            horizon: Number of gameweeks to predict for
            
        Returns:
            Dict with predictions for each player
        """
        if not player_ids:
            return {"predictions": []}
        
        # Check if pandas/numpy are available
        if not PANDAS_AVAILABLE or not NUMPY_AVAILABLE:
            logger.info("Pandas/numpy not available, using pure Python fallback predictions")
            return {"predictions": self._fallback_predictions(player_ids)}
        
        try:
            # Build features
            features_df = self.feature_builder.build_features(
                player_ids, season, gameweek, horizon
            )
            
            # Check if empty (DataFrame or list)
            is_empty = False
            if PANDAS_AVAILABLE and hasattr(features_df, 'empty'):
                is_empty = features_df.empty
            elif isinstance(features_df, list):
                is_empty = len(features_df) == 0
            else:
                is_empty = True
            
            if is_empty:
                logger.warning("No features built for any players")
                return {"predictions": self._fallback_predictions(player_ids)}
            
            # Get predictions
            predictions = self._predict_with_model(features_df, horizon)
            
            return {"predictions": predictions}
            
        except Exception as e:
            logger.error(f"Neural prediction failed: {e}", exc_info=True)
            return {"predictions": self._fallback_predictions(player_ids)}
    
    def _predict_with_model(
        self, features_df: Any, horizon: int
    ) -> List[Dict[str, Any]]:
        """Generate predictions using the model or heuristics."""
        predictions = []
        
        # Handle both DataFrame and list of dicts
        if PANDAS_AVAILABLE and hasattr(features_df, 'iterrows'):
            rows = features_df.iterrows()
        elif isinstance(features_df, list):
            rows = enumerate(features_df)
        else:
            return self._fallback_predictions([])
        
        for idx, row in rows:
            # Handle both Series and dict
            if PANDAS_AVAILABLE and hasattr(row, 'get'):
                player_id = int(row.get("player_id", 0))
                row_dict = row.to_dict() if hasattr(row, 'to_dict') else dict(row)
            elif isinstance(row, dict):
                player_id = int(row.get("player_id", 0))
                row_dict = row
            else:
                continue
            
            if player_id == 0:
                continue
            
            # Use heuristic-based prediction (can be replaced with trained model)
            predicted_points = self._heuristic_prediction(row_dict, horizon)
            
            # Calculate confidence and risk
            confidence, risk = self._calculate_confidence_risk(row_dict)
            
            # Calculate captaincy upside
            captaincy_upside = self._calculate_captaincy_upside(row_dict, predicted_points)
            
            predictions.append({
                "player_id": player_id,
                "predicted_points": round(predicted_points, 2),
                "confidence": round(confidence, 3),
                "risk_score": round(risk, 3),
                "captaincy_upside": round(captaincy_upside, 2),
                "features": {
                    "form": round(row_dict.get("form_weighted", 0), 2),
                    "fixture_difficulty": round(row_dict.get("fixture_difficulty_1", 3), 1),
                    "fitness": round(row_dict.get("chance_playing_this", 1) * 100, 0),
                }
            })
        
        return predictions
    
    def _heuristic_prediction(self, row: Dict[str, Any], horizon: int) -> float:
        """
        Sophisticated heuristic-based prediction using weighted features.
        Prioritizes current season performance, then form, fixtures, and other factors.
        """
        # =================================================================
        # 1. SEASON PERFORMANCE (Primary - 40% weight)
        # =================================================================
        # Points per game is the strongest indicator of expected performance
        points_per_game = row.get("points_per_game", 0)
        season_total = row.get("season_total_points", 0)
        games_played = row.get("games_played", 1)
        
        # FPL official form (if available, this is the most reliable indicator)
        fpl_form = row.get("fpl_form", 0)
        if fpl_form > 0:
            # FPL form is already points per game for last 5 games
            points_per_game = max(points_per_game, fpl_form)
        
        # Goals and assists contribution (attacking output)
        goals_per_game = row.get("goals_per_game", 0)
        assists_per_game = row.get("assists_per_game", 0)
        contributions = goals_per_game + assists_per_game
        
        # Clean sheet rate (important for GK/DEF)
        clean_sheet_rate = row.get("clean_sheet_rate", 0)
        position = int(row.get("position_num", 2))
        
        # Bonus points indicate consistent match ratings
        bonus_rate = row.get("bonus_rate", 0)
        
        # Calculate season performance score
        # High PPG players should have higher expected points
        if points_per_game > 0:
            season_score = points_per_game
        else:
            # Fallback for new players
            position_baselines = {0: 3.5, 1: 4.0, 2: 4.5, 3: 4.5}
            season_score = position_baselines.get(position, 4.0)
        
        # Boost for attacking contributions
        if position in [2, 3]:  # MID, FWD
            season_score += contributions * 1.5
        elif position == 1:  # DEF
            season_score += clean_sheet_rate * 2.0 + contributions * 1.0
        elif position == 0:  # GK
            season_score += clean_sheet_rate * 3.0
        
        # Bonus consistency boost
        season_score += bonus_rate * 0.5
        
        # =================================================================
        # 2. RECENT FORM (Secondary - 30% weight)
        # =================================================================
        form_weighted = row.get("form_weighted", 0)
        form_3 = row.get("form_3", 0)
        form_5 = row.get("form_5", 0)
        form_trend = row.get("form_trend", 0)
        
        # Use FPL form if available (most reliable)
        if fpl_form > 0:
            form_score = fpl_form
        elif form_3 > 0:
            # Prioritize most recent form
            form_score = form_weighted * 0.4 + form_3 * 0.35 + form_5 * 0.25
        else:
            form_score = season_score  # Fall back to season average
        
        # Form trend bonus/penalty (improving vs declining)
        # Pure Python clip function
        def clip(value, min_val, max_val):
            return max(min_val, min(value, max_val))
        form_trend_factor = 1.0 + clip(form_trend, -3, 3) * 0.04
        form_score *= form_trend_factor
        
        # =================================================================
        # 3. FIXTURE DIFFICULTY (15% weight)
        # =================================================================
        fixture_diff = row.get("fixture_difficulty_1", 3)
        fixture_avg = row.get("fixture_difficulty_avg", 3)
        is_home = row.get("is_home_1", 0.5)
        easy_fixtures = row.get("easy_fixtures_count", 0)
        
        # Fixture impact: easier fixtures = higher expected
        # Scale: difficulty 1 = +15%, difficulty 5 = -15%
        fixture_factor = 1.0 + (3 - fixture_diff) * 0.05
        
        # Home advantage: ~5-8% boost
        home_factor = 1.0 + (is_home - 0.5) * 0.12
        
        # Use historical home/away split
        home_ppg = row.get("home_ppg", 0)
        away_ppg = row.get("away_ppg", 0)
        if is_home > 0.5 and home_ppg > 0:
            historical_venue = home_ppg
        elif is_home < 0.5 and away_ppg > 0:
            historical_venue = away_ppg
        else:
            historical_venue = 0
        
        # =================================================================
        # 4. UNDERLYING QUALITY (xG/xA) (10% weight)
        # =================================================================
        recent_xg = row.get("recent_xg", 0)
        recent_xa = row.get("recent_xa", 0)
        xg_per_game = row.get("xg_per_game", 0)
        xa_per_game = row.get("xa_per_game", 0)
        xg_overperformance = row.get("xg_overperformance", 0)
        
        # xGI score - expected goal involvement
        recent_xgi = recent_xg + recent_xa
        
        # If underperforming xG, expect some regression upward
        # If overperforming xG, expect some regression downward
        if points_per_game > 0 and xg_per_game > 0:
            xg_regression = max(-1.0, min(1.0, -xg_overperformance * 0.1))
        else:
            xg_regression = 0
        
        # =================================================================
        # 5. HISTORICAL PATTERNS (5% weight)
        # =================================================================
        big_haul_rate = row.get("big_haul_rate", 0)
        blank_rate = row.get("blank_rate", 0.3)
        ceiling = row.get("ceiling", 0)
        consistency = row.get("consistency", 5)
        
        # Explosive potential
        explosive_factor = 1.0 + big_haul_rate * 0.2
        
        # Consistency penalty (high variance = slightly lower expected)
        consistency_penalty = 1.0 - min(consistency / 20, 0.1)
        
        # =================================================================
        # 6. FITNESS/AVAILABILITY (Multiplier)
        # =================================================================
        chance_playing = row.get("chance_playing_this", 1)
        injury_risk = row.get("injury_risk", 0)
        started_recently = row.get("started_recently", 1)
        recent_minutes_avg = row.get("recent_minutes_avg", 90)
        
        # Fitness multiplier (0 to 1)
        fitness_mult = chance_playing * (1 - injury_risk * 0.7)
        
        # Minutes factor (bench risk)
        if recent_minutes_avg < 30:
            minutes_mult = 0.3  # Likely bench player
        elif recent_minutes_avg < 60:
            minutes_mult = 0.7  # Rotation risk
        else:
            minutes_mult = 1.0
        
        # Starter factor
        starter_mult = 0.6 + started_recently * 0.4
        
        # Combined availability multiplier
        availability = fitness_mult * minutes_mult * starter_mult
        
        # =================================================================
        # COMBINE ALL FACTORS
        # =================================================================
        # Weighted combination prioritizing season performance and form
        base_prediction = (
            season_score * 0.40 +      # Season performance (primary)
            form_score * 0.30 +        # Recent form
            historical_venue * 0.10 +  # Venue-specific historical
            (recent_xgi * 3) * 0.10 +  # xG quality
            ceiling * 0.05 +           # Ceiling potential
            points_per_game * 0.05     # Additional PPG weight
        )
        
        # Apply modifiers
        base_prediction *= fixture_factor
        base_prediction *= home_factor
        base_prediction *= explosive_factor
        base_prediction *= consistency_penalty
        base_prediction += xg_regression
        
        # Apply availability multiplier
        base_prediction *= availability
        
        # Ensure minimum for players with season data
        if season_total > 20 and games_played >= 3:
            min_expected = max(points_per_game * 0.5, 1.5)
            base_prediction = max(base_prediction, min_expected)
        
        # Clamp to reasonable range (0.5 to 15 per GW)
        predicted = max(0.5, min(15.0, base_prediction))
        
        # =================================================================
        # HORIZON ADJUSTMENT
        # =================================================================
        if horizon > 1:
            # For longer horizons, regress toward season mean
            regression_weight = min(0.4, horizon * 0.1)
            predicted = predicted * (1 - regression_weight) + points_per_game * regression_weight
            predicted *= horizon
        
        return float(predicted)
    
    def _calculate_confidence_risk(self, row: Dict[str, Any]) -> Tuple[float, float]:
        """Calculate prediction confidence and risk score."""
        # Confidence based on data quality
        games_played = row.get("games_played", 0)
        consistency = row.get("consistency", 5)
        chance_playing = row.get("chance_playing_this", 1)
        
        # More games = more confidence
        games_factor = min(games_played / 10, 1.0)
        
        # Lower consistency (std dev) = more confidence
        consistency_factor = max(0, 1 - consistency / 10)
        
        # Higher availability = more confidence
        availability_factor = chance_playing
        
        confidence = (games_factor * 0.3 + consistency_factor * 0.4 + availability_factor * 0.3)
        confidence = max(0.1, min(0.95, confidence))
        
        # Risk score
        injury_risk = row.get("injury_risk", 0)
        blank_rate = row.get("blank_rate", 0.2)
        fixture_diff = row.get("fixture_difficulty_1", 3)
        
        risk = (
            injury_risk * 0.4 +
            blank_rate * 0.3 +
            (fixture_diff - 1) / 4 * 0.3
        )
        risk = max(0.0, min(1.0, risk))
        
        return float(confidence), float(risk)
    
    def _calculate_captaincy_upside(self, row: Dict[str, Any], predicted: float) -> float:
        """Calculate captaincy upside potential."""
        # Higher ceiling = higher captaincy upside
        ceiling = row.get("ceiling", 0)
        big_haul_rate = row.get("big_haul_rate", 0)
        
        # If player has high ceiling and hauls often, good captain pick
        upside = predicted + ceiling * 0.2 + big_haul_rate * 5
        
        # Penalty for high fixture difficulty
        fixture_diff = row.get("fixture_difficulty_1", 3)
        if fixture_diff >= 4:
            upside *= 0.8
        
        return float(upside)
    
    def _fallback_predictions(self, player_ids: List[int]) -> List[Dict[str, Any]]:
        """Fallback predictions when model fails."""
        return [
            {
                "player_id": pid,
                "predicted_points": 3.0,  # Conservative default
                "confidence": 0.3,
                "risk_score": 0.5,
                "captaincy_upside": 3.0,
                "features": {"form": 0, "fixture_difficulty": 3, "fitness": 100}
            }
            for pid in player_ids
        ]
    
    def train(
        self,
        training_data: pd.DataFrame,
        target_col: str = "actual_points"
    ) -> Dict[str, Any]:
        """
        Train the neural network model.
        
        Args:
            training_data: DataFrame with features and target
            target_col: Name of the target column
            
        Returns:
            Training metrics
        """
        if training_data.empty:
            raise ValueError("Training data is empty")
        
        # Prepare features
        feature_cols = [c for c in self.numerical_features if c in training_data.columns]
        X = training_data[feature_cols].fillna(0)
        y = training_data[target_col]
        
        # Scale features
        self.scaler = StandardScaler()
        X_scaled = self.scaler.fit_transform(X)
        
        # Train model
        self.model = MLPRegressor(
            hidden_layer_sizes=(128, 64, 32),
            activation='relu',
            solver='adam',
            alpha=0.001,
            batch_size=64,
            learning_rate='adaptive',
            learning_rate_init=0.001,
            max_iter=500,
            early_stopping=True,
            validation_fraction=0.15,
            n_iter_no_change=20,
            random_state=42,
        )
        
        self.model.fit(X_scaled, y)
        
        # Calculate metrics
        predictions = self.model.predict(X_scaled)
        if NUMPY_AVAILABLE:
            mse = np.mean((predictions - y) ** 2)
            mae = np.mean(np.abs(predictions - y))
            r2 = 1 - mse / np.var(y)
            rmse = float(np.sqrt(mse))
        else:
            # Pure Python fallback
            n = len(predictions)
            mse = sum((p - t) ** 2 for p, t in zip(predictions, y)) / n
            mae = sum(abs(p - t) for p, t in zip(predictions, y)) / n
            mean_y = sum(y) / n
            var_y = sum((t - mean_y) ** 2 for t in y) / n
            r2 = 1 - mse / var_y if var_y > 0 else 0.0
            rmse = mse ** 0.5
        
        # Save model
        self._save_model()
        
        return {
            "mse": float(mse),
            "rmse": float(rmse),
            "mae": float(mae),
            "r2": float(r2),
            "n_samples": len(y),
            "n_features": len(feature_cols),
        }
    
    def _save_model(self):
        """Save model and scaler to disk."""
        self.model_dir.mkdir(exist_ok=True, parents=True)
        
        joblib.dump({
            "model": self.model,
            "scaler": self.scaler,
            "features": self.numerical_features,
        }, self.model_dir / "neural_points.joblib")
        
        logger.info(f"Model saved to {self.model_dir / 'neural_points.joblib'}")
    
    def load_model(self) -> bool:
        """Load trained model from disk."""
        model_path = self.model_dir / "neural_points.joblib"
        
        if not model_path.exists():
            logger.warning(f"Model not found at {model_path}")
            return False
        
        try:
            data = joblib.load(model_path)
            self.model = data["model"]
            self.scaler = data["scaler"]
            self.numerical_features = data["features"]
            logger.info("Neural model loaded successfully")
            return True
        except Exception as e:
            logger.error(f"Failed to load model: {e}")
            return False

