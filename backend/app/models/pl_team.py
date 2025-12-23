from __future__ import annotations

from datetime import datetime

from sqlalchemy import Column, DateTime, String

from app.db import Base


class PLTeam(Base):
    """
    PremierLeague.com (PulseLive) team record.

    Note: this is distinct from the FPL `Team` model.
    """

    __tablename__ = "pl_teams"

    id = Column(String(16), primary_key=True)  # PulseLive teamId (string)
    name = Column(String(80), nullable=False, index=True)
    short_name = Column(String(80), nullable=True)
    abbr = Column(String(8), nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)



