from __future__ import annotations

from flask import Blueprint, request, jsonify, current_app
from typing import Dict, List, Any
import os

squad_bp = Blueprint("squad_bp", __name__)

# ---- optional loader imports (both paths supported) -------------------------
_LOADER = None
try:
    # your note said this path
    from app.ml.players_csv import load_players_from_csv as _LOADER  # type: ignore
except Exception:
    pass

if _LOADER is None:
    # fallback to the loader we previously used in app/players_csv.py
    try:
        from app.players_csv import load_players as _LOAD_SINGLE  # type: ignore
        def _LOADER(season: str, base_dir: str | None = None) -> List[dict]:
            # that loader reads a single CSV; just return it
            return _LOAD_SINGLE()  # type: ignore
    except Exception:
        _LOADER = None  # final fallback handled below


# ---- helpers ----------------------------------------------------------------

_ELEMENT_TYPE_TO_POS = {"1": "GK", "2": "DEF", "3": "MID", "4": "FWD", 1: "GK", 2: "DEF", 3: "MID", 4: "FWD"}
_ALIASES = {"GKP": "GK", "GOALKEEPER": "GK", "DF": "DEF", "MF": "MID", "FW": "FWD", "ST": "FWD", "STRIKER": "FWD"}

def _canon_pos(p: Any) -> str:
    if p is None:
        return ""
    s = str(p).strip().upper()
    if s in _ELEMENT_TYPE_TO_POS:
        return _ELEMENT_TYPE_TO_POS[s]
    return _ALIASES.get(s, s)

def _price_m(p: dict) -> float:
    """
    Coerce a player's price into £m with best-effort:
    - price or price_m already in £m
    - now_cost/value_now in tenths => divide by 10
    """
    val = p.get("price", None)
    if val is None:
        val = p.get("price_m", None)
    if val is None:
        now = p.get("now_cost", p.get("value_now", None))
        if now is not None:
            try:
                return round(float(now) / 10.0, 1)
            except (TypeError, ValueError):
                pass
    try:
        return round(float(val), 1) if val is not None else 0.0
    except (TypeError, ValueError):
        return 0.0

def _players_by_id(season: str) -> Dict[int, dict]:
    """
    Load all players and normalize keys so the rest of this file
    never depends on a particular CSV header scheme.
    """
    base_dir = current_app.config.get("PLAYERS_CSV_DIR")  # optional
    rows: List[dict] = []

    if _LOADER is not None:
        try:
            rows = _LOADER(season, base_dir)  # type: ignore[call-arg]
        except Exception:
            rows = []

    # last-resort: try a file called players.csv next to app/
    if not rows:
        try:
            here = os.path.dirname(os.path.dirname(__file__))  # backend/app
            fallback_csv = os.path.join(here, "players.csv")
            import csv
            with open(fallback_csv, newline="", encoding="utf-8") as f:
                rows = list(csv.DictReader(f))
        except Exception:
            rows = []

    out: Dict[int, dict] = {}
    for r in rows:
        # normalize keys
        rn = { (k or "").strip().lower().replace(" ", "_"): v for k, v in r.items() }

        pid = rn.get("id") or rn.get("player_id") or rn.get("element") or rn.get("code")
        try:
            pid_i = int(str(pid))
        except Exception:
            continue  # skip bad ids

        first = rn.get("first_name") or ""
        second = rn.get("second_name") or rn.get("last_name") or ""
        name = rn.get("name") or rn.get("full_name") or rn.get("web_name") or f"{first} {second}".strip()

        team = rn.get("team_name") or rn.get("team_short_name") or rn.get("team_short") or rn.get("team") or rn.get("short_name") or ""

        pos = _canon_pos(
            rn.get("position") or rn.get("pos") or rn.get("element_type") or rn.get("element_type_label")
        )
        if pos == "":
            pos = "MID"  # safe default

        price = _price_m(rn)

        # keep original row but ensure our normalized fields exist
        out[pid_i] = { **r, "id": pid_i, "name": name, "team": team, "position": pos, "price": price }

    return out

