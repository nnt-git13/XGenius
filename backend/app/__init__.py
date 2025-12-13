from __future__ import annotations
import os

# Flask imports are optional (only needed for old Flask app)
# FastAPI is the main framework now
try:
    from flask import Flask
    from flask_cors import CORS
    FLASK_AVAILABLE = True
except ImportError:
    FLASK_AVAILABLE = False
    Flask = None  # type: ignore

try:
    from .config import Config
    from .db import db, migrate
    from .utils.logging import configure_logging
    from .utils.cache import cache
    from .players_csv import players_bp
except ImportError:
    # Old Flask dependencies, optional
    Config = None  # type: ignore
    db = None  # type: ignore
    migrate = None  # type: ignore
    configure_logging = None  # type: ignore
    cache = None  # type: ignore
    players_bp = None  # type: ignore

def create_app(config_class: type[Config] | None = None):
    """Create Flask app (legacy, use FastAPI app.main:app instead)."""
    if not FLASK_AVAILABLE:
        raise ImportError("Flask is not installed. Use FastAPI: app.main:app")
    
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
    if players_bp:
        app.register_blueprint(players_bp, url_prefix="/api")

    if configure_logging:
        configure_logging(app)
    if db and migrate and cache:
        db.init_app(app); migrate.init_app(app, db); cache.init_app(app)

    try:
        from .routes import register_blueprints
        register_blueprints(app)
    except ImportError:
        pass  # Routes optional

    @app.get("/health")
    def health(): return {"status": "ok"}

    return app
