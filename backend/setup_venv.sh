#!/bin/bash
# Setup script for virtual environment

set -e

echo "🐍 Setting up Python virtual environment..."

# Check if Python 3.11+ is available
if command -v python3.11 &> /dev/null; then
    PYTHON_CMD=python3.11
elif command -v python3.12 &> /dev/null; then
    PYTHON_CMD=python3.12
elif command -v python3 &> /dev/null; then
    PYTHON_CMD=python3
    echo "⚠️  Using python3, but Python 3.11+ is recommended"
else
    echo "❌ Python 3 not found. Please install Python 3.11 or later."
    exit 1
fi

# Create virtual environment
echo "📦 Creating virtual environment..."
$PYTHON_CMD -m venv .venv

# Activate virtual environment
echo "✅ Virtual environment created!"
echo ""
echo "To activate the virtual environment, run:"
echo "  source .venv/bin/activate"
echo ""
echo "Then install dependencies with:"
echo "  pip install -r requirements.txt"
echo ""

