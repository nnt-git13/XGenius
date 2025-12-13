"""Weekly score model for player gameweek performance."""
from sqlalchemy import Column, Integer, String, Float, ForeignKey, DateTime, Index
from sqlalchemy.orm import relationship
from datetime import datetime
from app.core.database import Base


class WeeklyScore(Base):
    """Player weekly score for a specific gameweek."""
    
    __tablename__ = "weekly_scores"
    
    id = Column(Integer, primary_key=True, index=True)
    player_id = Column(Integer, ForeignKey("players.id"), nullable=False, index=True)
    season = Column(String(16), nullable=False, index=True)  # e.g., "2024-25"
    gw = Column(Integer, nullable=False, index=True)  # gameweek number
    
    # Performance metrics
    minutes = Column(Integer, default=0)
    points = Column(Float, default=0.0)
    xg = Column(Float, default=0.0)  # expected goals
    xa = Column(Float, default=0.0)  # expected assists
    xgi = Column(Float, default=0.0)  # expected goal involvement (xg + xa)
    shots = Column(Integer, default=0)
    key_passes = Column(Integer, default=0)
    assists = Column(Integer, default=0)
    goals = Column(Integer, default=0)
    clean_sheets = Column(Integer, default=0)
    saves = Column(Integer, default=0)
    
    # Opponent info
    opp = Column(String(30), nullable=True)  # opponent team
    opp_difficulty = Column(Integer, nullable=True)  # 1-5 FPL difficulty rating
    was_home = Column(Integer, default=1)  # 1 if home, 0 if away
    
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    
    # Relationships
    player = relationship("Player", back_populates="weekly_scores")
    
    __table_args__ = (
        Index("idx_weekly_score_season_gw", "season", "gw"),
        Index("idx_weekly_score_player_season_gw", "player_id", "season", "gw", unique=True),
    )
    
    def __repr__(self) -> str:
        return f"<WeeklyScore(player_id={self.player_id}, season='{self.season}', gw={self.gw}, points={self.points})>"

