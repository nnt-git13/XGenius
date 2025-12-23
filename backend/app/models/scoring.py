"""
Scoring and ML prediction models.
"""
from __future__ import annotations
from datetime import datetime
from sqlalchemy import Column, Integer, String, Float, ForeignKey, DateTime, Index, JSON
from sqlalchemy.orm import relationship
from app.db import Base


class ScoreObject(Base):
    """Computed score object for a player in a season."""
    __tablename__ = "score_objects"
    
    id = Column(Integer, primary_key=True, index=True)
    player_id = Column(Integer, ForeignKey("players.id"), nullable=False, index=True)
    season = Column(String(16), nullable=False, index=True)
    gw = Column(Integer, nullable=True, index=True)  # If None, season aggregate
    
    computed_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    
    # Base components
    base_score = Column(Float, default=0.0)
    form = Column(Float, default=0.0)  # Recent form component
    fixtures_difficulty = Column(Float, default=0.0)  # Upcoming fixture difficulty (0=easy, 1=hard)
    odds_boost = Column(Float, default=0.0)  # Bookmaker odds boost
    starting_xi_metric = Column(Float, default=0.0)  # Final optimization metric
    
    # Additional metadata
    meta_data = Column(JSON, nullable=True)  # Flexible storage for extra data (renamed from 'metadata' - SQLAlchemy reserved)
    
    # Relationships
    player = relationship("Player", back_populates="score_objects")
    
    __table_args__ = (
        Index("idx_score_object_player_season", "player_id", "season"),
        Index("idx_score_object_player_season_gw", "player_id", "season", "gw", unique=True),
    )
    
    def __repr__(self) -> str:
        return f"<ScoreObject(player_id={self.player_id}, season='{self.season}', gw={self.gw}, metric={self.starting_xi_metric:.2f})>"


class HypeScore(Base):
    """Social media/news hype score for a player."""
    __tablename__ = "hype_scores"
    
    id = Column(Integer, primary_key=True, index=True)
    player_id = Column(Integer, ForeignKey("players.id"), nullable=False, index=True)
    season = Column(String(16), nullable=False, index=True)
    
    computed_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    
    # Sentiment analysis
    sentiment = Column(Float, default=0.0)  # -1 (negative) to 1 (positive)
    volume = Column(Float, default=0.0)  # News/social volume
    velocity = Column(Float, default=0.0)  # Rate of change in volume
    
    # Injury signals
    injury_signal = Column(Float, default=0.0)  # 0 (no injury) to 1 (injured)
    
    # Composite score
    hype_score = Column(Float, default=0.0)  # Final composite hype score
    
    # Relationships
    player = relationship("Player", back_populates="hype_scores")
    
    __table_args__ = (
        Index("idx_hype_score_player_season", "player_id", "season", unique=True),
    )
    
    def __repr__(self) -> str:
        return f"<HypeScore(player_id={self.player_id}, season='{self.season}', score={self.hype_score:.2f})>"


class MLPrediction(Base):
    """ML model predictions for player points."""
    __tablename__ = "ml_predictions"
    
    id = Column(Integer, primary_key=True, index=True)
    player_id = Column(Integer, ForeignKey("players.id"), nullable=False, index=True)
    season = Column(String(16), nullable=False, index=True)
    gw = Column(Integer, nullable=False, index=True)  # Target gameweek
    
    # Predictions
    predicted_points = Column(Float, nullable=False)
    predicted_xg = Column(Float, default=0.0)
    predicted_xa = Column(Float, default=0.0)
    predicted_xgi = Column(Float, default=0.0)  # Expected goal involvements
    
    # Uncertainty/confidence
    prediction_std = Column(Float, nullable=True)  # Standard deviation
    confidence_interval_lower = Column(Float, nullable=True)
    confidence_interval_upper = Column(Float, nullable=True)
    
    # Model metadata
    model_name = Column(String(100), nullable=False)  # e.g., "ridge_regression", "xgboost"
    model_version = Column(String(50), nullable=True)
    feature_importance = Column(JSON, nullable=True)  # Feature importance scores
    
    # Timestamps
    predicted_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    
    # Relationships
    player = relationship("Player", back_populates="ml_predictions")
    
    __table_args__ = (
        Index("idx_ml_prediction_player_season_gw", "player_id", "season", "gw"),
        Index("idx_ml_prediction_season_gw_model", "season", "gw", "model_name"),
    )
    
    def __repr__(self) -> str:
        return f"<MLPrediction(player_id={self.player_id}, season='{self.season}', gw={self.gw}, points={self.predicted_points:.2f})>"

