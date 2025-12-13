"""Legacy advisor service (fallback for copilot)."""
from __future__ import annotations
from typing import Dict, Any, List, Optional
import re
from sqlalchemy import desc, func
from sqlalchemy.orm import Session
from app.models import Player, ScoreObject


def _score_row(db: Session, player_id: int, season: Optional[str]) -> Optional[ScoreObject]:
    q = db.query(ScoreObject).filter(ScoreObject.player_id == player_id)
    if season:
        q = q.filter(ScoreObject.season == season)
    return q.order_by(ScoreObject.computed_at.desc()).first()


def _ev_for_player(db: Session, player_id: int, season: Optional[str]) -> float:
    s = _score_row(db, player_id, season)
    if not s:
        p = db.query(Player).filter(Player.id == player_id).first()
        return float(getattr(p, "price", 0.0)) * 0.10 if p else 0.0
    return float(s.predicted_points or s.starting_xi_metric or 0.0)


def _find_players_by_names(db: Session, names: List[str]) -> List[Player]:
    found: List[Player] = []
    for name in names:
        like = f"%{name.strip()}%"
        p = (
            db.query(Player)
            .filter(func.lower(Player.name).ilike(func.lower(like)))
            .order_by(Player.price.desc())
            .first()
        )
        if p:
            found.append(p)
    return found


def answer_question(question: str, context: Dict[str, Any], db: Session) -> str:
    """Answer a question using legacy advisor logic."""
    qraw = question or ""
    q = qraw.lower().strip()
    season = context.get("season")
    
    # Simple pattern matching
    if "captain" in q:
        return "Based on current predictions, select the player with highest expected points for captaincy."
    
    if " or " in q:
        parts = [t.strip() for t in qraw.split(" or ", 1)]
        names = []
        for part in parts:
            tokens = [t for t in re.findall(r"[A-Za-zÀ-ÖØ-öø-ÿ'-]+", part) if len(t) >= 2]
            if tokens:
                names.append(tokens[-1])
        
        if len(names) >= 2 and db:
            candidates = _find_players_by_names(db, names[:2])
            if len(candidates) == 2:
                a, b = candidates
                eva, evb = _ev_for_player(db, a.id, season), _ev_for_player(db, b.id, season)
                best = (a, eva) if eva >= evb else (b, evb)
                other = (b, evb) if eva >= evb else (a, eva)
                return (
                    f"**{best[0].name}** ({best[0].team}) has higher EV **{best[1]:.2f}** vs "
                    f"**{other[0].name}** ({other[0].team}) **{other[1]:.2f}** for the upcoming GW."
                )
    
    return (
        "I'm using current optimization and predictions. "
        "Try asking about captaincy, transfers, or formations."
    )
