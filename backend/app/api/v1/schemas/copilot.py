"""Schemas for copilot endpoints."""
from __future__ import annotations
from typing import Optional, Dict, Any, List
from pydantic import BaseModel, Field


class CopilotChatRequest(BaseModel):
    """Request schema for copilot chat."""
    message: str = Field(..., description="User message")
    conversation_id: Optional[int] = Field(None, description="Conversation ID")
    app_state: Optional[Dict[str, Any]] = Field(default_factory=dict, description="Application state")
    route: Optional[str] = Field(None, description="Current route")
    user_id: Optional[int] = Field(None, description="User ID")
    team_id: Optional[int] = Field(None, description="Team ID")


class CopilotChatResponse(BaseModel):
    """Response schema for copilot chat."""
    conversation_id: int
    message_id: int
    answer: str
    sources: List[Dict[str, Any]] = Field(default_factory=list)
    actions: List[Dict[str, Any]] = Field(default_factory=list)
    usage: Dict[str, Any] = Field(default_factory=dict)

