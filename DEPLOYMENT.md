# XGenius Deployment Guide

## Quick Start

1. **Connect Repository to Vercel**
   - Go to [vercel.com](https://vercel.com)
   - Click "Add New Project"
   - Import your GitHub/GitLab repository

2. **Configure Root Directory** ⚠️ **CRITICAL**
   - In Project Settings → General → Root Directory
   - Set to: `frontend`
   - Click "Save"
   - **This is essential for Next.js auto-detection**

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
     - **Auto-detect Next.js** from `package.json` (no vercel.json needed!)
     - **Auto-detect Python API** from `api/index.py` and `api/requirements.txt`

## Architecture Overview

The project uses a clean monorepo structure optimized for Vercel:
- `frontend/` - Next.js application (**Root Directory for Vercel**)
- `backend/` - FastAPI Python backend code
- `frontend/api/` - Vercel serverless function entry point for Python API

## File Structure

```
XGenius/
├── frontend/              # Root Directory for Vercel
│   ├── api/              # Python API entry point (auto-detected by Vercel)
│   │   ├── index.py     # FastAPI app re-export
│   │   └── requirements.txt  # Minimal Python deps
│   ├── src/             # Next.js source
│   │   └── app/         # Next.js App Router
│   ├── package.json     # Next.js config (auto-detected)
│   └── next.config.js   # Next.js configuration
├── backend/              # FastAPI backend code
│   └── app/             # Main application (imported by api/index.py)
└── .vercelignore        # Excludes unnecessary files
```

## How It Works

1. **Next.js Auto-Detection**:
   - Vercel detects `package.json` with `"next"` dependency
   - Automatically runs `next build`
   - No `vercel.json` needed for Next.js!

2. **Python API Auto-Detection**:
   - Vercel detects `api/index.py` as a serverless function
   - Uses `api/requirements.txt` for dependencies
   - The `index.py` imports from `../../backend/app/` (relative to repo root)
   - Routes `/api/*` requests to the Python function

3. **No vercel.json Required**:
   - Next.js is auto-detected from `package.json`
   - Python API is auto-detected from `api/` directory
   - Both work together seamlessly!

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
- `NEXT_PUBLIC_API_URL` - API URL (defaults to relative path in production)

## Deployment Steps (Detailed)

### Step 1: Connect Repository
1. Go to [vercel.com/dashboard](https://vercel.com/dashboard)
2. Click "Add New..." → "Project"
3. Import your Git repository
4. Select the repository

### Step 2: Configure Project ⚠️ **CRITICAL**
1. **Framework Preset**: Leave as "Other" (Vercel will auto-detect Next.js)
2. **Root Directory**: **MUST be set to `frontend`**
3. **Build Command**: Leave empty (auto-detected: `next build`)
4. **Output Directory**: Leave empty (auto-detected: `.next`)
5. **Install Command**: Leave empty (auto-detected: `npm install`)

### Step 3: Environment Variables
1. Go to Settings → Environment Variables
2. Add variables (see above)
3. Select environments: Production, Preview, Development
4. Click "Save"

### Step 4: Deploy
1. Click "Deploy" button
2. Wait for build to complete
3. Check build logs:
   - Should see "Installing dependencies" (npm)
   - Should see "Building Next.js application"
   - Should see "Installing Python dependencies" (for API)
   - Should see both Next.js and Python builds

### Step 5: Verify Deployment
1. Visit your deployment URL
2. Test the frontend: Should load the homepage
3. Test the API: Visit `https://your-app.vercel.app/api/v1/health`
4. Test Copilot: Try asking a question (if API keys are set)

## Troubleshooting

### Build Only Shows Python API, No Next.js
- **Solution**: Verify Root Directory is set to `frontend` (not `.` or empty)
- Check that `frontend/package.json` exists and has `"next"` in dependencies
- Ensure there's no `vercel.json` at repository root with `builds` configuration

### Next.js Not Detected
- Check Root Directory is `frontend`
- Verify `frontend/package.json` has `"next": "^14.2.0"` in dependencies
- Check build logs for "Installing dependencies" - should install npm packages

### API Returns 500 Error
- Check function logs in Vercel dashboard
- Verify backend code is accessible (check `.vercelignore` doesn't exclude `backend/app/`)
- Check that `backend/app/` directory is not ignored
- Verify API routes are working: `/api/v1/health`

### Frontend Can't Connect to API
- Verify API URL is using relative path (check `frontend/src/lib/api.ts`)
- Check CORS settings in environment variables
- Verify API routes are working: `/api/v1/health`

### Copilot Not Working
- Check that at least one LLM API key is set
- Check function logs for API key errors
- Verify environment variables are set for Production environment

## Key Points

✅ **Root Directory MUST be `frontend`** - This is critical for Next.js auto-detection
✅ **No vercel.json needed** - Vercel auto-detects both Next.js and Python API
✅ **Python API uses minimal dependencies** - Stays under Vercel's 250MB limit
✅ **Heavy ML libraries are optional** - Graceful fallbacks when not available
✅ **Database initialization is skipped on Vercel** - Serverless doesn't support persistent DB
✅ **All functionality is preserved** - With graceful degradation for missing dependencies

## Notes

- The Python API uses minimal dependencies to stay under Vercel's 250MB limit
- Heavy ML libraries (numpy, pandas, scikit-learn) are optional with fallbacks
- Database initialization is skipped on Vercel (serverless doesn't support persistent DB)
- All functionality is preserved with graceful degradation for missing dependencies
- The API automatically uses relative URLs in production (no configuration needed)
