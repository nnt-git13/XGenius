"""
Generic storage for raw FPL API payloads.

We store raw responses so we can reprocess/derive features later without re-fetching.
"""

from __future__ import annotations

from datetime import datetime

from sqlalchemy import Column, Integer, String, DateTime, Index
from sqlalchemy.dialects.sqlite import JSON as SQLiteJSON

from app.db import Base


class FPLApiSnapshot(Base):
    __tablename__ = "fpl_api_snapshots"

    id = Column(Integer, primary_key=True, index=True)
    season = Column(String(16), nullable=False, index=True)

    # endpoint identifier, e.g. "bootstrap-static", "event-live", "entry-picks", "entry-history"
    endpoint = Column(String(64), nullable=False, index=True)

    entry_id = Column(Integer, nullable=True, index=True)
    gw = Column(Integer, nullable=True, index=True)

    payload = Column(SQLiteJSON, nullable=False)
    fetched_at = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)

    __table_args__ = (
        Index("idx_fpl_snapshot_lookup", "season", "endpoint", "entry_id", "gw", "fetched_at"),
    )


