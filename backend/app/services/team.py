"""Team evaluation service."""
from __future__ import annotations
from typing import List, Dict, Optional
from sqlalchemy.orm import Session

from app.models.player import Player
from app.models.squad import ScoreObject
from app.schemas.team import TeamEvaluateRequest, TeamEvaluateResponse, XGScoreResponse, PlayerEvaluation
from app.services.ml.predict import predict_points
from app.schemas.ml import PredictRequest


def evaluate_team(
    db: Session,
    request: TeamEvaluateRequest
) -> TeamEvaluateResponse:
    """Evaluate a user's FPL team."""
    # TODO: Implement FPL API integration to fetch team by team_id
    # For now, assume squad is provided in request
    
    if not request.squad:
        raise ValueError("Either team_id or squad must be provided")
    
    player_ids = [p.get("id") for p in request.squad if p.get("id")]
    if not player_ids:
        raise ValueError("No valid player IDs in squad")
    
    # Get players
    players = db.query(Player).filter(Player.id.in_(player_ids)).all()
    player_dict = {p.id: p for p in players}
    
    # Get predictions
    predict_req = PredictRequest(
        player_ids=player_ids,
        season=request.season,
        gameweek=request.gameweek,
        horizon=1,
    )
    predictions = predict_points(db, predict_req)
    pred_dict = {p.player_id: p for p in predictions.predictions}
    
    # Get score objects
    score_objects = (
        db.query(ScoreObject)
        .filter(ScoreObject.player_id.in_(player_ids))
        .filter(ScoreObject.season == request.season)
        .all()
    )
    score_dict = {s.player_id: s for s in score_objects}
    
    # Evaluate each player
    player_evaluations = []
    total_points = 0.0
    total_predicted = 0.0
    total_risk = 0.0
    total_fixture_difficulty = 0.0
    
    for pid in player_ids:
        if pid not in player_dict:
            continue
        
        player = player_dict[pid]
        pred = pred_dict.get(pid)
        score_obj = score_dict.get(pid)
        
        current_points = player.total_points or 0.0
        predicted_points = pred.predicted_points if pred else 0.0
        risk_score = pred.risk_score if pred else 0.5
        fixture_difficulty = score_obj.fixtures_difficulty if score_obj else 0.0
        
        # Determine recommendation
        if predicted_points > 6.0 and risk_score < 0.3:
            recommendation = "captain"
        elif predicted_points > 4.0:
            recommendation = "keep"
        elif predicted_points < 2.0 or risk_score > 0.7:
            recommendation = "sell"
        else:
            recommendation = "bench"
        
        player_evaluations.append(PlayerEvaluation(
            id=player.id,
            name=player.name,
            position=player.position,
            team=player.team,
            price=player.price,
            current_points=current_points,
            predicted_points=predicted_points,
            risk_score=risk_score,
            fixture_difficulty=fixture_difficulty,
            recommendation=recommendation,
        ))
        
        total_points += current_points
        total_predicted += predicted_points
        total_risk += risk_score
        total_fixture_difficulty += fixture_difficulty
    
    n_players = len(player_evaluations)
    avg_risk = total_risk / n_players if n_players > 0 else 0.5
    avg_fixture_difficulty = total_fixture_difficulty / n_players if n_players > 0 else 0.0
    
    # Calculate XG score
    xg_score = calculate_xg_score(db, request).xg_score
    
    # Generate recommendations
    recommendations = []
    if avg_risk > 0.6:
        recommendations.append("High risk detected. Consider more stable players.")
    if avg_fixture_difficulty > 4.0:
        recommendations.append("Tough fixtures ahead. Consider rotating players.")
    if total_predicted < 50.0:
        recommendations.append("Low predicted points. Consider making transfers.")
    
    return TeamEvaluateResponse(
        total_points=total_points,
        predicted_points=total_predicted,
        xg_score=xg_score,
        risk_score=avg_risk,
        fixture_difficulty=avg_fixture_difficulty,
        players=player_evaluations,
        recommendations=recommendations,
    )


def calculate_xg_score(
    db: Session,
    request: TeamEvaluateRequest
) -> XGScoreResponse:
    """Calculate advanced XG score for a team."""
    if not request.squad:
        raise ValueError("Squad must be provided")
    
    player_ids = [p.get("id") for p in request.squad if p.get("id")]
    
    # Get predictions
    predict_req = PredictRequest(
        player_ids=player_ids,
        season=request.season,
        gameweek=request.gameweek,
        horizon=1,
    )
    predictions = predict_points(db, predict_req)
    
    # Get score objects
    score_objects = (
        db.query(ScoreObject)
        .filter(ScoreObject.player_id.in_(player_ids))
        .filter(ScoreObject.season == request.season)
        .all()
    )
    score_dict = {s.player_id: s for s in score_objects}
    
    # Calculate components
    ml_contribution = sum(p.predicted_points for p in predictions.predictions)
    fixture_contribution = sum(
        (score_dict.get(p.player_id, type('obj', (object,), {"fixtures_difficulty": 0.0})).fixtures_difficulty or 0.0)
        for p in predictions.predictions
    )
    form_contribution = sum(
        (score_dict.get(p.player_id, type('obj', (object,), {"form": 0.0})).form or 0.0)
        for p in predictions.predictions
    )
    risk_penalty = sum(p.risk_score for p in predictions.predictions) * 2.0
    captaincy_bonus = max((p.captaincy_upside for p in predictions.predictions), default=0.0)
    
    # Combine into XG score
    xg_score = (
        ml_contribution * 0.5 +
        fixture_contribution * 0.2 +
        form_contribution * 0.2 -
        risk_penalty * 0.05 +
        captaincy_bonus * 0.05
    )
    
    return XGScoreResponse(
        xg_score=xg_score,
        components={
            "ml_contribution": ml_contribution,
            "fixture_contribution": fixture_contribution,
            "form_contribution": form_contribution,
            "risk_penalty": -risk_penalty,
            "captaincy_bonus": captaincy_bonus,
        },
        ml_contribution=ml_contribution,
        fixture_contribution=fixture_contribution,
        form_contribution=form_contribution,
        risk_penalty=risk_penalty,
        captaincy_bonus=captaincy_bonus,
    )

