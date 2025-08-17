# backend/app/services/advisor.py
from __future__ import annotations
from typing import Dict, Any, List, Optional, Tuple
import re
from sqlalchemy import desc, func
from app.db import db
from app.models import Player, ScoreObject

# ---------- helpers ----------

def _score_row(player_id: int, season: Optional[str]) -> Optional[ScoreObject]:
    q = db.session.query(ScoreObject).filter(ScoreObject.player_id == player_id)
    if season:
        q = q.filter(ScoreObject.season == season)
    return q.order_by(ScoreObject.updated_at.desc().nullslast()).first()

def _ev_for_player(player_id: int, season: Optional[str]) -> float:
    s = _score_row(player_id, season)
    if not s:
        # fallback: rough EV from price band if no score object yet
        p = db.session.query(Player).get(player_id)
        return float(getattr(p, "price", 0.0)) * 0.10 if p else 0.0
    for key in ("ev", "expected_value", "pred_ev", "total_score"):
        v = getattr(s, key, None)
        if v is not None:
            return float(v)
    # soft derive
    form = float(getattr(s, "form", 0.0) or 0.0)
    fix = float(getattr(s, "fixture", 0.0) or 0.0)
    xg = float(getattr(s, "xg", 0.0) or 0.0)
    xa = float(getattr(s, "xa", 0.0) or 0.0)
    mins = float(getattr(s, "mins", 0.0) or 0.0)
    return 0.6*form + 0.2*(xg+xa) + 0.15*fix + 0.05*mins

def _lt_for_player(player_id: int, season: Optional[str]) -> float:
    s = _score_row(player_id, season)
    if not s:
        return _ev_for_player(player_id, season)
    hype = float(getattr(s, "hype", 0.0) or 0.0)
    form = float(getattr(s, "form", 0.0) or 0.0)
    ev = float(getattr(s, "ev", 0.0) or 0.0)
    return 0.5*ev + 0.5*(form + 0.7*hype)

def _top_ev_players(n: int, season: Optional[str]) -> List[Player]:
    # Try ScoreObject order by ev desc for given season
    q = (
        db.session.query(Player)
        .join(ScoreObject, ScoreObject.player_id == Player.id)
    )
    if season:
        q = q.filter(ScoreObject.season == season)
    try:
        q = q.order_by(desc(ScoreObject.ev.nullslast()), desc(ScoreObject.total_score.nullslast()))
        return q.limit(n).all()
    except Exception:
        # fallback by price if no score table/columns
        return db.session.query(Player).order_by(desc(Player.price)).limit(n).all()

def _find_players_by_names(names: List[str]) -> List[Player]:
    found: List[Player] = []
    for name in names:
        like = f"%{name.strip()}%"
        p = (db.session.query(Player)
             .filter(func.lower(Player.name).ilike(func.lower(like)))
             .order_by(Player.price.desc())
             .first())
        if p:
            found.append(p)
    return found

# ---------- public API used by routes ----------

def trade_advice(out_player_id: int, in_player_id: int, season: Optional[str]) -> Dict[str, Any]:
    ev_out = _ev_for_player(out_player_id, season)
    ev_in  = _ev_for_player(in_player_id,  season)
    lt_out = _lt_for_player(out_player_id, season)
    lt_in  = _lt_for_player(in_player_id,  season)

    delta_ev = ev_in - ev_out
    delta_lt = lt_in - lt_out

    out_p = db.session.query(Player).get(out_player_id)
    in_p  = db.session.query(Player).get(in_player_id)

    reason = []
    if delta_ev > 0: reason.append("Immediate EV improves.")
    if delta_lt > 0: reason.append("Long-term outlook improves (form/hype).")
    if (in_p and out_p) and in_p.price > out_p.price:
        reason.append("Higher price band; ensure budget fits.")
    if not reason:
        reason.append("Trade looks marginal or negative based on current scores.")

    return {
        "delta_ev": round(float(delta_ev), 3),
        "delta_long_term": round(float(delta_lt), 3),
        "out": {"id": out_p.id if out_p else out_player_id, "name": getattr(out_p, "name", "Unknown")},
        "in":  {"id": in_p.id  if in_p  else in_player_id,  "name": getattr(in_p,  "name", "Unknown")},
        "reason": " ".join(reason)
    }

def best_captain(player_ids: List[int], season: Optional[str]) -> List[Dict[str, Any]]:
    # returns top 3 candidates with EV
    scored = []
    for pid in player_ids:
        p = db.session.query(Player).get(pid)
        if p:
            scored.append({"id": p.id, "name": p.name, "team": p.team, "ev": _ev_for_player(pid, season)})
    if not scored:
        # fallback: top EV players in pool
        for p in _top_ev_players(3, season):
            scored.append({"id": p.id, "name": p.name, "team": p.team, "ev": _ev_for_player(p.id, season)})
    scored.sort(key=lambda x: x["ev"], reverse=True)
    return scored[:3]

