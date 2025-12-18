#!/bin/bash
# XGenius Quick Start Script

set -e

echo "🚀 XGenius Quick Start"
echo "======================"
echo ""

# Check if Docker is available and accessible
if command -v docker >/dev/null 2>&1 && command -v docker-compose >/dev/null 2>&1; then
    # Test if we can actually use Docker (check permissions)
    if docker info >/dev/null 2>&1; then
        echo "✅ Docker detected and accessible"
        USE_DOCKER=true
    else
        echo "⚠️  Docker detected but permission denied"
        echo "   💡 To fix: sudo usermod -aG docker $USER (then log out/in)"
        echo "   💡 Or run with: sudo ./QUICK_START.sh"
        echo ""
        echo "   Using local setup instead..."
        USE_DOCKER=false
    fi
else
    echo "⚠️  Docker not found, will use local setup"
    USE_DOCKER=false
fi

# Create necessary directories
mkdir -p backend/models_store
mkdir -p backend/historical
mkdir -p docs

# Create .env if it doesn't exist
if [ ! -f backend/.env ]; then
    echo "📝 Creating backend/.env file..."
    cat > backend/.env << 'EOF'
# Database
DATABASE_URL=postgresql://xgenius:xgenius@postgres:5432/xgenius

# Redis
REDIS_URL=redis://redis:6379/0
CELERY_BROKER_URL=redis://redis:6379/1
CELERY_RESULT_BACKEND=redis://redis:6379/2

# LLM (Optional)
OPENAI_API_KEY=
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
    echo "✅ Created backend/.env"
fi

if [ "$USE_DOCKER" = true ]; then
    echo ""
    echo "🐳 Starting with Docker..."
    echo ""
    
    # Build and start
    docker-compose up -d --build
    
    echo ""
    echo "⏳ Waiting for services to be ready..."
    sleep 10
    
    # Initialize database
    echo ""
    echo "🗄️  Initializing database..."
    docker-compose exec -T backend python -m app.cli.main init || {
        echo "⚠️  Database initialization may have failed, but continuing..."
    }
    
    echo ""
    echo "✅ Setup complete!"
    echo ""
    echo "📍 Access points:"
    echo "   - Frontend: http://localhost:3000"
    echo "   - Backend API: http://localhost:8000"
    echo "   - API Docs: http://localhost:8000/docs"
    echo ""
    echo "📚 View logs: docker-compose logs -f"
    echo "🛑 Stop services: docker-compose down"
    
else
    echo ""
    echo "📦 Local setup instructions:"
    echo ""
    echo "Backend:"
    echo "  1. cd backend"
    echo "  2. python3.11 -m venv .venv"
    echo "  3. source .venv/bin/activate"
    echo "  4. pip install -r requirements.txt"
    echo "  5. export DATABASE_URL='sqlite:///xgenius.db'"
    echo "  6. python -m app.cli.main init"
    echo "  7. python -m app.cli.main run"
    echo ""
    echo "Frontend:"
    echo "  1. cd frontend"
    echo "  2. npm install"
    echo "  3. npm run dev"
    echo ""
    echo "See BOOTUP_GUIDE.md for detailed instructions"
fi

echo ""
echo "🎉 Done! Happy optimizing!"

