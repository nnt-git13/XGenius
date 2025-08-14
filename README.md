# XGenius – FPL Optimization Backend

## Quickstart

```bash
cd backend
cp .env.example .env
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
flask --app manage.py init-db
flask --app manage.py import-players --csv app/data/fpl_players_gw_data_24-25.csv --season 2024-25
flask --app manage.py bootstrap-scores --csv app/data/fpl_players_gw_data_24-25.csv --season 2024-25
python -m app.main
```

### Optimize a Squad
```bash
curl -X POST http://localhost:5001/optimize/squad \
  -H 'Content-Type: application/json' \
  -d '{"season":"2024-25","budget":100}'
```

### Ingest Weekly Scores (for 2025-26 growth)
```bash
curl -X POST http://localhost:5001/ingest/weekly_scores \
  -H 'Content-Type: application/json' \
  -d '{"season":"2025-26","csv_path":"/absolute/path/to/gw01.csv"}'
```

### Trade Advice
```bash
curl -X POST http://localhost:5001/trades/advice \
  -H 'Content-Type: application/json' \
  -d '{"season":"2024-25","out_player_id":12,"in_player_id":345}'
```

### LLM Assistant (stub)
```bash
curl -X POST http://localhost:5001/assistant/ask -H 'Content-Type: application/json' -d '{"question":"Should I captain Haaland or Saka this week?"}'
```

## Training ML Models
Place historical CSVs in `historical/` (5+ seasons). Then:
```bash
python -m app.services.ml.pipeline  # if you add CLI; or use below script
```

Alternatively, run from a Python shell:
```python
from app.services.ml.pipeline import train_on_folder
train_on_folder('historical', 'models_store/ridge_points.joblib')
```

Use predictions to enrich `ScoreObject.starting_xi_metric` or feed the optimizer directly.

## Notes
- Replace `services/hype.py` with real news providers and/or transformer-based sentiment.
- Swap SQLite for Postgres by setting `DATABASE_URL` in `.env`.
- Add auth/session tracking and rate limiting for multi-user deployments.
- For production, run under Gunicorn/Uvicorn, behind Nginx, and configure HTTPS.
