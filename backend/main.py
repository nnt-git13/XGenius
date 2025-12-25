"""
FastAPI entrypoint for deployment platforms.
Re-exports the app from the app package.
"""
from app.main import app

# This allows deployment platforms to find the FastAPI app
# Usage: uvicorn main:app --host 0.0.0.0 --port 8000
