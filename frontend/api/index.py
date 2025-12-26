# Vercel Serverless Function entrypoint
# This file re-exports the FastAPI app for Vercel deployment
# Optimized for Vercel's 250MB limit: https://vercel.com/kb/guide/troubleshooting-function-250mb-limit

import sys
import os
from pathlib import Path

# Set environment to use minimal requirements
os.environ.setdefault("VERCEL", "1")

# Add backend to path so imports work
# When frontend is root: frontend/api/ -> ../../backend
api_dir = Path(__file__).parent.resolve()
possible_backend_paths = [
    api_dir.parent.parent / "backend",  # frontend/api/../../backend
    Path("/vercel/path0") / "backend",  # Vercel build path (when root is frontend, backend is at ../backend)
    Path("/var/task") / "backend",  # Alternative Vercel path
    Path("/vercel/path0") / "frontend" / ".." / "backend",  # Alternative path structure
]

backend_path = None
for path in possible_backend_paths:
    if path.exists() and (path / "app").exists():
        backend_path = path
        break

if backend_path:
    backend_str = str(backend_path)
    if backend_str not in sys.path:
        sys.path.insert(0, backend_str)
    print(f"Added backend path: {backend_path}")
else:
    # Last resort: try to find backend relative to current working directory
    cwd = Path.cwd()
    if (cwd / "backend").exists():
        backend_str = str(cwd / "backend")
        if backend_str not in sys.path:
            sys.path.insert(0, backend_str)
        print(f"Added backend path from CWD: {cwd / 'backend'}")
    else:
        print(f"WARNING: Could not find backend directory. Tried: {possible_backend_paths}")
        print(f"Current working directory: {cwd}")
        print(f"API directory: {api_dir}")
        print(f"Python path: {sys.path}")

# Import the FastAPI app with detailed error handling
try:
    from app.main import app
    print("Successfully imported FastAPI app")
except ImportError as e:
    import traceback
    print(f"ERROR: Failed to import FastAPI app: {e}")
    print(f"Python path: {sys.path}")
    print(f"Traceback:")
    traceback.print_exc()
    raise
except Exception as e:
    import traceback
    print(f"ERROR: Unexpected error importing FastAPI app: {e}")
    print(f"Python path: {sys.path}")
    print(f"Traceback:")
    traceback.print_exc()
    raise

# Vercel looks for 'app' or 'handler'
handler = app

