from __future__ import annotations

from datetime import datetime

from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, Index
from sqlalchemy.dialects.sqlite import JSON as SQLiteJSON

from app.db import Base


class PLMatchLineup(Base):
    """
    Team lineup + formation + bench list.
    Source: /api/v1/matches/{matchId}/lineups (and/or v3 lineups)
    """

    __tablename__ = "pl_match_lineups"

    id = Column(Integer, primary_key=True, index=True)
    match_id = Column(String(32), ForeignKey("pl_matches.match_id"), nullable=False, index=True)
    team_id = Column(String(16), ForeignKey("pl_teams.id"), nullable=False, index=True)

    formation = Column(String(32), nullable=True)

    # Raw structures for flexibility:
    subs = Column(SQLiteJSON, nullable=True)
    lineup = Column(SQLiteJSON, nullable=True)  # positional groups of playerIds
    players = Column(SQLiteJSON, nullable=True)  # list of players (id/name)

    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    __table_args__ = (
        Index("uq_pl_match_lineup", "match_id", "team_id", unique=True),
    )



