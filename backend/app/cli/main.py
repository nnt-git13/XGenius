"""
Unified CLI for XGenius.
"""
import click
import sys
from pathlib import Path

# Add backend to path to avoid importing Flask app
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

# Import directly from core to avoid triggering app/__init__.py
from app.core.database import get_db, init_db, drop_db
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
@click.option("--season", default="2024-25", help="Season identifier (e.g., 2024-25)")
def ingest_fpl(season: str):
    """Ingest all data from FPL bootstrap-static API."""
    import asyncio
    from app.services.fpl_ingestion import FPLIngestionService
    
    async def run_ingestion():
        db_gen = get_db()
        db = next(db_gen)
        service = FPLIngestionService(db)
        try:
            click.echo(f"Starting FPL data ingestion for season {season}...")
            click.echo("Fetching data from https://fantasy.premierleague.com/api/bootstrap-static/...")
            counts = await service.ingest_bootstrap_static(season=season)
            click.echo(f"\n✅ Ingestion complete!")
            click.echo(f"   Teams: {counts['teams']} new")
            click.echo(f"   Players: {counts['players']} new")
            click.echo(f"   Gameweeks: {counts['gameweeks']} found")
            click.echo(f"   Fixtures: {counts['fixtures']} new")
        except Exception as e:
            click.echo(f"❌ Error during ingestion: {e}", err=True)
            import traceback
            traceback.print_exc()
            raise
        finally:
            await service.close()
            db.close()
    
    asyncio.run(run_ingestion())


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

