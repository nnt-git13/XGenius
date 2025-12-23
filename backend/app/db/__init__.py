"""
Unified DB package.

- FastAPI uses the SQLAlchemy ORM setup in `app.db.sqlalchemy`
- Legacy Flask uses extensions in `app.db.flask` (imported conditionally)
"""

from __future__ import annotations

from .paths import normalize_database_url
from .sqlalchemy import Base, SessionLocal, engine, get_db, init_db, drop_db

# Flask deps are optional; keep imports guarded so FastAPI installs don't break.
try:
    from .flask import db, migrate  # type: ignore
except Exception:  # pragma: no cover
    db = None  # type: ignore
    migrate = None  # type: ignore

__all__ = [
    "Base",
    "SessionLocal",
    "engine",
    "get_db",
    "init_db",
    "drop_db",
    "normalize_database_url",
    "db",
    "migrate",
]


