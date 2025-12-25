"""
Agent Framework - Orchestrates planning, retrieval, action, and response.
"""
from __future__ import annotations
from typing import Dict, Any, List, Optional
from dataclasses import dataclass
from enum import Enum
import logging
import json
from sqlalchemy.orm import Session

from app.services.ai_gateway import AIGateway, ModelTier
from app.services.copilot_context import ContextBuilder
from app.services.copilot_tools import ToolRegistry
from app.services.copilot_policy import PolicyEngine
from app.models.copilot import (
    CopilotMessage,
    MessageRole,
    CopilotAction,
    ActionStatus,
    ActionRisk,
)

logger = logging.getLogger(__name__)


class AgentStep(str, Enum):
    """Agent execution steps."""
    PLAN = "plan"
    RETRIEVE = "retrieve"
    ACT = "act"
    VERIFY = "verify"
    RESPOND = "respond"


@dataclass
class AgentState:
    """State of agent execution."""
    step: AgentStep
    messages: List[Dict[str, str]]
    tool_calls: List[Dict[str, Any]]
    context: Dict[str, Any]
    actions: List[CopilotAction]
    max_steps: int = 8
    current_step: int = 0


class CopilotAgent:
    """Agentic copilot that plans, retrieves, acts, and responds."""
    
    def __init__(self, db: Session):
        self.db = db
        self.ai_gateway = AIGateway()
        self.context_builder = ContextBuilder(db)
        self.tool_registry = ToolRegistry(db)
        self.policy_engine = PolicyEngine(db)
    
    async def process_query(
        self,
        query: str,
        conversation_id: Optional[int] = None,
        user_id: Optional[int] = None,
        team_id: Optional[int] = None,
        app_state: Optional[Dict[str, Any]] = None,
        route: Optional[str] = None,
        conversation_history: Optional[List[Dict[str, str]]] = None,
    ) -> Dict[str, Any]:
        """
        Process a user query through the agent loop.
        
        Args:
            query: The current user message
            conversation_id: Optional conversation ID for context
            user_id: Optional user ID
            team_id: Optional FPL team ID
            app_state: Optional application state
            route: Optional current route/page
            conversation_history: Previous messages in this conversation
        
        Returns:
            Response with answer, actions, sources, etc.
        """
        # Build context
        context = await self.context_builder.build_context(
            user_id=user_id,
            team_id=team_id,
            app_state=app_state,
            route=route,
        )
        
        # Build messages list with conversation history
        messages = [
            {
                "role": "system",
                "content": self._build_system_prompt(context),
            },
        ]
        
        # Add conversation history (limited to avoid token limits)
        if conversation_history:
            # Keep last 10 messages to stay within token limits
            recent_history = conversation_history[-10:]
            for msg in recent_history:
                messages.append({
                    "role": msg.get("role", "user"),
                    "content": msg.get("content", ""),
                })
        
        # Add current query
        messages.append({
            "role": "user",
            "content": query,
        })
        
        # Initialize agent state
        state = AgentState(
            step=AgentStep.PLAN,
            messages=messages,
            tool_calls=[],
            context=context,
            actions=[],
        )
        
        # Agent loop
        while state.current_step < state.max_steps:
            state.current_step += 1
            
            if state.step == AgentStep.PLAN:
                await self._plan(state)
            elif state.step == AgentStep.RETRIEVE:
                await self._retrieve(state)
            elif state.step == AgentStep.ACT:
                await self._act(state, user_id)
            elif state.step == AgentStep.VERIFY:
                await self._verify(state)
            elif state.step == AgentStep.RESPOND:
                response = await self._respond(state)
                return response
            
            # Determine next step
            state.step = self._determine_next_step(state)
        
        # Max steps reached
        return await self._respond(state, force=True)
    
    def _build_system_prompt(self, context: Dict[str, Any]) -> str:
        """Build system prompt with context."""
        prompt = """You are an expert Fantasy Premier League (FPL) assistant with deep knowledge of Premier League football, player statistics, fixture difficulty, and FPL strategy. Your role is to provide specific, actionable advice tailored to each user's situation.

You have access to tools that let you:
- Search for players by name, position, team, or attributes
- Get detailed player data, statistics, and performance metrics
- Analyze teams and squads
- Optimize squads based on budget and constraints
- Get fixture difficulty ratings and upcoming schedules
- Evaluate transfer decisions and trade advice

IMPORTANT: Always provide specific, detailed answers. Never give generic responses like "consider transferring players" or "check your team". Instead:

1. **Be Specific**: Use actual player names, team names, gameweek numbers, and specific statistics when available
2. **Use Context**: Reference the user's current page/route, their team data if available, and any relevant app state
3. **Provide Data**: Include specific numbers, percentages, or metrics when making recommendations
4. **Use Tools**: When the user asks about players, teams, or data, use the available tools to get accurate, up-to-date information
5. **Explain Reasoning**: Always explain WHY you're making a recommendation with 2-3 specific reasons
6. **Be Actionable**: Give clear next steps the user can take

Example of a GOOD response:
"Based on your current squad, I recommend captaining Mohamed Salah this gameweek. Here's why:
- Liverpool face Brighton at home (FDR: 2), a favorable fixture
- Salah has 3 goals and 2 assists in his last 5 games
- He's on penalties and has a strong home record this season
Next steps: Set Salah as captain and consider starting Tsimikas if you have him, as Liverpool's defense has been solid at home."

Example of a BAD response (too generic):
"Consider selecting a player with good form and easy fixtures as your captain."

Current Context:"""
        
        # Add context
        context_str = self.context_builder.format_context_for_prompt(context)
        if context_str:
            prompt += f"\n{context_str}"
        else:
            prompt += "\nNo specific context available - use tools to gather relevant information about the user's question."
        
        prompt += "\n\nRemember: Always be specific, use tools when needed, and provide actionable advice with clear reasoning."
        
        return prompt
    
    async def _plan(self, state: AgentState):
        """Planning step - determine what to do."""
        # Use fast model for planning
        response = await self.ai_gateway.chat(
            messages=state.messages,
            model=self.ai_gateway.select_model(task_complexity="simple"),
            temperature=0.3,
            tools=self.tool_registry.list_tools(),
            tool_choice="auto",
        )
        
        # Add assistant message
        state.messages.append({
            "role": "assistant",
            "content": response.get("content", ""),
        })
        
        # Check for tool calls
        if response.get("tool_calls"):
            state.tool_calls.extend(response["tool_calls"])
            state.step = AgentStep.ACT
        else:
            state.step = AgentStep.RESPOND
    
    async def _retrieve(self, state: AgentState):
        """Retrieval step - get relevant data."""
        # Placeholder for RAG/retrieval
        # Would query vector store, database, etc.
        state.step = AgentStep.ACT
    
    async def _act(
        self,
        state: AgentState,
        user_id: Optional[int]
    ):
        """Action step - execute tools."""
        if not state.tool_calls:
            state.step = AgentStep.RESPOND
            return
        
        # Execute each tool call
        for tool_call in state.tool_calls:
            tool_name = tool_call["function"]["name"]
            try:
                params = json.loads(tool_call["function"]["arguments"])
            except:
                params = {}
            
            tool = self.tool_registry.get_tool(tool_name)
            if not tool:
                continue
            
            # Check permissions
            permission = self.policy_engine.check_permission(user_id, tool, params)
            if not permission["allowed"]:
                state.messages.append({
                    "role": "tool",
                    "name": tool_name,
                    "content": f"Permission denied: {permission['reason']}",
                })
                continue
            
            # Execute tool (dry run first if needed)
            if permission["requires_confirmation"]:
                preview = await self.tool_registry.execute_tool(tool_name, params, dry_run=True)
                # Create action for user confirmation
                action = CopilotAction(
                    conversation_id=None,  # Will be set later
                    tool_name=tool_name,
                    tool_params=params,
                    status=ActionStatus.PREVIEW,
                    risk_level=ActionRisk(tool.risk_level.value),
                    preview=preview,
                    requires_confirmation=True,
                )
                state.actions.append(action)
            else:
                result = await self.tool_registry.execute_tool(tool_name, params, dry_run=False)
                # Truncate large tool results to avoid token limits
                result_str = json.dumps(result)
                max_result_len = 3000
                if len(result_str) > max_result_len:
                    result_str = result_str[:max_result_len] + '..."}'
                state.messages.append({
                    "role": "tool",
                    "name": tool_name,
                    "tool_call_id": tool_call.get("id"),
                    "content": result_str,
                })
        
        # Clear tool calls
        state.tool_calls = []
        state.step = AgentStep.VERIFY
    
    async def _verify(self, state: AgentState):
        """Verification step - check results."""
        # Verify tool results make sense
        # Could add validation logic here
        state.step = AgentStep.RESPOND
    
    def _truncate_messages(self, messages: List[Dict], max_total_chars: int = 8000) -> List[Dict]:
        """Truncate messages to fit within token limits."""
        # Keep system message and last few messages intact
        if len(messages) <= 3:
            return messages
        
        # Always keep first (system) and last 2 messages
        result = [messages[0]]  # System message
        
        # Calculate remaining space
        system_len = len(str(messages[0]))
        last_msgs_len = sum(len(str(m)) for m in messages[-2:])
        remaining = max_total_chars - system_len - last_msgs_len - 500  # Buffer
        
        # Add middle messages, truncating if needed
        middle_msgs = messages[1:-2]
        current_len = 0
        for msg in middle_msgs:
            msg_str = str(msg)
            if current_len + len(msg_str) > remaining:
                # Truncate this message
                if msg.get("role") == "tool":
                    content = msg.get("content", "")
                    if len(content) > 500:
                        msg = {**msg, "content": content[:500] + "... [truncated]"}
                elif len(msg_str) > 200:
                    continue  # Skip old messages if too long
            result.append(msg)
            current_len += len(str(msg))
        
        # Add last 2 messages
        result.extend(messages[-2:])
        return result
    
    async def _respond(
        self,
        state: AgentState,
        force: bool = False
    ) -> Dict[str, Any]:
        """Response step - generate final answer."""
        # Truncate messages to fit within token limits
        truncated_messages = self._truncate_messages(state.messages)
        
        # Use smart model for final response
        response = await self.ai_gateway.chat(
            messages=truncated_messages,
            model=self.ai_gateway.select_model(task_complexity="moderate"),
            temperature=0.7,
        )
        
        content = response.get("content", "")
        
        # Extract sources from context
        sources = []
        if state.context.get("knowledge"):
            sources = state.context["knowledge"].get("sources", [])
        
        return {
            "answer": content,
            "sources": sources,
            "actions": [
                {
                    "id": None,  # Will be set when saved
                    "tool_name": action.tool_name,
                    "status": action.status.value,
                    "preview": action.preview,
                    "requires_confirmation": action.requires_confirmation,
                }
                for action in state.actions
            ],
            "usage": response.get("usage", {}),
            "model": response.get("metadata", {}).get("model"),
        }
    
    def _determine_next_step(self, state: AgentState) -> AgentStep:
        """Determine next step in agent loop."""
        if state.tool_calls:
            return AgentStep.ACT
        if state.step == AgentStep.PLAN:
            return AgentStep.RETRIEVE
        if state.step == AgentStep.ACT:
            return AgentStep.VERIFY
        return AgentStep.RESPOND

