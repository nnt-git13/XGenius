from __future__ import annotations
from flask import Blueprint, request
from ..models import Player, ScoreObject, HypeScore

bp = Blueprint("trades", __name__)


@bp.post("/advice")
def trade_advice():
    payload = request.get_json(force=True)
    out_id = int(payload["out_player_id"])  # player to sell
    in_id = int(payload["in_player_id"])   # player to buy
    season = payload.get("season", "2024-25")

    def agg(pid):
        so = ScoreObject.query.filter_by(player_id=pid, season=season).first()
        hs = HypeScore.query.filter_by(player_id=pid, season=season).first()
        return (so.starting_xi_metric if so else 0.0) + 0.25 * (hs.hype_score if hs else 0.0)

    delta = agg(in_id) - agg(out_id)
    return {"expected_delta_points": delta}
