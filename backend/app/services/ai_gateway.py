"""
AI Gateway - Unified interface for LLM providers with intelligent routing.
"""
from __future__ import annotations
from typing import Optional, Dict, Any, List, Literal
from enum import Enum
import logging
import time
from dataclasses import dataclass

from app.core.config import settings

logger = logging.getLogger(__name__)


class ModelTier(str, Enum):
    """Model tiers for routing strategy."""
    FAST = "fast"  # Fast, cheap models for simple tasks
    SMART = "smart"  # Balanced models for most tasks
    DEEP = "deep"  # Powerful models for complex tasks


@dataclass
class ModelConfig:
    """Configuration for a model."""
    name: str
    tier: ModelTier
    provider: str
    max_tokens: int
    cost_per_1k_tokens: float
    avg_latency_ms: int
    supports_streaming: bool = True
    supports_tools: bool = True


class AIGateway:
    """Unified AI Gateway with model routing and provider abstraction."""
    
    # Model configurations
    MODELS = {
        "gpt-4o-mini": ModelConfig(
            name="gpt-4o-mini",
            tier=ModelTier.FAST,
            provider="openai",
            max_tokens=16384,
            cost_per_1k_tokens=0.15,  # Input
            avg_latency_ms=500,
        ),
        "gpt-4o": ModelConfig(
            name="gpt-4o",
            tier=ModelTier.SMART,
            provider="openai",
            max_tokens=128000,
            cost_per_1k_tokens=2.50,  # Input
            avg_latency_ms=1000,
        ),
        "gpt-4-turbo": ModelConfig(
            name="gpt-4-turbo",
            tier=ModelTier.DEEP,
            provider="openai",
            max_tokens=128000,
            cost_per_1k_tokens=10.00,  # Input
            avg_latency_ms=2000,
        ),
    }
    
    def __init__(self):
        self.openai_client = None
        self._init_clients()
    
    def _init_clients(self):
        """Initialize LLM provider clients."""
        if settings.OPENAI_API_KEY:
            try:
                import openai
                self.openai_client = openai.OpenAI(api_key=settings.OPENAI_API_KEY)
                logger.info("OpenAI client initialized")
            except ImportError:
                logger.warning("OpenAI package not installed")
            except Exception as e:
                logger.error(f"Failed to initialize OpenAI client: {e}")
    
    def select_model(
        self,
        task_complexity: Literal["simple", "moderate", "complex"] = "moderate",
        requires_tools: bool = False,
        requires_retrieval: bool = False,
        latency_budget_ms: Optional[int] = None,
        safety_level: Literal["low", "medium", "high"] = "medium",
    ) -> str:
        """
        Select appropriate model based on task requirements.
        
        Args:
            task_complexity: Simple, moderate, or complex task
            requires_tools: Whether tool calling is needed
            requires_retrieval: Whether RAG/retrieval is needed
            latency_budget_ms: Maximum acceptable latency
            safety_level: Safety requirements (high = use more capable model)
        
        Returns:
            Model name to use
        """
        # High safety or complex tasks -> DEEP
        if safety_level == "high" or task_complexity == "complex":
            return "gpt-4-turbo"
        
        # Moderate complexity or tool calling -> SMART
        if task_complexity == "moderate" or requires_tools or requires_retrieval:
            return "gpt-4o"
        
        # Simple tasks -> FAST
        return "gpt-4o-mini"
    
    async def chat(
        self,
        messages: List[Dict[str, str]],
        model: Optional[str] = None,
        temperature: float = 0.7,
        max_tokens: Optional[int] = None,
        tools: Optional[List[Dict]] = None,
        tool_choice: Optional[str] = None,
        stream: bool = False,
        **kwargs
    ) -> Dict[str, Any]:
        """
        Send chat completion request.
        
        Returns:
            Response dict with content, tool_calls, usage, etc.
        """
        if not model:
            model = self.select_model()
        
        model_config = self.MODELS.get(model)
        if not model_config:
            raise ValueError(f"Unknown model: {model}")
        
        start_time = time.time()
        
        try:
            if model_config.provider == "openai":
                response = await self._openai_chat(
                    messages=messages,
                    model=model,
                    temperature=temperature,
                    max_tokens=max_tokens or model_config.max_tokens,
                    tools=tools,
                    tool_choice=tool_choice,
                    stream=stream,
                    **kwargs
                )
            else:
                raise ValueError(f"Unsupported provider: {model_config.provider}")
            
            latency_ms = (time.time() - start_time) * 1000
            
            # Add metadata
            response["metadata"] = {
                "model": model,
                "tier": model_config.tier.value,
                "latency_ms": latency_ms,
                "provider": model_config.provider,
            }
            
            return response
            
        except Exception as e:
            logger.error(f"AI Gateway error: {e}", exc_info=True)
            raise
    
    async def _openai_chat(
        self,
        messages: List[Dict[str, str]],
        model: str,
        temperature: float,
        max_tokens: int,
        tools: Optional[List[Dict]] = None,
        tool_choice: Optional[str] = None,
        stream: bool = False,
        **kwargs
    ) -> Dict[str, Any]:
        """OpenAI chat completion."""
        if not self.openai_client:
            raise RuntimeError("OpenAI client not initialized")
        
        params = {
            "model": model,
            "messages": messages,
            "temperature": temperature,
            "max_tokens": max_tokens,
        }
        
        if tools:
            params["tools"] = tools
            if tool_choice:
                params["tool_choice"] = tool_choice
        
        if stream:
            # Handle streaming (for future implementation)
            response = self.openai_client.chat.completions.create(**params, stream=True)
            # For now, collect all chunks
            full_content = ""
            for chunk in response:
                if chunk.choices[0].delta.content:
                    full_content += chunk.choices[0].delta.content
            
            return {
                "content": full_content,
                "tool_calls": [],
                "usage": {"total_tokens": 0},  # Would need to track
            }
        else:
            response = self.openai_client.chat.completions.create(**params)
            choice = response.choices[0]
            
            return {
                "content": choice.message.content or "",
                "tool_calls": [
                    {
                        "id": tc.id,
                        "type": tc.type,
                        "function": {
                            "name": tc.function.name,
                            "arguments": tc.function.arguments,
                        }
                    }
                    for tc in (choice.message.tool_calls or [])
                ],
                "usage": {
                    "prompt_tokens": response.usage.prompt_tokens,
                    "completion_tokens": response.usage.completion_tokens,
                    "total_tokens": response.usage.total_tokens,
                },
            }
    
    def estimate_cost(self, model: str, tokens: int) -> float:
        """Estimate cost for token usage."""
        config = self.MODELS.get(model)
        if not config:
            return 0.0
        return (tokens / 1000) * config.cost_per_1k_tokens

