"""
Legacy Flask database extensions (optional).

FastAPI is the primary framework now, but some CLI flows still use Flask.
This module is imported conditionally to avoid requiring Flask deps in all setups.
"""

from __future__ import annotations

from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate

db = SQLAlchemy()
migrate = Migrate()


