#!/bin/bash

echo "🤖 AI Analytics Chatbot Setup"
echo "=============================="
echo ""

# Check if Ollama is installed
if ! command -v ollama &> /dev/null
then
    echo "❌ Ollama is not installed"
    echo ""
    echo "Please install Ollama first:"
    echo "  macOS/Linux: Visit https://ollama.ai/download"
    echo "  Or run: curl -fsSL https://ollama.ai/install.sh | sh"
    echo ""
    exit 1
fi

echo "✅ Ollama is installed"
echo ""

# Check if Ollama is running
if ! curl -s http://localhost:11434/api/tags > /dev/null 2>&1
then
    echo "⚠️  Ollama is not running"
    echo "Starting Ollama..."
    ollama serve &
    sleep 3
fi

echo "✅ Ollama is running"
echo ""

# Check if qwen2.5:3b is available
if ollama list | grep -q "qwen2.5:3b"
then
    echo "✅ Qwen2.5:3b model is already installed"
else
    echo "📥 Downloading Qwen2.5:3b model (this may take a few minutes)..."
    ollama pull qwen2.5:3b
    echo "✅ Model downloaded successfully"
fi

echo ""
echo "🎉 Setup complete!"
echo ""
echo "Next steps:"
echo "  1. Run: npm run dev"
echo "  2. Open: http://localhost:3000/dashboard/ai-analytics"
echo "  3. Start asking questions about your data!"
echo ""
echo "Example questions:"
echo "  - What is expense by Pratham Vora?"
echo "  - Which KAM has highest revenue in August?"
echo "  - What is the churn revenue ratio?"
echo ""
