"""
Advanced squad optimizer with constraints and multi-gameweek planning.
"""
from __future__ import annotations
from typing import List, Optional, Dict, Any, Tuple
import logging
try:
    from ortools.linear_solver import pywraplp
    ORTOOLS_AVAILABLE = True
except ImportError:
    ORTOOLS_AVAILABLE = False
    pywraplp = None  # type: ignore
from sqlalchemy.orm import Session
from sqlalchemy import and_

from app.models import Player, Team
from app.models.scoring import ScoreObject
from app.models.fixture import Fixture
from app.api.v1.schemas.optimize import (
    OptimizeSquadResponse, OptimizedPlayer, SquadOption, UpcomingFixture
)

logger = logging.getLogger(__name__)

# FPL constraints
POSITION_REQUIREMENTS = {"GK": 2, "DEF": 5, "MID": 5, "FWD": 3}
MAX_PLAYERS_PER_TEAM = 3
VALID_FORMATIONS = [
    (1, 3, 4, 3),  # 3-4-3
    (1, 3, 5, 2),  # 3-5-2
    (1, 4, 3, 3),  # 4-3-3
    (1, 4, 4, 2),  # 4-4-2
    (1, 4, 5, 1),  # 4-5-1
    (1, 5, 3, 2),  # 5-3-2
    (1, 5, 4, 1),  # 5-4-1
]


