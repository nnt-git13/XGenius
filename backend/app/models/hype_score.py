"""Hype score model for sentiment and social signals."""
from sqlalchemy import Column, Integer, String, Float, ForeignKey, DateTime, Index
from sqlalchemy.orm import relationship
from datetime import datetime
from app.db import Base


class HypeScore(Base):
    """Hype and sentiment scores for players."""
    
    __tablename__ = "hype_scores"
    
    id = Column(Integer, primary_key=True, index=True)
    player_id = Column(Integer, ForeignKey("players.id"), nullable=False, index=True)
    season = Column(String(16), nullable=False, index=True)
    
    # Sentiment metrics (-1 to 1)
    sentiment = Column(Float, default=0.0)  # -1 (negative) to 1 (positive)
    volume = Column(Float, default=0.0)  # volume of mentions
    velocity = Column(Float, default=0.0)  # rate of change in mentions
    injury_signal = Column(Float, default=0.0)  # 0-1, likelihood of injury concern
    
    # Combined hype score
    hype_score = Column(Float, default=0.0)  # normalized 0-1 score
    
    computed_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    
    # Relationships
    player = relationship("Player", back_populates="hype_scores")
    
    __table_args__ = (
        Index("idx_hype_score_player_season", "player_id", "season", unique=True),
    )
    
    def __repr__(self) -> str:
        return f"<HypeScore(player_id={self.player_id}, season='{self.season}', hype_score={self.hype_score})>"

