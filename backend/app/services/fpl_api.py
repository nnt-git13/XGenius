"""
Service for fetching data from Fantasy Premier League API.
"""
from __future__ import annotations
import httpx
import logging
from typing import Dict, Any, List, Optional
from datetime import datetime

logger = logging.getLogger(__name__)

FPL_API_BASE = "https://fantasy.premierleague.com/api"


class FPLAPIService:
    """Service for interacting with the FPL API."""
    
    def __init__(self, timeout: int = 30):
        self.timeout = timeout
        self.client = httpx.AsyncClient(timeout=timeout)
    
    async def close(self):
        """Close the HTTP client."""
        await self.client.aclose()
    
    async def fetch_bootstrap_static(self) -> Dict[str, Any]:
        """
        Fetch bootstrap-static data from FPL API.
        
        Returns:
            Dictionary containing:
            - elements (players)
            - teams
            - element_types (positions)
            - events (gameweeks)
            - phases
            - total_players
            - game_settings
        """
        try:
            response = await self.client.get(f"{FPL_API_BASE}/bootstrap-static/")
            response.raise_for_status()
            data = response.json()
            logger.info(f"Fetched bootstrap-static: {len(data.get('elements', []))} players, {len(data.get('teams', []))} teams")
            return data
        except httpx.HTTPError as e:
            logger.error(f"Error fetching bootstrap-static: {e}")
            raise
    
    async def fetch_player_details(self, player_id: int) -> Dict[str, Any]:
        """
        Fetch detailed player data including history and fixtures.
        
        Args:
            player_id: FPL player ID
            
        Returns:
            Player details including history, fixtures, history_past
        """
        try:
            response = await self.client.get(f"{FPL_API_BASE}/element-summary/{player_id}/")
            response.raise_for_status()
            return response.json()
        except httpx.HTTPError as e:
            logger.error(f"Error fetching player {player_id}: {e}")
            raise
    
    async def fetch_fixtures(self) -> List[Dict[str, Any]]:
        """
        Fetch all fixtures for the current season.
        
        Returns:
            List of fixture dictionaries
        """
        try:
            response = await self.client.get(f"{FPL_API_BASE}/fixtures/")
            response.raise_for_status()
            fixtures = response.json()
            logger.info(f"Fetched {len(fixtures)} fixtures")
            return fixtures
        except httpx.HTTPError as e:
            logger.error(f"Error fetching fixtures: {e}")
            raise

    async def fetch_event_live(self, gw_id: int) -> Dict[str, Any]:
        """
        Fetch live gameweek data for all elements.
        Endpoint: /event/{gw_id}/live/
        """
        try:
            response = await self.client.get(f"{FPL_API_BASE}/event/{gw_id}/live/")
            response.raise_for_status()
            return response.json()
        except httpx.HTTPError as e:
            logger.error(f"Error fetching event live GW {gw_id}: {e}")
            raise

    async def fetch_entry_details(self, entry_id: int) -> Dict[str, Any]:
        """Endpoint: /entry/{entry_id}/"""
        try:
            response = await self.client.get(f"{FPL_API_BASE}/entry/{entry_id}/")
            response.raise_for_status()
            return response.json()
        except httpx.HTTPError as e:
            logger.error(f"Error fetching entry details {entry_id}: {e}")
            raise

    async def fetch_entry_history(self, entry_id: int) -> Dict[str, Any]:
        """Endpoint: /entry/{entry_id}/history/"""
        try:
            response = await self.client.get(f"{FPL_API_BASE}/entry/{entry_id}/history/")
            response.raise_for_status()
            return response.json()
        except httpx.HTTPError as e:
            logger.error(f"Error fetching entry history {entry_id}: {e}")
            raise

    async def fetch_entry_transfers(self, entry_id: int) -> List[Dict[str, Any]]:
        """Endpoint: /entry/{entry_id}/transfers/"""
        try:
            response = await self.client.get(f"{FPL_API_BASE}/entry/{entry_id}/transfers/")
            response.raise_for_status()
            return response.json()
        except httpx.HTTPError as e:
            logger.error(f"Error fetching entry transfers {entry_id}: {e}")
            raise

    async def fetch_entry_picks(self, entry_id: int, gw_id: int) -> Dict[str, Any]:
        """Endpoint: /entry/{entry_id}/event/{gw_id}/picks/"""
        try:
            response = await self.client.get(f"{FPL_API_BASE}/entry/{entry_id}/event/{gw_id}/picks/")
            response.raise_for_status()
            return response.json()
        except httpx.HTTPError as e:
            logger.error(f"Error fetching entry picks {entry_id} GW {gw_id}: {e}")
            raise

    async def fetch_me(self, cookie: str) -> Dict[str, Any]:
        """Endpoint: /me/ (requires authentication cookie)."""
        try:
            response = await self.client.get(
                f"{FPL_API_BASE}/me/",
                headers={"cookie": cookie},
            )
            response.raise_for_status()
            return response.json()
        except httpx.HTTPError as e:
            logger.error(f"Error fetching /me/: {e}")
            raise

    async def fetch_my_team(self, team_id: int, cookie: str) -> Dict[str, Any]:
        """Endpoint: /my-team/{team_id}/ (requires authentication cookie)."""
        try:
            response = await self.client.get(
                f"{FPL_API_BASE}/my-team/{team_id}/",
                headers={"cookie": cookie},
            )
            response.raise_for_status()
            return response.json()
        except httpx.HTTPError as e:
            logger.error(f"Error fetching /my-team/{team_id}: {e}")
            raise
    
    def parse_position(self, element_type: int) -> str:
        """Convert FPL element_type to position string."""
        position_map = {1: "GK", 2: "DEF", 3: "MID", 4: "FWD"}
        return position_map.get(element_type, "UNK")
    
    def parse_price(self, now_cost: int) -> float:
        """Convert FPL price (in tenths) to millions."""
        return now_cost / 10.0
    
    def parse_datetime(self, dt_str: Optional[str]) -> Optional[datetime]:
        """Parse FPL datetime string."""
        if not dt_str:
            return None
        try:
            return datetime.fromisoformat(dt_str.replace("Z", "+00:00"))
        except (ValueError, AttributeError):
            return None