def _score_player(p: dict) -> float:
    """
    Very simple scoring fallback (feel free to swap for your model):
    prefer fields like score/ev/total_points; else use price as proxy.
    """
    for key in ("score", "ev", "total_points", "pts", "rating", "xpts"):
        v = p.get(key)
        try:
            if v is not None:
                return float(v)
        except (TypeError, ValueError):
            pass
    return _price_m(p)

def _similarity_pct(team: List[dict]) -> int:
    """
    Cheap similarity proxy: compare your XI against a 'template' built
    from the most expensive players per position.
    """
    if not team:
        return 0

    template = set()
    for pos in ("GK", "DEF", "MID", "FWD"):
        pool = [p for p in team if _canon_pos(p.get("position")) == pos]
        pool.sort(key=lambda x: -_price_m(x))
        take = 1 if pos == "GK" else (4 if pos == "DEF" else (4 if pos == "MID" else 2))
        template.update([p.get("name") for p in pool[:take] if p.get("name")])

    names = set(p.get("name") for p in team if p.get("name"))
    if not names:
        return 0
    return int(round(100 * len(names & template) / len(names)))


# ---- routes -----------------------------------------------------------------

# Explicit preflight handler (Flask-CORS will also help, but this avoids 404s)
@squad_bp.route("/squad/summary", methods=["OPTIONS"])
def squad_summary_options():
    return ("", 204)

@squad_bp.post("/squad/summary")
def squad_summary():
    """
    Body:
      { "season": "2025-26", "budget": 100, "xi_ids": [...], "bench_ids": [...] }
    Returns:
      { value, in_bank, points_by_position, mvp, similarity_pct, rank_history }
    """
    body = request.get_json(silent=True) or {}
    season = body.get("season") or "2025-26"
    budget = float(body.get("budget") or 100)

    # ids may include 0/None; filter and coerce safely
    def _ints(xs: list[Any] | None) -> List[int]:
        out: List[int] = []
        for x in xs or []:
            try:
                i = int(x)
                if i > 0:
                    out.append(i)
            except Exception:
                pass
        return out

    xi_ids   = _ints(body.get("xi_ids"))
    bench_ids= _ints(body.get("bench_ids"))

    pmap = _players_by_id(season)

    xi    = [pmap[i] for i in xi_ids   if i in pmap]
    bench = [pmap[i] for i in bench_ids if i in pmap]
    all_players = xi + bench

    # value + bank
    value = round(sum(_price_m(p) for p in all_players), 1)
    in_bank = round(budget - value, 1)

    # points by position (heuristic over XI only)
    pbp = {"GK": 0.0, "DEF": 0.0, "MID": 0.0, "FWD": 0.0}
    for p in xi:
        pos = _canon_pos(p.get("position"))
        if pos in pbp:
            pbp[pos] += _score_player(p)
    pbp = {k: round(v, 1) for k, v in pbp.items()}

    # MVP
    mvp = None
    if xi:
        m = max(xi, key=_score_player)
        mvp = {
            "id": m.get("id"),
            "name": m.get("name"),
            "team": m.get("team"),
            "position": _canon_pos(m.get("position")),
            "price": _price_m(m),
            "score": round(_score_player(m), 1),
        }

    # similarity against the simple template
    sim = _similarity_pct(xi)

    # toy rank history that improves with value (purely cosmetic)
    base = 400_000
    step = max(1, int((budget - max(0.0, in_bank)) * 500))  # more spent -> bigger jump
    rank_hist = [max(1, base - i * step) for i in range(12)]

    return jsonify(
        {
            "value": value,
            "in_bank": in_bank,
            "points_by_position": pbp,
            "mvp": mvp,
            "similarity_pct": sim,
            "rank_history": rank_hist,
        }
    )
