"""
SQLite schema migration helpers.

We don't currently maintain Alembic revisions in this repo, so for SQLite dev
we apply lightweight, additive migrations at startup/CLI init to keep existing
DB files working after model changes.
"""

from __future__ import annotations

from sqlalchemy import Engine, text


def _has_column(conn, table: str, column: str) -> bool:
    rows = conn.execute(text(f"PRAGMA table_info({table})")).fetchall()
    # PRAGMA table_info returns: cid, name, type, notnull, dflt_value, pk
    return any(r[1] == column for r in rows)


def ensure_sqlite_schema(engine: Engine) -> None:
    """
    Apply additive migrations for SQLite:
    - add players.fpl_id
    - ensure fpl_api_snapshots table exists
    - ensure player_season_stats table exists (added later)
    """
    if engine.dialect.name != "sqlite":
        return

    with engine.begin() as conn:
        # players.fpl_id
        try:
            if _has_column(conn, "players", "id") and not _has_column(conn, "players", "fpl_id"):
                conn.execute(text("ALTER TABLE players ADD COLUMN fpl_id INTEGER"))
                conn.execute(text("CREATE INDEX IF NOT EXISTS ix_players_fpl_id ON players (fpl_id)"))
        except Exception:
            # players table may not exist yet; create_all will handle it.
            pass

        # Snapshot table (raw payload storage)
        # SQLite DB-API only allows one statement per execute().
        conn.execute(
            text(
                """
CREATE TABLE IF NOT EXISTS fpl_api_snapshots (
  id INTEGER PRIMARY KEY,
  season VARCHAR(16) NOT NULL,
  endpoint VARCHAR(64) NOT NULL,
  entry_id INTEGER,
  gw INTEGER,
  payload JSON NOT NULL,
  fetched_at DATETIME NOT NULL
)
"""
            )
        )
        conn.execute(
            text(
                """
CREATE INDEX IF NOT EXISTS idx_fpl_snapshot_lookup
  ON fpl_api_snapshots (season, endpoint, entry_id, gw, fetched_at)
"""
            )
        )

        # Player season stats table (historical backfill from element-summary history_past)
        conn.execute(
            text(
                """
CREATE TABLE IF NOT EXISTS player_season_stats (
  id INTEGER PRIMARY KEY,
  player_id INTEGER NOT NULL,
  season VARCHAR(16) NOT NULL,
  total_points INTEGER DEFAULT 0,
  minutes INTEGER DEFAULT 0,
  goals_scored INTEGER DEFAULT 0,
  assists INTEGER DEFAULT 0,
  clean_sheets INTEGER DEFAULT 0,
  goals_conceded INTEGER DEFAULT 0,
  yellow_cards INTEGER DEFAULT 0,
  red_cards INTEGER DEFAULT 0,
  starts INTEGER DEFAULT 0,
  bonus INTEGER DEFAULT 0,
  bps INTEGER DEFAULT 0,
  influence FLOAT DEFAULT 0,
  creativity FLOAT DEFAULT 0,
  threat FLOAT DEFAULT 0,
  ict_index FLOAT DEFAULT 0,
  created_at DATETIME NOT NULL
)
"""
            )
        )
        conn.execute(
            text(
                """
CREATE UNIQUE INDEX IF NOT EXISTS uq_player_season_stats_player_season
  ON player_season_stats (player_id, season)
"""
            )
        )

        # PremierLeague.com ingestion tables: ensure uniqueness constraints exist even for older DB files
        # (SQLAlchemy create_all will not always backfill indexes on existing tables).
        try:
            conn.execute(
                text(
                    """
CREATE UNIQUE INDEX IF NOT EXISTS uq_pl_match_team_stats
  ON pl_match_team_stats (match_id, team_id)
"""
                )
            )
        except Exception:
            pass
        try:
            conn.execute(
                text(
                    """
CREATE UNIQUE INDEX IF NOT EXISTS uq_pl_match_lineup
  ON pl_match_lineups (match_id, team_id)
"""
                )
            )
        except Exception:
            pass
        try:
            conn.execute(
                text(
                    """
CREATE UNIQUE INDEX IF NOT EXISTS uq_pl_ingest_state_season
  ON pl_ingest_state (season)
"""
                )
            )
        except Exception:
            pass


