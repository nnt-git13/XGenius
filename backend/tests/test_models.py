"""Tests for database models."""
import pytest
from sqlalchemy.orm import Session
from app.models import Player, WeeklyScore, ScoreObject
from app.core.database import Base, engine, SessionLocal


@pytest.fixture
def db():
    """Create a test database session."""
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
        Base.metadata.drop_all(bind=engine)


def test_create_player(db: Session):
    """Test creating a player."""
    player = Player(
        name="Test Player",
        team="Test Team",
        position="MID",
        price=8.5,
        code="TEST001",
    )
    db.add(player)
    db.commit()
    
    assert player.id is not None
    assert player.name == "Test Player"
    assert player.position == "MID"


def test_player_weekly_score_relationship(db: Session):
    """Test player-weekly score relationship."""
    player = Player(
        name="Test Player",
        team="Test Team",
        position="MID",
        price=8.5,
        code="TEST001",
    )
    db.add(player)
    db.commit()
    
    score = WeeklyScore(
        player_id=player.id,
        season="2024-25",
        gw=1,
        points=10.0,
        xg=0.5,
        xa=0.3,
    )
    db.add(score)
    db.commit()
    
    assert len(player.weekly_scores) == 1
    assert player.weekly_scores[0].points == 10.0

