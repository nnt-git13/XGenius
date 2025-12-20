"""
FastAPI / SQLAlchemy (ORM) database setup: engine, SessionLocal, Base, and helpers.
"""

from __future__ import annotations

import logging
from typing import Generator

from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.config import settings
from .paths import normalize_database_url

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
        CopilotConversation,
        CopilotMessage,
        CopilotAction,
        CopilotAuditLog,
        CopilotPreference,
        CopilotMetric,
    )

    Base.metadata.create_all(bind=engine)
    logger.info("Database tables initialized")


def drop_db() -> None:
    """Drop all database tables."""
    Base.metadata.drop_all(bind=engine)
    logger.info("Database tables dropped")


