# Vercel Serverless Function entrypoint
# This file re-exports the FastAPI app for Vercel deployment

import sys
from pathlib import Path

# Add backend to path so imports work
backend_path = Path(__file__).parent.parent / "backend"
sys.path.insert(0, str(backend_path))

from app.main import app

# Vercel looks for 'app' or 'handler'
handler = app

