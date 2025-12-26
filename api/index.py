# Vercel Serverless Function entrypoint
# This file re-exports the FastAPI app for Vercel deployment
# Optimized for Vercel's 250MB limit: https://vercel.com/kb/guide/troubleshooting-function-250mb-limit

import sys
import os
from pathlib import Path

# Set environment to use minimal requirements
os.environ.setdefault("VERCEL", "1")

# Add backend to path so imports work
# When frontend is root: api/ -> ../backend
# When root is project root: api/ -> ../backend
# Try multiple possible paths
api_dir = Path(__file__).parent.resolve()
possible_backend_paths = [
    api_dir.parent / "backend",  # Standard: api/../backend
    api_dir.parent.parent / "backend",  # If api is nested: frontend/api/../backend
    Path("/vercel/path0") / "backend",  # Vercel build path
]

backend_path = None
for path in possible_backend_paths:
    if path.exists() and (path / "app").exists():
        backend_path = path
        break

if backend_path:
    sys.path.insert(0, str(backend_path))
    print(f"Added backend path: {backend_path}")
else:
    # Last resort: try to find backend relative to current working directory
    cwd = Path.cwd()
    if (cwd / "backend").exists():
        sys.path.insert(0, str(cwd / "backend"))
        print(f"Added backend path from CWD: {cwd / 'backend'}")
    else:
        print(f"WARNING: Could not find backend directory. Tried: {possible_backend_paths}")

# Import the FastAPI app
try:
    from app.main import app
    print("Successfully imported FastAPI app")
except ImportError as e:
    print(f"ERROR: Failed to import FastAPI app: {e}")
    print(f"Python path: {sys.path}")
    raise

# Vercel looks for 'app' or 'handler'
handler = app

