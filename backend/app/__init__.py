from __future__ import annotations
import os
from flask import Flask
from flask_cors import CORS
from .config import Config
from .db import db, migrate
from .utils.logging import configure_logging
from .utils.cache import cache
from .players_csv import players_bp

def create_app(config_class: type[Config] | None = None) -> Flask:
    app = Flask(__name__)
    app.config.from_object(config_class or Config())

    # CORS for dev: allow all origins to hit /api/*
    CORS(
        app,
        resources={r"/api/*": {"origins": "*"}},   # <— wildcard (dev only)
        supports_credentials=False
    )

    app.config["PLAYERS_CSV_PATH"] = os.path.join(app.root_path, "players.csv")
    app.register_blueprint(players_bp, url_prefix="/api")

    configure_logging(app)
    db.init_app(app); migrate.init_app(app, db); cache.init_app(app)

    from .routes import register_blueprints
    register_blueprints(app)

    @app.get("/health")
    def health(): return {"status": "ok"}

    return app
