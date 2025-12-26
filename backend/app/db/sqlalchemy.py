"""
FastAPI / SQLAlchemy (ORM) database setup: engine, SessionLocal, Base, and helpers.
"""

from __future__ import annotations

import logging
import os
from typing import Generator

from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.config import settings
from .paths import normalize_database_url
from .sqlite_migrate import ensure_sqlite_schema

logger = logging.getLogger(__name__)


DATABASE_URL = normalize_database_url(settings.DATABASE_URL)

# Create engine
if DATABASE_URL.startswith("sqlite"):
    # SQLite for development/testing
    engine = create_engine(
        DATABASE_URL,
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
        echo=settings.DATABASE_ECHO,
    )
else:
    # PostgreSQL for production
    engine = create_engine(
        DATABASE_URL,
        echo=settings.DATABASE_ECHO,
        pool_pre_ping=True,
        pool_size=10,
        max_overflow=20,
    )

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db() -> Generator[Session, None, None]:
    """Dependency for getting database session."""
    # On Vercel, database might not be available - handle gracefully
    if os.environ.get("VERCEL"):
        # Return a mock session or raise a clear error
        # For now, we'll try to create a session but handle errors gracefully
        try:
            db = SessionLocal()
            try:
                yield db
            finally:
                db.close()
        except Exception as e:
            logger.warning(f"Database connection failed on Vercel: {e}")
            # Return None or raise HTTPException depending on endpoint needs
            # For now, let it fail so endpoints can handle it
            raise
    else:
        db = SessionLocal()
        try:
            yield db
        finally:
            db.close()


def init_db() -> None:
    """Initialize database tables."""
    # Import all models to ensure they're registered
    from app.models import (  # noqa: F401
        Player,
        WeeklyScore,
        ScoreObject,
        HypeScore,
        MLPrediction,
        Squad,
        SquadOptimization,
        Team,
        Fixture,
        FPLApiSnapshot,
        PlayerSeasonStat,
        PLTeam,
        PLPlayer,
        PLMatch,
        PLMatchTeamStats,
        PLMatchEvent,
        PLMatchLineup,
        PLIngestState,
        CopilotConversation,
        CopilotMessage,
        CopilotAction,
        CopilotAuditLog,
        CopilotPreference,
        CopilotMetric,
    )

    Base.metadata.create_all(bind=engine)
    # Keep existing SQLite DB files compatible with new columns/tables.
    ensure_sqlite_schema(engine)
    logger.info("Database tables initialized")


def drop_db() -> None:
    """Drop all database tables."""
    Base.metadata.drop_all(bind=engine)
    logger.info("Database tables dropped")


