# XGenius Deployment Guide

## Quick Start

1. **Connect Repository to Vercel**
   - Go to [vercel.com](https://vercel.com)
   - Click "Add New Project"
   - Import your GitHub/GitLab repository

2. **Configure Root Directory**
   - In Project Settings → General → Root Directory
   - **IMPORTANT**: Leave Root Directory as repository root (`.` or empty)
   - Do NOT set it to `frontend` - the root-level `vercel.json` handles the configuration

3. **Set Environment Variables** (optional but recommended)
   - Go to Settings → Environment Variables
   - Add at least one LLM API key for Copilot:
     - `GROQ_API_KEY` (recommended - free tier available)
     - `GEMINI_API_KEY` (alternative - free tier available)
     - `OPENAI_API_KEY` (alternative - paid)
   - Add CORS origins (after first deployment):
     - `CORS_ORIGINS`: `https://your-app.vercel.app`

4. **Deploy**
   - Click "Deploy" or push to your main branch
   - Vercel will automatically:
     - Build Next.js from `frontend/package.json`
     - Build Python API from `frontend/api/index.py`

## Architecture Overview

The project uses a clean monorepo structure:
- `frontend/` - Next.js application (Root Directory for Vercel)
- `backend/` - FastAPI Python backend
- `frontend/api/` - Vercel serverless function entry point for Python API

## File Structure

```
XGenius/
├── frontend/              # Root Directory for Vercel
│   ├── api/              # Python API entry point
│   │   ├── index.py     # FastAPI app re-export
│   │   └── requirements.txt  # Minimal Python deps
│   ├── src/             # Next.js source
│   ├── package.json     # Next.js config
│   └── vercel.json      # Minimal config
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
   - Routes `/api/v1/*` requests to the FastAPI app

## Environment Variables

### Required (for Copilot to work)
Set at least ONE of these:
- `GROQ_API_KEY` - Get free key at [console.groq.com](https://console.groq.com)
- `GEMINI_API_KEY` - Get free key at [makersuite.google.com](https://makersuite.google.com)
- `OPENAI_API_KEY` - Get key at [platform.openai.com](https://platform.openai.com)

### Optional
- `CORS_ORIGINS` - Comma-separated list of allowed origins (defaults to localhost)
  - Example: `https://your-app.vercel.app,https://www.your-app.vercel.app`
- `SECRET_KEY` - For production security (auto-generated if not set)
- `DEBUG` - Set to `false` for production

## Deployment Steps (Detailed)

### Step 1: Connect Repository
1. Go to [vercel.com/dashboard](https://vercel.com/dashboard)
2. Click "Add New..." → "Project"
3. Import your Git repository
4. Select the repository

### Step 2: Configure Project
1. **Framework Preset**: Leave as "Other" (Vercel will auto-detect Next.js)
2. **Root Directory**: Set to `frontend`
3. **Build Command**: Leave empty (auto-detected)
4. **Output Directory**: Leave empty (auto-detected)
5. **Install Command**: Leave empty (auto-detected)

### Step 3: Environment Variables
1. Go to Settings → Environment Variables
2. Add variables (see above)
3. Select environments: Production, Preview, Development
4. Click "Save"

### Step 4: Deploy
1. Click "Deploy" button
2. Wait for build to complete
3. Check build logs for any errors

### Step 5: Verify Deployment
1. Visit your deployment URL
2. Test the frontend: Should load the homepage
3. Test the API: Visit `https://your-app.vercel.app/api/v1/health`
4. Test Copilot: Try asking a question (if API keys are set)

## Troubleshooting

### Build Fails
- Check build logs in Vercel dashboard
- Ensure Root Directory is set to `frontend`
- Verify `frontend/api/index.py` and `frontend/api/requirements.txt` exist

### API Returns 500 Error
- Check function logs in Vercel dashboard
- Verify backend code is accessible (check `.vercelignore`)
- Check that `backend/app/` directory is not ignored

### Frontend Can't Connect to API
- Verify API URL is using relative path (check `frontend/src/lib/api.ts`)
- Check CORS settings in environment variables
- Verify API routes are working: `/api/v1/health`

### Copilot Not Working
- Check that at least one LLM API key is set
- Check function logs for API key errors
- Verify environment variables are set for Production environment

## Notes

- The Python API uses minimal dependencies to stay under Vercel's 250MB limit
- Heavy ML libraries (numpy, pandas, scikit-learn) are optional with fallbacks
- Database initialization is skipped on Vercel (serverless doesn't support persistent DB)
- All functionality is preserved with graceful degradation for missing dependencies
- The API automatically uses relative URLs in production (no configuration needed)

