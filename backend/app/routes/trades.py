# backend/app/routes/trades.py
from flask import Blueprint, request, jsonify
from app.services.advisor import trade_advice

trades_bp = Blueprint("trades_bp", __name__)

@trades_bp.post("/trades/advice")
def trades_advice():
    data = request.get_json(force=True, silent=True) or {}
    season = data.get("season")
    out_id = int(data.get("out_player_id") or data.get("out") or 0)
    in_id  = int(data.get("in_player_id")  or data.get("in")  or 0)
    if not out_id or not in_id:
        return jsonify({"error":"missing player ids"}), 400
    try:
        res = trade_advice(out_id, in_id, season)
        return jsonify(res)
    except Exception as e:
        return jsonify({"error":"trade_failed", "detail":str(e)}), 500

bp = trades_bp
__all__ = ["players_bp", "bp"]
