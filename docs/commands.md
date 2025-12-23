# XGenius Terminal Commands Reference

Complete guide to all useful terminal commands for XGenius development and operations.

## 🚀 Quick Start

### Using Docker (Recommended)
```bash
# Start all services (backend, frontend, database, redis)
./QUICK_START.sh

# Or manually with docker-compose
docker-compose up -d --build

# View logs
docker-compose logs -f

# Stop all services
docker-compose down
```

### Local Development Setup
```bash
# Backend setup (using conda - recommended)
cd backend
conda create -n xgenius python=3.11 -y
conda activate xgenius
pip install -r requirements.txt

# Or using venv (if Python 3.11+ is available)
cd backend
python3 -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate
pip install -r requirements.txt

# Frontend setup
cd frontend
npm install
```

---

## 🔧 Backend Commands

### Start Backend Server
```bash
cd backend

# With SQLite (default for local dev)
DATABASE_URL="sqlite:///./app/instance/xgenius.db" python -m app.cli.main run

# With PostgreSQL
DATABASE_URL="postgresql://xgenius:xgenius@localhost:5432/xgenius" python -m app.cli.main run

# Or using environment file
python -m app.cli.main run
```

### Backend Server Options
- **Host**: `0.0.0.0` (all interfaces)
- **Port**: `8000`
- **API Docs**: http://localhost:8000/docs
- **Auto-reload**: Enabled in DEBUG mode

---

## 🎨 Frontend Commands

### Start Frontend Development Server
```bash
cd frontend

# Development mode (with hot reload)
npm run dev

# Production build
npm run build

# Start production server
npm start

# Run linting
npm run lint

# Type checking
npm run type-check
```

### Frontend Server
- **URL**: http://localhost:3000
- **Hot Reload**: Enabled in dev mode

---

## 🗄️ Database Commands

### Initialize Database
```bash
cd backend

# SQLite (local development)
DATABASE_URL="sqlite:///./app/instance/xgenius.db" python -m app.cli.main init

# PostgreSQL
DATABASE_URL="postgresql://xgenius:xgenius@localhost:5432/xgenius" python -m app.cli.main init

# Using .env file
python -m app.cli.main init
```

### Database Migrations (Alembic)
```bash
cd backend

# Create a new migration
alembic revision --autogenerate -m "description of changes"

# Apply migrations
alembic upgrade head

# Rollback one migration
alembic downgrade -1

# View migration history
alembic history

# Show current revision
alembic current
```

### Database Reset (SQLite)
```bash
cd backend
rm -f app/instance/xgenius.db
DATABASE_URL="sqlite:///./app/instance/xgenius.db" python -m app.cli.main init
```

---

## 📥 Data Ingestion Commands

### Ingest FPL Data (Complete)
```bash
cd backend

# Ingest all data from FPL API (teams, players, fixtures, gameweeks)
DATABASE_URL="sqlite:///./app/instance/xgenius.db" python -m app.cli.main ingest-fpl --season 2024-25

# With PostgreSQL
DATABASE_URL="postgresql://xgenius:xgenius@localhost:5432/xgenius" python -m app.cli.main ingest-fpl --season 2024-25
```

This command fetches and ingests:
- ✅ 20 Premier League teams
- ✅ ~760 FPL players with current stats
- ✅ 38 gameweeks
- ✅ 380 fixtures with difficulty ratings

### Ingest Players (Legacy)
```bash
cd backend
python -m app.cli.main ingest-players --season 2024-25 --csv data/players.csv
```

### Ingest Gameweek Scores (Legacy)
```bash
cd backend
python -m app.cli.main ingest-gw --season 2024-25 --gw 1 --csv data/gw01.csv
```

---

## 🤖 ML Model Commands

### Train ML Models
```bash
cd backend

# Train XGBoost model
python -m app.cli.main train-models --model xgboost --seasons 2020-21 2021-22 2022-23 2023-24

# Train Ridge Regression model
python -m app.cli.main train-models --model ridge --seasons 2020-21 2021-22 2022-23

# Train Random Forest model
python -m app.cli.main train-models --model random_forest --seasons 2020-21 2021-22 2022-23
```

---

## 🐳 Docker Commands

### Docker Compose Operations
```bash
# Start all services
docker-compose up -d

# Start with rebuild
docker-compose up -d --build

# View logs (all services)
docker-compose logs -f

# View logs (specific service)
docker-compose logs -f backend
docker-compose logs -f frontend
docker-compose logs -f postgres

# Stop all services
docker-compose down

# Stop and remove volumes
docker-compose down -v

# Restart a specific service
docker-compose restart backend

# Execute command in container
docker-compose exec backend python -m app.cli.main init
docker-compose exec backend python -m app.cli.main ingest-fpl --season 2024-25
```

### Docker Container Management
```bash
# List running containers
docker ps

# List all containers
docker ps -a

# View container logs
docker logs <container_id>

# Access container shell
docker exec -it <container_id> /bin/bash

# Remove containers
docker-compose down
```

---

## 🧪 Testing Commands

### Backend Tests
```bash
cd backend

# Run all tests
pytest

# Run with coverage
pytest --cov=app --cov-report=html

# Run specific test file
pytest tests/test_team.py

# Run with verbose output
pytest -v

# Run with print statements
pytest -s
```

