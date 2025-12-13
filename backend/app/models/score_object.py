"""Score object model for ML predictions and optimization scores."""
from sqlalchemy import Column, Integer, String, Float, ForeignKey, DateTime, Index
from sqlalchemy.orm import relationship
from datetime import datetime
from app.core.database import Base


class ScoreObject(Base):
    """Computed score object for optimization and ML predictions."""
    
    __tablename__ = "score_objects"
    
    id = Column(Integer, primary_key=True, index=True)
    player_id = Column(Integer, ForeignKey("players.id"), nullable=False, index=True)
    season = Column(String(16), nullable=False, index=True)
    gw = Column(Integer, nullable=True, index=True)  # specific GW or None for general
    
    # Base scores
    base_score = Column(Float, default=0.0)
    form = Column(Float, default=0.0)  # recent form (last 5 GWs)
    fixtures_difficulty = Column(Float, default=0.0)  # upcoming fixture difficulty
    odds_boost = Column(Float, default=0.0)  # betting odds boost
    
    # ML predictions
    predicted_points = Column(Float, default=0.0)  # ML model prediction
    predicted_points_next_gw = Column(Float, default=0.0)
    predicted_points_next_3 = Column(Float, default=0.0)  # next 3 GWs
    predicted_points_next_5 = Column(Float, default=0.0)  # next 5 GWs
    
    # Risk metrics
    risk_score = Column(Float, default=0.0)  # 0-1, higher = riskier
    uncertainty = Column(Float, default=0.0)  # prediction uncertainty
    
    # Optimization metric
    starting_xi_metric = Column(Float, default=0.0)  # combined metric for optimization
    
    # Captaincy
    captaincy_upside = Column(Float, default=0.0)  # expected points if captained
    
    computed_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    
    # Relationships
    player = relationship("Player", back_populates="score_objects")
    
    __table_args__ = (
        Index("idx_score_object_player_season_gw", "player_id", "season", "gw"),
        Index("idx_score_object_starting_xi", "starting_xi_metric"),
    )
    
    def __repr__(self) -> str:
        return f"<ScoreObject(player_id={self.player_id}, season='{self.season}', gw={self.gw}, starting_xi_metric={self.starting_xi_metric})>"

