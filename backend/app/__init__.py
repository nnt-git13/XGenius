from __future__ import annotations
import os
from flask import Flask
from .config import Config
from .db import db, migrate
from .utils.logging import configure_logging
from .utils.cache import cache
from .routes import register_blueprints


def create_app(config_class: type[Config] | None = None) -> Flask:
    app = Flask(__name__)
    app.config.from_object(config_class or Config())

    # Logging
    configure_logging(app)

    # DB, Migrations, Cache
    db.init_app(app)
    migrate.init_app(app, db)
    cache.init_app(app)

    # Blueprints
    register_blueprints(app)

    # Health check
    @app.get("/health")
    def health():
        return {"status": "ok"}

    return app
