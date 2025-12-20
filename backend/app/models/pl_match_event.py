from __future__ import annotations

from datetime import datetime

from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, Index

from app.db import Base


class PLMatchEvent(Base):
    """
    Normalized match events (goals/cards/subs).
    Source: /api/v1/matches/{matchId}/events
    """

    __tablename__ = "pl_match_events"

    id = Column(Integer, primary_key=True, index=True)
    match_id = Column(String(32), ForeignKey("pl_matches.match_id"), nullable=False, index=True)
    team_id = Column(String(16), ForeignKey("pl_teams.id"), nullable=False, index=True)
    side = Column(String(8), nullable=True)  # home/away

    event_type = Column(String(20), nullable=False)  # goal/card/sub
    period = Column(String(20), nullable=True)
    minute = Column(Integer, nullable=True)
    timestamp = Column(String(32), nullable=True)

    # Goal-specific
    goal_type = Column(String(30), nullable=True)
    player_id = Column(String(32), ForeignKey("pl_players.id"), nullable=True, index=True)
    assist_player_id = Column(String(32), ForeignKey("pl_players.id"), nullable=True, index=True)

    # Card-specific
    card_type = Column(String(20), nullable=True)  # Yellow/Red/SecondYellow

    # Sub-specific
    player_on_id = Column(String(32), ForeignKey("pl_players.id"), nullable=True, index=True)
    player_off_id = Column(String(32), ForeignKey("pl_players.id"), nullable=True, index=True)

    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    __table_args__ = (
        Index("idx_pl_match_event_lookup", "match_id", "event_type", "team_id"),
    )



