"""
New agentic copilot endpoints.
"""
from __future__ import annotations
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from typing import Optional, Dict, Any
import logging

from app.db import get_db
from app.services.copilot_agent import CopilotAgent
from app.api.v1.schemas.copilot import CopilotChatRequest, CopilotChatResponse
from app.models.copilot import (
    CopilotConversation,
    CopilotMessage,
    CopilotAction,
    CopilotMetric,
    MessageRole,
    ActionStatus,
)
from datetime import datetime

logger = logging.getLogger(__name__)

router = APIRouter()


@router.post("/chat", response_model=CopilotChatResponse)
async def chat(
    request: CopilotChatRequest,
    db: Session = Depends(get_db),
):
    """
    Main copilot chat endpoint with agentic capabilities.
    """
    try:
        message = request.message
        conversation_id = request.conversation_id
        app_state = request.app_state or {}
        route = request.route
        user_id = request.user_id
        team_id = request.team_id
        
        if not message:
            raise HTTPException(status_code=400, detail="Message is required")
        
        # Get or create conversation
        conversation_history = []
        if conversation_id:
            conversation = db.query(CopilotConversation).filter(
                CopilotConversation.id == conversation_id
            ).first()
            if not conversation:
                raise HTTPException(status_code=404, detail="Conversation not found")
            
            # Load previous messages for context
            previous_messages = db.query(CopilotMessage).filter(
                CopilotMessage.conversation_id == conversation_id
            ).order_by(CopilotMessage.created_at.asc()).limit(20).all()  # Last 20 messages max
            
            for msg in previous_messages:
                conversation_history.append({
                    "role": msg.role.value if hasattr(msg.role, 'value') else msg.role,
                    "content": msg.content,
                })
        else:
            conversation = CopilotConversation(
                user_id=user_id,
                team_id=team_id,
                conversation_metadata={"app_state": app_state, "route": route},
            )
            db.add(conversation)
            db.commit()
            db.refresh(conversation)
        
        # Save user message
        user_message = CopilotMessage(
            conversation_id=conversation.id,
            role=MessageRole.USER,
            content=message,
        )
        db.add(user_message)
        db.commit()
        
        # Process with agent (with fallback to simple response)
        import time
        start_time = time.time()
        try:
            agent = CopilotAgent(db)
            response = await agent.process_query(
                query=message,
                conversation_id=conversation.id,
                user_id=user_id,
                team_id=team_id,
                app_state=app_state,
                route=route,
                conversation_history=conversation_history,
            )
            
            # Record latency metric
            latency_ms = (time.time() - start_time) * 1000
            latency_metric = CopilotMetric(
                conversation_id=conversation.id,
                message_id=None,  # Will be set after message is created
                metric_type="latency",
                metric_value=latency_ms,
                metric_unit="ms",
            )
            db.add(latency_metric)
            
            # Record token usage if available
            if response.get("usage"):
                usage = response["usage"]
                if usage.get("total_tokens"):
                    token_metric = CopilotMetric(
                        conversation_id=conversation.id,
                        metric_type="tokens",
                        metric_value=usage.get("total_tokens", 0),
                        metric_unit="tokens",
                        metric_metadata={"model": response.get("model", "unknown")},
                    )
                    db.add(token_metric)
            
            # Record tool calls
            if response.get("actions"):
                tool_count = len(response.get("actions", []))
                tool_metric = CopilotMetric(
                    conversation_id=conversation.id,
                    metric_type="tool_calls",
                    metric_value=tool_count,
                    metric_unit="count",
                )
                db.add(tool_metric)
                
        except HTTPException:
            raise  # Re-raise HTTPExceptions
        except Exception as agent_error:
            logger.error(f"Agent processing failed: {agent_error}", exc_info=True)
            
            # Provide more helpful error messages based on error type
            error_msg = str(agent_error).lower()
            if "no llm provider" in error_msg or "api key" in error_msg:
                answer = "I'm unable to process requests right now because no AI provider is configured. Please set GROQ_API_KEY, GEMINI_API_KEY, or OPENAI_API_KEY in your backend environment variables."
            elif "rate limit" in error_msg or "quota" in error_msg:
                answer = "I'm experiencing rate limits from the AI provider. Please try again in a moment."
            elif "timeout" in error_msg:
                answer = "The request took too long to process. Please try again with a simpler question."
            else:
                # Generic error - log full details but show user-friendly message
                answer = f"I encountered an error processing your request: '{message}'. Please try again in a moment. If this persists, check the backend logs for details."
            
            # Fallback to simple response
            response = {
                "answer": answer,
                "sources": [],
                "actions": [],
                "usage": {},
            }
        
        # Save assistant message
        assistant_message = CopilotMessage(
            conversation_id=conversation.id,
            role=MessageRole.ASSISTANT,
            content=response.get("answer", "I've processed your request."),
            sources=response.get("sources", []),
            tool_calls=response.get("tool_calls", []),
            token_count=response.get("usage", {}).get("total_tokens") if isinstance(response.get("usage"), dict) else None,
            model_used=response.get("model") or response.get("metadata", {}).get("model") if isinstance(response.get("metadata"), dict) else None,
        )
        db.add(assistant_message)
        db.commit()
        db.refresh(assistant_message)
        
        # Update metrics with message_id
        db.query(CopilotMetric).filter(
            CopilotMetric.conversation_id == conversation.id,
            CopilotMetric.message_id.is_(None)
        ).update({"message_id": assistant_message.id})
        db.commit()
        
        # Save actions
        actions = []
        for action_data in response.get("actions", []):
            if isinstance(action_data, dict) and "tool_name" in action_data:
                action = CopilotAction(
                    conversation_id=conversation.id,
                    message_id=assistant_message.id,
                    tool_name=action_data["tool_name"],
                    tool_params=action_data.get("params", {}),
                    status=ActionStatus(action_data.get("status", "pending")),
                    preview=action_data.get("preview"),
                    requires_confirmation=action_data.get("requires_confirmation", False),
                )
                db.add(action)
                actions.append(action)
        
        db.commit()
        
        return {
            "conversation_id": conversation.id,
            "message_id": assistant_message.id,
            "answer": response["answer"],
            "sources": response.get("sources", []),
            "actions": [
                {
                    "id": a.id,
                    "tool_name": a.tool_name,
                    "status": a.status.value,
                    "preview": a.preview,
                    "requires_confirmation": a.requires_confirmation,
                }
                for a in actions
            ],
            "usage": response.get("usage", {}),
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Copilot error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/actions/{action_id}/confirm")
async def confirm_action(
    action_id: int,
    db: Session = Depends(get_db),
):
    """Confirm and execute a pending action."""
    action = db.query(CopilotAction).filter(CopilotAction.id == action_id).first()
    if not action:
        raise HTTPException(status_code=404, detail="Action not found")
    
    if action.status != ActionStatus.PREVIEW:
        raise HTTPException(status_code=400, detail="Action is not in preview state")
    
    # Execute action
    from app.services.copilot_tools import ToolRegistry
    tool_registry = ToolRegistry(db)
    
    result = await tool_registry.execute_tool(
        action.tool_name,
        action.tool_params,
        dry_run=False
    )
    
    action.status = ActionStatus.COMPLETED if result.get("success") else ActionStatus.FAILED
    action.result = result
    action.confirmed_by_user = True
    action.executed_at = datetime.utcnow()
    
    db.commit()
    
    return {
        "action_id": action.id,
        "status": action.status.value,
        "result": result,
    }


@router.get("/conversations")
async def list_conversations(
    user_id: Optional[int] = None,
    limit: int = 20,
    db: Session = Depends(get_db),
):
    """List user conversations."""
    query = db.query(CopilotConversation)
    if user_id:
        query = query.filter(CopilotConversation.user_id == user_id)
    
    conversations = query.order_by(
        CopilotConversation.updated_at.desc()
    ).limit(limit).all()
    
    return {
        "conversations": [
            {
                "id": c.id,
                "title": c.title,
                "created_at": c.created_at.isoformat(),
                "updated_at": c.updated_at.isoformat(),
            }
            for c in conversations
        ]
    }

