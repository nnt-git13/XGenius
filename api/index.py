# Vercel Serverless Function entrypoint
# This file re-exports the FastAPI app for Vercel deployment
# Optimized for Vercel's 250MB limit: https://vercel.com/kb/guide/troubleshooting-function-250mb-limit

import sys
import os
from pathlib import Path

# Set environment to use minimal requirements
os.environ.setdefault("VERCEL", "1")

# Add backend to path so imports work
backend_path = Path(__file__).parent.parent / "backend"
sys.path.insert(0, str(backend_path))

# Import the FastAPI app
from app.main import app

# Vercel looks for 'app' or 'handler'
handler = app

