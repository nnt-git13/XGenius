from __future__ import annotations
from flask import Blueprint, request
from ..services.optimizer import optimize_squad

bp = Blueprint("optimize", __name__)


@bp.post("/squad")
def build_squad():
    payload = request.get_json(force=True)
    season = payload.get("season", "2024-25")
    budget = float(payload.get("budget", 100.0))
    exclude = payload.get("exclude_players", [])
    locks = payload.get("lock_players", [])

    result = optimize_squad(season, budget, exclude, locks)
    return result
