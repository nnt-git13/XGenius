from __future__ import annotations
import os
from apscheduler.schedulers.background import BackgroundScheduler
from flask import current_app
from app.db import db
from app.legacy.models import Player
from ..services.hype import compute_hype


scheduler = BackgroundScheduler()


def start_scheduled_jobs(app):
    @scheduler.scheduled_job("interval", hours=24)
    def refresh_hype_job():
        with app.app_context():
            season = current_app.config.get("ACTIVE_SEASON", "2024-25")
            for p in Player.query.all():
                compute_hype(db.session, season, p)
            db.session.commit()

    scheduler.start()
