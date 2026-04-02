# AI Analytics Chatbot Setup Guide

This guide will help you set up the AI Analytics chatbot using Ollama with Qwen2.5:3b model.

## Prerequisites

1. Install Ollama from https://ollama.ai/download
2. Node.js and npm (already installed for your Next.js project)

## Installation Steps

### 1. Install Ollama

**Windows:**
- Download the installer from https://ollama.ai/download
- Run the installer
- Ollama will start automatically as a service

**macOS:**
```bash
brew install ollama
```

**Linux:**
```bash
curl -fsSL https://ollama.ai/install.sh | sh
```

### 2. Pull the Qwen2.5:3b Model

Open a terminal and run:

```bash
ollama pull qwen2.5:3b
```

This will download the Qwen2.5 3B parameter model (~2GB).

### 3. Verify Ollama is Running

Check if Ollama is running:

```bash
ollama list
```

You should see `qwen2.5:3b` in the list.

### 4. Start Your Next.js Application

```bash
npm run dev
```

### 5. Access the AI Analytics Chat

Navigate to: http://localhost:3000/dashboard/ai-analytics

## Features

The AI Analytics chatbot can answer questions like:

1. **Expense Queries**
   - "What is expense by Pratham Vora?"
   - "Show me expenses for Rahul Taak"

2. **Revenue Queries**
   - "Which KAM has highest revenue in August?"
   - "Show me revenue by Mahima Sali in April"
   - "What's the revenue for Harsh Gohel in June?"

3. **Churn Analysis**
   - "What is the churn revenue ratio?"
   - "Calculate churn to revenue ratio"

4. **General Questions**
   - The chatbot can also answer general questions about the data
   - It maintains conversation context

## How It Works

1. **Data Loading**: The system loads all CSV files (Brand, Revenue, Expense, Churn, KAM data)
2. **Query Interpretation**: Ollama's Qwen2.5 model interprets your natural language question
3. **Query Execution**: The system executes the appropriate query on your data
4. **Response Generation**: Results are formatted and displayed with the raw data

## Architecture

```
User Question
    ↓
AI Analytics Agent (Qwen2.5:3b via Ollama)
    ↓
Query Interpretation
    ↓
Data Query Engine
    ↓
CSV Data (Brand, Revenue, Expense, Churn, KAM)
    ↓
Formatted Response
```

## Troubleshooting

### Ollama Not Connected

If you see "Ollama Disconnected":

1. Check if Ollama is running:
   ```bash
   ollama serve
   ```

2. Verify the model is available:
   ```bash
   ollama list
   ```

3. Test the API:
   ```bash
   curl http://localhost:11434/api/tags
   ```

### Model Not Found

If the model isn't found:

```bash
ollama pull qwen2.5:3b
```

### Slow Responses

- The 3B model is optimized for speed
- First query may be slower as the model loads
- Subsequent queries should be faster

### Port Conflicts

If port 11434 is in use, you can change Ollama's port:

```bash
OLLAMA_HOST=0.0.0.0:11435 ollama serve
```

Then update `lib/ollama-client.ts`:
```typescript
constructor(baseUrl: string = 'http://localhost:11435', ...)
```

## Customization

### Using a Different Model

To use a different Ollama model, update `lib/ollama-client.ts`:

```typescript
constructor(baseUrl: string = 'http://localhost:11434', model: string = 'llama2')
```

Available models:
- `qwen2.5:3b` - Fast, good for analytics (recommended)
- `llama2` - General purpose
- `mistral` - Good balance of speed and quality
- `codellama` - Better for code-related queries

### Adding New Query Types

Edit `lib/data-query-engine.ts` to add new query methods:

```typescript
getCustomQuery(params: any): QueryResult {
  // Your custom query logic
}
```

Then update the `executeQuery` switch statement.

## Performance Tips

1. **Model Size**: 3B model is fast but less capable than larger models
2. **Data Caching**: Data is loaded once and cached in memory
3. **Conversation History**: Clear chat periodically to reduce context size
4. **GPU Acceleration**: Ollama automatically uses GPU if available

## Next Steps

- Add more query types for deeper analytics
- Implement data visualization for query results
- Add export functionality for query results
- Create saved queries/templates
- Add multi-turn conversation improvements

## Support

For Ollama issues: https://github.com/ollama/ollama/issues
For application issues: Check the browser console and Next.js logs
