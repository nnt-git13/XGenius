"""Player schemas."""
from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime


class PlayerBase(BaseModel):
    """Base player schema."""
    code: str
    name: str
    team: str
    position: str = Field(..., pattern="^(GK|DEF|MID|FWD)$")
    price: float = Field(..., gt=0)


class PlayerCreate(PlayerBase):
    """Player creation schema."""
    fpl_id: Optional[int] = None
    photo_url: Optional[str] = None
    status: str = "a"


class PlayerOut(PlayerBase):
    """Player output schema."""
    id: int
    fpl_id: Optional[int] = None
    status: str
    photo_url: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True

