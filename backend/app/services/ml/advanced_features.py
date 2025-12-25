"""
Advanced feature engineering for ML-based player points prediction.
Multi-dimensional features for neural network input.
"""
from __future__ import annotations
from typing import List, Dict, Any, Optional, Tuple
from sqlalchemy.orm import Session
from sqlalchemy import func, and_
from datetime import datetime, timedelta

# Make numpy/pandas optional for Vercel deployment
try:
    import pandas as pd
    PANDAS_AVAILABLE = True
except ImportError:
    PANDAS_AVAILABLE = False
    pd = None  # type: ignore

try:
    import numpy as np
    NUMPY_AVAILABLE = True
except ImportError:
    NUMPY_AVAILABLE = False
    np = None  # type: ignore

from app.models import Player, WeeklyScore
from app.models.fixture import Fixture, Team
from app.models.scoring import ScoreObject
from app.core.logging import logger


class AdvancedFeatureBuilder:
    """
    Builds comprehensive feature vectors for player points prediction.
    
    Features are organized into categories:
    1. Season Performance - current season stats
    2. Form - recent performance trends
    3. Fixture Difficulty - upcoming opponent strength
    4. Historical - career/historical patterns
    5. Fitness - injury/availability indicators
    6. Context - price, ownership, etc.
    """
    
    POSITION_MAP = {"GK": 0, "DEF": 1, "MID": 2, "FWD": 3}
    
    def __init__(self, db: Session):
        self.db = db
        self._team_cache: Dict[int, Team] = {}
        self._fixture_cache: Dict[str, List[Fixture]] = {}
    
    def build_features(
        self,
        player_ids: List[int],
        season: str,
        gameweek: int,
        horizon: int = 1,
    ) -> Any:  # Returns pd.DataFrame if pandas available, else list of dicts
        """
        Build comprehensive feature matrix for players.
        
        Args:
            player_ids: List of player IDs to build features for
            season: Season identifier (e.g., "2024-25")
            gameweek: Target gameweek for prediction
            horizon: Number of gameweeks to predict for
            
        Returns:
            DataFrame with feature columns for each player
        """
        features_list = []
        
        # Pre-fetch data for efficiency
        self._load_team_cache()
        self._load_fixture_cache(season, gameweek, horizon)
        
        for player_id in player_ids:
            try:
                features = self._build_player_features(player_id, season, gameweek, horizon)
                if features:
                    features_list.append(features)
            except Exception as e:
                logger.warning(f"Failed to build features for player {player_id}: {e}")
                continue
        
        if not features_list:
            if PANDAS_AVAILABLE:
                return pd.DataFrame()
            return []  # Return empty list if pandas not available
        
        if not PANDAS_AVAILABLE:
            # Return list of dicts instead of DataFrame
            return features_list
        
        df = pd.DataFrame(features_list)
        
        # Fill NaN with sensible defaults
        df = df.fillna(0.0)
        
        return df
    
    def _build_player_features(
        self, player_id: int, season: str, gameweek: int, horizon: int
    ) -> Optional[Dict[str, Any]]:
        """Build all features for a single player."""
        player = self.db.query(Player).filter(Player.id == player_id).first()
        if not player:
            return None
        
        # Get historical weekly scores
        historical = (
            self.db.query(WeeklyScore)
            .filter(
                WeeklyScore.player_id == player_id,
                WeeklyScore.season == season,
                WeeklyScore.gw < gameweek,
            )
            .order_by(WeeklyScore.gw.desc())
            .limit(15)  # Get more history for trend analysis
            .all()
        )
        
        features = {"player_id": player_id}
        
        # 1. Season Performance Features
        features.update(self._season_performance_features(player, historical))
        
        # 2. Form Features (recent trends)
        features.update(self._form_features(historical))
        
        # 3. Fixture Difficulty Features
        features.update(self._fixture_features(player, season, gameweek, horizon))
        
        # 4. Historical/Pattern Features
        features.update(self._historical_features(player, historical))
        
        # 5. Fitness/Availability Features
        features.update(self._fitness_features(player, historical))
        
        # 6. Contextual Features
        features.update(self._context_features(player))
        
        return features
    
    def _season_performance_features(
        self, player: Player, historical: List[WeeklyScore]
    ) -> Dict[str, float]:
        """Season-level performance aggregates."""
        features = {}
        
        # Total season stats from player model
        # Use getattr to safely access attributes that might not exist
        features["season_total_points"] = float(getattr(player, 'total_points', 0) or 0)
        features["season_goals"] = float(getattr(player, 'goals_scored', 0) or 0)
        features["season_assists"] = float(getattr(player, 'assists', 0) or 0)
        features["season_clean_sheets"] = float(getattr(player, 'clean_sheets', 0) or 0)
        features["season_bonus"] = float(getattr(player, 'bonus', 0) or 0)
        
        # Also try to get from historical if player model lacks data
        if features["season_total_points"] == 0 and historical:
            features["season_total_points"] = sum(
                getattr(ws, 'points', 0) or 0 for ws in historical
            )
        if features["season_goals"] == 0 and historical:
            features["season_goals"] = sum(
                getattr(ws, 'goals_scored', 0) or getattr(ws, 'goals', 0) or 0 
                for ws in historical
            )
        if features["season_assists"] == 0 and historical:
            features["season_assists"] = sum(
                getattr(ws, 'assists', 0) or 0 for ws in historical
            )
        
        # Games played - count historical entries OR estimate from player data
        if historical:
            games_played = len(historical)
        else:
            # Estimate games from FPL form string length or default
            form_str = getattr(player, 'form', None)
            if form_str and isinstance(form_str, (int, float)):
                games_played = 5  # Form is typically last 5 games
            else:
                games_played = max(1, features["season_total_points"] // 4)  # Rough estimate
        
        features["games_played"] = float(max(games_played, 1))
        
        # Points per game
        features["points_per_game"] = features["season_total_points"] / max(games_played, 1)
        
        # Goals per game
        features["goals_per_game"] = features["season_goals"] / max(games_played, 1)
        
        # Assists per game
        features["assists_per_game"] = features["season_assists"] / max(games_played, 1)
        
        # Contributions (goals + assists) per game
        features["contributions_per_game"] = (
            features["goals_per_game"] + features["assists_per_game"]
        )
        
        # Clean sheet rate (for defenders/GKs)
        features["clean_sheet_rate"] = features["season_clean_sheets"] / max(games_played, 1)
        
        # Bonus point rate
        features["bonus_rate"] = features["season_bonus"] / max(games_played, 1)
        
        # xG and xA aggregates from weekly scores
        # Handle both possible attribute names (xg vs expected_goals)
        if historical:
            total_xg = sum(
                getattr(ws, 'xg', None) or getattr(ws, 'expected_goals', None) or 0 
                for ws in historical
            )
            total_xa = sum(
                getattr(ws, 'xa', None) or getattr(ws, 'expected_assists', None) or 0 
                for ws in historical
            )
            features["season_xg"] = total_xg
            features["season_xa"] = total_xa
            features["xg_per_game"] = total_xg / max(len(historical), 1)
            features["xa_per_game"] = total_xa / max(len(historical), 1)
            
            # xG overperformance (goals vs xG)
            features["xg_overperformance"] = features["season_goals"] - total_xg
        else:
            features["season_xg"] = 0.0
            features["season_xa"] = 0.0
            features["xg_per_game"] = 0.0
            features["xa_per_game"] = 0.0
            features["xg_overperformance"] = 0.0
        
        return features
    
    def _form_features(self, historical: List[WeeklyScore]) -> Dict[str, float]:
        """Recent form and trend features."""
        features = {}
        
        if not historical:
            return {
                "form_3": 0.0, "form_5": 0.0, "form_10": 0.0,
                "form_weighted": 0.0, "form_trend": 0.0,
                "recent_xg": 0.0, "recent_xa": 0.0, "recent_xgi": 0.0,
                "recent_minutes": 0.0, "minutes_trend": 0.0,
                "consistency": 0.0, "ceiling": 0.0, "floor": 0.0,
            }
        
        # Simple averages over different windows
        points = [ws.points or 0 for ws in historical]
        features["form_3"] = np.mean(points[:3]) if len(points) >= 3 else np.mean(points)
        features["form_5"] = np.mean(points[:5]) if len(points) >= 5 else np.mean(points)
        features["form_10"] = np.mean(points[:10]) if len(points) >= 10 else np.mean(points)
        
        # Exponentially weighted form (more recent = higher weight)
        weights = np.exp(-0.2 * np.arange(len(points[:5])))
        weights = weights / weights.sum()
        features["form_weighted"] = np.average(points[:5], weights=weights[:len(points[:5])])
        
        # Form trend (is form improving or declining?)
        if len(points) >= 6:
            recent_avg = np.mean(points[:3])
            older_avg = np.mean(points[3:6])
            features["form_trend"] = recent_avg - older_avg  # Positive = improving
        else:
            features["form_trend"] = 0.0
        
        # Recent xG/xA (handle both attribute names)
        recent_xg = [
            getattr(ws, 'xg', None) or getattr(ws, 'expected_goals', None) or 0 
            for ws in historical[:5]
        ]
        recent_xa = [
            getattr(ws, 'xa', None) or getattr(ws, 'expected_assists', None) or 0 
            for ws in historical[:5]
        ]
        features["recent_xg"] = np.mean(recent_xg) if recent_xg else 0.0
        features["recent_xa"] = np.mean(recent_xa) if recent_xa else 0.0
        features["recent_xgi"] = features["recent_xg"] + features["recent_xa"]
        
        # Minutes trend
        minutes = [ws.minutes or 0 for ws in historical]
        features["recent_minutes"] = np.mean(minutes[:5]) if minutes else 0.0
        
        if len(minutes) >= 6:
            recent_mins = np.mean(minutes[:3])
            older_mins = np.mean(minutes[3:6])
            features["minutes_trend"] = recent_mins - older_mins
        else:
            features["minutes_trend"] = 0.0
        
        # Consistency (std dev of points - lower = more consistent)
        features["consistency"] = np.std(points[:5]) if len(points) >= 3 else 5.0
        
        # Ceiling and floor (max/min recent points)
        features["ceiling"] = max(points[:5]) if points else 0.0
        features["floor"] = min(points[:5]) if points else 0.0
        
        return features
    
    def _fixture_features(
        self, player: Player, season: str, gameweek: int, horizon: int
    ) -> Dict[str, float]:
        """Upcoming fixture difficulty features."""
        features = {}
        
        if not player.team_id:
            return {
                "fixture_difficulty_1": 3.0, "fixture_difficulty_avg": 3.0,
                "is_home_1": 0.5, "home_games_pct": 0.5,
                "opponent_strength": 0.5, "easy_fixtures_count": 0.0,
            }
        
        # Get upcoming fixtures for this team
        team_fixtures = self._fixture_cache.get(f"{player.team_id}_{season}", [])
        upcoming = [f for f in team_fixtures if gameweek <= f.gw < gameweek + horizon]
        
        if not upcoming:
            return {
                "fixture_difficulty_1": 3.0, "fixture_difficulty_avg": 3.0,
                "is_home_1": 0.5, "home_games_pct": 0.5,
                "opponent_strength": 0.5, "easy_fixtures_count": 0.0,
            }
        
        # First fixture difficulty
        first_fixture = upcoming[0]
        if first_fixture.team_h_id == player.team_id:
            features["fixture_difficulty_1"] = float(first_fixture.team_h_difficulty or 3)
            features["is_home_1"] = 1.0
        else:
            features["fixture_difficulty_1"] = float(first_fixture.team_a_difficulty or 3)
            features["is_home_1"] = 0.0
        
        # Average difficulty across horizon
        difficulties = []
        home_count = 0
        for fix in upcoming:
            if fix.team_h_id == player.team_id:
                difficulties.append(fix.team_h_difficulty or 3)
                home_count += 1
            else:
                difficulties.append(fix.team_a_difficulty or 3)
        
        features["fixture_difficulty_avg"] = np.mean(difficulties) if difficulties else 3.0
        features["home_games_pct"] = home_count / max(len(upcoming), 1)
        
        # Easy fixtures count (difficulty <= 2)
        features["easy_fixtures_count"] = sum(1 for d in difficulties if d <= 2)
        
        # Opponent strength (inverse of difficulty, normalized)
        features["opponent_strength"] = 1.0 - (features["fixture_difficulty_avg"] - 1) / 4.0
        
        return features
    
    def _historical_features(
        self, player: Player, historical: List[WeeklyScore]
    ) -> Dict[str, float]:
        """Historical patterns and tendencies."""
        features = {}
        
        if not historical:
            return {
                "home_ppg": 0.0, "away_ppg": 0.0, "home_away_diff": 0.0,
                "big_haul_rate": 0.0, "blank_rate": 0.0,
            }
        
        # Home vs Away performance
        home_scores = [ws for ws in historical if ws.was_home == 1]
        away_scores = [ws for ws in historical if ws.was_home == 0]
        
        home_ppg = np.mean([ws.points or 0 for ws in home_scores]) if home_scores else 0.0
        away_ppg = np.mean([ws.points or 0 for ws in away_scores]) if away_scores else 0.0
        
        features["home_ppg"] = home_ppg
        features["away_ppg"] = away_ppg
        features["home_away_diff"] = home_ppg - away_ppg
        
        # Big haul rate (games with 8+ points)
        points = [ws.points or 0 for ws in historical]
        features["big_haul_rate"] = sum(1 for p in points if p >= 8) / max(len(points), 1)
        
        # Blank rate (games with 0-1 points)
        features["blank_rate"] = sum(1 for p in points if p <= 1) / max(len(points), 1)
        
        return features
    
    def _fitness_features(
        self, player: Player, historical: List[WeeklyScore]
    ) -> Dict[str, float]:
        """Injury and fitness likelihood features."""
        features = {}
        
        # FPL API chance of playing
        features["chance_playing_this"] = float(player.chance_of_playing_this_round or 100) / 100.0
        features["chance_playing_next"] = float(player.chance_of_playing_next_round or 100) / 100.0
        
        # Status encoding (a=available, d=doubtful, i=injured, s=suspended, u=unavailable)
        status_risk = {
            "a": 0.0, "d": 0.3, "i": 0.8, "s": 0.9, "u": 1.0, None: 0.0, "": 0.0
        }
        features["injury_risk"] = status_risk.get(player.status, 0.5)
        
        # Recent playing time trend (are they playing regularly?)
        if historical:
            recent_minutes = [ws.minutes or 0 for ws in historical[:3]]
            features["recent_minutes_avg"] = np.mean(recent_minutes) if recent_minutes else 0.0
            features["started_recently"] = sum(1 for m in recent_minutes if m >= 60) / max(len(recent_minutes), 1)
            
            # Missed games recently?
            missed_games = sum(1 for m in recent_minutes if m == 0)
            features["missed_games_recent"] = float(missed_games)
        else:
            features["recent_minutes_avg"] = 90.0
            features["started_recently"] = 1.0
            features["missed_games_recent"] = 0.0
        
        # Days since news (if available)
        if player.news_added:
            days_since_news = (datetime.utcnow() - player.news_added).days
            features["days_since_news"] = float(min(days_since_news, 30))
        else:
            features["days_since_news"] = 30.0  # No recent news = good
        
        # Has injury news?
        features["has_injury_news"] = 1.0 if player.news else 0.0
        
        return features
    
    def _context_features(self, player: Player) -> Dict[str, float]:
        """Contextual features like price, position, FPL form."""
        features = {}
        
        # Price
        features["price"] = float(getattr(player, 'price', 5.0) or 5.0)
        features["price_initial"] = float(getattr(player, 'initial_price', None) or features["price"])
        features["price_change"] = features["price"] - features["price_initial"]
        features["price_change_pct"] = features["price_change"] / max(features["price_initial"], 0.1)
        
        # Position (one-hot encoded would be done in pipeline, but include numeric too)
        features["position_num"] = float(self.POSITION_MAP.get(player.position, 2))
        features["is_gk"] = 1.0 if player.position == "GK" else 0.0
        features["is_def"] = 1.0 if player.position == "DEF" else 0.0
        features["is_mid"] = 1.0 if player.position == "MID" else 0.0
        features["is_fwd"] = 1.0 if player.position == "FWD" else 0.0
        
        # BPS (bonus point system)
        features["bps"] = float(getattr(player, 'bps', 0) or 0)
        
        # Team encoding (simple hash for now)
        features["team_id"] = float(getattr(player, 'team_id', 0) or 0)
        
        # FPL Form (official FPL form rating - points per game last 5)
        fpl_form = getattr(player, 'form', None)
        if fpl_form is not None:
            try:
                features["fpl_form"] = float(fpl_form)
            except (ValueError, TypeError):
                features["fpl_form"] = 0.0
        else:
            features["fpl_form"] = 0.0
        
        # ICT Index if available (Influence, Creativity, Threat)
        features["ict_index"] = float(getattr(player, 'ict_index', 0) or 0)
        features["influence"] = float(getattr(player, 'influence', 0) or 0)
        features["creativity"] = float(getattr(player, 'creativity', 0) or 0)
        features["threat"] = float(getattr(player, 'threat', 0) or 0)
        
        # Selected by percentage (ownership)
        selected_by = getattr(player, 'selected_by_percent', 0)
        if selected_by:
            try:
                features["ownership"] = float(selected_by)
            except (ValueError, TypeError):
                features["ownership"] = 0.0
        else:
            features["ownership"] = 0.0
        
        return features
    
    def _load_team_cache(self):
        """Load all teams into cache."""
        if not self._team_cache:
            teams = self.db.query(Team).all()
            self._team_cache = {t.id: t for t in teams}
    
    def _load_fixture_cache(self, season: str, start_gw: int, horizon: int):
        """Load fixtures into cache for efficiency."""
        fixtures = (
            self.db.query(Fixture)
            .filter(Fixture.season == season)
            .filter(Fixture.gw >= start_gw)
            .filter(Fixture.gw < start_gw + horizon)
            .all()
        )
        
        for fix in fixtures:
            # Index by home team
            key_h = f"{fix.team_h_id}_{season}"
            if key_h not in self._fixture_cache:
                self._fixture_cache[key_h] = []
            self._fixture_cache[key_h].append(fix)
            
            # Index by away team
            key_a = f"{fix.team_a_id}_{season}"
            if key_a not in self._fixture_cache:
                self._fixture_cache[key_a] = []
            self._fixture_cache[key_a].append(fix)


def get_feature_columns() -> Tuple[List[str], List[str]]:
    """
    Get list of feature column names for the neural network.
    
    Returns:
        (numerical_features, categorical_features)
    """
    numerical = [
        # Season performance
        "season_total_points", "season_goals", "season_assists",
        "season_clean_sheets", "season_bonus", "games_played",
        "points_per_game", "goals_per_game", "assists_per_game",
        "contributions_per_game", "clean_sheet_rate", "bonus_rate",
        "season_xg", "season_xa", "xg_per_game", "xa_per_game",
        "xg_overperformance",
        # Form
        "form_3", "form_5", "form_10", "form_weighted", "form_trend",
        "recent_xg", "recent_xa", "recent_xgi",
        "recent_minutes", "minutes_trend",
        "consistency", "ceiling", "floor",
        # Fixtures
        "fixture_difficulty_1", "fixture_difficulty_avg",
        "is_home_1", "home_games_pct",
        "opponent_strength", "easy_fixtures_count",
        # Historical
        "home_ppg", "away_ppg", "home_away_diff",
        "big_haul_rate", "blank_rate",
        # Fitness
        "chance_playing_this", "chance_playing_next",
        "injury_risk", "recent_minutes_avg", "started_recently",
        "missed_games_recent", "days_since_news", "has_injury_news",
        # Context
        "price", "price_initial", "price_change", "price_change_pct",
        "position_num", "is_gk", "is_def", "is_mid", "is_fwd", "bps",
    ]
    
    categorical = ["team_id"]
    
    return numerical, categorical

