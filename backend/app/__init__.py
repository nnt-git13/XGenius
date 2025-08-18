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

    # CORS for the frontend (Vite default http://localhost:5173)
    CORS(
        app,
        resources={r"/api/*": {"origins": ["http://localhost:5173", "http://127.0.0.1:5173"]}},
        supports_credentials=False,
        allow_headers=["Content-Type", "Authorization"],
        methods=["GET", "POST", "OPTIONS"],
        max_age=86400,
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
