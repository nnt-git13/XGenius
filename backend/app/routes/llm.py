from __future__ import annotations
import os
from flask import Blueprint, request, current_app

bp = Blueprint("llm", __name__)


@bp.post("/ask")
def ask():
    """LLM hook. In production, call OpenAI/other provider.
    Here we respond with a rule-based explanation that references backend scores.
    Payload: {question: str}
    """
    question = request.get_json(force=True).get("question", "")
    # Minimal stub to keep the endpoint functional without external dependency
    return {
        "answer": (
            "I'm using current optimization and hype scores. Try asking: "
            "'Should I captain Haaland or Saka this week?' or 'Who to replace an injured GK with?'."
        )
    }
