# backend/app/main.py
from flask import Flask
from flask_cors import CORS
import os

def create_app():
    app = Flask(__name__)
    CORS(app)

    base_dir = os.path.dirname(os.path.abspath(__file__))
    # CSVs live one directory above app/ in your tree
    app.config["PLAYERS_CSV_DIR"] = os.path.abspath(os.path.join(base_dir, ".."))

    # routes
    from app.routes.players import players_bp
    app.register_blueprint(players_bp, url_prefix="/api")
    from app.routes.squad import squad_bp
    app.register_blueprint(squad_bp, url_prefix="/api")

    # (assistant/optimize/trades routes already mounted)
    return app

# If you run python -m app.main
if __name__ == "__main__":
    app = create_app()
    app.run(debug=True, host="0.0.0.0", port=5000)
