from __future__ import annotations

from datetime import datetime

from sqlalchemy import Column, DateTime, Integer, String, Index

from app.db import Base


class PLIngestState(Base):
    """
    Tracks which seasons have been fully backfilled, and when we last updated.
    """

    __tablename__ = "pl_ingest_state"

    id = Column(Integer, primary_key=True, index=True)
    season = Column(Integer, nullable=False, unique=True, index=True)  # e.g. 2020
    backfilled = Column(Integer, default=0)  # 1 if historical season completed
    last_run_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    last_error = Column(String(255), nullable=True)

    __table_args__ = (Index("idx_pl_ingest_state_season", "season"),)



