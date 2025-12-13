"""Trade advice service."""
from __future__ import annotations
from sqlalchemy.orm import Session

from app.models.player import Player
from app.models.squad import ScoreObject
from app.schemas.trades import TradeAdviceRequest, TradeAdviceResponse
from app.services.ml.predict import predict_points
from app.schemas.ml import PredictRequest


def get_trade_advice(
    db: Session,
    request: TradeAdviceRequest
) -> TradeAdviceResponse:
    """Get advice on a potential trade."""
    # Get players
    out_player = db.query(Player).filter(Player.id == request.out_player_id).first()
    in_player = db.query(Player).filter(Player.id == request.in_player_id).first()
    
    if not out_player or not in_player:
        raise ValueError("One or both players not found")
    
    # Get predictions
    predict_req = PredictRequest(
        player_ids=[request.out_player_id, request.in_player_id],
        season=request.season,
        gameweek=request.gameweek,
        horizon=1,
    )
    predictions = predict_points(db, predict_req)
    pred_dict = {p.player_id: p for p in predictions.predictions}
    
    # Get score objects
    score_objects = (
        db.query(ScoreObject)
        .filter(ScoreObject.player_id.in_([request.out_player_id, request.in_player_id]))
        .filter(ScoreObject.season == request.season)
        .all()
    )
    score_dict = {s.player_id: s for s in score_objects}
    
    # Calculate metrics
    out_pred = pred_dict.get(request.out_player_id)
    in_pred = pred_dict.get(request.in_player_id)
    
    out_ev = out_pred.predicted_points if out_pred else 0.0
    in_ev = in_pred.predicted_points if in_pred else 0.0
    
    delta_ev = in_ev - out_ev
    
    # Long-term (3 GW)
    predict_req_3gw = PredictRequest(
        player_ids=[request.out_player_id, request.in_player_id],
        season=request.season,
        gameweek=request.gameweek,
        horizon=3,
    )
    predictions_3gw = predict_points(db, predict_req_3gw)
    pred_dict_3gw = {p.player_id: p for p in predictions_3gw.predictions}
    
    out_pred_3gw = pred_dict_3gw.get(request.out_player_id)
    in_pred_3gw = pred_dict_3gw.get(request.in_player_id)
    
    out_lt = out_pred_3gw.predicted_points if out_pred_3gw else 0.0
    in_lt = in_pred_3gw.predicted_points if in_pred_3gw else 0.0
    
    delta_long_term = in_lt - out_lt
    
    # Build reason
    reasons = []
    if delta_ev > 2.0:
        reasons.append("Significant immediate improvement in expected points.")
    elif delta_ev > 0:
        reasons.append("Slight improvement in expected points.")
    else:
        reasons.append("No immediate improvement in expected points.")
    
    if delta_long_term > 5.0:
        reasons.append("Strong long-term improvement expected.")
    elif delta_long_term > 0:
        reasons.append("Moderate long-term improvement expected.")
    
    if in_player.price > out_player.price:
        reasons.append(f"Budget impact: +£{(in_player.price - out_player.price):.1f}m")
    
    reason = " ".join(reasons)
    
    # Determine recommendation
    if delta_ev > 3.0 and delta_long_term > 5.0:
        recommendation = "strong_buy"
    elif delta_ev > 1.0:
        recommendation = "buy"
    elif delta_ev < -2.0:
        recommendation = "sell"
    else:
        recommendation = "hold"
    
    return TradeAdviceResponse(
        delta_ev=delta_ev,
        delta_long_term=delta_long_term,
        out={
            "id": out_player.id,
            "name": out_player.name,
            "team": out_player.team,
            "price": out_player.price,
        },
        in_player={
            "id": in_player.id,
            "name": in_player.name,
            "team": in_player.team,
            "price": in_player.price,
        },
        reason=reason,
        recommendation=recommendation,
    )

