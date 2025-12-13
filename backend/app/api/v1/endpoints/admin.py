"""Admin endpoints for ingestion and management."""
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.services.ingestion import ingest_weekly_scores, ingest_players

router = APIRouter()


@router.post("/ingest/weekly-scores")
async def ingest_weekly_scores_endpoint(
    season: str,
    gameweek: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    """Ingest weekly scores from CSV file."""
    try:
        result = await ingest_weekly_scores(
            db=db,
            season=season,
            gameweek=gameweek,
            file=file,
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/ingest/players")
async def ingest_players_endpoint(
    season: str,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    """Ingest players from CSV file."""
    try:
        result = await ingest_players(
            db=db,
            season=season,
            file=file,
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

