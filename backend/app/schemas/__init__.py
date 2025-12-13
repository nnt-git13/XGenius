"""Pydantic schemas for request/response validation."""
from app.schemas.player import PlayerBase, PlayerCreate, PlayerOut
from app.schemas.team import TeamEvaluateRequest, TeamEvaluateResponse, XGScoreResponse
from app.schemas.optimize import OptimizeRequest, OptimizeResponse, SquadPlayer
from app.schemas.trades import TradeAdviceRequest, TradeAdviceResponse
from app.schemas.assistant import AssistantAskRequest, AssistantAskResponse
from app.schemas.ml import PredictRequest, PredictResponse

__all__ = [
    "PlayerBase",
    "PlayerCreate",
    "PlayerOut",
    "TeamEvaluateRequest",
    "TeamEvaluateResponse",
    "XGScoreResponse",
    "OptimizeRequest",
    "OptimizeResponse",
    "SquadPlayer",
    "TradeAdviceRequest",
    "TradeAdviceResponse",
    "AssistantAskRequest",
    "AssistantAskResponse",
    "PredictRequest",
    "PredictResponse",
]

