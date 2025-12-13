"""
Data ingestion service for FPL data.
Enhanced with validation and error handling.
"""
from __future__ import annotations
import csv
import io
import pandas as pd
from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session
from datetime import datetime

from app.models import Player, WeeklyScore, Team


class DataIngestionService:
    """Handles data ingestion from FPL API and CSVs."""
    
    REQUIRED_COLUMNS = ["Name", "GW", "Points", "Minutes"]
    
    def __init__(self, db: Session):
        self.db = db
    
    async def ingest_weekly_scores(
        self,
        season: str,
        gameweek: int,
        csv_file,
    ) -> Dict[str, Any]:
        """Ingest weekly scores from CSV with validation."""
        errors = []
        ingested_count = 0
        
        try:
            # Read CSV
            content = await csv_file.read()
            csv_text = content.decode("utf-8")
            
            # Parse CSV
            df = pd.read_csv(io.StringIO(csv_text))
            
            # Validate columns
            missing_cols = set(self.REQUIRED_COLUMNS) - set(df.columns)
            if missing_cols:
                raise ValueError(f"Missing required columns: {missing_cols}")
            
            # Process each row
            for _, row in df.iterrows():
                try:
                    player_name = row.get("Name") or row.get("name")
                    if not player_name or pd.isna(player_name):
                        continue
                    
                    # Find player
                    player = self.db.query(Player).filter(
                        Player.name.ilike(f"%{player_name}%")
                    ).first()
                    
                    if not player:
                        errors.append(f"Player not found: {player_name}")
                        continue
                    
                    # Parse gameweek
                    gw = int(row.get("GW", gameweek))
                    
                    # Create or update WeeklyScore
                    ws = (
                        self.db.query(WeeklyScore)
                        .filter(WeeklyScore.player_id == player.id)
                        .filter(WeeklyScore.season == season)
                        .filter(WeeklyScore.gw == gw)
                        .first()
                    )
                    
                    if not ws:
                        ws = WeeklyScore(
                            player_id=player.id,
                            season=season,
                            gw=gw,
                        )
                        self.db.add(ws)
                    
                    # Update fields
                    ws.points = float(row.get("Points", 0) or 0)
                    ws.minutes = int(row.get("Minutes", 0) or 0)
                    ws.goals_scored = int(row.get("Goals", 0) or 0)
                    ws.assists = int(row.get("Assists", 0) or 0)
                    ws.clean_sheets = int(row.get("Clean Sheets", 0) or 0)
                    ws.goals_conceded = int(row.get("Goals Conceded", 0) or 0)
                    ws.yellow_cards = int(row.get("Yellow Cards", 0) or 0)
                    ws.red_cards = int(row.get("Red Cards", 0) or 0)
                    ws.saves = int(row.get("Saves", 0) or 0)
                    ws.bonus = int(row.get("Bonus", 0) or 0)
                    
                    # Expected metrics if available
                    if "xG" in row and not pd.isna(row["xG"]):
                        ws.expected_goals = float(row["xG"])
                    if "xA" in row and not pd.isna(row["xA"]):
                        ws.expected_assists = float(row["xA"])
                    
                    ingested_count += 1
                    
                except Exception as e:
                    errors.append(f"Error processing row: {str(e)}")
                    continue
            
            # Commit changes
            self.db.commit()
            
            return {
                "status": "success",
                "season": season,
                "gameweek": gameweek,
                "ingested_count": ingested_count,
                "errors": errors[:10],  # Limit error output
                "error_count": len(errors),
            }
            
        except Exception as e:
            self.db.rollback()
            return {
                "status": "error",
                "message": str(e),
                "ingested_count": ingested_count,
            }
    
    async def bootstrap_season(self, season: str) -> Dict[str, Any]:
        """Bootstrap a season with initial player data from FPL API."""
        import requests
        
        try:
            base_url = "https://fantasy.premierleague.com/api"
            
            # Fetch bootstrap data
            response = requests.get(f"{base_url}/bootstrap-static/")
            data = response.json()
            
            # Process teams
            teams_map = {}
            for team_data in data.get("teams", []):
                team = (
                    self.db.query(Team)
                    .filter(Team.fpl_code == team_data["id"])
                    .first()
                )
                if not team:
                    team = Team(
                        fpl_code=team_data["id"],
                        name=team_data["name"],
                        short_name=team_data["short_name"],
                        strength=team_data.get("strength", 1000),
                    )
                    self.db.add(team)
                teams_map[team_data["id"]] = team
            
            # Process players
            players_processed = 0
            for player_data in data.get("elements", []):
                team_id = player_data.get("team")
                team = teams_map.get(team_id)
                
                if not team:
                    continue
                
                player = (
                    self.db.query(Player)
                    .filter(Player.fpl_code == player_data["id"])
                    .first()
                )
                
                if not player:
                    player = Player(
                        fpl_code=player_data["id"],
                        name=f"{player_data.get('first_name', '')} {player_data.get('second_name', '')}".strip(),
                        first_name=player_data.get("first_name", ""),
                        second_name=player_data.get("second_name", ""),
                        team_id=team.id,
                        position=self._map_position(player_data.get("element_type")),
                        price=player_data.get("now_cost", 0) / 10.0,  # Convert to millions
                        status=player_data.get("status", "a"),
                        element_type=player_data.get("element_type"),
                        total_points=player_data.get("total_points", 0),
                    )
                    self.db.add(player)
                    players_processed += 1
                else:
                    # Update existing player
                    player.price = player_data.get("now_cost", 0) / 10.0
                    player.status = player_data.get("status", "a")
                    player.total_points = player_data.get("total_points", 0)
            
            self.db.commit()
            
            return {
                "status": "success",
                "season": season,
                "players_processed": players_processed,
            }
            
        except Exception as e:
            self.db.rollback()
            return {
                "status": "error",
                "message": str(e),
            }
    
    def _map_position(self, element_type: Optional[int]) -> str:
        """Map FPL element_type to position string."""
        mapping = {
            1: "GK",
            2: "DEF",
            3: "MID",
            4: "FWD",
        }
        return mapping.get(element_type, "MID")
