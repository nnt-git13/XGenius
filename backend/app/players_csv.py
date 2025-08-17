# backend/app/players_csv.py
from __future__ import annotations

from flask import Blueprint, request, jsonify, current_app
import csv
import os
from typing import Any, Dict, List, Tuple

players_bp = Blueprint("players_bp", __name__)

# -------- Canonical position helpers --------
ELEMENT_TYPE_TO_POS = {
    "1": "GK", "2": "DEF", "3": "MID", "4": "FWD",
    1: "GK",   2: "DEF",   3: "MID",  4: "FWD",
}
POSITION_ALIASES = {
    "GK": "GK", "GKP": "GK", "GOALKEEPER": "GK", "G": "GK",
    "DEF": "DEF", "DF": "DEF", "DEFENDER": "DEF",
    "MID": "MID", "MF": "MID", "MIDFIELDER": "MID", "M": "MID",
    "FWD": "FWD", "FW": "FWD", "FORWARD": "FWD", "ST": "FWD", "STRIKER": "FWD",
}

def _canon_pos(v: Any) -> str:
    if v is None:
        return ""
    s = str(v).strip()
    if s in ELEMENT_TYPE_TO_POS:
        return ELEMENT_TYPE_TO_POS[s]
    up = s.upper()
    return POSITION_ALIASES.get(up, up)

# -------- CSV path / cache (auto-reload on file change) --------
_cache: Dict[str, Any] = {"key": None, "rows": []}

def _csv_path() -> str:
    """
    Pick CSV path in this order:
    1) app.config['PLAYERS_CSV_PATH']
    2) env var PLAYERS_CSV_PATH
    3) backend/app/players.csv (repo default)
    4) fallback: backend/app/data/players_mini.csv
    """
    cfg = current_app.config.get("PLAYERS_CSV_PATH")
    if cfg:
        return cfg
    envp = os.getenv("PLAYERS_CSV_PATH")
    if envp:
        return envp
    default_here = os.path.join(current_app.root_path, "players.csv")
    if os.path.exists(default_here):
        return default_here
    return os.path.join(os.path.dirname(__file__), "data", "players.csv")

def _key_for(path: str) -> Tuple[str, float]:
    try:
        return (os.path.abspath(path), os.path.getmtime(path))
    except FileNotFoundError:
        return (os.path.abspath(path), -1.0)

def _load_rows_from_csv(path: str) -> List[Dict[str, Any]]:
    rows: List[Dict[str, Any]] = []
    with open(path, newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for r in reader:
            # normalize keys to snake_case-ish
            k = {
                (kk or "").strip().lower().replace(" ", "_"): (vv.strip() if isinstance(vv, str) else vv)
                for kk, vv in r.items()
            }

            pid = k.get("id") or k.get("element") or k.get("player_id") or k.get("code")

            first = k.get("first_name") or ""
            second = k.get("second_name") or k.get("last_name") or ""
            name = (
                k.get("name")
                or k.get("full_name")
                or k.get("web_name")
                or f"{first} {second}".strip()
            )

            team = (
                k.get("team_name")
                or k.get("team_short_name")
                or k.get("team_short")
                or k.get("team")
                or k.get("short_name")
                or ""
            )

            el_type = (
                k.get("element_type")
                or k.get("position")
                or k.get("pos")
                or k.get("element_type_label")
            )
            position = _canon_pos(el_type)

            raw_price = (
                k.get("now_cost")
                or k.get("value_now")
                or k.get("price")
                or k.get("value")
                or k.get("cost")
            )
            try:
                if k.get("now_cost") is not None or k.get("value_now") is not None:
                    price_m = round(float(raw_price) / 10.0, 1)  # tenths → £m
                else:
                    price_m = round(float(raw_price), 1) if raw_price is not None else None
            except (TypeError, ValueError):
                price_m = None

            if not name:
                continue

            rows.append({
                "id": str(pid) if pid is not None else None,
                "name": name,
                "team": team,
                "position": position,
                "price_m": price_m,
            })
    return rows

def load_players() -> List[Dict[str, Any]]:
    path = _csv_path()
    key = _key_for(path)
    if _cache["key"] != key:
        # refresh cache
        _cache["rows"] = _load_rows_from_csv(path)
        _cache["key"] = key
    return _cache["rows"]

# -------- filtering / endpoints --------
def apply_filters(rows, q, position, team):
    out = rows
    if q:
        ql = q.lower()
        out = [r for r in out if ql in (r["name"] or "").lower() or ql in (r["team"] or "").lower()]
    if position and position != "ALL":
        target = _canon_pos(position)
        if target:
            out = [r for r in out if _canon_pos(r.get("position")) == target]
    if team:
        tl = team.lower()
        out = [r for r in out if tl in (r["team"] or "").lower()]
    return out

@players_bp.get("/ping")
def ping():
    return {"ok": True}

@players_bp.get("/admin/reload_players")
def reload_players():
    """Force a CSV reload without restarting the server."""
    _cache["key"] = None
    rows = load_players()
    return {
        "reloaded": True,
        "csv_path": _csv_path(),
        "count": len(rows),
    }

@players_bp.get("/debug/positions")
def debug_positions():
    rows = load_players()
    uniq = sorted({(r.get("position") or "").upper() for r in rows})
    return {"unique_positions": uniq, "count": len(rows), "csv_path": _csv_path()}

@players_bp.get("/debug/sample")
def debug_sample():
    rows = load_players()
    return {"sample": rows[:5], "count": len(rows), "csv_path": _csv_path()}

@players_bp.get("/players")
def list_players():
    """
    GET /api/players?q=&position=GK|DEF|MID|FWD|ALL&team=&limit=&offset=
    Response: { players: [{id,name,team,position,price}], total }
    """
    # query params
    q = (request.args.get("q") or "").strip()
    position = (request.args.get("position") or "").strip()
    team = (request.args.get("team") or "").strip()

    try:
        limit = max(1, min(200, int(request.args.get("limit", 20))))
    except ValueError:
        limit = 20
    try:
        offset = max(0, int(request.args.get("offset", 0)))
    except ValueError:
        offset = 0

    # load + filter
    rows = load_players()
    filtered = apply_filters(rows, q, position, team)
    total = len(filtered)
    page = filtered[offset : offset + limit]

    # normalize to frontend shape (price)
    players = [
        {
            "id": r["id"],
            "name": r["name"],
            "team": r["team"],
            "position": r["position"],
            "price": r["price_m"],
        }
        for r in page
    ]

    return jsonify({"players": players, "total": total})
