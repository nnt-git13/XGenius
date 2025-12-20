from __future__ import annotations

from datetime import datetime

from app.db import db


class Player(db.Model):
    __tablename__ = "players"
    id = db.Column(db.Integer, primary_key=True)
    code = db.Column(db.String(32), index=True)
    name = db.Column(db.String(120), nullable=False, index=True)
    team = db.Column(db.String(80), index=True)
    position = db.Column(db.String(10), index=True)  # GK/DEF/MID/FWD
    price = db.Column(db.Float, nullable=False)
    status = db.Column(db.String(20), default="a")  # available, injured, etc.

    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    weekly_scores = db.relationship("WeeklyScore", backref="player", lazy=True)


class WeeklyScore(db.Model):
    __tablename__ = "weekly_scores"
    id = db.Column(db.Integer, primary_key=True)
    player_id = db.Column(db.Integer, db.ForeignKey("players.id"), nullable=False)
    season = db.Column(db.String(16), index=True)  # e.g., 2024-25 or 2025-26
    gw = db.Column(db.Integer, index=True)
    minutes = db.Column(db.Integer, default=0)
    points = db.Column(db.Float, default=0.0)
    xg = db.Column(db.Float, default=0.0)
    xa = db.Column(db.Float, default=0.0)
    shots = db.Column(db.Integer, default=0)
    key_passes = db.Column(db.Integer, default=0)
    opp = db.Column(db.String(30))


class ScoreObject(db.Model):
    __tablename__ = "score_objects"
    id = db.Column(db.Integer, primary_key=True)
    player_id = db.Column(db.Integer, db.ForeignKey("players.id"), nullable=False)
    season = db.Column(db.String(16), index=True)
    computed_at = db.Column(db.DateTime, default=datetime.utcnow)
    # Base score used for optimization (derived from CSV stats, betting odds, fixture diffs)
    base_score = db.Column(db.Float, default=0.0)
    form = db.Column(db.Float, default=0.0)
    fixtures_difficulty = db.Column(db.Float, default=0.0)
    odds_boost = db.Column(db.Float, default=0.0)
    starting_xi_metric = db.Column(db.Float, default=0.0)


class HypeScore(db.Model):
    __tablename__ = "hype_scores"
    id = db.Column(db.Integer, primary_key=True)
    player_id = db.Column(db.Integer, db.ForeignKey("players.id"), nullable=False)
    season = db.Column(db.String(16), index=True)
    computed_at = db.Column(db.DateTime, default=datetime.utcnow)
    sentiment = db.Column(db.Float, default=0.0)  # -1..1
    volume = db.Column(db.Float, default=0.0)
    velocity = db.Column(db.Float, default=0.0)
    injury_signal = db.Column(db.Float, default=0.0)
    hype_score = db.Column(db.Float, default=0.0)


# Squad of 15 for optimization output persistence
class Squad(db.Model):
    __tablename__ = "squads"
    id = db.Column(db.Integer, primary_key=True)
    season = db.Column(db.String(16), index=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    budget = db.Column(db.Float, default=100.0)
    total_score = db.Column(db.Float, default=0.0)
    serialized = db.Column(db.JSON, nullable=False)  # list of players with roles


