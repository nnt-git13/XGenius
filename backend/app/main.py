"""
Main FastAPI application entry point.
"""
from __future__ import annotations
import logging
import os
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

from .core.config import settings
from .db import init_db
from .api.v1.router import api_router

# Configure logging
logging.basicConfig(
    level=getattr(logging, settings.LOG_LEVEL.upper()),
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Rate limiter
limiter = Limiter(key_func=get_remote_address)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifespan context manager for startup/shutdown."""
    # Startup
    logger.info("Starting XGenius application...")
    # Skip database initialization on Vercel (no database available)
    if not os.environ.get("VERCEL"):
        try:
            init_db()
            logger.info("Database initialized")
        except Exception as e:
            logger.warning(f"Database initialization failed (this is OK on Vercel): {e}")
    else:
        logger.info("Skipping database initialization on Vercel")
    yield
    # Shutdown
    logger.info("Shutting down XGenius application...")


# Create FastAPI app
app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="Production-grade Fantasy Premier League optimization platform",
    openapi_url=f"{settings.API_V1_PREFIX}/openapi.json",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

# CORS middleware - parse and clean origins
cors_origins = settings.CORS_ORIGINS
if isinstance(cors_origins, str):
    # Split by comma and strip whitespace
    cors_origins = [origin.strip() for origin in cors_origins.split(",") if origin.strip()]

logger.info(f"CORS allowed origins: {cors_origins}")

# CORS middleware - add FIRST so it executes LAST (FastAPI middleware is reverse order)
# This ensures CORSMiddleware handles CORS properly
app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allow_headers=["*"],
    expose_headers=["*"],
    max_age=3600,  # Cache preflight requests for 1 hour
)

# Handle CORS for all requests - add LAST so it executes FIRST
# This ensures CORS headers are added to all responses
@app.middleware("http")
async def cors_handler(request: Request, call_next):
    # Handle OPTIONS preflight
    if request.method == "OPTIONS":
        logger.info(f"OPTIONS request intercepted at app level: {request.url.path}, origin: {request.headers.get('origin')}")
        origin = request.headers.get("origin")
        # Check if origin is in allowed list
        if origin and origin in cors_origins:
            allow_origin = origin
        elif "*" in cors_origins:
            allow_origin = "*"
        else:
            # For development, allow the origin if it's localhost
            if origin and ("localhost" in origin or "127.0.0.1" in origin):
                allow_origin = origin
            else:
                allow_origin = cors_origins[0] if cors_origins else "*"
        
        logger.info(f"Returning OPTIONS response with origin: {allow_origin}")
        return Response(
            status_code=200,
            headers={
                "Access-Control-Allow-Origin": allow_origin,
                "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS, PATCH",
                "Access-Control-Allow-Headers": "*",
                "Access-Control-Allow-Credentials": "true",
                "Access-Control-Max-Age": "3600",
            }
        )
    
    # Handle actual requests - add CORS headers to response
    response = await call_next(request)
    origin = request.headers.get("origin")
    
    # Determine allowed origin
    if origin and origin in cors_origins:
        allow_origin = origin
    elif "*" in cors_origins:
        allow_origin = "*"
    elif origin and ("localhost" in origin or "127.0.0.1" in origin):
        allow_origin = origin
    else:
        allow_origin = cors_origins[0] if cors_origins else "*"
    
    # Add CORS headers to response
    response.headers["Access-Control-Allow-Origin"] = allow_origin
    response.headers["Access-Control-Allow-Credentials"] = "true"
    
    return response

# Trusted host middleware (for production)
if not settings.DEBUG:
    app.add_middleware(
        TrustedHostMiddleware,
        allowed_hosts=["*"]  # Configure appropriately for production
    )

# Rate limiting
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# Include routers
app.include_router(api_router, prefix=settings.API_V1_PREFIX)


@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {
        "status": "healthy",
        "version": settings.APP_VERSION,
        "environment": "development" if settings.DEBUG else "production"
    }


@app.get("/")
async def root():
    """Root endpoint."""
    return {
        "message": "Welcome to XGenius FPL Optimizer",
        "docs": "/docs",
        "health": "/health"
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=settings.DEBUG,
    )
