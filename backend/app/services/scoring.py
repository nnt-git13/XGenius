from __future__ import annotations
import math
import pandas as pd
from typing import Dict
from sqlalchemy.orm import Session
from app.models import Player, ScoreObject


# Heuristics combining form, upcoming fixtures difficulty, and odds
# In practice you may integrate FDRs and bookmaker odds via separate tables/APIs.


def compute_base_score(row: pd.Series) -> float:
    # Example: xPts from CSV (if present) + scaled xG/xa + minutes reliability
    xpts = row.get("expected_points", 0.0)
    xg = row.get("xg", 0.0)
    xa = row.get("xa", 0.0)
    mins = row.get("minutes", 0)
    reliability = min(mins / 2700.0, 1.0)  # cap at full season minutes
    return float(xpts + 0.6 * xg + 0.4 * xa) * (0.5 + 0.5 * reliability)


def form_component(recent_pts: float) -> float:
    # Smoothly saturating function 0..1
    return float(1 - math.exp(-recent_pts / 20.0))


def fixtures_component(avg_fdr: float) -> float:
    # Lower FDR (easier) -> higher component
    # Assume FDR is 1..5; transform to 0..1 benefit
    return float(max(0.0, min(1.0, (5 - avg_fdr) / 4)))


def odds_component(odds_goal_involvement: float) -> float:
    # Transform implied prob 0..1
    return float(max(0.0, min(1.0, odds_goal_involvement)))


def upsert_score_object(db_sess: Session, season: str, player: Player, features: Dict[str, float]) -> ScoreObject:
    so = ScoreObject.query.filter_by(player_id=player.id, season=season).first()
    if not so:
        so = ScoreObject(player_id=player.id, season=season)
    so.base_score = features.get("base_score", 0.0)
    so.form = features.get("form", 0.0)
    so.fixtures_difficulty = features.get("fixtures", 0.0)
    so.odds_boost = features.get("odds", 0.0)
    so.starting_xi_metric = so.base_score * (0.6 + 0.2 * so.form + 0.15 * so.odds_boost + 0.05 * (1 - so.fixtures_difficulty))
    db_sess.add(so)
    return so
