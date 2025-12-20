"""Squad optimization endpoints."""
from __future__ import annotations
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db import get_db
from app.api.v1.schemas.optimize import OptimizeSquadRequest, OptimizeSquadResponse
from app.services.optimizer import SquadOptimizer

router = APIRouter()


@router.post("/squad", response_model=OptimizeSquadResponse)
async def optimize_squad(
    request: OptimizeSquadRequest,
    db: Session = Depends(get_db),
):
    """Optimize a squad under constraints."""
    try:
        optimizer = SquadOptimizer(db)
        result = await optimizer.optimize(
            season=request.season,
            budget=request.budget,
            exclude_players=request.exclude_players,
            lock_players=request.lock_players,
            chip=request.chip,
            horizon_gw=request.horizon_gw,
            current_squad=request.current_squad,
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

