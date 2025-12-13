"""
AI Copilot service using LLM for natural language advice.
"""
from __future__ import annotations
from typing import Optional, Dict, Any
import json
from sqlalchemy.orm import Session

from app.core.config import settings
from app.api.v1.schemas.assistant import AssistantAskResponse


class CopilotService:
    """AI Copilot for FPL advice."""
    
    def __init__(self, db: Session):
        self.db = db
        self.openai_api_key = settings.OPENAI_API_KEY
    
    async def answer(
        self,
        question: str,
        context: Optional[Dict[str, Any]] = None,
        season: Optional[str] = None,
        gameweek: Optional[int] = None,
    ) -> AssistantAskResponse:
        """Answer a question using LLM."""
        context = context or {}
        
        # Build context string
        context_str = self._build_context(context, season, gameweek)
        
        # If OpenAI is configured, use it
        if self.openai_api_key:
            try:
                import openai
                client = openai.OpenAI(api_key=self.openai_api_key)
                
                prompt = f"""You are an expert Fantasy Premier League assistant. Answer the user's question based on the provided context.

Context:
{context_str}

Question: {question}

Provide a helpful, data-driven answer. If the question is about transfers, captaincy, or squad selection, give specific recommendations."""
                
                response = client.chat.completions.create(
                    model=settings.OPENAI_MODEL,
                    messages=[
                        {"role": "system", "content": "You are an expert FPL assistant."},
                        {"role": "user", "content": prompt},
                    ],
                    temperature=settings.LLM_TEMPERATURE,
                    max_tokens=settings.LLM_MAX_TOKENS,
                )
                
                answer = response.choices[0].message.content
                
                return AssistantAskResponse(
                    answer=answer,
                    reasoning=None,
                    suggestions=[],
                    confidence=0.8,
                )
            except Exception as e:
                # Fallback to rule-based
                pass
        
        # Fallback: Rule-based responses
        return self._rule_based_answer(question, context_str)
    
    def _build_context(
        self, context: Dict[str, Any], season: Optional[str], gameweek: Optional[int]
    ) -> str:
        """Build context string from provided context."""
        parts = []
        
        if season:
            parts.append(f"Season: {season}")
        if gameweek:
            parts.append(f"Current Gameweek: {gameweek}")
        
        if context.get("squad"):
            parts.append(f"Squad: {json.dumps(context['squad'], indent=2)}")
        
        if context.get("transfers"):
            parts.append(f"Transfers: {json.dumps(context['transfers'], indent=2)}")
        
        return "\n".join(parts)
    
    def _rule_based_answer(self, question: str, context: str) -> AssistantAskResponse:
        """Fallback rule-based answer system."""
        question_lower = question.lower()
        
        if "captain" in question_lower:
            answer = "Based on your squad, I recommend selecting your highest-scoring midfielder or forward as captain, especially if they have favorable fixtures."
        elif "transfer" in question_lower or "sell" in question_lower or "buy" in question_lower:
            answer = "Consider transferring out players with difficult upcoming fixtures or injury concerns, and bringing in players with good form and easy fixtures."
        elif "bench" in question_lower:
            answer = "Bench players with tough fixtures or rotation risk. Prioritize starting players with good form and easy opponents."
        else:
            answer = "I can help with captaincy decisions, transfer suggestions, and squad optimization. Please ask a specific question about your FPL team."
        
        return AssistantAskResponse(
            answer=answer,
            reasoning="Rule-based response",
            suggestions=[],
            confidence=0.6,
        )

