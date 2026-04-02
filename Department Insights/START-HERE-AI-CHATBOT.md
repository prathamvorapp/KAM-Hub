# 🤖 AI Analytics Chatbot - START HERE

## What Is This?

An AI-powered chatbot that answers questions about your restaurant data using natural language. Ask questions like "What is expense by Pratham Vora?" and get instant answers.

---

## ⚡ Quick Setup (5 Minutes)

### Step 1: Install Ollama
Download and install from: **https://ollama.ai/download**

### Step 2: Install AI Model
```bash
ollama pull qwen2.5:3b
```

### Step 3: Test Connection
```bash
npm run test-ollama
```

### Step 4: Start App
```bash
npm run dev
```

### Step 5: Open Chatbot
Visit: **http://localhost:3000/dashboard/ai-analytics**

---

## 📚 Documentation Guide

| File | Purpose | When to Read |
|------|---------|--------------|
| **QUICK-START-AI-ANALYTICS.md** | 5-minute setup guide | Read first |
| **AI-ANALYTICS-README.md** | Complete documentation | For detailed info |
| **AI-ANALYTICS-SETUP.md** | Detailed setup steps | If having issues |
| **AI-ANALYTICS-SUMMARY.md** | Technical overview | For developers |
| **CHATBOT-EXAMPLES.md** | Example questions | To learn what to ask |

---

## 🎯 Try These Questions

Copy and paste into the chatbot:

1. **What is expense by Rahul Taak?**
2. **Which KAM has highest revenue in August?**
3. **What is the churn revenue ratio?**
4. **Show me revenue by Mahima Sali in April**

---

## ✅ Is It Working?

You should see:
- ✅ Green "Ollama Connected" indicator
- ✅ Responses within 2-3 seconds
- ✅ Data displayed below answers

---

## ❌ Troubleshooting

### "Ollama Disconnected"
```bash
ollama serve
```

### "Model Not Found"
```bash
ollama pull qwen2.5:3b
```

### Still Having Issues?
1. Check: `QUICK-START-AI-ANALYTICS.md` (troubleshooting section)
2. Run: `npm run test-ollama`
3. Check browser console (F12)

---

## 📊 What Data Can You Query?

- **Expenses** by KAM
- **Revenue** by KAM and month
- **Churn** statistics
- **Top performers** by period
- **Brand assignments**

---

## 🎨 Features

✅ Natural language understanding
✅ Real-time data queries
✅ Conversation memory
✅ Detailed results
✅ 100% local (no external APIs)
✅ Privacy-focused

---

## 📁 Files Created

### Core Files (7)
- `lib/ollama-client.ts`
- `lib/data-query-engine.ts`
- `lib/ai-analytics-agent.ts`
- `components/AIAnalyticsChat.tsx`
- `app/api/chat/route.ts`
- `app/dashboard/ai-analytics/page.tsx`
- Updated: `app/api/data/route.ts`

### Documentation (8)
- `START-HERE-AI-CHATBOT.md` (this file)
- `QUICK-START-AI-ANALYTICS.md`
- `AI-ANALYTICS-README.md`
- `AI-ANALYTICS-SETUP.md`
- `AI-ANALYTICS-SUMMARY.md`
- `CHATBOT-EXAMPLES.md`
- `setup-ollama.sh` / `setup-ollama.bat`
- `test-ollama-connection.js`

---

## 🚀 Next Steps

Once working:
1. Try different questions
2. Explore conversation features
3. Check raw data in responses
4. Clear chat to start fresh

---

## 💡 Tips

- First query may take 5-10 seconds (model loading)
- Subsequent queries are fast (1-3 seconds)
- Be specific with KAM names and months
- The AI maintains conversation context
- Click "Clear Chat" to reset conversation

---

## 🆘 Need Help?

1. **Quick issues**: See `QUICK-START-AI-ANALYTICS.md`
2. **Setup problems**: See `AI-ANALYTICS-SETUP.md`
3. **Usage questions**: See `CHATBOT-EXAMPLES.md`
4. **Technical details**: See `AI-ANALYTICS-SUMMARY.md`

---

## 🎉 That's It!

You now have a fully functional AI analytics chatbot. Start asking questions!

**Access it at**: http://localhost:3000/dashboard/ai-analytics