### Frontend Tests
```bash
cd frontend

# Run tests
npm test

# Run tests in watch mode
npm test -- --watch

# Run tests with coverage
npm test -- --coverage
```

---

## 🔍 Development Tools

### Code Quality

#### Backend
```bash
cd backend

# Format code with Black
black app/

# Lint with Ruff
ruff check app/

# Type checking with mypy
mypy app/

# Sort imports
isort app/
```

#### Frontend
```bash
cd frontend

# Format code
npm run format

# Lint code
npm run lint

# Fix linting issues
npm run lint -- --fix

# Type checking
npm run type-check
```

### Environment Variables

#### Backend (.env)
```bash
cd backend

# Create .env file
cat > .env << EOF
DATABASE_URL=sqlite:///./app/instance/xgenius.db
REDIS_URL=redis://localhost:6379/0
OPENAI_API_KEY=your_key_here
OPENAI_MODEL=gpt-4o-mini
DEBUG=true
SECRET_KEY=dev-secret-change-in-production
EOF
```

#### Frontend (.env.local)
```bash
cd frontend

# Create .env.local file
cat > .env.local << EOF
NEXT_PUBLIC_API_URL=http://localhost:8000
EOF
```

---

## 📊 API Testing

### Using curl
```bash
# Test team evaluation
curl -X POST http://localhost:8000/api/v1/team/evaluate \
  -H "Content-Type: application/json" \
  -d '{"season": "2024-25", "team_id": 123}'

# Test copilot
curl -X POST http://localhost:8000/api/v1/copilot/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "Who should I captain this week?"}'

# Get metrics summary
curl http://localhost:8000/api/v1/copilot/metrics/summary?days=7
```

### Using httpie
```bash
# Install: pip install httpie

# Test endpoint
http POST localhost:8000/api/v1/team/evaluate season=2024-25 team_id:=123

# Get endpoint
http GET localhost:8000/api/v1/copilot/metrics/summary days==7
```

---

## 🔐 Database Access

### SQLite
```bash
cd backend

# Access SQLite database
sqlite3 app/instance/xgenius.db

# Common SQLite commands
.tables                    # List all tables
.schema players            # Show table schema
SELECT * FROM players LIMIT 10;
.exit                      # Exit
```

### PostgreSQL
```bash
# Connect to PostgreSQL
psql -h localhost -U xgenius -d xgenius

# Or via Docker
docker-compose exec postgres psql -U xgenius -d xgenius

# Common PostgreSQL commands
\dt                        # List all tables
\d players                 # Describe table
SELECT * FROM players LIMIT 10;
\q                         # Quit
```

---

## 🚨 Troubleshooting

### Clear Build Cache
```bash
# Frontend
cd frontend
rm -rf .next
rm -rf node_modules/.cache

# Backend Python cache
cd backend
find . -type d -name __pycache__ -exec rm -r {} +
find . -type f -name "*.pyc" -delete
```

### Reset Everything
```bash
# Stop all services
docker-compose down -v

# Remove database
rm -f backend/app/instance/xgenius.db

# Reinstall dependencies
cd backend && pip install -r requirements.txt
cd ../frontend && npm install

# Reinitialize
cd backend && python -m app.cli.main init
cd backend && python -m app.cli.main ingest-fpl --season 2024-25
```

### Check Service Status
```bash
# Check if backend is running
curl http://localhost:8000/docs

# Check if frontend is running
curl http://localhost:3000

# Check database connection
cd backend
python -c "from app.core.database import engine; engine.connect(); print('Connected!')"
```

---

## 📝 Common Workflows

### Full Setup from Scratch
```bash
# 1. Clone and navigate
cd XGenius

# 2. Backend setup
cd backend
python3.11 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

# 3. Initialize database
DATABASE_URL="sqlite:///./app/instance/xgenius.db" python -m app.cli.main init

# 4. Ingest FPL data
DATABASE_URL="sqlite:///./app/instance/xgenius.db" python -m app.cli.main ingest-fpl --season 2024-25

# 5. Start backend
DATABASE_URL="sqlite:///./app/instance/xgenius.db" python -m app.cli.main run

# 6. Frontend setup (in new terminal)
cd frontend
npm install
npm run dev
```

### Daily Development
```bash
# Terminal 1: Backend
cd backend
source .venv/bin/activate
DATABASE_URL="sqlite:///./app/instance/xgenius.db" python -m app.cli.main run

# Terminal 2: Frontend
cd frontend
npm run dev
```

### Update FPL Data
```bash
cd backend
source .venv/bin/activate
DATABASE_URL="sqlite:///./app/instance/xgenius.db" python -m app.cli.main ingest-fpl --season 2024-25
```

---

## 📚 Additional Resources

- **API Documentation**: http://localhost:8000/docs (when backend is running)
- **Frontend**: http://localhost:3000
- **Backend Health**: http://localhost:8000/health

---

## 💡 Tips

1. **Use environment variables**: Set `DATABASE_URL` in `.env` file to avoid typing it every time
2. **Use Docker**: Simplifies setup and ensures consistent environment
3. **Check logs**: Use `docker-compose logs -f` to debug issues
4. **Database location**: SQLite database is at `backend/app/instance/xgenius.db`
5. **Hot reload**: Both frontend and backend support hot reload in development mode

