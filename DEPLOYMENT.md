# XGenius Deployment Guide

## Architecture Overview

The project uses a clean monorepo structure:
- `frontend/` - Next.js application (Root Directory for Vercel)
- `backend/` - FastAPI Python backend
- `frontend/api/` - Vercel serverless function entry point for Python API

## Vercel Deployment Configuration

### Step 1: Set Root Directory
In Vercel Dashboard → Settings → General:
- **Root Directory**: `frontend`

### Step 2: Auto-Detection
Vercel will automatically:
- Detect Next.js from `frontend/package.json`
- Detect Python API from `frontend/api/index.py` and `frontend/api/requirements.txt`

### Step 3: No vercel.json Required
With this structure, Vercel auto-detects both:
- Next.js framework (from `package.json`)
- Python serverless functions (from `api/` directory)

## File Structure

```
XGenius/
├── frontend/              # Root Directory for Vercel
│   ├── api/              # Python API entry point
│   │   ├── index.py     # FastAPI app re-export
│   │   └── requirements.txt  # Minimal Python deps
│   ├── src/             # Next.js source
│   └── package.json     # Next.js config
├── backend/              # FastAPI backend code
│   └── app/             # Main application
└── .vercelignore        # Excludes unnecessary files
```

## How It Works

1. **Next.js**: Auto-detected from `frontend/package.json`
2. **Python API**: 
   - Vercel detects `frontend/api/index.py` as a serverless function
   - Uses `frontend/api/requirements.txt` for dependencies
   - The `index.py` imports from `../../backend/app/` (relative to repo root)

## Environment Variables

Set these in Vercel Dashboard → Settings → Environment Variables:
- `OPENAI_API_KEY` (optional, for copilot)
- `GROQ_API_KEY` (optional, for copilot)
- `GEMINI_API_KEY` (optional, for copilot)
- `CORS_ORIGINS` (your Vercel domain)

## Notes

- The Python API uses minimal dependencies to stay under Vercel's 250MB limit
- Heavy ML libraries (numpy, pandas, scikit-learn) are optional with fallbacks
- Database initialization is skipped on Vercel (serverless doesn't support persistent DB)
- All functionality is preserved with graceful degradation for missing dependencies

