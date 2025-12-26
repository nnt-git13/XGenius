"""
Core configuration settings for XGenius application.
"""
from __future__ import annotations
import os
from pathlib import Path
from typing import List
from pydantic_settings import BaseSettings
from pydantic import Field


class Settings(BaseSettings):
    """Application settings with environment variable support."""
    
    # Application
    APP_NAME: str = "XGenius FPL Optimizer"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = Field(default=False, env="DEBUG")
    API_V1_PREFIX: str = "/api/v1"
    
    # Database
    DATABASE_URL: str = Field(
        default="postgresql://xgenius:xgenius@localhost:5432/xgenius",
        env="DATABASE_URL"
    )
    DATABASE_ECHO: bool = Field(default=False, env="DATABASE_ECHO")
    
    # Security
    SECRET_KEY: str = Field(
        default="dev-secret-change-in-production",
        env="SECRET_KEY"
    )
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days
    
    # CORS
    CORS_ORIGINS: str = Field(
        default="http://localhost:3000,http://localhost:3001,http://localhost:5173,http://127.0.0.1:3000,http://127.0.0.1:3001,http://127.0.0.1:5173",
        env="CORS_ORIGINS"
    )
    
    # Redis Cache
    REDIS_URL: str = Field(
        default="redis://localhost:6379/0",
        env="REDIS_URL"
    )
    CACHE_DEFAULT_TIMEOUT: int = 300
    
    # ML Models
    MODEL_DIR: Path = Field(
        default_factory=lambda: Path("models_store"),
        env="MODEL_DIR"
    )
    ML_TRAINING_DATA_DIR: Path = Field(
        default_factory=lambda: Path("historical"),
        env="ML_TRAINING_DATA_DIR"
    )
    
    # LLM / AI - Multiple provider support (use whichever API key is available)
    OPENAI_API_KEY: str = Field(default="", env="OPENAI_API_KEY")
    OPENAI_MODEL: str = Field(default="gpt-4o-mini", env="OPENAI_MODEL")
    GROQ_API_KEY: str = Field(default="", env="GROQ_API_KEY")
    GROQ_MODEL: str = Field(default="llama-3.3-70b-versatile", env="GROQ_MODEL")
    GEMINI_API_KEY: str = Field(default="", env="GEMINI_API_KEY")
    GEMINI_MODEL: str = Field(default="gemini-2.0-flash-exp", env="GEMINI_MODEL")
    # Default LLM provider priority: groq (free) > gemini (free) > openai
    LLM_PROVIDER: str = Field(default="auto", env="LLM_PROVIDER")  # auto, groq, gemini, openai
    LLM_TEMPERATURE: float = 0.7
    LLM_MAX_TOKENS: int = 2000
    
    # FPL API
    FPL_API_BASE_URL: str = "https://fantasy.premierleague.com/api"
    FPL_API_RATE_LIMIT: float = 0.5  # seconds between requests
    
    # Celery
    CELERY_BROKER_URL: str = Field(
        default="redis://localhost:6379/1",
        env="CELERY_BROKER_URL"
    )
    CELERY_RESULT_BACKEND: str = Field(
        default="redis://localhost:6379/2",
        env="CELERY_RESULT_BACKEND"
    )
    
    # Rate Limiting
    RATE_LIMIT_PER_MINUTE: int = 60
    RATE_LIMIT_PER_HOUR: int = 1000
    
    # Logging
    LOG_LEVEL: str = Field(default="INFO", env="LOG_LEVEL")
    LOG_FORMAT: str = "json"  # json or text
    
    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()

# Ensure directories exist on initialization (skip on Vercel)
if not os.environ.get("VERCEL"):
    try:
        settings.MODEL_DIR.mkdir(exist_ok=True, parents=True)
        settings.ML_TRAINING_DATA_DIR.mkdir(exist_ok=True, parents=True)
    except Exception:
        pass  # Directory creation may fail on read-only filesystems

