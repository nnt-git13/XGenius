"""FastAPI dependencies."""
from fastapi import Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.db import get_db
from typing import Generator


def get_database() -> Generator[Session, None, None]:
    """Get database session dependency."""
    yield from get_db()

