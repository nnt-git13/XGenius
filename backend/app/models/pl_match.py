from __future__ import annotations

from datetime import datetime

from sqlalchemy import Column, DateTime, Integer, String, ForeignKey, Index

from app.db import Base


class PLMatch(Base):
    """
    PremierLeague.com (PulseLive) match record.
    """

    __tablename__ = "pl_matches"

    match_id = Column(String(32), primary_key=True)  # matchId from /api/v2/matches
    season = Column(Integer, nullable=False, index=True)  # season year (e.g. 2024 == 2024/25)
    matchweek = Column(Integer, nullable=True, index=True)

    kickoff = Column(DateTime, nullable=True, index=True)
    ground = Column(String(120), nullable=True)
    attendance = Column(Integer, nullable=True)

    period = Column(String(40), nullable=True)  # PreMatch, FullTime, etc
    phase = Column(Integer, nullable=True)

    home_team_id = Column(String(16), ForeignKey("pl_teams.id"), nullable=False, index=True)
    away_team_id = Column(String(16), ForeignKey("pl_teams.id"), nullable=False, index=True)

    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    __table_args__ = (
        Index("idx_pl_match_season_week", "season", "matchweek"),
    )



