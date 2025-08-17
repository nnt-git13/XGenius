# backend/app/routes/assistant.py
from flask import Blueprint, request, jsonify
from app.services.advisor import answer_question

assistant_bp = Blueprint("assistant_bp", __name__)

@assistant_bp.post("/assistant/ask")
def assistant_ask():
    payload = request.get_json(force=True, silent=True) or {}
    # Some clients send JSON string → accept both
    if isinstance(payload, str):
        import json
        try:
            payload = json.loads(payload)
        except Exception:
            payload = {"question": str(payload)}
    question = payload.get("question") or payload.get("q") or ""
    context = payload.get("context") or {}
    try:
        ans = answer_question(question, context)
        return jsonify({"answer": ans})
    except Exception as e:
        return jsonify({"error": "assistant_failed", "detail": str(e)}), 500
