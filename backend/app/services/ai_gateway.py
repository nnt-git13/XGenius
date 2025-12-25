"""
AI Gateway - Unified interface for LLM providers with intelligent routing.
Supports OpenAI, Groq (free), and Google Gemini (free).
"""
from __future__ import annotations
from typing import Optional, Dict, Any, List, Literal
from enum import Enum
import logging
import time
import json
from dataclasses import dataclass

from app.core.config import settings

logger = logging.getLogger(__name__)


class ModelTier(str, Enum):
    """Model tiers for routing strategy."""
    FAST = "fast"  # Fast, cheap models for simple tasks
    SMART = "smart"  # Balanced models for most tasks
    DEEP = "deep"  # Powerful models for complex tasks


class Provider(str, Enum):
    """LLM Providers."""
    OPENAI = "openai"
    GROQ = "groq"
    GEMINI = "gemini"


@dataclass
class ModelConfig:
    """Configuration for a model."""
    name: str
    tier: ModelTier
    provider: Provider
    max_tokens: int
    cost_per_1k_tokens: float
    avg_latency_ms: int
    supports_streaming: bool = True
    supports_tools: bool = True


class AIGateway:
    """Unified AI Gateway with model routing and provider abstraction."""
    
    # Model configurations
    MODELS = {
        # OpenAI models
        "gpt-4o-mini": ModelConfig(
            name="gpt-4o-mini",
            tier=ModelTier.FAST,
            provider=Provider.OPENAI,
            max_tokens=16384,
            cost_per_1k_tokens=0.15,
            avg_latency_ms=500,
        ),
        "gpt-4o": ModelConfig(
            name="gpt-4o",
            tier=ModelTier.SMART,
            provider=Provider.OPENAI,
            max_tokens=128000,
            cost_per_1k_tokens=2.50,
            avg_latency_ms=1000,
        ),
        "gpt-4-turbo": ModelConfig(
            name="gpt-4-turbo",
            tier=ModelTier.DEEP,
            provider=Provider.OPENAI,
            max_tokens=128000,
            cost_per_1k_tokens=10.00,
            avg_latency_ms=2000,
        ),
        # Groq models (FREE!)
        "llama-3.3-70b-versatile": ModelConfig(
            name="llama-3.3-70b-versatile",
            tier=ModelTier.SMART,
            provider=Provider.GROQ,
            max_tokens=32768,
            cost_per_1k_tokens=0.0,  # Free!
            avg_latency_ms=300,  # Very fast
            supports_tools=True,
        ),
        "llama-3.1-8b-instant": ModelConfig(
            name="llama-3.1-8b-instant",
            tier=ModelTier.FAST,
            provider=Provider.GROQ,
            max_tokens=8192,
            cost_per_1k_tokens=0.0,  # Free!
            avg_latency_ms=150,  # Ultra fast
            supports_tools=True,
        ),
        "mixtral-8x7b-32768": ModelConfig(
            name="mixtral-8x7b-32768",
            tier=ModelTier.SMART,
            provider=Provider.GROQ,
            max_tokens=32768,
            cost_per_1k_tokens=0.0,  # Free!
            avg_latency_ms=400,
            supports_tools=True,
        ),
        # Google Gemini models (FREE tier available)
        "gemini-2.0-flash-exp": ModelConfig(
            name="gemini-2.0-flash-exp",
            tier=ModelTier.SMART,
            provider=Provider.GEMINI,
            max_tokens=8192,
            cost_per_1k_tokens=0.0,  # Free tier
            avg_latency_ms=500,
            supports_tools=True,
        ),
        "gemini-1.5-flash": ModelConfig(
            name="gemini-1.5-flash",
            tier=ModelTier.FAST,
            provider=Provider.GEMINI,
            max_tokens=8192,
            cost_per_1k_tokens=0.0,  # Free tier
            avg_latency_ms=300,
            supports_tools=True,
        ),
    }
    
    def __init__(self):
        self.openai_client = None
        self.groq_client = None
        self.gemini_model = None
        self.available_provider: Optional[Provider] = None
        self._init_clients()
    
    def _init_clients(self):
        """Initialize LLM provider clients based on available API keys.
        Priority: Groq (free & fast) > Gemini (free) > OpenAI (paid)
        """
        provider_preference = settings.LLM_PROVIDER
        
        # Initialize Groq FIRST (FREE and fast!)
        if settings.GROQ_API_KEY:
            try:
                from groq import Groq
                self.groq_client = Groq(api_key=settings.GROQ_API_KEY)
                logger.info("✅ Groq client initialized (FREE - Llama 3.3 70B)")
                if provider_preference in ("auto", "groq"):
                    self.available_provider = Provider.GROQ
            except ImportError:
                logger.warning("Groq package not installed. Run: pip install groq")
            except Exception as e:
                logger.error(f"Failed to initialize Groq client: {e}")
        
        # Initialize Gemini as second option (FREE tier)
        if settings.GEMINI_API_KEY and not self.available_provider:
            try:
                import google.generativeai as genai
                genai.configure(api_key=settings.GEMINI_API_KEY)
                self.gemini_model = genai.GenerativeModel(settings.GEMINI_MODEL)
                logger.info("✅ Gemini client initialized (FREE tier)")
                if provider_preference in ("auto", "gemini"):
                    self.available_provider = Provider.GEMINI
            except ImportError:
                logger.warning("Gemini package not installed. Run: pip install google-generativeai")
            except Exception as e:
                logger.error(f"Failed to initialize Gemini client: {e}")
        
        # Initialize OpenAI as fallback (paid - may have quota issues)
        if settings.OPENAI_API_KEY and not self.available_provider:
            try:
                import openai
                self.openai_client = openai.OpenAI(api_key=settings.OPENAI_API_KEY)
                logger.info("✅ OpenAI client initialized (paid)")
                if provider_preference in ("auto", "openai"):
                    self.available_provider = Provider.OPENAI
            except ImportError:
                logger.warning("OpenAI package not installed. Run: pip install openai")
            except Exception as e:
                logger.error(f"Failed to initialize OpenAI client: {e}")
        
        if not self.available_provider:
            logger.warning("⚠️ No LLM provider initialized. Set GROQ_API_KEY, GEMINI_API_KEY, or OPENAI_API_KEY")
    
    def select_model(
        self,
        task_complexity: Literal["simple", "moderate", "complex"] = "moderate",
        requires_tools: bool = False,
        requires_retrieval: bool = False,
        latency_budget_ms: Optional[int] = None,
        safety_level: Literal["low", "medium", "high"] = "medium",
    ) -> str:
        """
        Select appropriate model based on task requirements and available providers.
        
        Returns:
            Model name to use
        """
        # Select based on available provider
        if self.available_provider == Provider.GROQ:
            if task_complexity == "simple":
                return "llama-3.1-8b-instant"
            return "llama-3.3-70b-versatile"
        
        elif self.available_provider == Provider.GEMINI:
            if task_complexity == "simple":
                return "gemini-1.5-flash"
            return "gemini-2.0-flash-exp"
        
        elif self.available_provider == Provider.OPENAI:
            if safety_level == "high" or task_complexity == "complex":
                return "gpt-4-turbo"
            if task_complexity == "moderate" or requires_tools or requires_retrieval:
                return "gpt-4o"
            return "gpt-4o-mini"
        
        # Fallback
        return "llama-3.3-70b-versatile"
    
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
        Send chat completion request to the appropriate provider.
        
        Returns:
            Response dict with content, tool_calls, usage, etc.
        """
        # Check if any provider is available
        if not self.available_provider:
            raise RuntimeError(
                "No LLM provider initialized. Please set one of: GROQ_API_KEY, GEMINI_API_KEY, or OPENAI_API_KEY "
                "in your environment variables."
            )
        
        if not model:
            model = self.select_model()
        
        model_config = self.MODELS.get(model)
        if not model_config:
            # Use default model for available provider
            model = self.select_model()
            model_config = self.MODELS.get(model)
        
        if not model_config:
            raise ValueError(f"No model configuration found for model: {model}")
        
        start_time = time.time()
        
        try:
            if model_config.provider == Provider.GROQ:
                response = await self._groq_chat(
                    messages=messages,
                    model=model,
                    temperature=temperature,
                    max_tokens=max_tokens or min(model_config.max_tokens, 4096),
                    tools=tools,
                    tool_choice=tool_choice,
                    **kwargs
                )
            elif model_config.provider == Provider.GEMINI:
                response = await self._gemini_chat(
                    messages=messages,
                    model=model,
                    temperature=temperature,
                    max_tokens=max_tokens or min(model_config.max_tokens, 4096),
                    tools=tools,
                    **kwargs
                )
            elif model_config.provider == Provider.OPENAI:
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
                "provider": model_config.provider.value,
            }
            
            return response
            
        except Exception as e:
            # If Groq fails with rate limit, fallback to Gemini
            error_str = str(e)
            if model_config.provider == Provider.GROQ and (
                "rate_limit" in error_str.lower() or 
                "413" in error_str or 
                "too large" in error_str.lower() or
                "tokens" in error_str.lower()
            ):
                logger.warning(f"Groq rate limited, falling back to Gemini: {e}")
                if self.gemini_model:
                    try:
                        response = await self._gemini_chat(
                            messages=messages,
                            model="gemini-2.0-flash",
                            temperature=temperature,
                            max_tokens=max_tokens or 4096,
                            tools=tools,
                            **kwargs
                        )
                        latency_ms = (time.time() - start_time) * 1000
                        response["metadata"] = {
                            "model": "gemini-2.0-flash",
                            "tier": "free",
                            "latency_ms": latency_ms,
                            "provider": "gemini",
                            "fallback": True,
                        }
                        return response
                    except Exception as gemini_error:
                        logger.error(f"Gemini fallback also failed: {gemini_error}")
            
            logger.error(f"AI Gateway error: {e}", exc_info=True)
            raise
    
    async def _groq_chat(
        self,
        messages: List[Dict[str, str]],
        model: str,
        temperature: float,
        max_tokens: int,
        tools: Optional[List[Dict]] = None,
        tool_choice: Optional[str] = None,
        **kwargs
    ) -> Dict[str, Any]:
        """Groq chat completion (FREE!)."""
        if not self.groq_client:
            raise RuntimeError("Groq client not initialized. Set GROQ_API_KEY environment variable.")
        
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
        
        response = self.groq_client.chat.completions.create(**params)
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
                "prompt_tokens": response.usage.prompt_tokens if response.usage else 0,
                "completion_tokens": response.usage.completion_tokens if response.usage else 0,
                "total_tokens": response.usage.total_tokens if response.usage else 0,
            },
        }
    
    async def _gemini_chat(
        self,
        messages: List[Dict[str, str]],
        model: str,
        temperature: float,
        max_tokens: int,
        tools: Optional[List[Dict]] = None,
        **kwargs
    ) -> Dict[str, Any]:
        """Google Gemini chat completion (FREE tier!)."""
        if not self.gemini_model:
            raise RuntimeError("Gemini client not initialized. Set GEMINI_API_KEY environment variable.")
        
        import google.generativeai as genai
        
        # Convert messages to Gemini format
        gemini_messages = []
        system_prompt = None
        
        for msg in messages:
            role = msg.get("role", "user")
            content = msg.get("content", "")
            
            if role == "system":
                system_prompt = content
            elif role == "user":
                gemini_messages.append({"role": "user", "parts": [content]})
            elif role == "assistant":
                gemini_messages.append({"role": "model", "parts": [content]})
            elif role == "tool":
                # Include tool response as user message
                gemini_messages.append({"role": "user", "parts": [f"Tool result: {content}"]})
        
        # Create model with system instruction
        gen_model = genai.GenerativeModel(
            model_name=model,
            system_instruction=system_prompt
        )
        
        # Configure generation
        generation_config = genai.types.GenerationConfig(
            temperature=temperature,
            max_output_tokens=max_tokens,
        )
        
        # Start chat and send message
        chat = gen_model.start_chat(history=gemini_messages[:-1] if len(gemini_messages) > 1 else [])
        
        last_message = gemini_messages[-1]["parts"][0] if gemini_messages else "Hello"
        response = chat.send_message(last_message, generation_config=generation_config)
        
        return {
            "content": response.text or "",
            "tool_calls": [],  # Gemini tool calling format is different
            "usage": {
                "prompt_tokens": 0,  # Gemini doesn't expose this easily
                "completion_tokens": 0,
                "total_tokens": 0,
            },
        }
    
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
            raise RuntimeError("OpenAI client not initialized. Set OPENAI_API_KEY environment variable.")
        
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
            response = self.openai_client.chat.completions.create(**params, stream=True)
            full_content = ""
            for chunk in response:
                if chunk.choices[0].delta.content:
                    full_content += chunk.choices[0].delta.content
            
            return {
                "content": full_content,
                "tool_calls": [],
                "usage": {"total_tokens": 0},
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
    
    def get_available_provider(self) -> Optional[str]:
        """Get the currently available provider."""
        return self.available_provider.value if self.available_provider else None
