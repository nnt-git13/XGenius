"""
PulseLive / PremierLeague.com data API client.

This is the structured JSON backing the pages like:
`https://www.premierleague.com/en/matches?...` and `https://www.premierleague.com/match/{matchId}`.
"""

from __future__ import annotations

import asyncio
import logging
from typing import Any, Dict, List, Optional

import httpx

logger = logging.getLogger(__name__)


class PremierLeagueAPI:
    SDP_BASE = "https://sdp-prem-prod.premier-league-prod.pulselive.com"

    def __init__(self, timeout: int = 30, rate_limit_s: float = 0.3):
        self.client = httpx.AsyncClient(timeout=timeout, headers={"accept": "application/json"})
        self.rate_limit_s = rate_limit_s

    async def close(self) -> None:
        await self.client.aclose()

    async def _get_json(self, url: str, params: Optional[Dict[str, Any]] = None) -> Any:
        # Simple rate limiter
        if self.rate_limit_s:
            await asyncio.sleep(self.rate_limit_s)
        resp = await self.client.get(url, params=params)
        resp.raise_for_status()
        return resp.json()

    async def list_matches(self, season: int, matchweek: Optional[int] = None, limit: int = 1000) -> List[Dict[str, Any]]:
        """
        List matches for a season (optionally scoped by matchweek).
        """
        # NOTE: This endpoint is cursor-paginated via `pagination._next`.
        # `_limit` is the per-page size (capped by the API; 100 works reliably).
        page_size = min(int(limit or 100), 100)
        params: Dict[str, Any] = {"competition": 8, "season": season, "_limit": page_size}
        if matchweek is not None:
            params["matchweek"] = matchweek
        url = f"{self.SDP_BASE}/api/v2/matches"
        out: List[Dict[str, Any]] = []
        next_cursor: Optional[str] = None
        seen: set[str] = set()

        while True:
            req_params = dict(params)
            if next_cursor:
                # Cursor token from previous response.
                req_params["_next"] = next_cursor

            payload = await self._get_json(url, params=req_params)
            data = payload.get("data") or []
            out.extend(data)

            # Stop early if caller only wanted a limited number of rows.
            if limit and len(out) >= limit:
                return out[:limit]

            pagination = payload.get("pagination") or {}
            nxt = pagination.get("_next")
            if not nxt:
                break
            if nxt in seen:
                logger.warning("Pagination cursor repeated; stopping to avoid infinite loop")
                break
            seen.add(nxt)
            next_cursor = str(nxt)

        return out

    async def get_match(self, match_id: str) -> Dict[str, Any]:
        return await self._get_json(f"{self.SDP_BASE}/api/v2/matches/{match_id}")

    async def get_match_stats(self, match_id: str) -> List[Dict[str, Any]]:
        # Returns list: [{ side, teamId, stats: {...} }, ...]
        return await self._get_json(f"{self.SDP_BASE}/api/v3/matches/{match_id}/stats")

    async def get_match_events(self, match_id: str) -> Dict[str, Any]:
        # Returns dict: { homeTeam: {...}, awayTeam: {...} }
        return await self._get_json(f"{self.SDP_BASE}/api/v1/matches/{match_id}/events")

    async def get_match_lineups(self, match_id: str) -> List[Dict[str, Any]]:
        # Returns list with 2 items (home/away): { teamId, formation, players, lineup, subs }
        return await self._get_json(f"{self.SDP_BASE}/api/v1/matches/{match_id}/lineups")

    async def get_team_squad(self, season: int, team_id: str) -> Dict[str, Any]:
        return await self._get_json(f"{self.SDP_BASE}/api/v2/competitions/8/seasons/{season}/teams/{team_id}/squad")

    async def get_player(self, player_id: str) -> Dict[str, Any]:
        return await self._get_json(f"{self.SDP_BASE}/api/v1/players/{player_id}")


