"""Trade advice endpoints."""
from __future__ import annotations
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.api.v1.schemas.trades import TradeAdviceRequest, TradeAdviceResponse
from app.services.trade_advisor import TradeAdvisor

router = APIRouter()


@router.post("/advice", response_model=TradeAdviceResponse)
async def get_trade_advice(
    request: TradeAdviceRequest,
    db: Session = Depends(get_db),
):
    """Get advice on a potential trade."""
    try:
        advisor = TradeAdvisor(db)
        result = await advisor.analyze_trade(
            season=request.season,
            out_player_id=request.out_player_id,
            in_player_id=request.in_player_id,
            current_squad=request.current_squad,
            budget=request.budget,
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

