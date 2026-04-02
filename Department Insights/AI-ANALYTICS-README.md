# AI Analytics Chatbot

An intelligent chatbot powered by Ollama (Qwen2.5:3b) that answers questions about your restaurant management data.

## Quick Start

### Windows
```bash
# Run the setup script
setup-ollama.bat

# Start the application
npm run dev
```

### macOS/Linux
```bash
# Make script executable
chmod +x setup-ollama.sh

# Run the setup script
./setup-ollama.sh

# Start the application
npm run dev
```

### Manual Setup
```bash
# Install Ollama from https://ollama.ai/download

# Pull the model
ollama pull qwen2.5:3b

# Start Ollama (if not running)
ollama serve

# Start the app
npm run dev
```

## Access the Chatbot

Navigate to: **http://localhost:3000/dashboard/ai-analytics**

Or click "AI Analytics" in the navigation menu.

## Example Questions

### Expense Queries
- "What is expense by Pratham Vora?"
- "Show me expenses for Rahul Taak"
- "Total expenses by Bhanvi Gupta"

### Revenue Queries
- "Which KAM has highest revenue in August?"
- "Show me revenue by Mahima Sali in April"
- "What's the revenue for Harsh Gohel in June?"
- "Revenue by Kripal Patel in May"

### Churn Analysis
- "What is the churn revenue ratio?"
- "Calculate churn to revenue ratio"
- "Show me churn statistics"

### General Questions
- "Who manages the CHOICE brand?"
- "List all KAMs"
- "What data do you have?"

## Features

✅ Natural language understanding
✅ Real-time data querying
✅ Conversation context maintained
✅ Detailed data display
✅ Connection status indicator
✅ Chat history management

## Architecture

```
┌─────────────────┐
│   User Input    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  AI Agent       │
│  (Qwen2.5:3b)   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Query Engine    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  CSV Data       │
│  - Brand        │
│  - Revenue      │
│  - Expense      │
│  - Churn        │
│  - KAM          │
└─────────────────┘
```

## Files Created

### Core Components
- `lib/ollama-client.ts` - Ollama API client
- `lib/data-query-engine.ts` - Data querying logic
- `lib/ai-analytics-agent.ts` - AI agent orchestration
- `components/AIAnalyticsChat.tsx` - Chat UI component
- `app/api/chat/route.ts` - Chat API endpoint
- `app/dashboard/ai-analytics/page.tsx` - Analytics page

### Setup & Documentation
- `AI-ANALYTICS-SETUP.md` - Detailed setup guide
- `AI-ANALYTICS-README.md` - This file
- `setup-ollama.sh` - Linux/macOS setup script
- `setup-ollama.bat` - Windows setup script

## Troubleshooting

### "Ollama Disconnected" Error

1. Check if Ollama is running:
   ```bash
   curl http://localhost:11434/api/tags
   ```

2. Start Ollama:
   ```bash
   ollama serve
   ```

3. Verify model is installed:
   ```bash
   ollama list
   ```

### Slow Responses

- First query loads the model (may take 5-10 seconds)
- Subsequent queries are faster
- Consider using GPU acceleration if available

### Model Not Found

```bash
ollama pull qwen2.5:3b
```

### Port Already in Use

Change Ollama port:
```bash
OLLAMA_HOST=0.0.0.0:11435 ollama serve
```

Update `lib/ollama-client.ts` line 13:
```typescript
constructor(baseUrl: string = 'http://localhost:11435', ...)
```

## Customization

### Use Different Model

Edit `lib/ollama-client.ts`:
```typescript
constructor(baseUrl: string = 'http://localhost:11434', model: string = 'llama2')
```

Available models:
- `qwen2.5:3b` - Fast, optimized for analytics (recommended)
- `llama2` - General purpose
- `mistral` - Good balance
- `codellama` - Code-focused

### Add Custom Queries

Edit `lib/data-query-engine.ts` and add new methods:

```typescript
getCustomMetric(params: any): QueryResult {
  // Your logic here
  return {
    success: true,
    data: { /* your data */ },
    summary: 'Your summary'
  };
}
```

Update `executeQuery` switch:
```typescript
case 'custom_metric':
  return this.getCustomMetric(params);
```

## Performance

- Model size: ~2GB
- Memory usage: ~3-4GB during inference
- Response time: 1-3 seconds (after initial load)
- Supports GPU acceleration automatically

## Tech Stack

- **Frontend**: Next.js 16, React 18, TailwindCSS
- **AI Model**: Qwen2.5:3b via Ollama
- **Data**: CSV files parsed with PapaParse
- **API**: Next.js API routes

## Future Enhancements

- [ ] Data visualization for query results
- [ ] Export results to CSV/Excel
- [ ] Saved query templates
- [ ] Multi-language support
- [ ] Voice input
- [ ] Advanced analytics (trends, predictions)
- [ ] Custom report generation

## Support

- Ollama Documentation: https://ollama.ai/docs
- Qwen2.5 Model: https://ollama.ai/library/qwen2.5
- Issues: Check browser console and Next.js terminal logs

## License

Part of the Brand Journey Dashboard project.
