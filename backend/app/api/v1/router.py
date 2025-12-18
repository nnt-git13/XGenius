"""
Main API router combining all endpoint routers.
"""
from fastapi import APIRouter

from .endpoints import (
    team,
    optimize,
    trades,
    assistant,
    copilot,
    copilot_metrics,
    ml,
    ingest,
    players,
)

api_router = APIRouter()

# Include all endpoint routers
api_router.include_router(team.router, prefix="/team", tags=["team"])
api_router.include_router(optimize.router, prefix="/optimize", tags=["optimize"])
api_router.include_router(trades.router, prefix="/trades", tags=["trades"])
api_router.include_router(assistant.router, prefix="/assistant", tags=["assistant"])
api_router.include_router(copilot.router, prefix="/copilot", tags=["copilot"])
api_router.include_router(copilot_metrics.router, prefix="/copilot", tags=["copilot"])
api_router.include_router(ml.router, prefix="/ml", tags=["ml"])
api_router.include_router(ingest.router, prefix="/admin", tags=["admin"])
api_router.include_router(players.router, prefix="/players", tags=["players"])

