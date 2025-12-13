"""
Squad and optimization models.
"""
from __future__ import annotations
from datetime import datetime
from sqlalchemy import Column, Integer, String, Float, DateTime, Index, JSON, Text
from ..core.database import Base


class Squad(Base):
    """Optimized squad of 15 players."""
    __tablename__ = "squads"
    
    id = Column(Integer, primary_key=True, index=True)
    season = Column(String(16), nullable=False, index=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    
    # Squad metadata
    budget = Column(Float, default=100.0)
    total_cost = Column(Float, default=0.0)
    total_score = Column(Float, default=0.0)
    xg_score = Column(Float, default=0.0)  # Advanced XG Score
    
    # Squad composition
    serialized = Column(JSON, nullable=False)  # Full squad data
    starting_xi = Column(JSON, nullable=False)  # Best starting XI
    bench = Column(JSON, nullable=False)  # Bench players
    
    # Formation
    formation = Column(String(10), nullable=True)  # e.g., "4-4-2"
    
    # Optimization parameters
    optimization_type = Column(String(50), default="standard")  # standard, wildcard, free_hit, bench_boost
    horizon_gw = Column(Integer, default=1)  # Optimization horizon in gameweeks
    
    # Metadata
    meta_data = Column(JSON, nullable=True)  # Additional optimization metadata (renamed from 'metadata' - SQLAlchemy reserved)
    
    __table_args__ = (
        Index("idx_squad_season", "season"),
    )
    
    def __repr__(self) -> str:
        return f"<Squad(id={self.id}, season='{self.season}', score={self.xg_score:.2f})>"


class SquadOptimization(Base):
    """Log of squad optimization requests and results."""
    __tablename__ = "squad_optimizations"
    
    id = Column(Integer, primary_key=True, index=True)
    season = Column(String(16), nullable=False, index=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    
    # Request parameters
    request_params = Column(JSON, nullable=False)  # Input parameters
    exclude_players = Column(JSON, nullable=True)  # Player IDs to exclude
    lock_players = Column(JSON, nullable=True)  # Player IDs to lock in
    chip = Column(String(50), nullable=True)  # wildcard, free_hit, bench_boost, triple_captain
    
    # Results
    result = Column(JSON, nullable=True)  # Optimization result
    execution_time_ms = Column(Float, nullable=True)
    
    # Status
    status = Column(String(20), default="completed")  # completed, failed, pending
    error_message = Column(Text, nullable=True)
    
    __table_args__ = (
        Index("idx_squad_opt_season", "season"),
        Index("idx_squad_opt_created", "created_at"),
    )
    
    def __repr__(self) -> str:
        return f"<SquadOptimization(id={self.id}, season='{self.season}', status='{self.status}')>"

