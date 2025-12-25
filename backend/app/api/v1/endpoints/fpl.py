"""FPL proxy endpoints (server-to-server) to avoid browser CORS issues."""

import logging
from fastapi import APIRouter, HTTPException
from typing import Dict, Any, List

from app.services.fpl_api import FPLAPIService

logger = logging.getLogger(__name__)
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


@router.get("/entry/{entry_id}/metadata")
async def get_entry_metadata(entry_id: int) -> Dict[str, Any]:
    """
    Get FPL entry metadata: chips, free transfers, current gameweek.
    
    Returns:
        {
            "current_gameweek": int,
            "next_gameweek": int,
            "free_transfers": int,
            "chips": {
                "wildcard": {"available": bool, "used": bool},
                "free_hit": {"available": bool, "used": bool},
                "bench_boost": {"available": bool, "used": bool},
                "triple_captain": {"available": bool, "used": bool}
            },
            "bank": float,
            "squad_value": float
        }
    """
    svc = FPLAPIService()
    try:
        logger.info(f"Fetching metadata for entry {entry_id}")
        
        # Get bootstrap for current gameweek
        try:
            bootstrap = await svc.fetch_bootstrap_static()
            events = bootstrap.get("events", [])
            current_gw = next((e.get("id") for e in events if e.get("is_current")), None)
            next_gw = next((e.get("id") for e in events if e.get("is_next")), None)
            logger.info(f"Current GW: {current_gw}, Next GW: {next_gw}")
        except Exception as e:
            logger.error(f"Failed to fetch bootstrap: {str(e)}")
            raise HTTPException(status_code=500, detail=f"Failed to fetch gameweek info: {str(e)}")
        
        # Get entry history for chips (this is public, doesn't require auth)
        # Note: We don't fetch entry_details as it's not needed and might require auth
        try:
            entry_history = await svc.fetch_entry_history(entry_id)
            chips_history = entry_history.get("chips", [])
            # "current" is a list of events, get the latest one
            current_events = entry_history.get("current", [])
            latest_event = current_events[-1] if current_events else {}
            logger.info(f"Found {len(chips_history)} chips in history, latest event: {latest_event.get('event')}")
        except Exception as e:
            logger.warning(f"Failed to fetch entry history: {str(e)}, using defaults")
            chips_history = []
            entry_history = {}
            current_events = []
            latest_event = {}
        
        # FPL API chip names: "wildcard", "freehit", "bboost", "3xc"
        chips_used_names = {chip.get("name", "").lower() for chip in chips_history if chip.get("name")}
        
        # Get current picks for bank and squad value
        current_gw_id = current_gw or (next_gw - 1 if next_gw else 1)
        entry_history_data = {}
        
        try:
            picks_data = await svc.fetch_entry_picks(entry_id, current_gw_id)
            entry_history_data = picks_data.get("entry_history", {})
            logger.info(f"Fetched picks for GW {current_gw_id}")
        except Exception as e:
            logger.warning(f"Failed to fetch picks for GW {current_gw_id}: {str(e)}, using latest event from history")
            # Use latest event from entry history
            entry_history_data = latest_event
        
        # Extract chips info (FPL uses: "wildcard", "freehit", "bboost", "3xc")
        chips_info = {
            "wildcard": {
                "available": "wildcard" not in chips_used_names,
                "used": "wildcard" in chips_used_names,
            },
            "free_hit": {
                "available": "freehit" not in chips_used_names,
                "used": "freehit" in chips_used_names,
            },
            "bench_boost": {
                "available": "bboost" not in chips_used_names,
                "used": "bboost" in chips_used_names,
            },
            "triple_captain": {
                "available": "3xc" not in chips_used_names,
                "used": "3xc" in chips_used_names,
            },
        }
        
        # Get free transfers - FPL gives 1 free transfer per week, +1 if you didn't use any last week
        # For simplicity, we'll use 1 as default, but could calculate from event_transfers
        free_transfers = 1
        if entry_history_data:
            # If no transfers were made last week, we have 2 free transfers
            event_transfers = entry_history_data.get("event_transfers", 0)
            if event_transfers == 0:
                free_transfers = 2
        
        # Get bank and squad value (convert from tenths)
        bank_raw = entry_history_data.get("bank") or latest_event.get("bank", 0)
        bank = float(bank_raw) / 10.0 if bank_raw else 0.0
        
        value_raw = entry_history_data.get("value") or latest_event.get("value", 0)
        squad_value = float(value_raw) / 10.0 if value_raw else 0.0
        
        result = {
            "current_gameweek": current_gw or current_gw_id,
            "next_gameweek": next_gw or (current_gw_id + 1 if current_gw else 1),
            "free_transfers": free_transfers,
            "chips": chips_info,
            "bank": bank,
            "squad_value": squad_value,
        }
        
        logger.info(f"Successfully fetched metadata for entry {entry_id}: "
                   f"GW={result['current_gameweek']}, transfers={free_transfers}, "
                   f"bank=£{bank:.1f}M, value=£{squad_value:.1f}M")
        
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Unexpected error fetching entry metadata for {entry_id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to fetch entry metadata: {str(e)}")
    finally:
        await svc.close()


@router.get("/entry/{entry_id}")
async def get_entry(entry_id: int) -> Dict[str, Any]:
    """Get FPL entry basic info."""
    svc = FPLAPIService()
    try:
        return await svc.fetch_entry_details(entry_id)
    finally:
        await svc.close()


@router.get("/entry/{entry_id}/history")
async def get_entry_history(entry_id: int) -> Dict[str, Any]:
    """Get FPL entry history (points, chips, etc.)."""
    svc = FPLAPIService()
    try:
        return await svc.fetch_entry_history(entry_id)
    finally:
        await svc.close()


@router.get("/entry/{entry_id}/picks/{gameweek}")
async def get_entry_picks(entry_id: int, gameweek: int) -> Dict[str, Any]:
    """Get FPL entry picks for a specific gameweek."""
    svc = FPLAPIService()
    try:
        return await svc.fetch_entry_picks(entry_id, gameweek)
    finally:
        await svc.close()


@router.get("/fixtures")
async def get_fixtures() -> List[Dict[str, Any]]:
    """Get all fixtures for the current season."""
    svc = FPLAPIService()
    try:
        return await svc.fetch_fixtures()
    finally:
        await svc.close()


