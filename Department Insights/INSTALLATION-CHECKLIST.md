# ✅ AI Analytics Chatbot - Installation Checklist

Use this checklist to verify your installation is complete and working.

---

## 📋 Pre-Installation

- [ ] Node.js is installed (`node --version`)
- [ ] npm is installed (`npm --version`)
- [ ] Next.js app runs (`npm run dev`)
- [ ] CSV data files exist in `Data/` folder

---

## 🔧 Ollama Installation

- [ ] Ollama is downloaded from https://ollama.ai/download
- [ ] Ollama is installed
- [ ] Ollama command works (`ollama --version`)
- [ ] Ollama service is running (`ollama serve` or auto-started)

---

## 🤖 AI Model Setup

- [ ] Qwen2.5:3b model is pulled (`ollama pull qwen2.5:3b`)
- [ ] Model appears in list (`ollama list`)
- [ ] Model size is ~2GB
- [ ] Connection test passes (`npm run test-ollama`)

---

## 📁 File Verification

### Core Implementation Files
- [ ] `lib/ollama-client.ts` exists
- [ ] `lib/data-query-engine.ts` exists
- [ ] `lib/ai-analytics-agent.ts` exists
- [ ] `components/AIAnalyticsChat.tsx` exists
- [ ] `app/api/chat/route.ts` exists
- [ ] `app/dashboard/ai-analytics/page.tsx` exists
- [ ] `app/api/data/route.ts` updated

### Documentation Files
- [ ] `START-HERE-AI-CHATBOT.md` exists
- [ ] `QUICK-START-AI-ANALYTICS.md` exists
- [ ] `AI-ANALYTICS-README.md` exists
- [ ] `AI-ANALYTICS-SETUP.md` exists
- [ ] `AI-ANALYTICS-SUMMARY.md` exists
- [ ] `CHATBOT-EXAMPLES.md` exists
- [ ] `INSTALLATION-CHECKLIST.md` exists (this file)

### Utility Files
- [ ] `test-ollama-connection.js` exists
- [ ] `setup-ollama.sh` exists (Linux/macOS)
- [ ] `setup-ollama.bat` exists (Windows)
- [ ] `package.json` has `test-ollama` script

---

## 🎨 UI Verification

- [ ] Navigation bar shows "AI Analytics" link
- [ ] Link points to `/dashboard/ai-analytics`
- [ ] Page loads without errors
- [ ] Chat interface displays
- [ ] Connection status indicator shows

---

## 🧪 Functionality Tests

### Connection Test
- [ ] Run `npm run test-ollama`
- [ ] See "✅ Ollama is running"
- [ ] See "✅ Qwen2.5:3b model is installed"
- [ ] No error messages

### Application Test
- [ ] Run `npm run dev`
- [ ] No TypeScript errors
- [ ] No build errors
- [ ] Server starts on port 3000

### UI Test
- [ ] Visit http://localhost:3000/dashboard/ai-analytics
- [ ] Page loads successfully
- [ ] Green "Ollama Connected" indicator shows
- [ ] Input field is enabled
- [ ] Send button is enabled
- [ ] Example questions display

### Query Test
- [ ] Type: "What is expense by Rahul Taak?"
- [ ] Click Send or press Enter
- [ ] Loading indicator appears
- [ ] Response appears within 10 seconds
- [ ] Data is displayed
- [ ] No errors in browser console

---

## 🎯 Feature Verification

### Basic Features
- [ ] Can send messages
- [ ] Receives AI responses
- [ ] Loading indicator works
- [ ] Messages display correctly
- [ ] User messages are blue
- [ ] Assistant messages are white
- [ ] Auto-scroll to latest message works

### Advanced Features
- [ ] Conversation history maintained
- [ ] Clear Chat button works
- [ ] Connection status updates
- [ ] Raw data displays in responses
- [ ] Multiple queries work in sequence
- [ ] Error messages display properly

