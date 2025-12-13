"""
Advanced squad optimizer with constraints and multi-gameweek planning.
"""
from __future__ import annotations
from typing import List, Optional, Dict, Any
from ortools.linear_solver import pywraplp
from sqlalchemy.orm import Session
from sqlalchemy import and_

from app.models import Player, ScoreObject, Team
from app.api.v1.schemas.optimize import OptimizeSquadResponse, OptimizedPlayer

# FPL constraints
POSITION_REQUIREMENTS = {"GK": 2, "DEF": 5, "MID": 5, "FWD": 3}
MAX_PLAYERS_PER_TEAM = 3
VALID_FORMATIONS = [
    (1, 3, 4, 3),  # 3-4-3
    (1, 3, 5, 2),  # 3-5-2
    (1, 4, 4, 2),  # 4-4-2
    (1, 4, 5, 1),  # 4-5-1
    (1, 5, 3, 2),  # 5-3-2
    (1, 5, 4, 1),  # 5-4-1
]


class SquadOptimizer:
    """Optimizes FPL squads using integer linear programming."""
    
    def __init__(self, db: Session):
        self.db = db
    
    async def optimize(
        self,
        season: str,
        budget: float,
        exclude_players: List[int] = None,
        lock_players: List[int] = None,
        chip: Optional[str] = None,
        horizon_gw: int = 1,
        current_squad: Optional[List[int]] = None,
    ) -> OptimizeSquadResponse:
        """Optimize a squad under constraints."""
        exclude_set = set(exclude_players or [])
        lock_set = set(lock_players or [])
        
        # Fetch candidates with scores
        candidates = self._fetch_candidates(season, horizon_gw)
        
        # Filter excluded players
        candidates = [(p, s) for p, s in candidates if p.id not in exclude_set]
        
        if not candidates:
            raise ValueError("No valid candidates found")
        
        # Create solver
        solver = pywraplp.Solver.CreateSolver("SCIP")
        if not solver:
            raise RuntimeError("OR-Tools SCIP solver unavailable")
        
        # Decision variables: x[i] = 1 if player i is selected
        x = {p.id: solver.BoolVar(f"x_{p.id}") for p, s in candidates}
        
        # Budget constraint
        solver.Add(
            sum(p.price * x[p.id] for p, s in candidates if p.id in x) <= budget
        )
        
        # Exactly 15 players
        solver.Add(sum(x[p.id] for p, s in candidates if p.id in x) == 15)
        
        # Position constraints
        for pos, count in POSITION_REQUIREMENTS.items():
            solver.Add(
                sum(x[p.id] for p, s in candidates 
                    if p.position == pos and p.id in x) == count
            )
        
        # Team constraints (max 3 per team)
        teams = set(p.team_id for p, _ in candidates)
        for team_id in teams:
            solver.Add(
                sum(x[p.id] for p, s in candidates 
                    if p.team_id == team_id and p.id in x) <= MAX_PLAYERS_PER_TEAM
            )
        
        # Lock players
        for pid in lock_set:
            if pid in x:
                solver.Add(x[pid] == 1)
        
        # Objective: maximize total starting XI metric
        # For multi-gameweek, use average expected score
        objective_terms = []
        for p, s in candidates:
            if p.id in x:
                # Use starting_xi_metric or fallback to base_score
                score = s.starting_xi_metric if hasattr(s, 'starting_xi_metric') else s.base_score
                objective_terms.append(score * x[p.id])
        
        solver.Maximize(sum(objective_terms))
        
        # Solve
        status = solver.Solve()
        if status not in (pywraplp.Solver.OPTIMAL, pywraplp.Solver.FEASIBLE):
            raise RuntimeError("No feasible squad found under constraints")
        
        # Extract solution
        chosen = [
            (p, s) for p, s in candidates 
            if p.id in x and x[p.id].solution_value() > 0.5
        ]
        
        # Select best starting XI
        starting_xi, bench, formation = self._select_best_xi(chosen)
        
        # Calculate total scores
        total_cost = sum(p.price for p, _ in chosen)
        total_score = sum(
            s.starting_xi_metric if hasattr(s, 'starting_xi_metric') else s.base_score
            for _, s in chosen
        )
        xg_score = total_score  # Enhanced later with ML components
        
        # Build response
        squad_players = [
            OptimizedPlayer(
                id=p.id,
                name=p.name,
                position=p.position,
                team=p.team.name if p.team else "Unknown",
                price=p.price,
                score=s.starting_xi_metric if hasattr(s, 'starting_xi_metric') else s.base_score,
                is_starting_xi=p.id in [pl.id for pl in starting_xi],
                is_captain=False,  # Will be determined separately
                is_vice_captain=False,
                expected_points=0.0,  # Will be populated from ML predictions
            )
            for p, s in chosen
        ]
        
        return OptimizeSquadResponse(
            squad=squad_players,
            starting_xi=[p for p in squad_players if p.is_starting_xi],
            bench=[p for p in squad_players if not p.is_starting_xi],
            total_cost=total_cost,
            total_score=total_score,
            xg_score=xg_score,
            formation=formation,
            transfers_made=None,
            optimization_metadata={
                "chip": chip,
                "horizon_gw": horizon_gw,
                "budget_used": total_cost,
                "budget_remaining": budget - total_cost,
            }
        )
    
    def _fetch_candidates(
        self, season: str, horizon_gw: int = 1
    ) -> List[tuple[Player, ScoreObject]]:
        """Fetch candidate players with their score objects."""
        query = (
            self.db.query(Player, ScoreObject)
            .join(ScoreObject, ScoreObject.player_id == Player.id)
            .filter(ScoreObject.season == season)
            .filter(Player.status == "a")  # Only available players
        )
        
        if horizon_gw > 1:
            # For multi-gameweek, use average or sum of scores
            # This is simplified; in production, aggregate scores properly
            pass
        
        return [(p, s) for p, s in query.all()]
    
    def _select_best_xi(
        self, chosen: List[tuple[Player, ScoreObject]]
    ) -> tuple[List[Player], List[Player], str]:
        """Select best starting XI and bench from chosen 15."""
        import heapq
        
        # Group by position
        pos_buckets: Dict[str, List[tuple[float, Player, ScoreObject]]] = {
            "GK": [], "DEF": [], "MID": [], "FWD": []
        }
        
        for p, s in chosen:
            score = s.starting_xi_metric if hasattr(s, 'starting_xi_metric') else s.base_score
            heapq.heappush(pos_buckets[p.position], (-score, p, s))
        
        best_lineup = None
        best_score = -1e9
        best_formation = "4-4-2"
        
        # Try all valid formations
        for gk, d, m, f in VALID_FORMATIONS:
            try:
                gks = [pl for _, pl, _ in sorted(pos_buckets["GK"])[:gk]]
                defs = [pl for _, pl, _ in sorted(pos_buckets["DEF"])[:d]]
                mids = [pl for _, pl, _ in sorted(pos_buckets["MID"])[:m]]
                fwds = [pl for _, pl, _ in sorted(pos_buckets["FWD"])[:f]]
                
                if len(gks) < gk or len(defs) < d or len(mids) < m or len(fwds) < f:
                    continue
                
                lineup = gks + defs + mids + fwds
                score = sum(
                    next(s.starting_xi_metric for p2, s in chosen if p2.id == p.id)
                    for p in lineup
                )
                
                if score > best_score:
                    best_score = score
                    best_lineup = lineup
                    best_formation = f"{d}-{m}-{f}"
            except Exception:
                continue
        
        if best_lineup is None:
            # Fallback: pick top scorers
            all_sorted = sorted(
                chosen, 
                key=lambda x: x[1].starting_xi_metric if hasattr(x[1], 'starting_xi_metric') else x[1].base_score,
                reverse=True
            )
            best_lineup = [p for p, _ in all_sorted[:11]]
            best_formation = "4-4-2"
        
        lineup_ids = {p.id for p in best_lineup}
        bench = [p for p, _ in chosen if p.id not in lineup_ids]
        
        return best_lineup, bench, best_formation
