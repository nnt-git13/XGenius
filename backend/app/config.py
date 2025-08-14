import os
from datetime import timedelta


class Config:
    SQLALCHEMY_DATABASE_URI = os.getenv(
        "DATABASE_URL",
        "sqlite:///xgenius.db",
    )
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SECRET_KEY = os.getenv("SECRET_KEY", "dev-secret")

    # Caching (simple in-memory by default; swap for Redis in production)
    CACHE_TYPE = os.getenv("CACHE_TYPE", "SimpleCache")
    CACHE_DEFAULT_TIMEOUT = int(os.getenv("CACHE_DEFAULT_TIMEOUT", 300))

    # LLM / News / Misc
    OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")
    NEWS_API_KEYS = os.getenv("NEWS_API_KEYS", "").split(",") if os.getenv("NEWS_API_KEYS") else []

    # Model storage
    MODEL_DIR = os.getenv("MODEL_DIR", "models_store")
    os.makedirs(MODEL_DIR, exist_ok=True)

    # Security
    PERMANENT_SESSION_LIFETIME = timedelta(days=7)
