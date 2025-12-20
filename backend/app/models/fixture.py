"""
Fixture and Team models.
"""
from __future__ import annotations
from datetime import datetime
from sqlalchemy import Column, Integer, String, Float, ForeignKey, DateTime, Index, Boolean
from sqlalchemy.orm import relationship
from app.db import Base


class Team(Base):
    """Premier League team model."""
    __tablename__ = "teams"
    
    id = Column(Integer, primary_key=True, index=True)
    fpl_id = Column(Integer, unique=True, index=True, nullable=True)  # FPL API team ID
    fpl_code = Column(Integer, unique=True, index=True, nullable=True)  # FPL team code
    name = Column(String(80), nullable=False, unique=True, index=True)
    short_name = Column(String(10), nullable=True)  # e.g., "ARS", "MCI"
    
    # Strength metrics
    strength = Column(Integer, default=1000)  # Overall strength rating
    strength_attack_home = Column(Integer, default=1000)
    strength_attack_away = Column(Integer, default=1000)
    strength_defence_home = Column(Integer, default=1000)
    strength_defence_away = Column(Integer, default=1000)
    
    # Current season stats
    played = Column(Integer, default=0)
    win = Column(Integer, default=0)
    draw = Column(Integer, default=0)
    loss = Column(Integer, default=0)
    goals_for = Column(Integer, default=0)
    goals_against = Column(Integer, default=0)
    points = Column(Integer, default=0)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    
    # Relationships
    players = relationship("Player", back_populates="team", foreign_keys="Player.team_id")
    home_fixtures = relationship(
        "Fixture", 
        foreign_keys="[Fixture.team_h_id]", 
        back_populates="team_home"
    )
    away_fixtures = relationship(
        "Fixture", 
        foreign_keys="[Fixture.team_a_id]", 
        back_populates="team_away"
    )
    
    def __repr__(self) -> str:
        return f"<Team(id={self.id}, name='{self.name}')>"


class Fixture(Base):
    """Premier League fixture model."""
    __tablename__ = "fixtures"
    
    id = Column(Integer, primary_key=True, index=True)
    fpl_id = Column(Integer, unique=True, index=True, nullable=True)  # FPL API fixture ID
    fpl_code = Column(Integer, unique=True, index=True, nullable=True)  # Legacy field
    season = Column(String(16), nullable=False, index=True)  # e.g., "2024-25"
    gw = Column(Integer, nullable=False, index=True)  # Gameweek
    team_h_id = Column(Integer, ForeignKey("teams.id"), nullable=False, index=True)
    team_a_id = Column(Integer, ForeignKey("teams.id"), nullable=False, index=True)
    
    # Kickoff time
    kickoff_time = Column(DateTime, nullable=True, index=True)
    finished = Column(Boolean, default=False, index=True)
    
    # Difficulty ratings (1=easiest, 5=hardest)
    team_h_difficulty = Column(Integer, default=3)  # Difficulty for team_h
    team_a_difficulty = Column(Integer, default=3)  # Difficulty for team_a
    
    # Results (if finished)
    team_h_score = Column(Integer, nullable=True)
    team_a_score = Column(Integer, nullable=True)
    
    # Expected metrics
    team_h_xg = Column(Float, nullable=True)
    team_a_xg = Column(Float, nullable=True)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    
    # Relationships
    team_home = relationship("Team", foreign_keys="[Fixture.team_h_id]", back_populates="home_fixtures")
    team_away = relationship("Team", foreign_keys="[Fixture.team_a_id]", back_populates="away_fixtures")
    
    __table_args__ = (
        Index("idx_fixture_season_gw", "season", "gw"),
        Index("idx_fixture_teams", "team_h_id", "team_a_id"),
    )
    
    def __repr__(self) -> str:
        return f"<Fixture(id={self.id}, season='{self.season}', gw={self.gw}, team_h={self.team_h_id} vs team_a={self.team_a_id})>"

