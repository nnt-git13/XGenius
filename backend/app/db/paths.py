"""
Database path + URL normalization utilities.

Goal: make SQLite file paths stable regardless of current working directory.
"""

from __future__ import annotations

from pathlib import Path


def backend_dir() -> Path:
    """
    Return the backend directory (the parent of the `app/` package).

    File layout:
      backend/app/db/paths.py  -> parents[2] == backend/
    """
    return Path(__file__).resolve().parents[2]


def default_sqlite_db_path() -> Path:
    """Canonical SQLite DB file location for local/dev."""
    return backend_dir() / "app" / "instance" / "xgenius.db"


def ensure_instance_dir_exists() -> None:
    default_sqlite_db_path().parent.mkdir(parents=True, exist_ok=True)


def normalize_database_url(database_url: str) -> str:
    """
    Normalize DB URL with special handling for sqlite URLs:
    - sqlite:///:memory: is left untouched
    - sqlite URLs with relative file paths are converted to absolute paths rooted at backend/
    """
    if not database_url.startswith("sqlite"):
        return database_url

    if database_url in ("sqlite:///:memory:", "sqlite://"):
        return database_url

    # Common forms:
    #   sqlite:///./app/instance/xgenius.db   (relative)
    #   sqlite:///xgenius.db                  (relative)
    #   sqlite:////abs/path/xgenius.db        (absolute)
    prefix = "sqlite:///"
    if not database_url.startswith(prefix):
        return database_url

    path_part = database_url[len(prefix) :]
    if path_part.startswith("/"):
        # Already absolute (sqlite:////abs/path... because abs path begins with '/')
        return database_url

    # Relative: anchor to backend/ so CWD doesn't matter.
    rel = Path(path_part)
    abs_path = (backend_dir() / rel).resolve()
    ensure_instance_dir_exists()
    return f"sqlite:///{abs_path.as_posix()}"


