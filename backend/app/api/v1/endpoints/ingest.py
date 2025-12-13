"""Data ingestion endpoints."""
from __future__ import annotations
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.services.ingestion import DataIngestionService

router = APIRouter()


@router.post("/ingest/weekly_scores")
async def ingest_weekly_scores(
    season: str,
    gameweek: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    """Ingest weekly FPL scores from CSV."""
    try:
        service = DataIngestionService(db)
        result = await service.ingest_weekly_scores(
            season=season,
            gameweek=gameweek,
            csv_file=file,
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/ingest/bootstrap")
async def bootstrap_season(
    season: str,
    db: Session = Depends(get_db),
):
    """Bootstrap a season with initial player data from FPL API."""
    try:
        service = DataIngestionService(db)
        result = await service.bootstrap_season(season=season)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

