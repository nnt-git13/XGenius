"""
Observability and metrics endpoints for the copilot.
"""
from __future__ import annotations
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, desc
from typing import List, Optional
from datetime import datetime, timedelta

from app.core.database import get_db
from app.models.copilot import CopilotMetric, CopilotConversation, CopilotMessage

router = APIRouter()


@router.get("/metrics/summary")
async def get_metrics_summary(
    days: int = Query(7, ge=1, le=90),
    db: Session = Depends(get_db),
):
    """
    Get summary metrics for the copilot.
    
    Returns:
    - Total conversations
    - Total messages
    - Average response time
    - Token usage
    - Tool usage stats
    """
    since = datetime.utcnow() - timedelta(days=days)
    
    # Conversation count
    total_conversations = db.query(CopilotConversation).filter(
        CopilotConversation.created_at >= since
    ).count()
    
    # Message count
    total_messages = db.query(CopilotMessage).filter(
        CopilotMessage.created_at >= since
    ).count()
    
    # Average latency
    latency_metrics = db.query(
        func.avg(CopilotMetric.metric_value)
    ).filter(
        CopilotMetric.metric_type == "latency",
        CopilotMetric.created_at >= since
    ).scalar() or 0.0
    
    # Total tokens
    token_metrics = db.query(
        func.sum(CopilotMetric.metric_value)
    ).filter(
        CopilotMetric.metric_type == "tokens",
        CopilotMetric.created_at >= since
    ).scalar() or 0.0
    
    # Tool calls
    tool_calls = db.query(
        func.sum(CopilotMetric.metric_value)
    ).filter(
        CopilotMetric.metric_type == "tool_calls",
        CopilotMetric.created_at >= since
    ).scalar() or 0.0
    
    return {
        "period_days": days,
        "total_conversations": total_conversations,
        "total_messages": total_messages,
        "average_latency_ms": round(latency_metrics, 2),
        "total_tokens": int(token_metrics),
        "total_tool_calls": int(tool_calls),
    }


@router.get("/metrics/timeline")
async def get_metrics_timeline(
    days: int = Query(7, ge=1, le=90),
    metric_type: Optional[str] = Query(None, description="Filter by metric type"),
    db: Session = Depends(get_db),
):
    """
    Get metrics timeline data for charts.
    """
    since = datetime.utcnow() - timedelta(days=days)
    
    query = db.query(
        func.date(CopilotMetric.created_at).label("date"),
        CopilotMetric.metric_type,
        func.avg(CopilotMetric.metric_value).label("avg_value"),
        func.sum(CopilotMetric.metric_value).label("sum_value"),
        func.count(CopilotMetric.id).label("count"),
    ).filter(
        CopilotMetric.created_at >= since
    )
    
    if metric_type:
        query = query.filter(CopilotMetric.metric_type == metric_type)
    
    results = query.group_by(
        func.date(CopilotMetric.created_at),
        CopilotMetric.metric_type
    ).order_by(
        func.date(CopilotMetric.created_at)
    ).all()
    
    return [
        {
            "date": str(row.date),
            "metric_type": row.metric_type,
            "avg_value": float(row.avg_value or 0),
            "sum_value": float(row.sum_value or 0),
            "count": row.count,
        }
        for row in results
    ]


@router.get("/metrics/top-tools")
async def get_top_tools(
    days: int = Query(7, ge=1, le=90),
    limit: int = Query(10, ge=1, le=50),
    db: Session = Depends(get_db),
):
    """
    Get most used tools.
    """
    since = datetime.utcnow() - timedelta(days=days)
    
    results = db.query(
        CopilotMetric.metric_metadata["tool_name"].astext.label("tool_name"),
        func.count(CopilotMetric.id).label("count"),
        func.avg(CopilotMetric.metric_value).label("avg_latency"),
    ).filter(
        CopilotMetric.metric_type == "tool_calls",
        CopilotMetric.created_at >= since,
    ).group_by(
        CopilotMetric.metric_metadata["tool_name"].astext
    ).order_by(
        desc("count")
    ).limit(limit).all()
    
    return [
        {
            "tool_name": row.tool_name or "unknown",
            "count": row.count,
            "avg_latency_ms": round(float(row.avg_latency or 0), 2),
        }
        for row in results
    ]

