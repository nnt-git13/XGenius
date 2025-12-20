from __future__ import annotations

from datetime import datetime

from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, Index
from sqlalchemy.dialects.sqlite import JSON as SQLiteJSON

from app.db import Base


class PLMatchTeamStats(Base):
    """
    Team-level match stats (includes tackles, shots, possession, etc).
    Source: /api/v3/matches/{matchId}/stats (or /api/v1/matches/{matchId}/stats)
    """

    __tablename__ = "pl_match_team_stats"

    id = Column(Integer, primary_key=True, index=True)
    match_id = Column(String(32), ForeignKey("pl_matches.match_id"), nullable=False, index=True)
    team_id = Column(String(16), ForeignKey("pl_teams.id"), nullable=False, index=True)
    side = Column(String(8), nullable=True)  # Home/Away

    stats = Column(SQLiteJSON, nullable=False)

    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    __table_args__ = (
        Index("uq_pl_match_team_stats", "match_id", "team_id", unique=True),
    )



