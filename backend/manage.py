from __future__ import annotations
import click
import os
from flask.cli import with_appcontext
from app import create_app
from app.db import db
from app.models import Player
from app.services.bootstrap import bootstrap_scores
from app.services.hype import compute_hype


app = create_app()


@app.cli.command("init-db")
@with_appcontext
def init_db():
    db.create_all()
    click.echo("Database initialized.")


@app.cli.command("import-players")
@click.option("--csv", "csv_path", type=click.Path(exists=True), required=True)
@click.option("--season", default="2024-25")
@with_appcontext
def import_players(csv_path, season):
    # Reuse REST endpoint logic by calling it as a function if desired; here inline
    import pandas as pd
    from app.models import Player

    df = pd.read_csv(csv_path)
    for _, r in df.iterrows():
        p = Player.query.filter_by(name=r["name"], team=r["team"]).first()
        if not p:
            p = Player(name=r["name"], team=r["team"], position=r["position"].upper(), price=r.get("price", 4.5))
            db.session.add(p)
        else:
            p.position = r["position"].upper()
            p.price = float(r.get("price", p.price))
    db.session.commit()
    click.echo("Players imported.")


@app.cli.command("bootstrap-scores")
@click.option("--csv", "csv_path", type=click.Path(exists=True), required=True)
@click.option("--season", default="2024-25")
@with_appcontext
def _bootstrap_scores(csv_path, season):
    bootstrap_scores(season, csv_path)
    click.echo("Score objects bootstrapped.")


@app.cli.command("refresh-hype")
@click.option("--season", default="2024-25")
@with_appcontext
def _refresh_hype(season):
    for p in Player.query.all():
        compute_hype(db.session, season, p)
    db.session.commit()
    click.echo("Hype scores refreshed.")
