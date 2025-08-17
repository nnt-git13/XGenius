# backend/app/routes/players.py
from flask import Blueprint, request, jsonify, current_app
from app.services.players_csv import load_players_from_csv, POS_ALLOWED

players_bp = Blueprint("players_bp", __name__)

@players_bp.get("/players")
def list_players():
    """
    GET /api/players?q=&position=GK|DEF|MID|FWD|ALL&team=&limit=&offset=&season=
    Returns: { players: [{id,name,team,position,price}], total }
    """
    q = (request.args.get("q") or "").strip().lower()
    pos = (request.args.get("position") or "").upper().strip()
    team = (request.args.get("team") or "").strip().lower()
    season = (request.args.get("season") or "").strip() or "2025-26"

    try:
        limit = min(max(int(request.args.get("limit", 50)), 1), 200)
    except ValueError:
        limit = 50
    try:
        offset = max(int(request.args.get("offset", 0)), 0)
    except ValueError:
        offset = 0

    base_dir = current_app.config.get("PLAYERS_CSV_DIR")
    players = load_players_from_csv(season, base_dir)

    # filters
    if pos and pos != "ALL" and pos in POS_ALLOWED:
        players = [p for p in players if p["position"] == pos]
    if team:
        players = [p for p in players if team in p["team"].lower()]
    if q:
        players = [p for p in players if q in p["name"].lower() or q in p["team"].lower()]

    total = len(players)
    page = players[offset: offset + limit]

    return jsonify({"players": page, "total": total})
