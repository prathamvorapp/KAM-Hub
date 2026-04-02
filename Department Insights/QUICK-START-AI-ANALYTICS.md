# 🚀 Quick Start: AI Analytics Chatbot

Get your AI analytics chatbot running in 5 minutes!

## Step 1: Install Ollama

### Windows (You're on Windows)
1. Download from: https://ollama.ai/download
2. Run the installer
3. Ollama starts automatically

### Verify Installation
Open a terminal and run:
```bash
ollama --version
```

## Step 2: Install the AI Model

Run this command:
```bash
ollama pull qwen2.5:3b
```

This downloads the Qwen2.5 3B model (~2GB). It may take a few minutes.

## Step 3: Test the Connection

Run the test script:
```bash
node test-ollama-connection.js
```

You should see:
```
✅ Ollama is running
✅ Qwen2.5:3b model is installed
```

## Step 4: Start Your Application

```bash
npm run dev
```

## Step 5: Open the Chatbot

Visit: **http://localhost:3000/dashboard/ai-analytics**

Or click "AI Analytics" in the navigation menu.

## 🎯 Try These Questions

Copy and paste these into the chatbot:

1. **What is expense by Rahul Taak?**
2. **Which KAM has highest revenue in August?**
3. **What is the churn revenue ratio?**
4. **Show me revenue by Mahima Sali in April**

## ✅ Success Indicators

- Green dot next to "Ollama Connected" in the UI
- Chatbot responds within 2-3 seconds
- You see data results below the answer

## ❌ Troubleshooting

### "Ollama Disconnected" Error

**Fix:**
```bash
# Start Ollama manually
ollama serve
```

Keep this terminal open and start your app in a new terminal.

### "Model Not Found" Error

**Fix:**
```bash
ollama pull qwen2.5:3b
```

### Slow First Response

This is normal! The model loads on first use (5-10 seconds). Subsequent queries are fast.

### Port 11434 Already in Use

**Fix:**
```bash
# Find what's using the port
netstat -ano | findstr :11434

# Kill the process or restart Ollama
```

## 📊 What Data Can You Query?

The chatbot has access to:
- **Brand Data**: Restaurant info, product subscriptions
- **Revenue Data**: Transactions, amounts, dates
- **Expense Data**: KAM expenses by date
- **Churn Data**: Churned restaurants and reasons
- **KAM Data**: Brand assignments, KAM names

## 🎨 Features

- Natural language understanding
- Real-time data queries
- Conversation memory
- Detailed results with raw data
- Connection status monitoring
- Clear chat history

## 📝 Next Steps

Once it's working, try:
1. Ask complex questions combining multiple data points
2. Request specific time periods
3. Compare different KAMs
4. Analyze trends

## 🆘 Still Having Issues?

1. Check browser console (F12) for errors
2. Check terminal for Next.js errors
3. Verify all CSV files are in the `Data/` folder
4. Restart both Ollama and the Next.js app

## 📚 More Information

- Full setup guide: `AI-ANALYTICS-SETUP.md`
- Detailed README: `AI-ANALYTICS-README.md`
- Ollama docs: https://ollama.ai/docs

---

**That's it!** You now have an AI-powered analytics chatbot running locally. 🎉
