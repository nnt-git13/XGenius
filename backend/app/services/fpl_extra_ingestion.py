"""
Ingestion for additional FPL endpoints beyond bootstrap-static/fixtures.

- event/{gw}/live -> updates WeeklyScore
- entry/* and /me/, /my-team/* -> stores raw snapshots
"""

from __future__ import annotations

import logging
from typing import Any, Dict, Optional

from sqlalchemy.orm import Session

from app.models import Player, WeeklyScore, FPLApiSnapshot
from app.services.fpl_api import FPLAPIService

logger = logging.getLogger(__name__)


class FPLExtraIngestionService:
    def __init__(self, db: Session):
        self.db = db
        self.fpl_api = FPLAPIService()

    async def close(self) -> None:
        await self.fpl_api.close()

    async def ingest_event_live(self, season: str, gw: int) -> Dict[str, Any]:
        """
        Pull /event/{gw}/live and upsert WeeklyScore rows using Player.fpl_id mapping.
        """
        payload = await self.fpl_api.fetch_event_live(gw)
        self._save_snapshot(season=season, endpoint="event-live", gw=gw, payload=payload)

        elements = payload.get("elements") or []
        updated = 0
        missing_player = 0

        for el in elements:
            element_id = el.get("id")
            stats = el.get("stats") or {}
            if not element_id:
                continue

            player = (
                self.db.query(Player)
                .filter(Player.fpl_id == int(element_id))
                .first()
            )
            if not player:
                missing_player += 1
                continue

            ws = (
                self.db.query(WeeklyScore)
                .filter(WeeklyScore.player_id == player.id)
                .filter(WeeklyScore.season == season)
                .filter(WeeklyScore.gw == gw)
                .first()
            )
            if not ws:
                ws = WeeklyScore(player_id=player.id, season=season, gw=gw)
                self.db.add(ws)

            # Core
            ws.minutes = int(stats.get("minutes") or 0)
            ws.points = float(stats.get("total_points") or 0)
            ws.bonus = int(stats.get("bonus") or 0) if hasattr(ws, "bonus") else ws.bonus

            # Common stat names in event live payload:
            # https://fantasy.premierleague.com/api/event/{gw}/live/
            ws.goals_scored = int(stats.get("goals_scored") or 0) if hasattr(ws, "goals_scored") else ws.goals_scored
            ws.assists = int(stats.get("assists") or 0) if hasattr(ws, "assists") else ws.assists
            ws.clean_sheets = int(stats.get("clean_sheets") or 0) if hasattr(ws, "clean_sheets") else ws.clean_sheets
            ws.goals_conceded = int(stats.get("goals_conceded") or 0) if hasattr(ws, "goals_conceded") else ws.goals_conceded
            ws.yellow_cards = int(stats.get("yellow_cards") or 0) if hasattr(ws, "yellow_cards") else ws.yellow_cards
            ws.red_cards = int(stats.get("red_cards") or 0) if hasattr(ws, "red_cards") else ws.red_cards
            ws.saves = int(stats.get("saves") or 0) if hasattr(ws, "saves") else ws.saves

            # Expected metrics
            if hasattr(ws, "expected_goals"):
                ws.expected_goals = float(stats.get("expected_goals") or 0.0)
            if hasattr(ws, "expected_assists"):
                ws.expected_assists = float(stats.get("expected_assists") or 0.0)
            if hasattr(ws, "expected_goal_involvements"):
                ws.expected_goal_involvements = float(stats.get("expected_goal_involvements") or 0.0)
            if hasattr(ws, "expected_goals_conceded"):
                ws.expected_goals_conceded = float(stats.get("expected_goals_conceded") or 0.0)

            updated += 1

        self.db.commit()
        return {
            "season": season,
            "gw": gw,
            "updated_weekly_scores": updated,
            "missing_players": missing_player,
        }

    async def ingest_entry_endpoints(
        self,
        season: str,
        entry_id: int,
        gw: Optional[int] = None,
        cookie: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Store raw snapshots for entry endpoints.
        Cookie is only required for /me and /my-team.
        """
        snapshots = 0

        details = await self.fpl_api.fetch_entry_details(entry_id)
        self._save_snapshot(season, "entry-details", payload=details, entry_id=entry_id)
        snapshots += 1

        history = await self.fpl_api.fetch_entry_history(entry_id)
        self._save_snapshot(season, "entry-history", payload=history, entry_id=entry_id)
        snapshots += 1

        transfers = await self.fpl_api.fetch_entry_transfers(entry_id)
        self._save_snapshot(season, "entry-transfers", payload=transfers, entry_id=entry_id)
        snapshots += 1

        if gw is not None:
            picks = await self.fpl_api.fetch_entry_picks(entry_id, gw)
            self._save_snapshot(season, "entry-picks", payload=picks, entry_id=entry_id, gw=gw)
            snapshots += 1

        if cookie:
            me = await self.fpl_api.fetch_me(cookie=cookie)
            self._save_snapshot(season, "me", payload=me, entry_id=entry_id)
            snapshots += 1

            my_team = await self.fpl_api.fetch_my_team(team_id=entry_id, cookie=cookie)
            self._save_snapshot(season, "my-team", payload=my_team, entry_id=entry_id)
            snapshots += 1

        self.db.commit()
        return {"season": season, "entry_id": entry_id, "gw": gw, "snapshots_saved": snapshots}

    def _save_snapshot(
        self,
        season: str,
        endpoint: str,
        payload: Any,
        entry_id: Optional[int] = None,
        gw: Optional[int] = None,
    ) -> None:
        snap = FPLApiSnapshot(
            season=season,
            endpoint=endpoint,
            entry_id=entry_id,
            gw=gw,
            payload=payload,
        )
        self.db.add(snap)


