"""
PremierLeague.com ingestion pipeline.

Backfills historical seasons once; incrementally updates current season by re-fetching
matches that are not FullTime (and refreshing recently played ones).
"""

from __future__ import annotations

import logging
from datetime import datetime
from typing import Any, Dict, List, Optional

from sqlalchemy.orm import Session

from app.models import (
    FPLApiSnapshot,
    PLIngestState,
    PLMatch,
    PLMatchEvent,
    PLMatchLineup,
    PLMatchTeamStats,
    PLPlayer,
    PLTeam,
)
from app.services.pl_api import PremierLeagueAPI

logger = logging.getLogger(__name__)


def _parse_kickoff(dt_str: Optional[str]) -> Optional[datetime]:
    if not dt_str:
        return None
    # Example: "2025-12-20 15:00:00"
    try:
        return datetime.fromisoformat(dt_str)
    except Exception:
        return None


def _safe_int(x: Any) -> Optional[int]:
    try:
        return int(x)
    except Exception:
        return None


class PremierLeagueIngestionService:
    def __init__(self, db: Session, rate_limit_s: float = 0.3):
        self.db = db
        self.api = PremierLeagueAPI(rate_limit_s=rate_limit_s)

    async def close(self) -> None:
        await self.api.close()

    async def backfill_season(self, season: int) -> Dict[str, Any]:
        """
        Backfill: list all matches for season, then ingest match + stats + lineups + events.
        """
        state = self._get_or_create_state(season)
        state.last_run_at = datetime.utcnow()
        state.last_error = None
        self.db.commit()

        matches = await self.api.list_matches(season=season)
        self._snapshot("pl.matches", season=season, payload=matches)

        ingested = 0
        for m in matches:
            match_id = str(m.get("matchId"))
            if not match_id:
                continue

            await self.ingest_match(season=season, match_id=match_id, listing=m)
            ingested += 1

        state.backfilled = 1
        state.last_run_at = datetime.utcnow()
        self.db.commit()
        return {"season": season, "matches_ingested": ingested}

    async def update_current_season(self, season: int, refresh_last_n: int = 60) -> Dict[str, Any]:
        """
        Incremental updater:
        - ingest matches not FullTime
        - also refresh most recent N matches (to catch late corrections)
        """
        matches = await self.api.list_matches(season=season)
        self._snapshot("pl.matches.current", season=season, payload=matches)

        # Sort by kickoff descending (fallback stable)
        matches_sorted = sorted(matches, key=lambda x: (x.get("kickoff") or ""), reverse=True)
        recent = matches_sorted[:refresh_last_n]

        # De-duplicate and avoid treating future scheduled fixtures (PreMatch) as "needs refresh".
        # We still keep them in the DB via prior backfills / match listing, but we don't need to
        # continuously re-fetch match detail/stats/lineups/events for them.
        processed: set[str] = set()

        async def _process(m: Dict[str, Any]) -> None:
            match_id = str(m.get("matchId"))
            if not match_id or match_id in processed:
                return
            processed.add(match_id)
            await self.ingest_match(season=season, match_id=match_id, listing=m)

        # Always refresh recent N matches (covers recently completed + today)
        for m in recent:
            await _process(m)

        # Ensure in-progress matches are included (even if not in recent window)
        for m in matches_sorted:
            period = (m.get("period") or "").lower()
            if period in ("prematch", "fulltime"):
                continue
            await _process(m)

        return {"season": season, "matches_refreshed": len(processed)}

    async def ingest_match(self, season: int, match_id: str, listing: Optional[Dict[str, Any]] = None) -> None:
        """
        Ingest one match: match row + team stats + lineups + events.
        """
        if not listing:
            listing = {}

        # Match detail is sometimes minimal; listing carries matchWeek, kickoff, teams, etc.
        detail = await self.api.get_match(match_id)
        self._snapshot("pl.match", season=season, payload=detail, extra={"match_id": match_id})

        home = (listing.get("homeTeam") or detail.get("homeTeam") or {})
        away = (listing.get("awayTeam") or detail.get("awayTeam") or {})
        self._upsert_team(home)
        self._upsert_team(away)

        plm = self.db.get(PLMatch, match_id)
        if not plm:
            plm = PLMatch(
                match_id=match_id,
                season=season,
                matchweek=_safe_int(listing.get("matchWeek") or detail.get("matchWeek")),
                kickoff=_parse_kickoff(listing.get("kickoff") or detail.get("kickoff")),
                ground=detail.get("ground"),
                attendance=_safe_int(detail.get("attendance")),
                period=detail.get("period") or listing.get("period"),
                phase=_safe_int(detail.get("phase") or listing.get("phase")),
                home_team_id=str(home.get("id")),
                away_team_id=str(away.get("id")),
            )
            self.db.add(plm)
        else:
            plm.matchweek = _safe_int(listing.get("matchWeek") or plm.matchweek)
            plm.kickoff = _parse_kickoff(listing.get("kickoff") or detail.get("kickoff")) or plm.kickoff
            plm.ground = detail.get("ground") or plm.ground
            plm.attendance = _safe_int(detail.get("attendance")) or plm.attendance
            plm.period = detail.get("period") or listing.get("period") or plm.period
            plm.phase = _safe_int(detail.get("phase") or listing.get("phase")) or plm.phase
            plm.home_team_id = str(home.get("id") or plm.home_team_id)
            plm.away_team_id = str(away.get("id") or plm.away_team_id)

        self.db.commit()

        # Stats (team-level)
        try:
            stats = await self.api.get_match_stats(match_id)
            self._snapshot("pl.match.stats", season=season, payload=stats, extra={"match_id": match_id})
            for s in stats or []:
                team_id = str(s.get("teamId"))
                side = s.get("side")
                stats_obj = (
                    self.db.query(PLMatchTeamStats)
                    .filter(PLMatchTeamStats.match_id == match_id)
                    .filter(PLMatchTeamStats.team_id == team_id)
                    .first()
                )
                if not stats_obj:
                    stats_obj = PLMatchTeamStats(match_id=match_id, team_id=team_id, side=side, stats=s.get("stats") or {})
                    self.db.add(stats_obj)
                else:
                    stats_obj.side = side
                    stats_obj.stats = s.get("stats") or {}
            self.db.commit()
        except Exception as e:
            logger.warning(f"Stats ingest failed for match {match_id}: {e}")
            self.db.rollback()

        # Lineups
        try:
            lineups = await self.api.get_match_lineups(match_id)
            self._snapshot("pl.match.lineups", season=season, payload=lineups, extra={"match_id": match_id})
            for l in lineups or []:
                team_id = str(l.get("teamId"))
                lu = (
                    self.db.query(PLMatchLineup)
                    .filter(PLMatchLineup.match_id == match_id)
                    .filter(PLMatchLineup.team_id == team_id)
                    .first()
                )
                if not lu:
                    lu = PLMatchLineup(
                        match_id=match_id,
                        team_id=team_id,
                        formation=l.get("formation"),
                        subs=l.get("subs"),
                        lineup=l.get("lineup"),
                        players=l.get("players"),
                    )
                    self.db.add(lu)
                else:
                    lu.formation = l.get("formation")
                    lu.subs = l.get("subs")
                    lu.lineup = l.get("lineup")
                    lu.players = l.get("players")

                # Upsert players from the lineup list with basic names
                for p in (l.get("players") or []):
                    pid = p.get("id")
                    if pid:
                        self._upsert_player_basic(pid=str(pid), known_name=p.get("knownName"), first_name=p.get("firstName"), last_name=p.get("lastName"), team_id=team_id)

            self.db.commit()
        except Exception as e:
            logger.warning(f"Lineup ingest failed for match {match_id}: {e}")
            self.db.rollback()

        # Events (goals/cards/subs)
        try:
            ev = await self.api.get_match_events(match_id)
            self._snapshot("pl.match.events", season=season, payload=ev, extra={"match_id": match_id})
            # Remove existing events and re-insert (simpler + idempotent)
            self.db.query(PLMatchEvent).filter(PLMatchEvent.match_id == match_id).delete()

            for side_key in ("homeTeam", "awayTeam"):
                t = ev.get(side_key) or {}
                team_id = str(t.get("id"))
                side = "home" if side_key == "homeTeam" else "away"

                for g in t.get("goals") or []:
                    self.db.add(
                        PLMatchEvent(
                            match_id=match_id,
                            team_id=team_id,
                            side=side,
                            event_type="goal",
                            period=g.get("period"),
                            minute=_safe_int(g.get("time")),
                            timestamp=g.get("timestamp"),
                            goal_type=g.get("goalType"),
                            player_id=str(g.get("playerId")) if g.get("playerId") else None,
                            assist_player_id=str(g.get("assistPlayerId")) if g.get("assistPlayerId") else None,
                        )
                    )
                    if g.get("playerId"):
                        self._upsert_player_basic(pid=str(g.get("playerId")))
                    if g.get("assistPlayerId"):
                        self._upsert_player_basic(pid=str(g.get("assistPlayerId")))

                for c in t.get("cards") or []:
                    self.db.add(
                        PLMatchEvent(
                            match_id=match_id,
                            team_id=team_id,
                            side=side,
                            event_type="card",
                            period=c.get("period"),
                            minute=_safe_int(c.get("time")),
                            timestamp=c.get("timestamp"),
                            card_type=c.get("type"),
                            player_id=str(c.get("playerId")) if c.get("playerId") else None,
                        )
                    )
                    if c.get("playerId"):
                        self._upsert_player_basic(pid=str(c.get("playerId")))

                for s in t.get("subs") or []:
                    self.db.add(
                        PLMatchEvent(
                            match_id=match_id,
                            team_id=team_id,
                            side=side,
                            event_type="sub",
                            period=s.get("period"),
                            minute=_safe_int(s.get("time")),
                            timestamp=s.get("timestamp"),
                            player_on_id=str(s.get("playerOnId")) if s.get("playerOnId") else None,
                            player_off_id=str(s.get("playerOffId")) if s.get("playerOffId") else None,
                        )
                    )
                    if s.get("playerOnId"):
                        self._upsert_player_basic(pid=str(s.get("playerOnId")))
                    if s.get("playerOffId"):
                        self._upsert_player_basic(pid=str(s.get("playerOffId")))

            self.db.commit()
        except Exception as e:
            logger.warning(f"Event ingest failed for match {match_id}: {e}")
            self.db.rollback()

    def _get_or_create_state(self, season: int) -> PLIngestState:
        st = self.db.query(PLIngestState).filter(PLIngestState.season == season).first()
        if not st:
            st = PLIngestState(season=season, backfilled=0)
            self.db.add(st)
            self.db.commit()
        return st

    def _upsert_team(self, t: Dict[str, Any]) -> None:
        tid = t.get("id")
        if not tid:
            return
        tid = str(tid)
        team = self.db.get(PLTeam, tid)
        if not team:
            team = PLTeam(id=tid, name=t.get("name") or tid, short_name=t.get("shortName"), abbr=t.get("abbr"))
            self.db.add(team)
        else:
            team.name = t.get("name") or team.name
            team.short_name = t.get("shortName") or team.short_name
            team.abbr = t.get("abbr") or team.abbr
        self.db.flush()

    def _upsert_player_basic(
        self,
        pid: str,
        known_name: Optional[str] = None,
        first_name: Optional[str] = None,
        last_name: Optional[str] = None,
        team_id: Optional[str] = None,
    ) -> None:
        player = self.db.get(PLPlayer, pid)
        if not player:
            player = PLPlayer(id=pid, known_name=known_name, first_name=first_name, last_name=last_name, team_id=team_id)
            self.db.add(player)
        else:
            if known_name:
                player.known_name = known_name
            if first_name:
                player.first_name = first_name
            if last_name:
                player.last_name = last_name
            if team_id:
                player.team_id = team_id
        self.db.flush()

    def _snapshot(self, endpoint: str, season: int, payload: Any, extra: Optional[Dict[str, Any]] = None) -> None:
        # Reuse existing snapshot mechanism; store PL payloads too.
        snap = FPLApiSnapshot(
            season=str(season),
            endpoint=endpoint,
            entry_id=None,
            gw=None,
            payload={"extra": extra or {}, "data": payload},
        )
        self.db.add(snap)
        self.db.commit()



