from __future__ import annotations
from typing import Dict, List, Tuple
from ortools.linear_solver import pywraplp
from ..models import Player, ScoreObject


REQUIRED = {"GK": 2, "DEF": 5, "MID": 5, "FWD": 3}
POSITIONS = ["GK", "DEF", "MID", "FWD"]


def _fetch_candidates(season: str) -> List[Tuple[Player, ScoreObject]]:
    # join players with ScoreObject for season
    q = (
        Player.query.join(ScoreObject, ScoreObject.player_id == Player.id)
        .filter(ScoreObject.season == season)
        .with_entities(Player, ScoreObject)
    )
    return [(p, s) for p, s in q]


def optimize_squad(season: str, budget: float, exclude: List[int] | None = None, locks: List[int] | None = None):
    exclude = set(exclude or [])
    locks = set(locks or [])

    candidates = _fetch_candidates(season)
    solver = pywraplp.Solver.CreateSolver("SCIP")
    if not solver:
        raise RuntimeError("OR-Tools SCIP solver unavailable")

    x = {}
    for p, s in candidates:
        if p.id in exclude:
            continue
        x[p.id] = solver.BoolVar(f"x_{p.id}")

    # Budget constraint
    solver.Add(sum(p.price * x[p.id] for p, s in candidates if p.id in x) <= budget)

    # Exactly 15 players
    solver.Add(sum(x[p.id] for p, s in candidates if p.id in x) == 15)

    # Position constraints
    for pos, count in REQUIRED.items():
        solver.Add(sum(x[p.id] for p, s in candidates if p.position == pos and p.id in x) == count)

    # Locks
    for pid in locks:
        if pid in x:
            solver.Add(x[pid] == 1)

    # Objective: maximize total starting XI metric
    solver.Maximize(sum(s.starting_xi_metric * x[p.id] for p, s in candidates if p.id in x))

    status = solver.Solve()
    if status not in (pywraplp.Solver.OPTIMAL, pywraplp.Solver.FEASIBLE):
        raise RuntimeError("No feasible squad found under constraints")

    chosen: List[Tuple[Player, ScoreObject]] = [(p, s) for p, s in candidates if p.id in x and x[p.id].solution_value() > 0.5]

    # Compute best starting XI from chosen 15 under valid FPL formations
    best_xi, xi_score = select_best_starting_xi(chosen)

    return {
        "squad": [
            {
                "id": p.id,
                "name": p.name,
                "team": p.team,
                "position": p.position,
                "price": p.price,
                "score": s.starting_xi_metric,
            }
            for p, s in chosen
        ],
        "starting_xi": best_xi,
        "starting_xi_score": xi_score,
        "total_cost": sum(p.price for p, _ in chosen),
    }


VALID_FORMATIONS = [
    (1, 3, 4, 3),
    (1, 3, 5, 2),
    (1, 4, 4, 2),
    (1, 4, 5, 1),
    (1, 5, 3, 2),
    (1, 5, 4, 1),
]


def select_best_starting_xi(chosen: List[Tuple[Player, ScoreObject]]):
    # Simple greedy per-formation (could be ILP too); good enough for XI selection
    import heapq

    pos_buckets: Dict[str, List[Tuple[float, Player]]] = {pos: [] for pos in POSITIONS}
    for p, s in chosen:
        heapq.heappush(pos_buckets[p.position], (-s.starting_xi_metric, p))

    best_lineup, best_score = None, -1e9
    for gk, d, m, f in VALID_FORMATIONS:
        # pick top K per bucket
        def pick(pos, k):
            return [heapq.nsmallest(k, pos_buckets[pos])]

        # get top lists
        def top_k_list(pos, k):
            items = sorted(pos_buckets[pos])[:k]
            return [pl for _, pl in items]

        gks = top_k_list("GK", gk)
        defs = top_k_list("DEF", d)
        mids = top_k_list("MID", m)
        fwds = top_k_list("FWD", f)
        if len(gks) < gk or len(defs) < d or len(mids) < m or len(fwds) < f:
            continue
        lineup = gks + defs + mids + fwds
        score = sum(
            next(s.starting_xi_metric for p2, s in chosen if p2.id == p.id) for p in lineup
        )
        if score > best_score:
            best_score = score
            best_lineup = [
                {
                    "id": p.id,
                    "name": p.name,
                    "team": p.team,
                    "position": p.position,
                }
                for p in lineup
            ]
    return best_lineup, best_score
