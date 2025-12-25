from __future__ import annotations
import os
from sqlalchemy.orm import Session
from app.db import db
from app.legacy.models import Player
from .scoring import compute_base_score, form_component, fixtures_component, odds_component, upsert_score_object

# Make pandas optional for Vercel deployment
try:
    import pandas as pd
    PANDAS_AVAILABLE = True
except ImportError:
    PANDAS_AVAILABLE = False
    pd = None  # type: ignore


def bootstrap_scores(season: str, csv_path: str):
    df = pd.read_csv(csv_path)
    for _, r in df.iterrows():
        p = Player.query.filter_by(name=r["name"], team=r["team"]).first()
        if not p:
            continue
        features = {
            "base_score": compute_base_score(r),
            "form": form_component(float(r.get("recent_points", r.get("points", 0)) / 3.0)),
            "fixtures": fixtures_component(float(r.get("avg_fdr_next_5", 3.0))),
            "odds": odds_component(float(r.get("goal_involvement_prob", 0.2))),
        }
        upsert_score_object(db.session, season, p, features)
    db.session.commit()
