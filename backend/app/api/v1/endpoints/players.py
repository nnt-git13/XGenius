"""Player endpoints."""
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from app.core.database import get_db
from app.schemas.player import PlayerOut
from app.models.player import Player

router = APIRouter()


@router.get("/", response_model=List[PlayerOut])
async def list_players(
    team: Optional[str] = None,
    position: Optional[str] = None,
    season: Optional[str] = None,
    limit: int = Query(default=100, le=1000),
    offset: int = Query(default=0, ge=0),
    db: Session = Depends(get_db),
):
    """List players with optional filters."""
    query = db.query(Player)
    
    if team:
        query = query.filter(Player.team == team)
    if position:
        query = query.filter(Player.position == position)
    
    players = query.offset(offset).limit(limit).all()
    return players


@router.get("/{player_id}", response_model=PlayerOut)
async def get_player(
    player_id: int,
    db: Session = Depends(get_db),
):
    """Get a specific player by ID."""
    player = db.query(Player).filter(Player.id == player_id).first()
    if not player:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Player not found")
    return player

