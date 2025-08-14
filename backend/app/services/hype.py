from __future__ import annotations
import re
import time
import random
from typing import Dict, List
from dataclasses import dataclass
from sqlalchemy.orm import Session
from ..models import Player, HypeScore

# This module sketches a News API based hype engine.
# In production, plug real providers (NewsAPI, Guardian, Twitter/X via third-party, Reddit).


@dataclass
class Article:
    title: str
    description: str


POS_WORDS = {"back", "returns", "fit", "signs", "extends", "scores", "brace", "hat-trick", "dominant", "elite", "rise", "underrated"}
NEG_WORDS = {"injury", "out", "hamstring", "ankle", "knock", "suspension", "doubt", "bench", "dropped", "poor", "struggle"}


def simple_sentiment(text: str) -> float:
    t = text.lower()
    pos = sum(1 for w in POS_WORDS if w in t)
    neg = sum(1 for w in NEG_WORDS if w in t)
    if pos == 0 and neg == 0:
        return 0.0
    return (pos - neg) / (pos + neg)


def fetch_mock_articles(player_name: str) -> List[Article]:
    # Placeholder to avoid external calls in scaffold. Replace with real client.
    samples = [
        Article(title=f"{player_name} returns to training after minor knock", description="positive fitness news"),
        Article(title=f"Debate: Should {player_name} be benched?", description="tactical rotation talk"),
        Article(title=f"{player_name} scores brace in pre-season", description="goals galore"),
    ]
    random.shuffle(samples)
    return samples[: random.randint(1, 3)]


def compute_hype(db_sess: Session, season: str, player: Player) -> HypeScore:
    arts = fetch_mock_articles(player.name)
    sentiments = [simple_sentiment(a.title + " " + a.description) for a in arts]
    sentiment = sum(sentiments) / len(sentiments) if sentiments else 0.0
    volume = len(arts) / 5.0  # scale 0..1 assuming up to 5 relevant pieces
    velocity = random.uniform(0.0, 1.0)  # change rate proxy (stub)
    injury_signal = 1.0 if any("injury" in (a.title + a.description).lower() for a in arts) else 0.0

    hs = HypeScore.query.filter_by(player_id=player.id, season=season).first()
    if not hs:
        hs = HypeScore(player_id=player.id, season=season)
    hs.sentiment = float(sentiment)
    hs.volume = float(volume)
    hs.velocity = float(velocity)
    hs.injury_signal = float(injury_signal)
    hs.hype_score = max(0.0, sentiment * 0.6 + volume * 0.3 + (1 - injury_signal) * 0.1)
    db_sess.add(hs)
    return hs
