@echo off
echo 🤖 AI Analytics Chatbot Setup
echo ==============================
echo.

REM Check if Ollama is installed
where ollama >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ❌ Ollama is not installed
    echo.
    echo Please install Ollama first:
    echo   Download from: https://ollama.ai/download
    echo.
    pause
    exit /b 1
)

echo ✅ Ollama is installed
echo.

REM Check if Ollama is running
curl -s http://localhost:11434/api/tags >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ⚠️  Ollama is not running
    echo Starting Ollama...
    start /B ollama serve
    timeout /t 3 >nul
)

echo ✅ Ollama is running
echo.

REM Check if qwen2.5:3b is available
ollama list | findstr "qwen2.5:3b" >nul 2>nul
if %ERRORLEVEL% EQU 0 (
    echo ✅ Qwen2.5:3b model is already installed
) else (
    echo 📥 Downloading Qwen2.5:3b model (this may take a few minutes)...
    ollama pull qwen2.5:3b
    echo ✅ Model downloaded successfully
)

echo.
echo 🎉 Setup complete!
echo.
echo Next steps:
echo   1. Run: npm run dev
echo   2. Open: http://localhost:3000/dashboard/ai-analytics
echo   3. Start asking questions about your data!
echo.
echo Example questions:
echo   - What is expense by Pratham Vora?
echo   - Which KAM has highest revenue in August?
echo   - What is the churn revenue ratio?
echo.
pause
