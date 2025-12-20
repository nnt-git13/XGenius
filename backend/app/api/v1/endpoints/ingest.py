"""Data ingestion endpoints."""
from __future__ import annotations
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from pydantic import BaseModel
from typing import Optional
from sqlalchemy.orm import Session

from app.db import get_db
from app.services.ingestion import DataIngestionService
from app.services.fpl_ingestion import FPLIngestionService
from app.services.fpl_extra_ingestion import FPLExtraIngestionService

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
        # Prefer the async ingestion stack (shared with CLI).
        service = FPLIngestionService(db)
        result = await service.ingest_bootstrap_static(season=season)
        await service.close()
        return {"status": "success", **result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


class EventLiveIngestRequest(BaseModel):
    season: str
    gw: int


@router.post("/ingest/fpl/event-live")
async def ingest_event_live(req: EventLiveIngestRequest, db: Session = Depends(get_db)):
    """Ingest /event/{gw}/live and update WeeklyScore for that GW."""
    try:
        service = FPLExtraIngestionService(db)
        result = await service.ingest_event_live(season=req.season, gw=req.gw)
        await service.close()
        return {"status": "success", **result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


class EntryIngestRequest(BaseModel):
    season: str
    entry_id: int
    gw: Optional[int] = None
    cookie: Optional[str] = None


@router.post("/ingest/fpl/entry")
async def ingest_entry(req: EntryIngestRequest, db: Session = Depends(get_db)):
    """Store snapshots from entry endpoints (and /me, /my-team if cookie provided)."""
    try:
        service = FPLExtraIngestionService(db)
        result = await service.ingest_entry_endpoints(
            season=req.season,
            entry_id=req.entry_id,
            gw=req.gw,
            cookie=req.cookie,
        )
        await service.close()
        return {"status": "success", **result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