class DummyScoreObject:
    """Dummy score object for players without score data."""
    def __init__(self, player_id: int, season: str, base_score: float):
        self.player_id = player_id
        self.season = season
        self.base_score = base_score
        self.starting_xi_metric = base_score
        self.form = 0.0
        self.fixtures_difficulty = 0.5


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
        free_transfers: int = 1,
        target_gameweek: Optional[int] = None,
    ) -> OptimizeSquadResponse:
        """
        Optimize a squad under constraints.
        Returns multiple options with different transfer counts.
        """
        exclude_set = set(exclude_players or [])
        lock_set = set(lock_players or [])
        current_squad_fpl_ids = set(current_squad or [])
        
        # Chips that allow unlimited transfers
        unlimited_transfers = chip and chip.lower() in ("wildcard", "free_hit")
        
        # Fetch all candidates
        candidates = self._fetch_candidates(season)
        logger.info(f"Fetched {len(candidates)} candidates")
        
        # Filter excluded players
        candidates = [(p, s) for p, s in candidates if p.id not in exclude_set]
        
        if len(candidates) < 15:
            raise ValueError(f"Not enough candidates: {len(candidates)} (need at least 15)")
        
        # Build FPL ID mappings
        fpl_to_db: Dict[int, int] = {}
        db_to_fpl: Dict[int, int] = {}
        for p, _ in candidates:
            if p.fpl_id:
                fpl_to_db[p.fpl_id] = p.id
                db_to_fpl[p.id] = p.fpl_id
        
        # Convert current squad FPL IDs to DB IDs
        current_squad_db_ids = {fpl_to_db[fpl_id] for fpl_id in current_squad_fpl_ids if fpl_id in fpl_to_db}
        
        # Get ML predictions
        pred_dict = self._get_predictions(candidates, season, target_gameweek or 1, horizon_gw)
        
        # Generate options for different transfer counts
        all_options: List[SquadOption] = []
        
        # Determine which transfer counts to try
        if unlimited_transfers:
            transfer_counts = [0, 1, 2, 3, 5, 7, 10]
        else:
            transfer_counts = [0, 1, 2, 3]
        
        for target_transfers in transfer_counts:
            try:
                # Optimize for this transfer count
                squad = self._optimize_for_transfers(
                    candidates, current_squad_db_ids, target_transfers,
                    budget, lock_set, pred_dict, horizon_gw
                )
                
                if not squad or len(squad) != 15:
                    continue
                
                # Generate formation options for this squad
                formation_options = self._generate_formations(squad, pred_dict, horizon_gw)
                
                for starting_xi, bench, formation, score in formation_options:
                    option = self._build_option(
                        starting_xi, bench, squad, formation, score,
                        current_squad_fpl_ids, free_transfers, unlimited_transfers,
                        db_to_fpl, pred_dict, horizon_gw,
                        chip=chip, season=season, target_gw=target_gameweek
                    )
                    all_options.append(option)
                    
            except Exception as e:
                logger.debug(f"Failed optimization for {target_transfers} transfers: {e}")
                continue
        
        # If no options, try unconstrained optimization
        if not all_options:
            logger.warning("No constrained options found, trying unconstrained")
            try:
                squad = self._optimize_unconstrained(candidates, budget, lock_set, pred_dict, horizon_gw)
                if squad and len(squad) == 15:
                    formation_options = self._generate_formations(squad, pred_dict, horizon_gw)
                    for starting_xi, bench, formation, score in formation_options:
                        option = self._build_option(
                            starting_xi, bench, squad, formation, score,
                            current_squad_fpl_ids, free_transfers, unlimited_transfers,
                            db_to_fpl, pred_dict, horizon_gw,
                            chip=chip, season=season, target_gw=target_gameweek
                        )
                        all_options.append(option)
            except Exception as e:
                logger.error(f"Unconstrained optimization failed: {e}")
        
        # Deduplicate and rank
        options = self._deduplicate_options(all_options)
        
        # Sort: prioritize 1-2 transfers, then by xg_score
        options.sort(key=lambda x: (
            -1 if x.transfers_count in [1, 2] and x.transfer_cost <= 4 else 0,
            -x.xg_score
        ))
        
        # Ensure at least one option exists
        if not options:
            raise RuntimeError("Failed to generate any optimization options")
        
        return OptimizeSquadResponse(
            options=options[:15],  # Return top 15 options
            optimization_metadata={
                "chip": chip,
                "horizon_gw": horizon_gw,
                "free_transfers": free_transfers,
                "target_gameweek": target_gameweek,
                "options_generated": len(options),
            }
        )
    
    def _fetch_candidates(self, season: str) -> List[Tuple[Player, Any]]:
        """Fetch all available players with their scores."""
        results = []
        players_with_scores: set = set()
        
        # First, get ALL players from database (no status filter initially)
        try:
            all_players = self.db.query(Player).all()
            logger.info(f"Total players in database: {len(all_players)}")
            
            if not all_players:
                # Try to count to verify database connectivity
                count = self.db.query(Player).count()
                logger.error(f"No players returned but count is: {count}")
                raise ValueError("No players found in database")
                
        except Exception as e:
            logger.error(f"Error fetching all players: {e}", exc_info=True)
            raise ValueError(f"Failed to fetch players from database: {e}")
        
        # Get players with score objects (optional - we'll create dummies if not available)
        try:
            with_scores = (
                self.db.query(Player, ScoreObject)
                .join(ScoreObject, ScoreObject.player_id == Player.id)
                .filter(ScoreObject.season == season)
                .all()
            )
            players_with_scores = {p.id for p, _ in with_scores}
            logger.info(f"Found {len(with_scores)} players with score objects for season {season}")
            
            # Add scored players that are available
            for p, s in with_scores:
                if self._is_player_available(p):
                    results.append((p, s))
                    
        except Exception as e:
            logger.warning(f"Error fetching scored players (will use fallback): {e}")
        
        # Add remaining available players with dummy scores
        for p in all_players:
            if p.id not in players_with_scores and self._is_player_available(p):
                # Create dummy score based on available data
                base_score = self._calculate_fallback_score(p)
                dummy = DummyScoreObject(p.id, season, base_score)
                results.append((p, dummy))
        
        logger.info(f"Total available candidates: {len(results)}")
        
        # Log position breakdown
        pos_counts = {}
        for p, _ in results:
            pos_counts[p.position] = pos_counts.get(p.position, 0) + 1
        logger.info(f"Position breakdown: {pos_counts}")
        
        return results
    
    def _is_player_available(self, player: Player) -> bool:
        """Check if a player is available for selection."""
        # Accept players with status 'a', 'd' (doubtful), or None/empty
        # Only exclude injured 'i', suspended 's', or unavailable 'u'
        if player.status in (None, "", "a", "d"):
            return True
        # Also accept if status is not explicitly unavailable
        if player.status not in ("i", "s", "u", "n"):
            return True
        return False
    
    def _calculate_fallback_score(self, player: Player) -> float:
        """Calculate a fallback score for players without score objects."""
        # Use total points as base, normalized
        if player.total_points and player.total_points > 0:
            # Approximate per-game score (assume ~20-25 games played for mid-season)
            return min(player.total_points / 25.0, 10.0)
        
        # Position-based defaults
        defaults = {"GK": 3.5, "DEF": 3.5, "MID": 4.0, "FWD": 4.5}
        base = defaults.get(player.position, 3.0)
        
        # Adjust by price (higher price = higher expected)
        if player.price:
            price_factor = min(player.price / 7.0, 1.5)  # 7.0m is baseline
            base *= price_factor
        
        return base
    
    def _get_predictions(
        self, candidates: List[Tuple[Player, Any]], 
        season: str, gameweek: int, horizon: int
    ) -> Dict[int, Dict]:
        """Get ML predictions for all candidates using neural predictor."""
        try:
            from app.services.ml.neural_predictor import NeuralPointsPredictor
            predictor = NeuralPointsPredictor(self.db)
            player_ids = [p.id for p, _ in candidates]
            result = predictor.predict(player_ids, season, gameweek, horizon)
            return {p["player_id"]: p for p in result.get("predictions", [])}
        except Exception as e:
            logger.warning(f"Neural predictions unavailable: {e}")
            # Fallback to basic prediction
            try:
                from app.services.ml.predict import predict_points
                player_ids = [p.id for p, _ in candidates]
                result = predict_points(self.db, player_ids, season, gameweek, horizon)
                return {p["player_id"]: p for p in result.get("predictions", [])}
            except Exception as e2:
                logger.warning(f"Basic predictions also unavailable: {e2}")
                return {}
    
    def _calc_player_score(
        self, p: Player, s: Any, pred_dict: Dict, horizon_gw: int
    ) -> Tuple[float, float]:
        """
        Calculate optimization score and expected points for a player.
        Uses neural network predictions when available.
        Returns (optimization_score, expected_gw_points).
        """
        pred = pred_dict.get(p.id, {})
        ml_predicted = pred.get("predicted_points", 0.0) or 0.0
        risk = pred.get("risk_score", 0.5) or 0.5
        confidence = pred.get("confidence", 0.5) or 0.5
        captaincy_upside = pred.get("captaincy_upside", 0.0) or 0.0
        
        # Get detailed features if available
        features = pred.get("features", {})
        form_from_nn = features.get("form", 0)
        fixture_diff_nn = features.get("fixture_difficulty", 3)
        fitness_pct = features.get("fitness", 100) / 100.0
        
        # Base expected points per gameweek
        if ml_predicted > 0:
            # Neural network prediction already accounts for horizon
            if horizon_gw > 1:
                base_per_gw = ml_predicted / horizon_gw
            else:
                base_per_gw = ml_predicted
        else:
            # Fallback: use historical average
            base_score = getattr(s, 'starting_xi_metric', None) or getattr(s, 'base_score', 2.0)
            base_per_gw = min(base_score, 10.0)
        
        # Clamp to realistic range
        base_per_gw = max(0.5, min(base_per_gw, 15.0))
        
        # Apply fitness/availability factor
        base_per_gw *= max(fitness_pct, 0.1)
        
        # Total expected points for horizon
        expected_total = base_per_gw * horizon_gw
        
        # Optimization score (multi-factor ranking)
        # Use neural network features if available, fallback to score object
        form = form_from_nn if form_from_nn > 0 else (getattr(s, 'form', 0.0) or 0.0)
        fixture_diff = fixture_diff_nn if fixture_diff_nn > 0 else (getattr(s, 'fixtures_difficulty', 3) or 3)
        
        # Fixture factor: lower difficulty = bonus
        fixture_factor = (5 - fixture_diff) / 4.0  # 0.0 to 1.0
        
        # Value factor: points per million
        value_factor = base_per_gw / max(p.price, 4.0)
        
        # Confidence-weighted prediction
        prediction_weight = 0.5 + confidence * 0.3
        
        opt_score = (
            expected_total * prediction_weight +      # Base prediction (confidence weighted)
            form * 0.3 * horizon_gw +                 # Form component
            fixture_factor * 1.5 * horizon_gw +       # Fixture easiness bonus
            value_factor * 0.8 +                      # Value for money
            captaincy_upside * 0.1 -                  # Captaincy potential
            risk * 4.0                                # Risk penalty (higher weight)
        )
        
        return opt_score, base_per_gw
    
    def _optimize_for_transfers(
        self, candidates: List[Tuple[Player, Any]],
        current_squad: set, target_transfers: int,
        budget: float, lock_set: set, pred_dict: Dict, horizon_gw: int
    ) -> List[Tuple[Player, Any]]:
        """Optimize squad with a target transfer count."""
        if not ORTOOLS_AVAILABLE:
            # Fallback to greedy algorithm if OR-Tools not available
            logger.warning("OR-Tools not available, using greedy selection")
            return self._greedy_select(candidates, budget, lock_set, pred_dict, horizon_gw, target_transfers, current_squad)
        
        solver = pywraplp.Solver.CreateSolver("SCIP")
        if not solver:
            raise RuntimeError("Solver unavailable")
        
        # Decision variables
        x = {p.id: solver.BoolVar(f"x_{p.id}") for p, _ in candidates}
        
        # Budget constraint
        solver.Add(sum(p.price * x[p.id] for p, _ in candidates) <= budget)
        
        # Exactly 15 players
        solver.Add(sum(x[p.id] for p, _ in candidates) == 15)
        
        # Position requirements
        for pos, count in POSITION_REQUIREMENTS.items():
            solver.Add(sum(x[p.id] for p, _ in candidates if p.position == pos) == count)
        
        # Max 3 per team
        teams = set(p.team_id for p, _ in candidates if p.team_id)
        for team_id in teams:
            solver.Add(sum(x[p.id] for p, _ in candidates if p.team_id == team_id) <= MAX_PLAYERS_PER_TEAM)
        
        # Locked players
        for pid in lock_set:
            if pid in x:
                solver.Add(x[pid] == 1)
        
        # Transfer constraint (if we have a current squad)
        if current_squad and target_transfers >= 0:
            # Players kept from current squad
            kept = sum(x[p.id] for p, _ in candidates if p.id in current_squad)
            current_size = min(len(current_squad), 15)
            
            if target_transfers == 0:
                # Keep all current players if possible
                solver.Add(kept >= current_size - 1)
            else:
                # Target number of transfers (with some flexibility)
                target_kept = 15 - target_transfers
                solver.Add(kept >= max(0, target_kept - 1))
                solver.Add(kept <= target_kept + 1)
        
        # Objective: maximize player scores
        objective = sum(
            self._calc_player_score(p, s, pred_dict, horizon_gw)[0] * x[p.id]
            for p, s in candidates
        )
        solver.Maximize(objective)
        
        # Solve
        status = solver.Solve()
        if status not in (pywraplp.Solver.OPTIMAL, pywraplp.Solver.FEASIBLE):
            return []
        
        # Extract solution
        return [(p, s) for p, s in candidates if x[p.id].solution_value() > 0.5]
    
    def _greedy_select(
        self, candidates: List[Tuple[Player, Any]], budget: float, lock_set: set,
        pred_dict: Dict, horizon_gw: int, target_transfers: int, current_squad: Optional[set]
    ) -> List[Tuple[Player, Any]]:
        """Greedy fallback algorithm when OR-Tools is not available."""
        # Sort candidates by score
        scored = [(self._calc_player_score(p, s, pred_dict, horizon_gw)[0], p, s) for p, s in candidates]
        scored.sort(key=lambda x: -x[0])
        
        selected = []
        used_budget = 0.0
        position_counts = {"GK": 0, "DEF": 0, "MID": 0, "FWD": 0}
        team_counts: Dict[int, int] = {}
        
        # First, add locked players
        for score, p, s in scored:
            if p.id in lock_set:
                if position_counts[p.position] < POSITION_REQUIREMENTS[p.position]:
                    selected.append((p, s))
                    used_budget += p.price
                    position_counts[p.position] += 1
                    team_counts[p.team_id] = team_counts.get(p.team_id, 0) + 1
        
        # Then add best available players
        target_kept = 15 - target_transfers if target_transfers >= 0 else 0
        kept_count = len([p for p, _ in selected if current_squad and p.id in current_squad])
        
        for score, p, s in scored:
            if p.id in lock_set:
                continue
            
            # Check position limit
            if position_counts[p.position] >= POSITION_REQUIREMENTS[p.position]:
                continue
            
            # Check team limit
            if team_counts.get(p.team_id, 0) >= MAX_PLAYERS_PER_TEAM:
                continue
            
            # Check budget
            if used_budget + p.price > budget:
                continue
            
            # Check transfer constraint
            if current_squad and target_transfers >= 0:
                if p.id in current_squad:
                    if kept_count >= target_kept:
                        continue
                    kept_count += 1
                else:
                    if kept_count < target_kept:
                        continue
            
            selected.append((p, s))
            used_budget += p.price
            position_counts[p.position] += 1
            team_counts[p.team_id] = team_counts.get(p.team_id, 0) + 1
            
            if len(selected) >= 15:
                break
        
        return selected
    
    def _optimize_unconstrained(
        self, candidates: List[Tuple[Player, Any]],
        budget: float, lock_set: set, pred_dict: Dict, horizon_gw: int
    ) -> List[Tuple[Player, Any]]:
        """Optimize without transfer constraints."""
        return self._optimize_for_transfers(candidates, set(), -1, budget, lock_set, pred_dict, horizon_gw)
    
    def _generate_formations(
        self, squad: List[Tuple[Player, Any]], pred_dict: Dict, horizon_gw: int
    ) -> List[Tuple[List[Player], List[Player], str, float]]:
        """Generate formation options for a 15-player squad."""
        # Group by position with scores
        by_pos: Dict[str, List[Tuple[float, Player, Any]]] = {"GK": [], "DEF": [], "MID": [], "FWD": []}
        
        for p, s in squad:
            score, _ = self._calc_player_score(p, s, pred_dict, horizon_gw)
            by_pos[p.position].append((score, p, s))
        
        # Sort each position by score (best first)
        for pos in by_pos:
            by_pos[pos].sort(key=lambda x: -x[0])
        
        options = []
        
        for gk, d, m, f in VALID_FORMATIONS:
            if len(by_pos["GK"]) < gk or len(by_pos["DEF"]) < d or len(by_pos["MID"]) < m or len(by_pos["FWD"]) < f:
                continue
            
            # Select best players for formation
            starting = (
                [p for _, p, _ in by_pos["GK"][:gk]] +
                [p for _, p, _ in by_pos["DEF"][:d]] +
                [p for _, p, _ in by_pos["MID"][:m]] +
                [p for _, p, _ in by_pos["FWD"][:f]]
            )
            
            starting_ids = {p.id for p in starting}
            bench = [p for p, _ in squad if p.id not in starting_ids]
            
            # Calculate XI score
            xi_score = sum(
                self._calc_player_score(p, next(s for pp, s in squad if pp.id == p.id), pred_dict, horizon_gw)[0]
                for p in starting
            )
            
            formation_str = f"{d}-{m}-{f}"
            options.append((starting, bench, formation_str, xi_score))
        
        # Sort by score
        options.sort(key=lambda x: -x[3])
        return options[:3]  # Top 3 formations per squad
    
    def _build_option(
        self, starting_xi: List[Player], bench: List[Player],
        full_squad: List[Tuple[Player, Any]], formation: str, raw_score: float,
        current_fpl_ids: set, free_transfers: int, unlimited: bool,
        db_to_fpl: Dict, pred_dict: Dict, horizon_gw: int,
        chip: Optional[str] = None, season: str = "2024-25", target_gw: Optional[int] = None
    ) -> SquadOption:
        """Build a SquadOption from optimization results."""
        starting_ids = {p.id for p in starting_xi}
        
        # Calculate transfers
        squad_fpl_ids = {db_to_fpl.get(p.id, p.id) for p, _ in full_squad}
        transfers_out = current_fpl_ids - squad_fpl_ids if current_fpl_ids else set()
        transfers_in = squad_fpl_ids - current_fpl_ids if current_fpl_ids else set()
        transfers_count = max(len(transfers_out), len(transfers_in))
        
        # Transfer cost (no cost for wildcard/free_hit)
        if unlimited or transfers_count <= free_transfers:
            transfer_cost = 0
        else:
            transfer_cost = (transfers_count - free_transfers) * 4
        
        # Build transfers list
        transfers_made = []
        out_list, in_list = list(transfers_out), list(transfers_in)
        for i in range(min(len(out_list), len(in_list))):
            transfers_made.append({"out": out_list[i], "in": in_list[i]})
        
        # Fetch upcoming fixtures for all players
        fixtures_by_team = self._get_upcoming_fixtures(season, target_gw or 1, horizon_gw)
        
        # Calculate expected points for each player
        player_expected = {}  # player_id -> expected_points
        for p, s in full_squad:
            _, exp_gw = self._calc_player_score(p, s, pred_dict, horizon_gw)
            player_expected[p.id] = exp_gw
        
        # Identify captain (highest expected points in XI)
        xi_with_scores = [(player_expected.get(p.id, 0), p.id) for p in starting_xi]
        xi_with_scores.sort(key=lambda x: -x[0])
        
        captain_id = xi_with_scores[0][1] if len(xi_with_scores) >= 1 else None
        vice_captain_id = xi_with_scores[1][1] if len(xi_with_scores) >= 2 else None
        captain_exp_pts = xi_with_scores[0][0] if xi_with_scores else 0.0
        
        # Build player list with fixtures
        squad_players = []
        total_cost = 0.0
        xi_points = 0.0
        bench_points = 0.0
        
        for p, s in full_squad:
            opt_score, exp_gw = self._calc_player_score(p, s, pred_dict, horizon_gw)
            is_starting = p.id in starting_ids
            is_captain = (p.id == captain_id)
            is_vice = (p.id == vice_captain_id)
            
            # Get upcoming fixtures for this player's team
            team_fixtures = fixtures_by_team.get(p.team_id, [])
            upcoming = [
                UpcomingFixture(
                    gameweek=f["gw"],
                    opponent=f["opponent"],
                    opponent_short=f["opponent_short"],
                    is_home=f["is_home"],
                    difficulty=f["difficulty"],
                    kickoff_time=f["kickoff_time"],
                )
                for f in team_fixtures[:horizon_gw]
            ]
            
            # Use FPL element ID for frontend navigation, fallback to db id
            player_fpl_id = p.fpl_id if p.fpl_id else p.id
            
            squad_players.append(OptimizedPlayer(
                id=player_fpl_id,  # Use FPL ID for player page navigation
                name=p.name,
                position=p.position,
                team=p.team.name if p.team else "Unknown",
                team_short=p.team.short_name if p.team and hasattr(p.team, 'short_name') else (p.team.name[:3].upper() if p.team else "UNK"),
                price=p.price,
                score=round(opt_score, 2),
                is_starting_xi=is_starting,
                is_captain=is_captain,
                is_vice_captain=is_vice,
                expected_points=round(exp_gw, 2),  # Keep precision
                upcoming_fixtures=upcoming,
            ))
            
            total_cost += p.price
            if is_starting:
                xi_points += exp_gw
            else:
                bench_points += exp_gw
        
        # Calculate captain bonus (captain's points are doubled)
        # Captain points = their expected points (already in xi_points) + bonus (= another captain_exp_pts)
        # For triple captain chip, it would be 2x bonus instead of 1x
        if chip and chip.lower() == "triple_captain":
            captain_bonus = captain_exp_pts * 2  # Triple = 3x total, so 2x bonus
        else:
            captain_bonus = captain_exp_pts  # Normal captain = 2x total, so 1x bonus
        
        # Calculate effective points
        # - Base: XI points + captain bonus
        # - Bench boost: add bench points
        # - Transfer cost: subtract
        effective = xi_points + captain_bonus
        
        if chip and chip.lower() == "bench_boost":
            effective += bench_points
        
        effective -= transfer_cost
        
        # Calculate XG score (0-100)
        # Baseline: 11 players * 3 pts = 33 per GW + captain bonus ~3 = 36
        # Max: 11 players * 8 pts = 88 per GW + captain bonus ~8 = 96
        baseline = 36.0 * horizon_gw
        max_possible = 96.0 * horizon_gw
        
        # Use effective points for scoring
        if effective <= baseline * 0.5:
            xg_score = max(0, (effective / (baseline * 0.5)) * 20)
        elif effective <= baseline:
            xg_score = 20 + ((effective - baseline * 0.5) / (baseline * 0.5)) * 30
        else:
            progress = (effective - baseline) / (max_possible - baseline)
            xg_score = 50 + progress * 45
        
        xg_score = max(0, min(95, xg_score))
        
        return SquadOption(
            squad=squad_players,
            starting_xi=[p for p in squad_players if p.is_starting_xi],
            bench=[p for p in squad_players if not p.is_starting_xi],
            total_cost=round(total_cost, 1),
            total_score=round(xi_points, 1),  # Raw XI points
            xg_score=round(xg_score, 1),
            formation=formation,
            transfers_made=transfers_made if transfers_made else None,
            transfer_cost=transfer_cost,
            transfers_count=transfers_count,
            xi_points=round(xi_points, 1),
            bench_points=round(bench_points, 1),
            captain_points=round(captain_bonus, 1),
            effective_points=round(effective, 1),
            chip=chip,
        )
    
    def _get_upcoming_fixtures(
        self, season: str, start_gw: int, horizon: int
    ) -> Dict[int, List[Dict]]:
        """Fetch upcoming fixtures for all teams."""
        fixtures_by_team: Dict[int, List[Dict]] = {}
        
        try:
            # Get fixtures for the next 'horizon' gameweeks
            fixtures = (
                self.db.query(Fixture)
                .filter(Fixture.season == season)
                .filter(Fixture.gw >= start_gw)
                .filter(Fixture.gw < start_gw + horizon)
                .filter(Fixture.finished == False)
                .order_by(Fixture.gw, Fixture.kickoff_time)
                .all()
            )
            
            # Get team names
            teams = {t.id: t for t in self.db.query(Team).all()}
            
            for f in fixtures:
                home_team = teams.get(f.team_h_id)
                away_team = teams.get(f.team_a_id)
                
                if not home_team or not away_team:
                    continue
                
                kickoff = f.kickoff_time.isoformat() if f.kickoff_time else None
                
                # Add fixture for home team
                if f.team_h_id not in fixtures_by_team:
                    fixtures_by_team[f.team_h_id] = []
                fixtures_by_team[f.team_h_id].append({
                    "gw": f.gw,
                    "opponent": away_team.name,
                    "opponent_short": away_team.short_name if hasattr(away_team, 'short_name') else away_team.name[:3].upper(),
                    "is_home": True,
                    "difficulty": f.team_h_difficulty or 3,
                    "kickoff_time": kickoff,
                })
                
                # Add fixture for away team
                if f.team_a_id not in fixtures_by_team:
                    fixtures_by_team[f.team_a_id] = []
                fixtures_by_team[f.team_a_id].append({
                    "gw": f.gw,
                    "opponent": home_team.name,
                    "opponent_short": home_team.short_name if hasattr(home_team, 'short_name') else home_team.name[:3].upper(),
                    "is_home": False,
                    "difficulty": f.team_a_difficulty or 3,
                    "kickoff_time": kickoff,
                })
                
        except Exception as e:
            logger.warning(f"Failed to fetch fixtures: {e}")
        
        return fixtures_by_team
    
    def _deduplicate_options(self, options: List[SquadOption]) -> List[SquadOption]:
        """Remove duplicate options based on squad composition."""
        seen = set()
        unique = []
        
        for opt in options:
            key = tuple(sorted(p.id for p in opt.squad))
            if key not in seen:
                seen.add(key)
                unique.append(opt)
        
        return unique
