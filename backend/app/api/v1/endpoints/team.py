"""Team evaluation and XG Score endpoints."""
from __future__ import annotations
from typing import Optional
import requests
import logging
from fastapi import APIRouter, Depends, HTTPException, Request, Response
from sqlalchemy.orm import Session

from app.db import get_db
from app.api.v1.schemas.team import (
    TeamEvaluationRequest,
    TeamEvaluationResponse,
    XGScoreRequest,
    XGScoreResponse,
)
from app.services.team_evaluator import TeamEvaluator
from app.services.xg_scorer import XGScorer

router = APIRouter()


@router.options("/evaluate")
async def evaluate_team_options(request: Request):
    """Handle OPTIONS preflight request."""
    origin = request.headers.get("origin", "*")
    return Response(
        status_code=200,
        headers={
            "Access-Control-Allow-Origin": origin,
            "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS, PATCH",
            "Access-Control-Allow-Headers": "*",
            "Access-Control-Allow-Credentials": "true",
            "Access-Control-Max-Age": "3600",
        }
    )


@router.post("/evaluate", response_model=TeamEvaluationResponse)
async def evaluate_team(
    request: TeamEvaluationRequest,
    http_request: Request,
    db: Session = Depends(get_db),
):
    """Evaluate a user's FPL team."""
    logger = logging.getLogger(__name__)
    
    try:
        evaluator = TeamEvaluator(db)
        result = await evaluator.evaluate(
            season=request.season,
            team_id=request.team_id,
            squad_json=request.squad_json,
            gameweek=request.gameweek,
        )
        # Log if no players were found
        if result.players and len(result.players) == 0:
            logger.warning(f"Team evaluation returned empty players for team_id={request.team_id}")
        else:
            logger.info(f"Team evaluation successful: {len(result.players)} players found for team_id={request.team_id}")
        
        return result
    except ValueError as e:
        # User input errors (e.g., invalid team_id)
        logger.warning(f"Validation error: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
    except requests.exceptions.RequestException as e:
        # Network errors when calling FPL API
        logger.error(f"FPL API error: {str(e)}")
        raise HTTPException(
            status_code=503, 
            detail=f"Failed to fetch team data from FPL API: {str(e)}"
        )
    except Exception as e:
        # Other errors
        logger.error(f"Unexpected error: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.options("/xgscore")
async def calculate_xg_score_options():
    """Handle OPTIONS preflight request."""
    return Response(status_code=200)


@router.post("/xgscore", response_model=XGScoreResponse)
async def calculate_xg_score(
    request: XGScoreRequest,
    db: Session = Depends(get_db),
):
    """Calculate advanced XG Score for a squad."""
    try:
        scorer = XGScorer(db)
        result = await scorer.calculate_score(
            season=request.season,
            squad=request.squad,
            gameweek=request.gameweek,
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

