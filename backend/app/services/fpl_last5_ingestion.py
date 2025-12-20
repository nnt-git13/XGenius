"""
Backfill last N seasons of player season summaries from FPL element-summary history_past.

Note: Official FPL API doesn't expose full historical gameweek-by-gameweek data for
past seasons in bulk. `history_past` provides season-level summaries, which is what
we ingest here.
"""

from __future__ import annotations

import logging
import re
from typing import Dict, Any, List, Optional

from sqlalchemy.orm import Session

from app.models import Player, PlayerSeasonStat
from app.services.fpl_api import FPLAPIService

logger = logging.getLogger(__name__)


def _normalize_season_name(season_name: str) -> Optional[str]:
    """
    Convert FPL season_name like "2023/24" to "2023-24".
    """
    if not season_name:
        return None
    m = re.match(r"^\s*(\d{4})\s*/\s*(\d{2})\s*$", str(season_name))
    if not m:
        return None
    return f"{m.group(1)}-{m.group(2)}"


class FPLLastNSeasonsIngestionService:
    def __init__(self, db: Session):
        self.db = db
        self.fpl_api = FPLAPIService()

    async def close(self) -> None:
        await self.fpl_api.close()

    async def ingest_player_season_summaries(
        self,
        seasons: List[str],
        limit_players: Optional[int] = None,
    ) -> Dict[str, Any]:
        """
        For each player with fpl_id, fetch element-summary and ingest history_past rows
        for the requested seasons.
        """
        q = self.db.query(Player).filter(Player.fpl_id.isnot(None))
        if limit_players:
            q = q.limit(limit_players)
        players = q.all()

        created = 0
        updated = 0
        missing = 0

        for p in players:
            try:
                payload = await self.fpl_api.fetch_player_details(int(p.fpl_id))
            except Exception as e:
                logger.warning(f"Failed element-summary for player {p.id} fpl_id={p.fpl_id}: {e}")
                continue

            history_past = payload.get("history_past") or []
            for row in history_past:
                s = _normalize_season_name(row.get("season_name"))
                if not s or s not in seasons:
                    continue

                stat = (
                    self.db.query(PlayerSeasonStat)
                    .filter(PlayerSeasonStat.player_id == p.id)
                    .filter(PlayerSeasonStat.season == s)
                    .first()
                )
                if not stat:
                    stat = PlayerSeasonStat(player_id=p.id, season=s)
                    self.db.add(stat)
                    created += 1
                else:
                    updated += 1

                stat.total_points = int(row.get("total_points") or 0)
                stat.minutes = int(row.get("minutes") or 0)
                stat.goals_scored = int(row.get("goals_scored") or 0)
                stat.assists = int(row.get("assists") or 0)
                stat.clean_sheets = int(row.get("clean_sheets") or 0)
                stat.goals_conceded = int(row.get("goals_conceded") or 0)
                stat.yellow_cards = int(row.get("yellow_cards") or 0)
                stat.red_cards = int(row.get("red_cards") or 0)
                stat.starts = int(row.get("starts") or 0)
                stat.bonus = int(row.get("bonus") or 0)
                stat.bps = int(row.get("bps") or 0)
                stat.influence = float(row.get("influence") or 0.0)
                stat.creativity = float(row.get("creativity") or 0.0)
                stat.threat = float(row.get("threat") or 0.0)
                stat.ict_index = float(row.get("ict_index") or 0.0)

            # If a player has no history_past entries in our range, count as missing for visibility.
            if not any(_normalize_season_name(r.get("season_name")) in seasons for r in history_past):
                missing += 1

        self.db.commit()
        return {
            "players_processed": len(players),
            "stats_created": created,
            "stats_updated": updated,
            "players_missing_history_in_range": missing,
            "seasons": seasons,
        }



