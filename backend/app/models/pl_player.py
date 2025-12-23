from __future__ import annotations

from datetime import datetime

from sqlalchemy import Column, DateTime, ForeignKey, String
from sqlalchemy.dialects.sqlite import JSON as SQLiteJSON

from app.db import Base


class PLPlayer(Base):
    """
    PremierLeague.com (PulseLive) player record.
    """

    __tablename__ = "pl_players"

    id = Column(String(32), primary_key=True)  # PulseLive playerId (string)
    first_name = Column(String(80), nullable=True)
    last_name = Column(String(80), nullable=True)
    known_name = Column(String(80), nullable=True)

    team_id = Column(String(16), ForeignKey("pl_teams.id"), nullable=True, index=True)
    position = Column(String(40), nullable=True)
    nationality = Column(String(80), nullable=True)

    # Store full raw payload for forward compatibility
    raw = Column(SQLiteJSON, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)



