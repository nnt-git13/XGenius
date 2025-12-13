# XGenius - Fantasy Premier League Optimizer

🚀 **Production-grade AI-powered FPL optimization platform with ML predictions, squad optimization, and an intelligent copilot.**

## 🎯 Features

- **ML-Powered Predictions**: Advanced machine learning models (Ridge, XGBoost, Random Forest) predict player points
- **XG Score**: Proprietary scoring system combining ML, fixture difficulty, and risk assessment
- **Squad Optimizer**: AI-powered optimizer using integer linear programming to find optimal squads
- **AI Copilot**: LLM-powered assistant for natural language advice on transfers, captaincy, and squad selection
- **Multi-Gameweek Planning**: Optimize for multiple gameweeks ahead
- **Transfer Advisor**: Get recommendations on player trades with expected value analysis
- **Modern UI**: Beautiful, responsive Next.js frontend with Premier League-inspired design

## 🏗️ Architecture

```
XGenius/
├── backend/              # FastAPI backend
│   ├── app/
│   │   ├── api/         # API endpoints
│   │   ├── core/        # Configuration, database
│   │   ├── models/      # SQLAlchemy models
│   │   ├── services/    # Business logic
│   │   │   ├── ml/      # ML training & prediction
│   │   │   └── ...
│   │   └── cli/         # CLI commands
│   └── alembic/         # Database migrations
├── frontend/            # Next.js 14 frontend
│   └── src/
│       ├── app/         # Next.js App Router pages
│       └── lib/         # API client, utilities
└── docker-compose.yml   # Docker setup
```

## 🚀 Quick Start

### Quick Start (Recommended)

```bash
# Run the quick start script
./QUICK_START.sh
```

This will:
1. Check for Docker and set up accordingly
2. Create necessary directories and config files
3. Start all services
4. Initialize the database

Or see [BOOTUP_GUIDE.md](BOOTUP_GUIDE.md) for detailed step-by-step instructions.

### Prerequisites

- Docker & Docker Compose (recommended)
- Python 3.11+ (for local development)
- Node.js 20+ (for local frontend development)

### Using Docker (Recommended)

1. **Clone and navigate to the project:**
   ```bash
   cd zwe
   ```

2. **Create environment file:**
   ```bash
   cp backend/.env.example backend/.env
   # Edit .env with your settings (optional for local dev)
   ```

3. **Start services:**
   ```bash
   docker-compose up -d
   ```

4. **Initialize database:**
   ```bash
   docker-compose exec backend python -m app.cli.main init
   ```

5. **Access the application:**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:8000
   - API Docs: http://localhost:8000/docs

### Local Development

#### Backend Setup

```bash
cd backend
python -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate
pip install -r requirements.txt

# Set up database (Postgres or SQLite)
export DATABASE_URL="postgresql://xgenius:xgenius@localhost:5432/xgenius"
# OR for SQLite:
# export DATABASE_URL="sqlite:///xgenius.db"

# Initialize database
python -m app.cli.main init

# Run migrations
alembic upgrade head

# Run server
python -m app.cli.main run
```

#### Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

## 📚 CLI Commands

The unified CLI replaces the old Flask commands:

```bash
# Initialize database
python -m app.cli.main init

# Ingest players
python -m app.cli.main ingest-players --season 2024-25 --csv data/players.csv

# Ingest gameweek scores
python -m app.cli.main ingest-gw --season 2024-25 --gw 1 --csv data/gw01.csv

# Train ML models
python -m app.cli.main train-models --model xgboost --seasons 2020-21 2021-22 2022-23

# Run development server
python -m app.cli.main run
```

## 🔌 API Endpoints

### Team Evaluation
- `POST /api/v1/team/evaluate` - Evaluate a team
- `POST /api/v1/team/xgscore` - Calculate XG Score

### Squad Optimization
- `POST /api/v1/optimize/squad` - Optimize a squad

### Transfers
- `POST /api/v1/trades/advice` - Get trade advice

### AI Copilot
- `POST /api/v1/assistant/ask` - Ask the AI copilot

### ML Predictions
- `POST /api/v1/ml/predict` - Get ML predictions
- `POST /api/v1/ml/train` - Train ML models (background)

### Data Ingestion
- `POST /api/v1/admin/ingest/weekly_scores` - Ingest weekly scores
- `POST /api/v1/admin/ingest/bootstrap` - Bootstrap season data

See full API documentation at `/docs` when the server is running.

## 🧠 ML Models

XGenius supports multiple ML models:

- **Ridge Regression**: Fast, interpretable baseline
- **XGBoost**: Gradient boosting for high accuracy
- **Random Forest**: Robust ensemble method

Train models on historical data:
```bash
python -m app.cli.main train-models --model xgboost --seasons 2020-21 2021-22 2022-23 2023-24
```

## 🎨 Frontend Pages

- `/` - Homepage with feature overview
- `/dashboard` - Main dashboard with stats and quick actions
- `/optimize` - Squad optimizer interface
- `/transfers` - Transfer advisor
- `/copilot` - AI copilot chat interface
- `/team` - Team management (coming soon)
- `/players` - Player stats explorer (coming soon)

## 🐳 Docker Services

- **postgres**: PostgreSQL 15 database
- **redis**: Redis cache and task queue
- **backend**: FastAPI application
- **frontend**: Next.js application

## 📦 Environment Variables

Create a `.env` file in the `backend/` directory:

```env
# Database
DATABASE_URL=postgresql://xgenius:xgenius@postgres:5432/xgenius

# Redis
REDIS_URL=redis://redis:6379/0

# LLM
OPENAI_API_KEY=your_openai_api_key_here
OPENAI_MODEL=gpt-4o-mini

# Application
DEBUG=true
SECRET_KEY=your_secret_key_here
```

## 🧪 Testing

```bash
# Backend tests
cd backend
pytest

# Frontend tests (coming soon)
cd frontend
npm test
```

## 📖 Documentation

See `/docs` directory for:
- System architecture
- ML pipeline documentation
- API reference
- Deployment guide

## 🔧 Development

### Database Migrations

```bash
# Create a new migration
alembic revision --autogenerate -m "description"

# Apply migrations
alembic upgrade head

# Rollback
alembic downgrade -1
```

### Code Quality

```bash
# Format code
black backend/app
ruff check backend/app

# Type checking
mypy backend/app
```

## 📝 License

MIT License

## 🙏 Acknowledgments

- Fantasy Premier League API
- Premier League for official data
- The FPL community for inspiration

## 🤝 Contributing

Contributions welcome! Please open an issue or submit a pull request.

---

**Built with ❤️ for FPL managers everywhere**
