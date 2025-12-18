"""Player endpoints."""
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session, joinedload
from typing import List, Optional
from pydantic import BaseModel
from app.core.database import get_db
from app.models.player import Player
from app.models.fixture import Team

router = APIRouter()


class PlayerResponse(BaseModel):
    """Player response schema matching database model."""
    id: int
    fpl_code: Optional[int] = None
    name: str
    first_name: Optional[str] = None
    second_name: Optional[str] = None
    position: str
    price: float
    initial_price: Optional[float] = None
    status: str
    team_id: int
    team_name: Optional[str] = None
    team_short_name: Optional[str] = None
    total_points: float = 0.0
    goals_scored: int = 0
    assists: int = 0
    clean_sheets: int = 0
    goals_conceded: int = 0
    saves: int = 0
    bonus: int = 0
    bps: int = 0
    
    class Config:
        from_attributes = True


@router.get("/", response_model=List[PlayerResponse])
async def list_players(
    team: Optional[str] = Query(None, description="Filter by team name or short name"),
    position: Optional[str] = Query(None, description="Filter by position (GK/DEF/MID/FWD)"),
    season: Optional[str] = None,
    limit: int = Query(default=100, le=1000),
    offset: int = Query(default=0, ge=0),
    search: Optional[str] = Query(None, description="Search by player name"),
    db: Session = Depends(get_db),
):
    """List players with optional filters."""
    # Always join with Team to get team info (use outerjoin to handle players without teams)
    query = db.query(Player).outerjoin(Team, Player.team_id == Team.id).options(joinedload(Player.team))
    
    # Filter by position
    if position:
        query = query.filter(Player.position == position.upper())
    
    # Filter by team
    if team:
        query = query.filter(
            (Team.name.ilike(f"%{team}%")) | (Team.short_name.ilike(f"%{team}%"))
        )
    
    # Search by name
    if search:
        query = query.filter(
            (Player.name.ilike(f"%{search}%")) |
            (Player.first_name.ilike(f"%{search}%")) |
            (Player.second_name.ilike(f"%{search}%"))
        )
    
    players = query.offset(offset).limit(limit).all()
    
    # Convert to response format
    result = []
    for player in players:
        player_dict = {
            "id": player.id,
            "fpl_code": player.fpl_code,
            "name": player.name,
            "first_name": player.first_name,
            "second_name": player.second_name,
            "position": player.position,
            "price": player.price,
            "initial_price": player.initial_price,
            "status": player.status,
            "team_id": player.team_id,
            "team_name": player.team.name if player.team else None,
            "team_short_name": player.team.short_name if player.team else None,
            "total_points": player.total_points,
            "goals_scored": player.goals_scored,
            "assists": player.assists,
            "clean_sheets": player.clean_sheets,
            "goals_conceded": player.goals_conceded,
            "saves": player.saves,
            "bonus": player.bonus,
            "bps": player.bps,
        }
        result.append(PlayerResponse(**player_dict))
    
    return result


@router.get("/{player_id}", response_model=PlayerResponse)
async def get_player(
    player_id: int,
    db: Session = Depends(get_db),
):
    """Get a specific player by ID."""
    player = db.query(Player).options(joinedload(Player.team)).filter(Player.id == player_id).first()
    if not player:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Player not found")
    
    return PlayerResponse(
        id=player.id,
        fpl_code=player.fpl_code,
        name=player.name,
        first_name=player.first_name,
        second_name=player.second_name,
        position=player.position,
        price=player.price,
        initial_price=player.initial_price,
        status=player.status,
        team_id=player.team_id,
        team_name=player.team.name if player.team else None,
        team_short_name=player.team.short_name if player.team else None,
        total_points=player.total_points,
        goals_scored=player.goals_scored,
        assists=player.assists,
        clean_sheets=player.clean_sheets,
        goals_conceded=player.goals_conceded,
        saves=player.saves,
        bonus=player.bonus,
        bps=player.bps,
    )

