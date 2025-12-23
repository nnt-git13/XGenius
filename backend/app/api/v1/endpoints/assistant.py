"""AI Copilot assistant endpoints."""
from __future__ import annotations
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db import get_db
from app.api.v1.schemas.assistant import AssistantAskRequest, AssistantAskResponse
from app.services.copilot import CopilotService

router = APIRouter()


@router.post("/ask", response_model=AssistantAskResponse)
async def ask_assistant(
    request: AssistantAskRequest,
    db: Session = Depends(get_db),
):
    """Query the AI copilot for advice."""
    try:
        copilot = CopilotService(db)
        result = await copilot.answer(
            question=request.question,
            context=request.context,
            season=request.season,
            gameweek=request.gameweek,
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

