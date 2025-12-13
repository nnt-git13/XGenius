"""Assistant/Copilot schemas."""
from pydantic import BaseModel, Field
from typing import Optional, Dict, Any, List


class AssistantAskRequest(BaseModel):
    """Assistant question request."""
    question: str = Field(..., min_length=1)
    context: Optional[Dict[str, Any]] = Field(default_factory=dict)
    season: Optional[str] = "2024-25"


class AssistantAskResponse(BaseModel):
    """Assistant response."""
    answer: str
    reasoning: Optional[str] = None
    suggestions: Optional[List[str]] = Field(default_factory=list)

