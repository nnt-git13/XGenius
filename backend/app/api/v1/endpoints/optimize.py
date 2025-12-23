"""Squad optimization endpoints."""
from __future__ import annotations
import logging
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db import get_db
from app.api.v1.schemas.optimize import OptimizeSquadRequest, OptimizeSquadResponse
from app.services.optimizer import SquadOptimizer

logger = logging.getLogger(__name__)
router = APIRouter()


@router.post("/squad", response_model=OptimizeSquadResponse)
async def optimize_squad(
    request: OptimizeSquadRequest,
    db: Session = Depends(get_db),
):
    """Optimize a squad under constraints."""
    try:
        logger.info(f"Optimization request: season={request.season}, budget={request.budget}, "
                   f"horizon={request.horizon_gw}, chip={request.chip}, "
                   f"current_squad_size={len(request.current_squad or [])}, "
                   f"free_transfers={request.free_transfers}")
        
        optimizer = SquadOptimizer(db)
        result = await optimizer.optimize(
            season=request.season,
            budget=request.budget,
            exclude_players=request.exclude_players,
            lock_players=request.lock_players,
            chip=request.chip,
            horizon_gw=request.horizon_gw,
            current_squad=request.current_squad,
            free_transfers=request.free_transfers,
            target_gameweek=request.target_gameweek,
        )
        
        if result.options:
            best_option = result.options[0]
            logger.info(f"Optimization successful: {len(result.options)} options, "
                       f"best score={best_option.xg_score:.2f}, formation={best_option.formation}, "
                       f"transfers={best_option.transfers_count}")
        else:
            logger.warning("Optimization returned no options")
        return result
    except ValueError as e:
        logger.warning(f"Optimization validation error: {str(e)}")
        raise HTTPException(status_code=400, detail=f"Validation error: {str(e)}")
    except RuntimeError as e:
        logger.error(f"Optimization runtime error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Runtime error: {str(e)}")
    except Exception as e:
        import traceback
        error_trace = traceback.format_exc()
        logger.error(f"Optimization unexpected error: {str(e)}\n{error_trace}")
        # Return a more user-friendly error message
        error_msg = str(e)
        if "No valid candidates" in error_msg:
            raise HTTPException(status_code=400, detail=error_msg)
        elif "solver" in error_msg.lower() or "SCIP" in error_msg:
            raise HTTPException(status_code=500, detail="Optimization solver unavailable. Please try again later.")
        else:
            raise HTTPException(status_code=500, detail=f"Optimization failed: {error_msg}")

