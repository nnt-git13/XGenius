from pydantic import BaseModel, Field
from typing import List, Literal


class PlayerIn(BaseModel):
    code: str
    name: str
    team: str
    position: Literal["GK", "DEF", "MID", "FWD"]
    price: float


class PlayerOut(PlayerIn):
    id: int


class OptimizeRequest(BaseModel):
    season: str = Field("2024-25")
    budget: float = 100.0
    exclude_players: List[int] = []
    lock_players: List[int] = []


class TradeAdviceRequest(BaseModel):
    season: str = Field("2024-25")
    out_player_id: int
    in_player_id: int
