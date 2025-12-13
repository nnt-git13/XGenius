#!/bin/bash
# XGenius Setup Script

set -e

echo "🚀 XGenius Setup Script"
echo "======================="

# Check Python version
echo "Checking Python version..."
python_version=$(python3 --version 2>&1 | awk '{print $2}')
echo "Python version: $python_version"

# Create virtual environment
if [ ! -d ".venv" ]; then
    echo "Creating virtual environment..."
    python3 -m venv .venv
fi

# Activate virtual environment
echo "Activating virtual environment..."
source .venv/bin/activate

# Install dependencies
echo "Installing dependencies..."
pip install --upgrade pip
pip install -r requirements.txt

# Create .env file if it doesn't exist
if [ ! -f ".env" ]; then
    echo "Creating .env file..."
    cat > .env << EOF
DATABASE_URL=postgresql://xgenius:xgenius@localhost:5432/xgenius
REDIS_URL=redis://localhost:6379/0
SECRET_KEY=$(python3 -c 'import secrets; print(secrets.token_urlsafe(32))')
OPENAI_API_KEY=
OPENAI_MODEL=gpt-4o-mini
MODEL_DIR=models_store
TRAIN_AUTO_ON_INGEST=false
LOG_LEVEL=INFO
DEBUG=true
EOF
    echo ".env file created. Please update with your settings."
fi

# Create model directory
mkdir -p models_store

# Check if PostgreSQL is running
echo "Checking PostgreSQL connection..."
if command -v psql &> /dev/null; then
    echo "PostgreSQL client found."
    echo "Please ensure PostgreSQL is running and create the database:"
    echo "  createdb -U postgres xgenius"
    echo "  Or: psql -U postgres -c 'CREATE DATABASE xgenius;'"
else
    echo "PostgreSQL client not found. Please install PostgreSQL."
fi

# Initialize database
echo "Initializing database..."
python cli.py init

echo ""
echo "✅ Setup complete!"
echo ""
echo "Next steps:"
echo "1. Update .env with your database credentials and API keys"
echo "2. Run migrations: alembic upgrade head"
echo "3. Ingest data: python cli.py ingest-players --csv data/players.csv --season 2024-25"
echo "4. Start server: python cli.py run"
echo ""
echo "Or use Docker: docker-compose up -d"