def compare_formations(squad: List[Dict[str, Any]], formations: List[str], season: Optional[str]) -> Dict[str, float]:
    pos_need_map = {
        "3-4-3": {"GK":1,"DEF":3,"MID":4,"FWD":3},
        "4-4-2": {"GK":1,"DEF":4,"MID":4,"FWD":2},
        "4-3-3": {"GK":1,"DEF":4,"MID":3,"FWD":3},
        "3-5-2": {"GK":1,"DEF":3,"MID":5,"FWD":2},
    }
    # Build per-pos EVs from user's squad; if empty, from global top EV per pos
    pos_to: Dict[str, List[float]] = {"GK":[], "DEF":[], "MID":[], "FWD":[]}

    ids = [s.get("id") or s.get("player_id") for s in squad if (s.get("id") or s.get("player_id"))]
    if ids:
        for pid in ids:
            p = db.session.query(Player).get(pid)
            if p and p.position in pos_to:
                pos_to[p.position].append(_ev_for_player(pid, season))
    else:
        # global fallback: 3 best per position
        for pos, k in {"GK":2, "DEF":5, "MID":5, "FWD":3}.items():
            # query top per position
            q = (db.session.query(Player)
                 .filter(Player.position == pos)
                 .join(ScoreObject, ScoreObject.player_id == Player.id))
            if season:
                q = q.filter(ScoreObject.season == season)
            try:
                q = q.order_by(desc(ScoreObject.ev.nullslast()))
                top = q.limit(k).all()
            except Exception:
                top = (db.session.query(Player)
                       .filter(Player.position == pos)
                       .order_by(desc(Player.price))
                       .limit(k).all())
            pos_to[pos] = [ _ev_for_player(p.id, season) for p in top ]

    out: Dict[str, float] = {}
    for f in formations:
        need = pos_need_map.get(f, {})
        total = 0.0
        for pos, k in need.items():
            vals = sorted(pos_to.get(pos, []), reverse=True)
            total += sum(vals[:k])
        out[f] = round(total, 3)
    return out

def answer_question(question: str, context: Dict[str, Any]) -> str:
    qraw = question or ""
    q = qraw.lower().strip()
    season = context.get("season")
    squad = context.get("squad") or []
    squad_ids = [p.get("id") for p in squad if p.get("id")]

    # 1) direct name vs name ("haaland or saka")
    m = re.findall(r"[a-zA-Z]+", qraw)
    # crude two-name detection
    if " or " in q and len(m) >= 2:
        # guess two entities around "or"
        parts = [t.strip() for t in qraw.split(" or ", 1)]
        names = []
        for part in parts:
            tokens = [t for t in re.findall(r"[A-Za-zÀ-ÖØ-öø-ÿ'-]+", part) if len(t) >= 2]
            if tokens:
                names.append(tokens[-1])  # last token often is the surname
        candidates = _find_players_by_names(names[:2])
        if len(candidates) == 2:
            a, b = candidates
            eva, evb = _ev_for_player(a.id, season), _ev_for_player(b.id, season)
            best = (a, eva) if eva >= evb else (b, evb)
            other = (b, evb) if eva >= evb else (a, eva)
            return (f"**{best[0].name}** ({best[0].team}) has higher EV **{best[1]:.2f}** vs "
                    f"**{other[0].name}** ({other[0].team}) **{other[1]:.2f}** for the upcoming GW.\n"
                    "If budget or fixtures shift, re-check before the deadline.")
    # 2) captain
    if "captain" in q:
        top = best_captain(squad_ids, season)
        if not top:
            return "I couldn't compute a captain yet. Make sure players are imported and scored."
        lines = [f"1) **{top[0]['name']}** ({top[0]['team']}) EV **{top[0]['ev']:.2f}**"]
        if len(top) > 1: lines.append(f"2) {top[1]['name']} ({top[1]['team']}) EV {top[1]['ev']:.2f}")
        if len(top) > 2: lines.append(f"3) {top[2]['name']} ({top[2]['team']}) EV {top[2]['ev']:.2f}")
        return "Captain ranking:\n" + "\n".join(lines)
    # 3) formation comparison
    if any(f in q for f in ["3-5-2","3-4-3","4-3-3","4-4-2"]):
        comps = compare_formations(squad, ["3-5-2","3-4-3","4-3-3","4-4-2"], season)
        if not comps:
            return "I couldn't compare formations with current data."
        best = max(comps.items(), key=lambda kv: kv[1])[0]
        lines = [f"- **{k}** → XI EV: {v:.2f}" for k,v in comps.items()]
        return f"**{best}** yields the highest XI EV right now.\n" + "\n".join(lines)

    # 4) generic guidance
    return (
        "I'm using current optimization and hype scores.\n"
        "Try: **'Should I captain Haaland or Saka this week?'**, **'Is 3-5-2 better than 3-4-3?'**, "
        "or **'Who to replace an injured GK with?'**"
    )
