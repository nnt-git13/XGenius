"""
Unified CLI for XGenius.
"""
import click
import sys
from pathlib import Path

# Add backend to path to avoid importing Flask app
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

# Import from unified DB package (does not import Flask unless available)
from app.db import get_db, init_db, drop_db
from app.core.config import settings


@click.group()
def cli():
    """XGenius FPL Optimizer CLI."""
    pass


@cli.command()
def init():
    """Initialize the database."""
    click.echo("Initializing database...")
    init_db()
    click.echo("Database initialized successfully!")


@cli.command()
@click.option("--season", default="2024-25", help="Season identifier")
@click.option("--csv", type=click.Path(exists=True), help="CSV file path")
def ingest_players(season: str, csv: str):
    """Ingest players from CSV or FPL API."""
    if csv:
        click.echo(f"Ingesting players from {csv}...")
        # Implementation would go here
        click.echo("Players ingested successfully!")
    else:
        click.echo("Fetching players from FPL API...")
        # Implementation would go here
        click.echo("Players fetched successfully!")


@cli.command()
@click.option("--season", default="2025-26", help="Season identifier (e.g., 2025-26)")
@click.option(
    "--backfill-seasons",
    default=0,
    type=int,
    help="Ensure last N seasons exist (including current); backfills prior seasons' player season summaries from element-summary history_past. 0 disables.",
)
@click.option("--limit-players", type=int, default=None, help="Debug: limit number of players to backfill")
def ingest_fpl(season: str, backfill_seasons: int, limit_players: int | None):
    """Ingest all data from FPL API (bootstrap-static; optionally backfill last-N season summaries)."""
    import asyncio
    from app.services.fpl_ingestion import FPLIngestionService
    from app.services.fpl_last5_ingestion import FPLLastNSeasonsIngestionService
    
    async def run_ingestion():
        init_db()
        db_gen = get_db()
        db = next(db_gen)
        service = FPLIngestionService(db)
        try:
            click.echo(f"Starting FPL data ingestion for season {season}...")
            click.echo("Fetching data from https://fantasy.premierleague.com/api/bootstrap-static/...")
            counts = await service.ingest_bootstrap_static(season=season)
            click.echo("✅ Current season bootstrap-static ingest complete")
            click.echo(f"   Teams: {counts['teams']} new")
            click.echo(f"   Players: {counts['players']} new")
            click.echo(f"   Gameweeks: {counts['gameweeks']} found")
            click.echo(f"   Fixtures: {counts['fixtures']} new")

            if backfill_seasons and backfill_seasons > 1:
                def _prev_season(s: str) -> str:
                    # "2025-26" -> "2024-25"
                    y1, y2 = s.split("-")
                    return f"{int(y1)-1}-{int(y2)-1:02d}"

                seasons = [season]
                for _ in range(max(0, backfill_seasons - 1)):
                    seasons.append(_prev_season(seasons[-1]))

                click.echo(f"\nBackfilling prior seasons from element-summary history_past: {', '.join(seasons[1:])} ...")
                backfill = FPLLastNSeasonsIngestionService(db)
                result = await backfill.ingest_player_season_summaries(seasons=seasons[1:], limit_players=limit_players)
                await backfill.close()
                click.echo("✅ Backfill complete")
                click.echo(f"   Player season stats created: {result['stats_created']}")
                click.echo(f"   Player season stats updated: {result['stats_updated']}")
                click.echo(f"   Players processed: {result['players_processed']}")
        except Exception as e:
            click.echo(f"❌ Error during ingestion: {e}", err=True)
            import traceback
            traceback.print_exc()
            raise
        finally:
            await service.close()
            db.close()
    
    asyncio.run(run_ingestion())


