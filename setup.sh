#!/bin/bash
# XGenius Setup Script

set -e

echo "🚀 Setting up XGenius FPL Optimizer..."

# Check prerequisites
echo "📋 Checking prerequisites..."
command -v docker >/dev/null 2>&1 || { echo "❌ Docker is required but not installed. Aborting." >&2; exit 1; }
command -v docker-compose >/dev/null 2>&1 || { echo "❌ docker-compose is required but not installed. Aborting." >&2; exit 1; }

# Create necessary directories
echo "📁 Creating directories..."
mkdir -p backend/models_store
mkdir -p backend/historical
mkdir -p docs

# Create .env file if it doesn't exist
if [ ! -f backend/.env ]; then
    echo "⚙️  Creating .env file..."
    cat > backend/.env << EOF
# Database
DATABASE_URL=postgresql://xgenius:xgenius@postgres:5432/xgenius

# Redis
REDIS_URL=redis://redis:6379/0
CELERY_BROKER_URL=redis://redis:6379/1
CELERY_RESULT_BACKEND=redis://redis:6379/2

# LLM
OPENAI_API_KEY=your_openai_api_key_here
OPENAI_MODEL=gpt-4o-mini

# Application
DEBUG=true
SECRET_KEY=dev-secret-change-in-production

# CORS
CORS_ORIGINS=http://localhost:3000,http://localhost:5173

# ML Models
MODEL_DIR=models_store
ML_TRAINING_DATA_DIR=historical

# Logging
LOG_LEVEL=INFO
EOF
    echo "✅ Created backend/.env (please update with your values)"
fi

# Build and start services
echo "🐳 Starting Docker services..."
docker-compose build
docker-compose up -d

echo "⏳ Waiting for services to be ready..."
sleep 10

# Initialize database
echo "🗄️  Initializing database..."
docker-compose exec -T backend python -m app.cli.main init || echo "⚠️  Database initialization may have failed. Check logs with: docker-compose logs backend"

echo ""
echo "✅ Setup complete!"
echo ""
echo "📍 Access points:"
echo "   - Frontend: http://localhost:3000"
echo "   - Backend API: http://localhost:8000"
echo "   - API Docs: http://localhost:8000/docs"
echo ""
echo "📚 Next steps:"
echo "   1. Update backend/.env with your OpenAI API key (optional, for AI Copilot)"
echo "   2. Bootstrap player data: docker-compose exec backend python -m app.cli.main ingest-players --season 2024-25"
echo "   3. Train ML models: docker-compose exec backend python -m app.cli.main train-models --model xgboost"
echo ""
echo "📖 See README.md for full documentation"

