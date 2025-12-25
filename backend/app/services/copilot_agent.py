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
                await self._act(state, user_id, team_id)
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
        prompt = """You are an expert Fantasy Premier League (FPL) assistant. Your role is to provide specific, actionable advice using ONLY real, current data from the FPL API.

⚠️ CRITICAL RULES - YOU MUST FOLLOW THESE (VIOLATIONS WILL CAUSE INCORRECT ANSWERS):
1. **ALWAYS USE TOOLS FOR CURRENT DATA** - Before answering ANY question about players, teams, transfers, or gameweeks, you MUST call the appropriate tool to get CURRENT data. NEVER rely on your training data - it's outdated (e.g., Mason Mount is at Manchester United, not Chelsea).
2. **ONLY CURRENT PLAYERS** - Only recommend players who are CURRENTLY in the FPL game. The FPL API only returns active Premier League players. If a player isn't in the tool results, they're not in the league.
3. **ALWAYS CHECK CURRENT GAMEWEEK** - Use get_gameweek_info tool to get the ACTUAL current gameweek number. Don't guess based on dates or your training data.
4. **NEVER GUESS** - If a player is not found in the tool results, they are either not in the Premier League or the name is spelled differently. Say so explicitly.
5. **USE REAL STATS** - All statistics (form, points, price, fixtures, team) must come from tool results, not from memory. Player transfers happen - always verify current team.
6. **VERIFY DATA** - If asked about a specific player, always use get_player_details or search_players to verify they exist and get current stats including their CURRENT team.

You have access to tools that let you:

**PLAYER DATA TOOLS:**
- **search_players**: Search for players by name, position, team, or attributes
- **get_player_details**: Get detailed stats for a specific player
- **find_player_replacements**: Find replacement options for a player
- **compare_players**: Compare two players side-by-side
- **get_top_players**: Get top performers by position
- **get_differential_picks**: Find low-ownership high-potential players

**USER'S TEAM TOOLS (use when user asks about "my team", "my squad", "my players"):**
- **get_my_squad**: Get the user's current squad with all player details
- **analyze_my_squad**: Analyze the squad for strengths, weaknesses, and recommendations
- **get_squad_issues**: Find injuries, suspensions, poor form in the squad
- **get_my_transfer_history**: Get the user's recent transfers
- **get_my_fpl_summary**: Get dashboard info (rank, points, chips, team value)

**OTHER TOOLS:**
- **get_team_fixtures**: Get upcoming fixtures for a Premier League team
- **get_transfer_suggestions**: Get AI-powered transfer recommendations
- **get_captain_picks**: Get captain recommendations
- **get_gameweek_info**: Get current gameweek status and deadline

TOOL USAGE GUIDE:
- When asked about "my team", "my squad", "my players" → Use get_my_squad or analyze_my_squad
- When asked about "my rank", "my points", "how am I doing" → Use get_my_fpl_summary
- When asked about injuries or issues in their team → Use get_squad_issues
- When asked about "replacements" or "alternatives" → Use find_player_replacements
- When asked about a specific player's stats → Use get_player_details
- When asked to compare players → Use compare_players
- When asked about best players by position → Use get_top_players or search_players
- When asked about fixtures → Use get_team_fixtures

IMPORTANT: When using tools that require team_id, use the team_id from the context if available.

IMPORTANT: Always provide specific, detailed answers. Never give generic responses like "consider transferring players" or "check your team". Instead:

1. **Be Specific**: Use actual player names, team names, gameweek numbers, and specific statistics when available
2. **Use Context**: Reference the user's current page/route, their team data if available, and any relevant app state
3. **Provide Data**: Include specific numbers, percentages, or metrics when making recommendations
4. **Use Tools**: When the user asks about players, teams, or data, use the available tools to get accurate, up-to-date information
5. **Explain Reasoning**: Always explain WHY you're making a recommendation with 2-3 specific reasons
6. **Be Actionable**: Give clear next steps the user can take

**FORMATTING REQUIREMENTS:**
- Always use markdown formatting for better readability
- Use **bold** for player names, team names, and key metrics
- Use headers (##) for major sections
- Use bullet points (-) or numbered lists (1.) for recommendations
- Use tables for comparisons or rankings
- Use code blocks for specific stats or data when helpful

Example of a GOOD formatted response:
```markdown
## Captain Recommendation

I recommend **Mohamed Salah** (Liverpool) as your captain this gameweek.

### Why Salah?
- **Fixture**: Liverpool vs Brighton (H) - FDR: 2 ⭐
- **Form**: 3 goals, 2 assists in last 5 games
- **Bonus**: On penalties, strong home record
- **Expected Points**: 7.2

### Alternative Options
1. **Erling Haaland** (Man City) - 6.8 EP, but tougher fixture
2. **Bukayo Saka** (Arsenal) - 6.5 EP, good form

### Next Steps
- Set Salah as captain
- Consider starting Tsimikas (DEF) - Liverpool's defense is solid at home
```

Example of a BAD response (unformatted blob):
"Based on your current squad, I recommend captaining Mohamed Salah this gameweek. Here's why: Liverpool face Brighton at home (FDR: 2), a favorable fixture. Salah has 3 goals and 2 assists in his last 5 games. He's on penalties and has a strong home record this season. Next steps: Set Salah as captain and consider starting Tsimikas if you have him, as Liverpool's defense has been solid at home."

Current Context:"""
        
        # Add context
        context_str = self.context_builder.format_context_for_prompt(context)
        if context_str:
            prompt += f"\n{context_str}"
        else:
            prompt += "\nNo specific context available - use tools to gather relevant information about the user's question."
        
        prompt += """

⚠️ BEFORE ANSWERING ANY QUESTION:
1. If asked about a player → Use search_players or get_player_details to get CURRENT team and stats
2. If asked about gameweek → Use get_gameweek_info to get the ACTUAL current gameweek number
3. If asked about "my team" → Use get_my_squad to get CURRENT squad data
4. NEVER assume player teams from your training data - always verify with tools!

CRITICAL: When you use tools and get results, you MUST provide a natural language answer. Never show tool calls or code snippets to the user. Always synthesize tool results into a clear, conversational response.

Example:
- User asks: "Rank my forwards"
- You call get_my_squad tool, get results
- You respond: "Based on your current squad, here are your forwards ranked by form:
  1. Erling Haaland (Man City) - Form: 6.5, Expected Points: 7.2
  2. Ollie Watkins (Aston Villa) - Form: 5.8, Expected Points: 6.5
  3. Darwin Núñez (Liverpool) - Form: 4.2, Expected Points: 5.1
  
  I recommend starting Haaland and Watkins, with Núñez as a strong bench option."

NOT: "get_my_squad() returned: [data...]"

Remember: Always be specific, use tools when needed, and provide actionable advice with clear reasoning."""
        
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
        user_id: Optional[int],
        team_id: Optional[int] = None
    ):
        """Action step - execute tools."""
        if not state.tool_calls:
            state.step = AgentStep.RESPOND
            return
        
        # Get team_id from context if not provided
        if not team_id and state.context.get("team"):
            team_id = state.context["team"].get("team_id")
        
        # Execute each tool call
        for tool_call in state.tool_calls:
            tool_name = tool_call["function"]["name"]
            try:
                params = json.loads(tool_call["function"]["arguments"])
            except:
                params = {}
            
            # Inject team_id for team-related tools if not provided
            team_tools = ["get_my_squad", "analyze_my_squad", "get_squad_issues", 
                         "get_my_transfer_history", "get_my_fpl_summary"]
            if tool_name in team_tools and "team_id" not in params and team_id:
                params["team_id"] = team_id
            
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
                result_str = json.dumps(result, indent=2) if isinstance(result, dict) else str(result)
                max_result_len = 3000
                if len(result_str) > max_result_len:
                    result_str = result_str[:max_result_len] + '..."}'
                state.messages.append({
                    "role": "tool",
                    "name": tool_name,
                    "tool_call_id": tool_call.get("id"),
                    "content": result_str,
                })
        
        # Clear tool calls - we've executed them
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
        
        # Check if we have tool results - if so, we need to generate a response based on them
        has_tool_results = any(msg.get("role") == "tool" for msg in truncated_messages)
        
        # If we have tool results, add explicit instruction to synthesize them
        if has_tool_results:
            # Find the original user question
            user_question = None
            for msg in reversed(truncated_messages):
                if msg.get("role") == "user":
                    user_question = msg.get("content", "")
                    break
            
            # Add a follow-up instruction to ensure natural language response with markdown formatting
            synthesis_prompt = {
                "role": "user",
                "content": f"Based on the tool results above, please provide a clear, helpful answer to: '{user_question}'. Use the data from the tools to give specific recommendations. Format your response using markdown:\n- Use **bold** for player names, teams, and key metrics\n- Use ## headers for major sections\n- Use bullet points (-) or numbered lists for recommendations\n- Use tables for comparisons or rankings\n- Make it visually organized and easy to scan\n\nDo not show tool calls, code, or raw JSON - just provide a well-formatted, natural response."
            }
            truncated_messages.append(synthesis_prompt)
        
        # Use smart model for final response
        # Don't pass tools here - we want a text response, not more tool calls
        response = await self.ai_gateway.chat(
            messages=truncated_messages,
            model=self.ai_gateway.select_model(task_complexity="moderate"),
            temperature=0.7,
            tools=None,  # Don't allow more tool calls - just generate answer
        )
        
        content = response.get("content", "")
        
        # Clean up any remaining tool call artifacts
        if content:
            # Remove any tool call syntax that might have leaked through
            content = content.replace("</python_tag|>", "")
            content = content.replace("get_player_details(", "")
            # Remove any standalone function calls
            import re
            content = re.sub(r'[a-z_]+\([^)]*\)', '', content)
            content = content.strip()
        
        # If content is still empty or problematic, generate a fallback
        if not content or len(content) < 10:
            # Force a proper response
            fallback_messages = truncated_messages[:-1] if has_tool_results else truncated_messages
            fallback_messages.append({
                "role": "user",
                "content": "Please provide a clear, natural language answer. Summarize the key information from the tool results in a helpful, conversational way."
            })
            response = await self.ai_gateway.chat(
                messages=fallback_messages,
                model=self.ai_gateway.select_model(task_complexity="moderate"),
                temperature=0.7,
            )
            content = response.get("content", "I've processed your request. Please check the tool results above for details.")
        
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