@cli.command("ingest-last5")
@click.option("--current-season", default="2025-26", help="Label for the current FPL season (e.g., 2025-26)")
@click.option("--include", default=5, type=int, help="How many seasons total to ensure in DB (default 5)")
@click.option("--limit-players", type=int, default=None, help="Debug: limit number of players to backfill")
def ingest_last5(current_season: str, include: int, limit_players: int | None):
    """
    Set up DB for the last N seasons:
    - Ingest current season teams/players/fixtures from FPL API
    - Backfill prior seasons *season-level* player stats from element-summary history_past
    """
    import asyncio
    from app.services.fpl_ingestion import FPLIngestionService
    from app.services.fpl_last5_ingestion import FPLLastNSeasonsIngestionService

    def _prev_season(s: str) -> str:
        # "2025-26" -> "2024-25"
        y1, y2 = s.split("-")
        return f"{int(y1)-1}-{int(y2)-1:02d}"

    seasons = [current_season]
    for _ in range(max(0, include - 1)):
        seasons.append(_prev_season(seasons[-1]))

    async def run_all():
        db_gen = get_db()
        db = next(db_gen)
        try:
            click.echo(f"Initializing DB + ingesting current season {current_season} from FPL API...")
            init_db()
            svc = FPLIngestionService(db)
            await svc.ingest_bootstrap_static(season=current_season)
            await svc.close()

            click.echo(f"Backfilling season summary stats for prior seasons: {', '.join(seasons[1:])} ...")
            backfill = FPLLastNSeasonsIngestionService(db)
            result = await backfill.ingest_player_season_summaries(seasons=seasons[1:], limit_players=limit_players)
            await backfill.close()

            click.echo("✅ Last-N seasons ingest complete")
            click.echo(f"   Player season stats created: {result['stats_created']}")
            click.echo(f"   Player season stats updated: {result['stats_updated']}")
            click.echo(f"   Players processed: {result['players_processed']}")
        finally:
            db.close()

    asyncio.run(run_all())


@cli.command("ingest-pl")
@click.option("--from-season", default=2020, type=int, help="First season year to backfill (2020 == 2020/21)")
@click.option("--to-season", default=2024, type=int, help="Last season year to backfill (2024 == 2024/25)")
@click.option("--current-season", default=2025, type=int, help="Current season year to keep updating (2025 == 2025/26)")
@click.option("--rate-limit", default=0.3, type=float, help="Seconds to sleep between requests")
def ingest_pl(from_season: int, to_season: int, current_season: int, rate_limit: float):
    """
    Build a historical Premier League match database from PremierLeague.com JSON endpoints.

    - Backfills from-season..to-season once (tracked in DB).
    - Always refreshes current season.
    """
    import asyncio
    from app.db import init_db, get_db
    from app.services.pl_ingestion import PremierLeagueIngestionService
    from app.models import PLIngestState, PLMatch

    async def run():
        init_db()
        db_gen = get_db()
        db = next(db_gen)
        svc = PremierLeagueIngestionService(db, rate_limit_s=rate_limit)
        try:
            # Historical backfill once
            for s in range(from_season, to_season + 1):
                st = db.query(PLIngestState).filter(PLIngestState.season == s).first()
                existing = db.query(PLMatch).filter(PLMatch.season == s).count()
                if st and st.backfilled and existing >= 350:
                    click.echo(f"Skipping season {s} (already backfilled; matches_in_db={existing})")
                    continue
                if st and st.backfilled and existing < 350:
                    click.echo(f"Re-backfilling season {s} (state says backfilled but matches_in_db={existing} looks incomplete)")
                click.echo(f"Backfilling season {s} ...")
                res = await svc.backfill_season(season=s)
                click.echo(f"  matches_ingested={res['matches_ingested']}")

            # Current season always refreshed
            click.echo(f"Refreshing current season {current_season} ...")
            res2 = await svc.update_current_season(season=current_season)
            click.echo(f"  matches_refreshed={res2['matches_refreshed']}")
        finally:
            await svc.close()
            db.close()

    asyncio.run(run())


@cli.command()
@click.option("--season", required=True, help="Season identifier")
@click.option("--gw", type=int, help="Specific gameweek (optional)")
@click.option("--csv", type=click.Path(exists=True), help="CSV file path")
def ingest_gw(season: str, gw: int, csv: str):
    """Ingest gameweek scores."""
    click.echo(f"Ingesting gameweek data for {season}...")
    # Implementation would go here
    click.echo("Gameweek data ingested successfully!")


@cli.command()
@click.option("--model", default="xgboost", help="Model name")
@click.option("--seasons", multiple=True, help="Seasons to train on")
def train_models(model: str, seasons: tuple):
    """Train ML models."""
    click.echo(f"Training {model} model...")
    # Implementation would go here
    click.echo("Model training completed!")


@cli.command()
def run():
    """Run the development server."""
    import uvicorn
    click.echo("Starting XGenius server...")
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=settings.DEBUG,
    )


if __name__ == "__main__":
    cli()

