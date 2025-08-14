from flask import Blueprint, request, jsonify
from sqlalchemy import or_, func
from app.models import Player, ScoreObject  # db import not needed here

players_bp = Blueprint("players_bp", __name__)

@players_bp.get("/players")
def list_players():
    """
    GET /players?q=<search>&position=<GK|DEF|MID|FWD|ALL>&team=<Team>&limit=&offset=&season=
    Returns: { players: [{id,name,team,position,price}], total }
    """
    q = (request.args.get("q") or "").strip()
    position = (request.args.get("position") or "").upper().strip()
    team = (request.args.get("team") or "").strip()

    try:
        limit = min(max(int(request.args.get("limit", 50)), 1), 200)
    except ValueError:
        limit = 50
    try:
        offset = max(int(request.args.get("offset", 0)), 0)
    except ValueError:
        offset = 0

    qry = Player.query

    if position and position != "ALL":
        qry = qry.filter(Player.position == position)

    if team:
        qry = qry.filter(Player.team.ilike(f"%{team}%"))

    if q:
        like = f"%{q}%"
        qry = qry.filter(or_(Player.name.ilike(like), Player.team.ilike(like)))

    season = request.args.get("season")
    if season:
        qry = qry.join(ScoreObject, ScoreObject.player_id == Player.id).filter(ScoreObject.season == season)

    total = qry.count()
    players = (
        qry.order_by(func.lower(Player.name))
           .offset(offset)
           .limit(limit)
           .all()
    )

    payload = [
        {
            "id": p.id,
            "name": p.name,
            "team": p.team,
            "position": p.position,
            "price": float(p.price or 0.0),
        }
        for p in players
    ]
    return jsonify({"players": payload, "total": total})
