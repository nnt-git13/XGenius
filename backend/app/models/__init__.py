"""
Database models for XGenius.
"""
from __future__ import annotations

from .player import Player, WeeklyScore
from .scoring import ScoreObject, HypeScore, MLPrediction
from .squad import Squad, SquadOptimization
from .fixture import Fixture, Team
from .copilot import (
    CopilotConversation,
    CopilotMessage,
    CopilotAction,
    CopilotAuditLog,
    CopilotPreference,
    CopilotMetric,
    MessageRole,
    ActionStatus,
    ActionRisk,
)
from .fpl_snapshot import FPLApiSnapshot
from .player_season_stat import PlayerSeasonStat
from .pl_team import PLTeam
from .pl_player import PLPlayer
from .pl_match import PLMatch
from .pl_match_team_stats import PLMatchTeamStats
from .pl_match_event import PLMatchEvent
from .pl_match_lineup import PLMatchLineup
from .pl_ingest_state import PLIngestState

__all__ = [
    "Player",
    "WeeklyScore",
    "ScoreObject",
    "HypeScore",
    "MLPrediction",
    "Squad",
    "SquadOptimization",
    "Fixture",
    "Team",
    "CopilotConversation",
    "CopilotMessage",
    "CopilotAction",
    "CopilotAuditLog",
    "CopilotPreference",
    "CopilotMetric",
    "MessageRole",
    "ActionStatus",
    "ActionRisk",
    "FPLApiSnapshot",
    "PlayerSeasonStat",
    "PLTeam",
    "PLPlayer",
    "PLMatch",
    "PLMatchTeamStats",
    "PLMatchEvent",
    "PLMatchLineup",
    "PLIngestState",
]

