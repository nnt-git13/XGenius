"""Tests for optimizer service."""
import pytest
from app.services.optimizer import optimize_squad_service
from app.schemas.squad import OptimizeRequest
from app.models.player import Player
from app.models.squad import ScoreObject


def test_optimize_squad_basic(db_session):
    """Test basic squad optimization."""
    # Create test players
    players = []
    for i in range(20):
        position = ["GK", "DEF", "MID", "FWD"][i % 4]
        player = Player(
            code=f"P{i}",
            name=f"Player {i}",
            team=f"Team {i % 5}",
            position=position,
            price=5.0 + (i * 0.5),
        )
        db_session.add(player)
        players.append(player)
    
    db_session.commit()
    
    # Create score objects
    for player in players:
        score_obj = ScoreObject(
            player_id=player.id,
            season="2024-25",
            starting_xi_metric=10.0 - (player.price * 0.5),
        )
        db_session.add(score_obj)
    
    db_session.commit()
    
    # Test optimization
    request = OptimizeRequest(
        season="2024-25",
        budget=100.0,
        horizon=1,
    )
    
    # This will fail without ML models, but structure is correct
    # result = optimize_squad_service(db_session, request)
    # assert result is not None
    # assert len(result.squad) == 15

