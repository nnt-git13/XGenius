from __future__ import annotations
import os
import pandas as pd
from flask import Blueprint, request
from app.db import db
from app.legacy.models import Player, WeeklyScore

bp = Blueprint("ingest", __name__)


@bp.post("/weekly_scores")
def ingest_weekly_scores():
    """POST weekly scores for a given season (e.g., 2025-26).
    Body JSON: {season: "2025-26", csv_path: "path/to/gwXX.csv"}
    CSV columns include: name, team, gw, minutes, points, xg, xa, shots, key_passes, opp
    """
    data = request.get_json(force=True)
    season = data.get("season")
    csv_path = data.get("csv_path")
    if not season or not csv_path:
        return {"error": "season and csv_path required"}, 400
    if not os.path.exists(csv_path):
        return {"error": f"CSV not found: {csv_path}"}, 400

    df = pd.read_csv(csv_path)
    upserts = 0
    for _, r in df.iterrows():
        p = Player.query.filter_by(name=r["name"], team=r["team"]).first()
        if not p:
            continue
        ws = WeeklyScore.query.filter_by(player_id=p.id, season=season, gw=int(r["gw"])) .first()
        if not ws:
            ws = WeeklyScore(player_id=p.id, season=season, gw=int(r["gw"]))
        ws.minutes = int(r.get("minutes", 0))
        ws.points = float(r.get("points", 0.0))
        ws.xg = float(r.get("xg", 0.0))
        ws.xa = float(r.get("xa", 0.0))
        ws.shots = int(r.get("shots", 0))
        ws.key_passes = int(r.get("key_passes", 0))
        ws.opp = r.get("opp")
        db.session.add(ws)
        upserts += 1
    db.session.commit()
    return {"upserts": upserts}
