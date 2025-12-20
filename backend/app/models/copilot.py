"""
Database models for the AI Copilot system.
"""
from __future__ import annotations
from datetime import datetime
from typing import Optional, Dict, Any
from sqlalchemy import Column, Integer, String, Text, DateTime, Boolean, JSON, ForeignKey, Float, Enum as SQLEnum
from sqlalchemy.orm import relationship
import enum

from app.db import Base


class MessageRole(str, enum.Enum):
    """Message role types."""
    USER = "user"
    ASSISTANT = "assistant"
    SYSTEM = "system"
    TOOL = "tool"


class ActionStatus(str, enum.Enum):
    """Action execution status."""
    PENDING = "pending"
    PREVIEW = "preview"
    EXECUTING = "executing"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"


class ActionRisk(str, enum.Enum):
    """Action risk levels."""
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class CopilotConversation(Base):
    """A copilot conversation session."""
    __tablename__ = "copilot_conversations"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, nullable=True, index=True)  # Optional for now
    team_id = Column(Integer, nullable=True, index=True)  # Optional team context
    title = Column(String(255), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    conversation_metadata = Column(JSON, default=dict)  # Store context, preferences, etc.
    
    # Relationships
    messages = relationship("CopilotMessage", back_populates="conversation", cascade="all, delete-orphan")
    actions = relationship("CopilotAction", back_populates="conversation", cascade="all, delete-orphan")


class CopilotMessage(Base):
    """A message in a copilot conversation."""
    __tablename__ = "copilot_messages"
    
    id = Column(Integer, primary_key=True, index=True)
    conversation_id = Column(Integer, ForeignKey("copilot_conversations.id", ondelete="CASCADE"), index=True)
    role = Column(SQLEnum(MessageRole), nullable=False, index=True)
    content = Column(Text, nullable=False)
    reasoning = Column(Text, nullable=True)  # Assistant reasoning/chain of thought
    sources = Column(JSON, default=list)  # Citations, data sources used
    tool_calls = Column(JSON, default=list)  # Tool calls made
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
    token_count = Column(Integer, nullable=True)  # Token usage
    model_used = Column(String(100), nullable=True)  # Which model was used
    
    # Relationships
    conversation = relationship("CopilotConversation", back_populates="messages")


class CopilotAction(Base):
    """An action proposed or executed by the copilot."""
    __tablename__ = "copilot_actions"
    
    id = Column(Integer, primary_key=True, index=True)
    conversation_id = Column(Integer, ForeignKey("copilot_conversations.id", ondelete="CASCADE"), index=True)
    message_id = Column(Integer, ForeignKey("copilot_messages.id", ondelete="SET NULL"), nullable=True)
    
    tool_name = Column(String(100), nullable=False, index=True)
    tool_params = Column(JSON, nullable=False)  # Tool parameters
    status = Column(SQLEnum(ActionStatus), default=ActionStatus.PENDING, index=True)
    risk_level = Column(SQLEnum(ActionRisk), default=ActionRisk.LOW, index=True)
    
    preview = Column(JSON, nullable=True)  # Preview of what will happen
    result = Column(JSON, nullable=True)  # Execution result
    error = Column(Text, nullable=True)  # Error message if failed
    
    requires_confirmation = Column(Boolean, default=False)
    confirmed_by_user = Column(Boolean, default=False)
    executed_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
    
    # Relationships
    conversation = relationship("CopilotConversation", back_populates="actions")
    audit_logs = relationship("CopilotAuditLog", back_populates="action", cascade="all, delete-orphan")


class CopilotAuditLog(Base):
    """Audit log for copilot actions."""
    __tablename__ = "copilot_audit_logs"
    
    id = Column(Integer, primary_key=True, index=True)
    action_id = Column(Integer, ForeignKey("copilot_actions.id", ondelete="CASCADE"), index=True)
    user_id = Column(Integer, nullable=True, index=True)
    
    event_type = Column(String(50), nullable=False, index=True)  # created, previewed, confirmed, executed, cancelled
    event_data = Column(JSON, default=dict)
    ip_address = Column(String(45), nullable=True)
    user_agent = Column(String(500), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
    
    # Relationships
    action = relationship("CopilotAction", back_populates="audit_logs")


class CopilotPreference(Base):
    """User and team preferences for the copilot."""
    __tablename__ = "copilot_preferences"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, nullable=True, index=True)
    team_id = Column(Integer, nullable=True, index=True)
    
    preference_key = Column(String(100), nullable=False, index=True)  # e.g., "tone", "output_format"
    preference_value = Column(JSON, nullable=False)
    scope = Column(String(20), default="user", index=True)  # user, team, global
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class CopilotMetric(Base):
    """Observability metrics for the copilot."""
    __tablename__ = "copilot_metrics"
    
    id = Column(Integer, primary_key=True, index=True)
    conversation_id = Column(Integer, ForeignKey("copilot_conversations.id", ondelete="SET NULL"), nullable=True)
    message_id = Column(Integer, ForeignKey("copilot_messages.id", ondelete="SET NULL"), nullable=True)
    
    metric_type = Column(String(50), nullable=False, index=True)  # latency, tokens, tool_calls, etc.
    metric_value = Column(Float, nullable=False)
    metric_unit = Column(String(20), nullable=True)  # ms, tokens, count, etc.
    metric_metadata = Column(JSON, default=dict)
    
    created_at = Column(DateTime, default=datetime.utcnow, index=True)

