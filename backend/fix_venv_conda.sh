#!/bin/bash
# Fix venv creation when conda is active

echo "🐍 Fixing virtual environment creation..."

# Check if conda is active
if [[ "$CONDA_DEFAULT_ENV" != "" ]]; then
    echo "⚠️  Conda environment detected: $CONDA_DEFAULT_ENV"
    echo "📝 Deactivating conda first..."
    conda deactivate
fi

# Try to create venv
echo "📦 Creating virtual environment..."
python3 -m venv .venv

if [ $? -eq 0 ]; then
    echo "✅ Virtual environment created successfully!"
    echo ""
    echo "Now activate it with:"
    echo "  source .venv/bin/activate"
    echo ""
    echo "Then install dependencies:"
    echo "  pip install -r requirements.txt"
else
    echo "❌ Failed to create venv. Trying alternative methods..."
    echo ""
    echo "Option 1: Install virtualenv and use that instead:"
    echo "  pip install virtualenv"
    echo "  virtualenv .venv"
    echo ""
    echo "Option 2: Use conda to create environment:"
    echo "  conda create -n xgenius python=3.11 -y"
    echo "  conda activate xgenius"
    echo ""
    echo "Option 3: Use Docker (recommended):"
    echo "  cd .."
    echo "  docker-compose up -d --build"
fi