---

## 📊 Data Query Tests

### Expense Queries
- [ ] "What is expense by Rahul Taak?" works
- [ ] Returns expense total
- [ ] Shows number of entries
- [ ] Displays raw data

### Revenue Queries
- [ ] "Which KAM has highest revenue in August?" works
- [ ] Returns KAM name
- [ ] Shows revenue amount
- [ ] Displays comparison data

### Churn Queries
- [ ] "What is the churn revenue ratio?" works
- [ ] Returns percentage
- [ ] Shows total amounts
- [ ] Calculates correctly

---

## 🔍 Error Handling Tests

### Ollama Not Running
- [ ] Stop Ollama (`pkill ollama` or close service)
- [ ] Refresh page
- [ ] Red "Ollama Disconnected" shows
- [ ] Input is disabled
- [ ] Helpful error message displays

### Invalid Query
- [ ] Ask nonsensical question
- [ ] Receives conversational response
- [ ] No crash or error
- [ ] Can continue chatting

### Network Error
- [ ] Disconnect network briefly
- [ ] Send message
- [ ] Error message displays
- [ ] Can retry after reconnection

---

## 🚀 Performance Checks

- [ ] First query completes in <10 seconds
- [ ] Subsequent queries complete in <3 seconds
- [ ] UI remains responsive during queries
- [ ] No memory leaks after multiple queries
- [ ] Browser doesn't freeze

---

## 📱 Browser Compatibility

Test in multiple browsers:
- [ ] Chrome/Edge (Chromium)
- [ ] Firefox
- [ ] Safari (if on macOS)

---

## 🎓 Documentation Review

- [ ] Read `START-HERE-AI-CHATBOT.md`
- [ ] Understand quick setup steps
- [ ] Know where to find help
- [ ] Familiar with example questions
- [ ] Understand troubleshooting steps

---

## ✨ Final Verification

- [ ] All checkboxes above are checked
- [ ] No console errors
- [ ] No TypeScript errors
- [ ] Application runs smoothly
- [ ] Can ask and receive answers
- [ ] Data is accurate
- [ ] UI is responsive
- [ ] Documentation is clear

---

## 🎉 Success Criteria

Your installation is successful when:

1. ✅ `npm run test-ollama` passes
2. ✅ Green "Ollama Connected" indicator
3. ✅ Can ask questions and get answers
4. ✅ Data displays correctly
5. ✅ No errors in console
6. ✅ Response time is acceptable

---

## 📞 If Something Fails

1. **Check which section failed**
2. **Review relevant documentation**:
   - Setup issues → `AI-ANALYTICS-SETUP.md`
   - Usage questions → `CHATBOT-EXAMPLES.md`
   - Technical details → `AI-ANALYTICS-SUMMARY.md`
3. **Run diagnostics**:
   ```bash
   npm run test-ollama
   ollama list
   curl http://localhost:11434/api/tags
   ```
4. **Check logs**:
   - Browser console (F12)
   - Next.js terminal output
   - Ollama logs

---

## 🔄 Reinstallation Steps

If you need to start over:

1. **Stop services**:
   ```bash
   # Stop Next.js (Ctrl+C)
   # Stop Ollama (if running manually)
   ```

2. **Clean Ollama**:
   ```bash
   ollama rm qwen2.5:3b
   ollama pull qwen2.5:3b
   ```

3. **Restart**:
   ```bash
   ollama serve  # If not auto-starting
   npm run dev
   ```

4. **Test**:
   ```bash
   npm run test-ollama
   ```

---

## 📝 Notes

- First-time model loading takes longer
- GPU acceleration is automatic if available
- All data stays local (privacy-focused)
- No external API calls required
- Works offline after setup

---

**Installation Date**: _____________

**Tested By**: _____________

**Status**: ⬜ Pending  ⬜ In Progress  ⬜ Complete

---

Print this checklist and check off items as you complete them!
