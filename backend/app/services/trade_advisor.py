"""
Trade advice service.
"""
from __future__ import annotations
from typing import List, Optional
from sqlalchemy.orm import Session

from app.api.v1.schemas.trades import TradeAdviceResponse
from app.models import Player


class TradeAdvisor:
    """Provides trade advice."""
    
    def __init__(self, db: Session):
        self.db = db
    
    async def analyze_trade(
        self,
        season: str,
        out_player_id: int,
        in_player_id: int,
        current_squad: Optional[List[int]] = None,
        budget: float = 100.0,
    ) -> TradeAdviceResponse:
        """Analyze a potential trade."""
        out_player = self.db.query(Player).filter(Player.id == out_player_id).first()
        in_player = self.db.query(Player).filter(Player.id == in_player_id).first()
        
        if not out_player or not in_player:
            raise ValueError("Player not found")
        
        # Calculate expected points gain (simplified)
        # In production, would use ML predictions
        cost_impact = in_player.price - out_player.price
        
        # Simplified expected points
        expected_gain = 2.0  # Would calculate from ML predictions
        
        # Determine if recommended
        recommended = expected_gain > 0 and (budget - cost_impact) >= 0
        
        # Risk assessment
        risk = "low"
        if in_player.status != "a":
            risk = "high"
        
        reasoning = f"Trading {out_player.name} ({out_player.price}M) for {in_player.name} ({in_player.price}M). "
        if recommended:
            reasoning += f"Expected points gain: {expected_gain:.1f}. Cost impact: {cost_impact:+.1f}M."
        else:
            reasoning += "Not recommended based on expected value."
        
        return TradeAdviceResponse(
            recommended=recommended,
            expected_points_gain=expected_gain,
            cost_impact=cost_impact,
            reasoning=reasoning,
            risk_assessment=risk,
            alternative_suggestions=[],
        )

