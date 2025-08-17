# backend/app/routes/squad.py
from flask import Blueprint, request, jsonify, current_app
from typing import Dict, List
import os

# you placed the loader in app/ml/players_csv.py in this repo
from app.ml.players_csv import load_players_from_csv

squad_bp = Blueprint("squad_bp", __name__)

def _players_by_id(season: str) -> Dict[int, dict]:
    base_dir = current_app.config.get("PLAYERS_CSV_DIR")
    arr = load_players_from_csv(season, base_dir)
    return {int(p["id"]): p for p in arr}

def _score_player(p: dict) -> float:
    """
    Very simple scoring fallback:
    - If CSV has xG/xa/mins etc, you can weight them here.
    - Otherwise use price as a weak proxy so MVP isn't random.
    """
    # try common fields; ignore errors
    for key in ("score","ev","total_points","pts","rating"):
        v = p.get(key)
        if isinstance(v, (int, float)): return float(v)
    return float(p.get("price", 0))  # fallback

def _similarity_pct(team: List[dict]) -> int:
    """
    Cheap + transparent similarity:
    - Build a 'template' by top priced players per position (proxy for popularity).
    - % overlap of names with the template XI.
    """
    template = set()
    for pos in ("GK","DEF","MID","FWD"):
        pool = [p for p in team if p["position"] == pos]
        pool.sort(key=lambda x: -float(x.get("price",0)))
        take = 1 if pos=="GK" else (4 if pos=="DEF" else (4 if pos=="MID" else 2))
        template.update([p["name"] for p in pool[:take]])
    names = set(p["name"] for p in team if p.get("name"))
    if not names: return 0
    return int(round(100 * len(names & template) / len(names)))

@squad_bp.post("/squad/summary")
def squad_summary():
    """
    Body:
    {
      "season": "2025-26",
      "budget": 100,
      "xi_ids": [int,...],   // 11 length (use 0/None for empty)
      "bench_ids": [int,...] // up to 4 (optional)
    }
    Returns:
    {
      "value": 104.8,
      "in_bank": 1.4,
      "points_by_position": {"GK":0,"DEF":0,"MID":0,"FWD":0},
      "mvp": {id,name,team,position,price,score},
      "similarity_pct": 53,
      "rank_history": [ ...numbers for MiniRankChart... ]
    }
    """
    body = request.get_json(force=True) or {}
    season = body.get("season") or "2025-26"
    budget = float(body.get("budget") or 100)
    xi_ids = [int(x) for x in (body.get("xi_ids") or []) if x]
    bench_ids = [int(x) for x in (body.get("bench_ids") or []) if x]

    pmap = _players_by_id(season)

    # resolve players
    xi = [pmap[i] for i in xi_ids if i in pmap]
    bench = [pmap[i] for i in bench_ids if i in pmap]
    all_players = xi + bench

    # value + bank
    value = round(sum(float(p.get("price",0)) for p in all_players), 1)
    in_bank = round(budget - value, 1)

    # points by position (use score heuristic)
    pbp = {"GK":0.0,"DEF":0.0,"MID":0.0,"FWD":0.0}
    for p in xi:
        s = _score_player(p)
        pos = p.get("position","MID")
        if pos in pbp: pbp[pos] += s
    # round
    pbp = {k: round(v, 1) for k,v in pbp.items()}

    # MVP
    mvp = None
    if xi:
        mvp_base = max(xi, key=_score_player)
        mvp = {**mvp_base, "score": round(_score_player(mvp_base), 1)}

    # similarity
    sim = _similarity_pct(xi)

    # rudimentary "rank history": monotonically improve as team value rises
    base = int(400_000)
    step = int(max(1, (100 - in_bank) * 500))
    rank_hist = [base - i*step for i in range(12)]
    rank_hist = [max(1, r) for r in rank_hist]

    return jsonify({
        "value": value, "in_bank": in_bank,
        "points_by_position": pbp,
        "mvp": mvp,
        "similarity_pct": sim,
        "rank_history": rank_hist
    })
