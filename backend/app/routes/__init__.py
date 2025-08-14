from flask import Flask
from .players import bp as players_bp
from .optimize import bp as optimize_bp
from .ingest import bp as ingest_bp
from .trades import bp as trades_bp
from .llm import bp as llm_bp


def register_blueprints(app: Flask):
    app.register_blueprint(players_bp, url_prefix="/players")
    app.register_blueprint(optimize_bp, url_prefix="/optimize")
    app.register_blueprint(ingest_bp, url_prefix="/ingest")
    app.register_blueprint(trades_bp, url_prefix="/trades")
    app.register_blueprint(llm_bp, url_prefix="/assistant")
