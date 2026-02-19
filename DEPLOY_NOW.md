# Deploy Health Check Fixes - Quick Action Guide

## 🚀 Ready to Deploy? Follow These Steps

### ⏱️ Total Time: ~15 minutes

---

## Step 1: Pre-Flight Check (2 minutes)

### Verify Code Changes
```bash
# Check what files were modified
git status

# Should show:
# modified: lib/services/healthCheckService.ts
# modified: app/api/data/health-checks/clear-cache/route.ts
# modified: app/api/data/health-checks/progress/route.ts
# modified: app/api/data/health-checks/route.ts
# modified: app/api/data/health-checks/statistics/route.ts
```

### Run Quick Checks
```bash
# Check for TypeScript errors
npm run type-check
# Should output: No errors

# Check for linting issues (optional)
npm run lint
```

---

## Step 2: Build & Deploy (5 minutes)

### Build
```bash
npm run build
```

### Deploy
Use your deployment method:

**Option A: Vercel**
```bash
vercel --prod
```

**Option B: Custom Server**
```bash
pm2 restart kam-hub
# or
npm run start
```

**Option C: Docker**
```bash
docker-compose up -d --build
```

---

## Step 3: Verify Deployment (3 minutes)

### Check Application Health
1. Open your application URL
2. Navigate to login page
3. Log in with test account
4. Navigate to Health Check-ups page

### Quick Visual Check
You should see:
- ✅ Assessment tab loads without errors
- ✅ Progress card shows numbers
- ✅ Brands are displayed in grid

---

## Step 4: Clear Cache (1 minute)

### In the Application
1. Click the "Clear Cache" button (🗑️) in Health Check-ups page
2. Wait for success message
3. Refresh the page (F5)

---

## Step 5: Verify Fixes (4 minutes)

### Check 1: Brands Visible ✅
- Assessment tab should show 47 brands (not 0)
- Brands should be displayed in a grid layout

### Check 2: Correct Counts ✅
Progress card should show:
- Total Brands: 50
- Completed: 3 (not 2)
- Remaining: 47 (not 48 or 49)

### Check 3: Console Logs ✅
Open browser DevTools (F12) and check console:
```
✅ Should see:
🔄 Cache bypassed due to cache buster
🔄 Progress cache bypassed due to cache buster
📊 [getBrandsForAssessment] Brands pending assessment: 47
📊 [getBrandsForAssessment] Assessed checks this month: 3

❌ Should NOT see on first load:
📈 Assessment progress served from cache
```

### Check 4: Test Assessment ✅
1. Click on any brand
2. Fill in assessment form
3. Submit
4. Verify:
   - Brand disappears from list
   - Completed count increases to 4
   - Remaining count decreases to 46

---

## ✅ Success Criteria

All of these should be true:
- [ ] Application deployed successfully
- [ ] No errors in console
- [ ] 47 brands visible in Assessment tab
- [ ] Progress shows 3 completed, 47 remaining
- [ ] Cache bypass logs appear
- [ ] Assessment submission works
- [ ] Counts update immediately

---

## 🆘 If Something Goes Wrong

### Issue: Build Fails
```bash
# Check for syntax errors
npm run type-check

# Check node_modules
rm -rf node_modules package-lock.json
npm install
npm run build
```

### Issue: Deployment Fails
```bash
# Check logs
pm2 logs kam-hub
# or
docker logs kam-hub

# Restart service
pm2 restart kam-hub
# or
docker-compose restart
```

### Issue: Brands Still Not Showing
1. Hard refresh: Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)
2. Clear browser cache
3. Click "Clear Cache" button again
4. Check console for errors

### Issue: Counts Still Wrong
1. Check Network tab in DevTools
2. Look for API responses
3. Verify cache buster parameter is present: `_t=timestamp`
4. Check if API is returning fresh data

### Emergency Rollback
```bash
# Revert all changes
git revert HEAD~2..HEAD
npm run build
# Redeploy using your method

# Or revert just cache fix (keep brand fix)
git revert HEAD
npm run build
# Redeploy
```

---

## 📊 Post-Deployment Monitoring

### First Hour
- [ ] Check error logs every 15 minutes
- [ ] Monitor user feedback
- [ ] Verify metrics in dashboard

### First Day
- [ ] Review error rate (should be 0%)
- [ ] Check API response times (should be < 500ms)
- [ ] Collect user feedback
- [ ] Document any issues

---

## 📞 Need Help?

### Quick References
- **Quick Fix Guide:** `QUICK_FIX_GUIDE.md`
- **Cache Fix Details:** `CACHE_FIX_SUMMARY.md`
- **Full Documentation:** `HEALTH_CHECK_COMPLETE_FIX.md`

### Diagnostic Tools
- **SQL Diagnostics:** `diagnose-health-check-issue.sql`
- **Data Fixes:** `fix-health-check-data-integrity.sql`

### Contact
- Development Team: [email]
- On-Call: [phone]
- Slack: #kam-hub-support

---

## 🎉 Deployment Complete!

Once all checks pass:
1. ✅ Mark deployment as successful
2. ✅ Notify stakeholders
3. ✅ Update deployment log
4. ✅ Monitor for 24 hours

---

## Quick Command Reference

```bash
# Build
npm run build

# Deploy (choose one)
vercel --prod                    # Vercel
pm2 restart kam-hub              # PM2
docker-compose up -d --build     # Docker

# Check logs
pm2 logs kam-hub                 # PM2
docker logs kam-hub              # Docker

# Rollback
git revert HEAD~2..HEAD
npm run build
# Redeploy
```

---

**Ready?** Start with Step 1! ⬆️

**Time:** ~15 minutes
**Difficulty:** Easy
**Risk:** Low (rollback available)
**Impact:** High (fixes critical user issue)

---

**Last Updated:** 2026-02-19
**Version:** 1.1.0
**Status:** ✅ Ready to Deploy
