"""
Player and WeeklyScore models.
"""
from __future__ import annotations
from datetime import datetime
from sqlalchemy import Column, Integer, String, Float, ForeignKey, DateTime, Index, Text
from sqlalchemy.orm import relationship
from app.db import Base


class Player(Base):
    """FPL Player model."""
    __tablename__ = "players"
    
    id = Column(Integer, primary_key=True, index=True)
    # FPL identifiers:
    # - fpl_id: "element id" (used by endpoints like /event/{gw}/live and /entry/{id}/event/{gw}/picks)
    # - fpl_code: "code" field from bootstrap-static (internal FPL code; not the same as element id)
    fpl_id = Column(Integer, index=True, nullable=True)
    fpl_code = Column(Integer, unique=True, index=True, nullable=True)  # FPL bootstrap "code"
    name = Column(String(120), nullable=False, index=True)
    first_name = Column(String(60))
    second_name = Column(String(60))
    team_id = Column(Integer, ForeignKey("teams.id"), index=True)
    position = Column(String(10), nullable=False, index=True)  # GK/DEF/MID/FWD
    price = Column(Float, nullable=False, index=True)  # Current price in millions
    initial_price = Column(Float)  # Starting price
    status = Column(String(20), default="a")  # a=available, i=injured, s=suspended, u=unavailable
    news = Column(Text, nullable=True)  # Injury/suspension news
    news_added = Column(DateTime, nullable=True)
    chance_of_playing_this_round = Column(Integer, nullable=True)  # 0-100
    chance_of_playing_next_round = Column(Integer, nullable=True)
    element_type = Column(Integer)  # 1=GK, 2=DEF, 3=MID, 4=FWD
    
    # Additional stats
    total_points = Column(Float, default=0.0)
    goals_scored = Column(Integer, default=0)
    assists = Column(Integer, default=0)
    clean_sheets = Column(Integer, default=0)
    goals_conceded = Column(Integer, default=0)
    yellow_cards = Column(Integer, default=0)
    red_cards = Column(Integer, default=0)
    saves = Column(Integer, default=0)
    bonus = Column(Integer, default=0)
    bps = Column(Integer, default=0)  # Bonus points system
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    
    # Relationships
    team = relationship("Team", back_populates="players", foreign_keys="[Player.team_id]")
    weekly_scores = relationship("WeeklyScore", back_populates="player", cascade="all, delete-orphan")
    score_objects = relationship("ScoreObject", back_populates="player", cascade="all, delete-orphan")
    hype_scores = relationship("HypeScore", back_populates="player", cascade="all, delete-orphan")
    ml_predictions = relationship("MLPrediction", back_populates="player", cascade="all, delete-orphan")
    season_stats = relationship("PlayerSeasonStat", back_populates="player", cascade="all, delete-orphan")
    
    __table_args__ = (
        Index("idx_player_season_position", "team_id", "position"),
    )
    
    def __repr__(self) -> str:
        return f"<Player(id={self.id}, name='{self.name}', position='{self.position}')>"


class WeeklyScore(Base):
    """Weekly gameweek score for a player."""
    __tablename__ = "weekly_scores"
    
    id = Column(Integer, primary_key=True, index=True)
    player_id = Column(Integer, ForeignKey("players.id"), nullable=False, index=True)
    season = Column(String(16), nullable=False, index=True)  # e.g., "2024-25"
    gw = Column(Integer, nullable=False, index=True)  # Gameweek 1-38
    was_home = Column(Integer, default=0)  # 1 if home, 0 if away
    opponent_team_id = Column(Integer, ForeignKey("teams.id"), nullable=True)
    
    # Performance metrics
    minutes = Column(Integer, default=0)
    points = Column(Float, default=0.0)
    bonus = Column(Integer, default=0)
    
    # Advanced stats
    goals_scored = Column(Integer, default=0)
    assists = Column(Integer, default=0)
    clean_sheets = Column(Integer, default=0)
    goals_conceded = Column(Integer, default=0)
    yellow_cards = Column(Integer, default=0)
    red_cards = Column(Integer, default=0)
    saves = Column(Integer, default=0)
    penalties_missed = Column(Integer, default=0)
    penalties_saved = Column(Integer, default=0)
    
    # Expected metrics
    expected_goals = Column(Float, default=0.0)  # xG
    expected_assists = Column(Float, default=0.0)  # xA
    expected_goal_involvements = Column(Float, default=0.0)  # xGI
    expected_goals_conceded = Column(Float, default=0.0)  # xGC
    expected_assists_allowed = Column(Float, default=0.0)  # xA_allowed
    
    # Shooting/creativity
    shots = Column(Integer, default=0)
    shots_on_target = Column(Integer, default=0)
    key_passes = Column(Integer, default=0)
    chances_created = Column(Integer, default=0)
    big_chances_created = Column(Integer, default=0)
    big_chances_missed = Column(Integer, default=0)
    
    # Defensive
    tackles = Column(Integer, default=0)
    tackles_won = Column(Integer, default=0)
    interceptions = Column(Integer, default=0)
    clearances = Column(Integer, default=0)
    blocks = Column(Integer, default=0)
    
    # Other
    open_play_crosses = Column(Integer, default=0)
    fouls = Column(Integer, default=0)
    recoveries = Column(Integer, default=0)
    winning_goals = Column(Integer, default=0)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    
    # Relationships
    player = relationship("Player", back_populates="weekly_scores")
    opponent_team = relationship("Team", foreign_keys=[opponent_team_id])
    
    __table_args__ = (
        Index("idx_weekly_score_season_gw", "season", "gw"),
        Index("idx_weekly_score_player_season_gw", "player_id", "season", "gw", unique=True),
    )
    
    def __repr__(self) -> str:
        return f"<WeeklyScore(player_id={self.player_id}, season='{self.season}', gw={self.gw}, points={self.points})>"

