"""Feature engineering for ML models."""
import pandas as pd
import numpy as np
from typing import List, Dict, Any
from sqlalchemy.orm import Session
from app.models import Player, WeeklyScore, ScoreObject


def build_features(
    db: Session,
    player_ids: List[int],
    season: str,
    gameweek: int,
) -> pd.DataFrame:
    """Build feature matrix for ML models."""
    features = []
    
    for player_id in player_ids:
        player = db.query(Player).filter(Player.id == player_id).first()
        if not player:
            continue
        
        # Get historical scores
        historical = (
            db.query(WeeklyScore)
            .filter(
                WeeklyScore.player_id == player_id,
                WeeklyScore.season == season,
                WeeklyScore.gw < gameweek,
            )
            .order_by(WeeklyScore.gw.desc())
            .limit(10)
            .all()
        )
        
        # Recent form (last 5 GWs)
        recent_points = [ws.points for ws in historical[:5]]
        form = np.mean(recent_points) if recent_points else 0.0
        
        # Rolling averages
        avg_points_3 = np.mean([ws.points for ws in historical[:3]]) if len(historical) >= 3 else 0.0
        avg_points_5 = np.mean([ws.points for ws in historical[:5]]) if len(historical) >= 5 else 0.0
        
        # xG/xA trends
        recent_xg = [ws.xg for ws in historical[:5]]
        recent_xa = [ws.xa for ws in historical[:5]]
        avg_xg = np.mean(recent_xg) if recent_xg else 0.0
        avg_xa = np.mean(recent_xa) if recent_xa else 0.0
        
        # Minutes played
        recent_minutes = [ws.minutes for ws in historical[:5]]
        avg_minutes = np.mean(recent_minutes) if recent_minutes else 0.0
        
        # Price
        price = player.price
        
        # Position encoding
        position_map = {"GK": 0, "DEF": 1, "MID": 2, "FWD": 3}
        position_encoded = position_map.get(player.position, 0)
        
        # Team (one-hot would be better, but for now use team index)
        team_hash = hash(player.team) % 100
        
        feature_dict = {
            "player_id": player_id,
            "form": form,
            "avg_points_3": avg_points_3,
            "avg_points_5": avg_points_5,
            "avg_xg": avg_xg,
            "avg_xa": avg_xa,
            "avg_minutes": avg_minutes,
            "price": price,
            "position": position_encoded,
            "team_hash": team_hash,
        }
        
        features.append(feature_dict)
    
    return pd.DataFrame(features)


def build_targets(
    db: Session,
    player_ids: List[int],
    season: str,
    gameweek: int,
) -> pd.Series:
    """Build target values (actual points) for training."""
    targets = []
    
    for player_id in player_ids:
        ws = (
            db.query(WeeklyScore)
            .filter(
                WeeklyScore.player_id == player_id,
                WeeklyScore.season == season,
                WeeklyScore.gw == gameweek,
            )
            .first()
        )
        targets.append(ws.points if ws else 0.0)
    
    return pd.Series(targets)

