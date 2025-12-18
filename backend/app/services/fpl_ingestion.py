"""
Service for ingesting FPL API data into the database.
"""
from __future__ import annotations
import logging
from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import and_

from app.services.fpl_api import FPLAPIService
from app.models.player import Player
from app.models.fixture import Team, Fixture

logger = logging.getLogger(__name__)


class FPLIngestionService:
    """Service for ingesting FPL data into the database."""
    
    def __init__(self, db: Session):
        self.db = db
        self.fpl_api = FPLAPIService()
        self.season = "2024-25"  # Default season
    
    async def close(self):
        """Close API client."""
        await self.fpl_api.close()
    
    async def ingest_bootstrap_static(self, season: str = "2024-25") -> Dict[str, int]:
        """
        Ingest all bootstrap-static data (teams, players, gameweeks).
        
        Args:
            season: Season identifier (e.g., "2024-25")
            
        Returns:
            Dictionary with counts of ingested items
        """
        self.season = season
        logger.info(f"Starting bootstrap-static ingestion for season {season}")
        
        # Fetch data from API
        data = await self.fpl_api.fetch_bootstrap_static()
        
        counts = {
            "teams": 0,
            "players": 0,
            "gameweeks": 0,
            "fixtures": 0,
        }
        
        # Ingest teams
        if "teams" in data:
            counts["teams"] = await self._ingest_teams(data["teams"])
        
        # Ingest players
        if "elements" in data:
            counts["players"] = await self._ingest_players(data["elements"], data.get("teams", []))
        
        # Ingest gameweeks (events)
        if "events" in data:
            counts["gameweeks"] = self._ingest_gameweeks(data["events"])
        
        # Ingest fixtures
        try:
            fixtures_data = await self.fpl_api.fetch_fixtures()
            counts["fixtures"] = await self._ingest_fixtures(fixtures_data)
        except Exception as e:
            logger.warning(f"Could not fetch fixtures: {e}")
        
        self.db.commit()
        logger.info(f"Bootstrap-static ingestion complete: {counts}")
        return counts
    
    async def _ingest_teams(self, teams_data: List[Dict[str, Any]]) -> int:
        """Ingest teams from FPL API data."""
        count = 0
        for team_data in teams_data:
            team = self.db.query(Team).filter(Team.fpl_id == team_data["id"]).first()
            
            if not team:
                team = Team(
                    fpl_id=team_data["id"],
                    fpl_code=team_data.get("code"),
                    name=team_data["name"],
                    short_name=team_data.get("short_name", team_data["name"][:3]),
                )
                self.db.add(team)
                count += 1
            else:
                # Update existing team
                team.name = team_data["name"]
                team.short_name = team_data.get("short_name", team_data["name"][:3])
                team.fpl_code = team_data.get("code")
            
        self.db.commit()
        logger.info(f"Ingested {count} new teams")
        return count
    
    async def _ingest_players(self, players_data: List[Dict[str, Any]], teams_data: List[Dict[str, Any]]) -> int:
        """Ingest players from FPL API data."""
        # Create team lookup
        team_lookup = {t["id"]: t for t in teams_data}
        
        count = 0
        for player_data in players_data:
            # Find team in database
            team = self.db.query(Team).filter(Team.fpl_id == player_data["team"]).first()
            if not team:
                logger.warning(f"Team {player_data['team']} not found for player {player_data.get('web_name')}")
                continue
            
            # Check if player exists
            player = self.db.query(Player).filter(Player.fpl_code == player_data["code"]).first()
            
            position = self.fpl_api.parse_position(player_data["element_type"])
            price = self.fpl_api.parse_price(player_data["now_cost"])
            # Calculate initial price: now_cost - cost_change_start (cost_change_start is negative if price increased)
            cost_change_start = player_data.get("cost_change_start", 0)
            initial_price = self.fpl_api.parse_price(player_data["now_cost"] - cost_change_start)
            
            if not player:
                player = Player(
                    fpl_code=player_data["code"],
                    name=f"{player_data.get('first_name', '')} {player_data.get('second_name', '')}".strip(),
                    first_name=player_data.get("first_name"),
                    second_name=player_data.get("second_name"),
                    team_id=team.id,
                    position=position,
                    price=price,
                    initial_price=initial_price,
                    status=player_data.get("status", "a"),
                    news=player_data.get("news"),
                    news_added=self.fpl_api.parse_datetime(player_data.get("news_added")),
                    chance_of_playing_this_round=player_data.get("chance_of_playing_this_round"),
                    chance_of_playing_next_round=player_data.get("chance_of_playing_next_round"),
                    element_type=player_data["element_type"],
                    total_points=float(player_data.get("total_points", 0)),
                    goals_scored=player_data.get("goals_scored", 0),
                    assists=player_data.get("assists", 0),
                    clean_sheets=player_data.get("clean_sheets", 0),
                    goals_conceded=player_data.get("goals_conceded", 0),
                    yellow_cards=player_data.get("yellow_cards", 0),
                    red_cards=player_data.get("red_cards", 0),
                    saves=player_data.get("saves", 0),
                    bonus=player_data.get("bonus", 0),
                    bps=player_data.get("bps", 0),
                )
                self.db.add(player)
                count += 1
            else:
                # Update existing player
                player.name = f"{player_data.get('first_name', '')} {player_data.get('second_name', '')}".strip()
                player.first_name = player_data.get("first_name")
                player.second_name = player_data.get("second_name")
                player.price = price
                player.status = player_data.get("status", "a")
                player.news = player_data.get("news")
                player.news_added = self.fpl_api.parse_datetime(player_data.get("news_added"))
                player.chance_of_playing_this_round = player_data.get("chance_of_playing_this_round")
                player.chance_of_playing_next_round = player_data.get("chance_of_playing_next_round")
                player.total_points = float(player_data.get("total_points", 0))
                player.goals_scored = player_data.get("goals_scored", 0)
                player.assists = player_data.get("assists", 0)
                player.clean_sheets = player_data.get("clean_sheets", 0)
                player.goals_conceded = player_data.get("goals_conceded", 0)
                player.yellow_cards = player_data.get("yellow_cards", 0)
                player.red_cards = player_data.get("red_cards", 0)
                player.saves = player_data.get("saves", 0)
                player.bonus = player_data.get("bonus", 0)
                player.bps = player_data.get("bps", 0)
        
        self.db.commit()
        logger.info(f"Ingested {count} new players, updated existing players")
        return count
    
    def _ingest_gameweeks(self, events_data: List[Dict[str, Any]]) -> int:
        """Ingest gameweeks (events) from FPL API data."""
        # Note: We don't have a Gameweek model yet, but we can store this info
        # in the WeeklyScore model or create a Gameweek model if needed
        count = len(events_data)
        logger.info(f"Found {count} gameweeks in API data")
        # For now, we'll just log this. Gameweek info is used when ingesting fixtures
        return count
    
    async def _ingest_fixtures(self, fixtures_data: List[Dict[str, Any]]) -> int:
        """Ingest fixtures from FPL API data."""
        count = 0
        for fixture_data in fixtures_data:
            # Find teams
            team_h = self.db.query(Team).filter(Team.fpl_id == fixture_data["team_h"]).first()
            team_a = self.db.query(Team).filter(Team.fpl_id == fixture_data["team_a"]).first()
            
            if not team_h or not team_a:
                logger.warning(f"Teams not found for fixture {fixture_data.get('id')}")
                continue
            
            # Check if fixture exists
            fixture = self.db.query(Fixture).filter(
                and_(
                    Fixture.fpl_id == fixture_data["id"],
                    Fixture.season == self.season
                )
            ).first()
            
            if not fixture:
                fixture = Fixture(
                    fpl_id=fixture_data["id"],
                    season=self.season,
                    gw=fixture_data.get("event", 0) or 0,
                    team_h_id=team_h.id,
                    team_a_id=team_a.id,
                    kickoff_time=self.fpl_api.parse_datetime(fixture_data.get("kickoff_time")),
                    team_h_score=fixture_data.get("team_h_score"),
                    team_a_score=fixture_data.get("team_a_score"),
                    finished=fixture_data.get("finished", False),
                    team_h_difficulty=fixture_data.get("team_h_difficulty", 3),
                    team_a_difficulty=fixture_data.get("team_a_difficulty", 3),
                )
                self.db.add(fixture)
                count += 1
            else:
                # Update existing fixture
                fixture.team_h_score = fixture_data.get("team_h_score")
                fixture.team_a_score = fixture_data.get("team_a_score")
                fixture.finished = fixture_data.get("finished", False)
        
        self.db.commit()
        logger.info(f"Ingested {count} new fixtures")
        return count

