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
    ) -> Dict[str, Any]:
        """
        Process a user query through the agent loop.
        
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
        
        # Initialize agent state
        state = AgentState(
            step=AgentStep.PLAN,
            messages=[
                {
                    "role": "system",
                    "content": self._build_system_prompt(context),
                },
                {
                    "role": "user",
                    "content": query,
                }
            ],
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
        prompt = """You are an expert Fantasy Premier League assistant. You help users optimize their teams, make transfer decisions, and understand player performance.

You have access to tools that let you:
- Search for players
- Get player data and statistics
- Analyze teams
- Optimize squads
- Get fixture difficulty

Always:
1. Start with a clear answer or recommendation
2. Explain your reasoning (1-3 bullets)
3. Suggest next steps
4. Use tools when needed to get accurate data
5. If uncertain, offer 2-3 options rather than guessing

Be concise, data-driven, and helpful."""
        
        # Add context
        context_str = self.context_builder.format_context_for_prompt(context)
        if context_str:
            prompt += f"\n\nContext:\n{context_str}"
        
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
                state.messages.append({
                    "role": "tool",
                    "name": tool_name,
                    "tool_call_id": tool_call.get("id"),
                    "content": json.dumps(result),
                })
        
        # Clear tool calls
        state.tool_calls = []
        state.step = AgentStep.VERIFY
    
    async def _verify(self, state: AgentState):
        """Verification step - check results."""
        # Verify tool results make sense
        # Could add validation logic here
        state.step = AgentStep.RESPOND
    
    async def _respond(
        self,
        state: AgentState,
        force: bool = False
    ) -> Dict[str, Any]:
        """Response step - generate final answer."""
        # Use smart model for final response
        response = await self.ai_gateway.chat(
            messages=state.messages,
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

