"""
Compatibility shim.

The DB implementation lives in `app.db.sqlalchemy`. This module remains to avoid
breaking older imports that referenced `app.core.database`.
"""

from __future__ import annotations

from app.db.sqlalchemy import (  # noqa: F401
    Base,
    SessionLocal,
    engine,
    get_db,
    init_db,
    drop_db,
    DATABASE_URL,
)

