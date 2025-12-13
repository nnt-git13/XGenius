"""Schemas for AI assistant endpoints."""
from __future__ import annotations
from typing import Optional, Dict, Any
from pydantic import BaseModel, Field


class AssistantAskRequest(BaseModel):
    """Request schema for assistant queries."""
    question: str = Field(..., description="User question")
    context: Optional[Dict[str, Any]] = Field(None, description="Additional context (team, transfers, etc.)")
    season: Optional[str] = None
    gameweek: Optional[int] = None


class AssistantAskResponse(BaseModel):
    """Response schema for assistant queries."""
    answer: str
    reasoning: Optional[str] = None
    suggestions: list[str] = Field(default_factory=list)
    confidence: float = Field(0.0, ge=0.0, le=1.0)

