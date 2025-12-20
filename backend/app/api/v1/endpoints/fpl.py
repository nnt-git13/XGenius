"""FPL proxy endpoints (server-to-server) to avoid browser CORS issues."""

from fastapi import APIRouter

from app.services.fpl_api import FPLAPIService

router = APIRouter()


@router.get("/bootstrap-static")
async def proxy_bootstrap_static():
    """
    Proxy the FPL bootstrap-static endpoint.

    Frontend MUST call this instead of hitting fantasy.premierleague.com directly
    (the browser blocks that request due to CORS).
    """
    svc = FPLAPIService()
    try:
        return await svc.fetch_bootstrap_static()
    finally:
        await svc.close()


@router.get("/element-summary/{player_id}")
async def proxy_element_summary(player_id: int):
    """Proxy FPL element-summary/{player_id} for per-player detail/history."""
    svc = FPLAPIService()
    try:
        return await svc.fetch_player_details(player_id)
    finally:
        await svc.close()


