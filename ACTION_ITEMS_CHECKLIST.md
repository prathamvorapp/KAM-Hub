# ✅ ACTION ITEMS CHECKLIST

## Your Next Steps - In Order

---

## 🚨 CRITICAL - DO FIRST (Today)

### ⚠️ 1. Rotate Service Role Key (MANDATORY)
**Why:** The key was exposed in `.env.local.example` and must be rotated immediately.

**Steps:**
```
1. Open browser → https://supabase.com/dashboard
2. Login to your account
3. Select project: qvgnrdarwsnweizifech
4. Click: Settings (left sidebar)
5. Click: API (in settings menu)
6. Scroll to: "Service Role Key" section
7. Click: "Reset" button
8. Copy the new key
9. Open: .env.local file
10. Update: SUPABASE_SERVICE_ROLE_KEY=<paste-new-key>
11. Save file
12. Restart dev server: npm run dev
```

**Verification:**
- [ ] New key copied
- [ ] .env.local updated
- [ ] Server restarted
- [ ] No Supabase errors in console

**Time Required:** 5 minutes  
**Status:** ⬜ NOT STARTED / ⏳ IN PROGRESS / ✅ COMPLETE

---

### 2. Verify .gitignore Protection
**Why:** Ensure secrets are never committed to git.

**Steps:**
```bash
# Check git status
git status

# Should NOT show:
# - .env.local
# - .env.production
# - Any file with secrets
```

**Verification:**
- [ ] .env.local is gitignored
- [ ] No secrets in git status
- [ ] .gitignore includes .env*.local

**Time Required:** 2 minutes  
**Status:** ⬜ NOT STARTED / ⏳ IN PROGRESS / ✅ COMPLETE

---

## 🧪 TESTING - DO SECOND (Today)

### 3. Test Authentication Flow

**Agent Account:**
```
Email: jinal.chavda@petpooja.com
Password: Temp@1234
```

**Steps:**
```bash
# Start dev server
npm run dev

# Open browser: http://localhost:3022
```

**Test Checklist:**
- [ ] Redirects to /login
- [ ] Can login with agent credentials
- [ ] Redirects to /dashboard after login
- [ ] Dashboard loads without errors
- [ ] Session persists on page refresh
- [ ] Can navigate to /dashboard/churn
- [ ] Can see churn data

**Time Required:** 5 minutes  
**Status:** ⬜ NOT STARTED / ⏳ IN PROGRESS / ✅ COMPLETE

---

### 4. Test Logout Flow

**Steps:**
```
1. Login (if not already logged in)
2. Click logout button
3. Should redirect to /login
4. Open DevTools → Application → Cookies
5. Verify cookies are cleared
6. Try to access: http://localhost:3022/dashboard
7. Should redirect back to /login
```

**Test Checklist:**
- [ ] Logout button works
- [ ] Redirects to /login
- [ ] Cookies cleared (check DevTools)
- [ ] localStorage cleared (check DevTools)
- [ ] Cannot access dashboard after logout
- [ ] Must login again to access dashboard

**Time Required:** 3 minutes  
**Status:** ⬜ NOT STARTED / ⏳ IN PROGRESS / ✅ COMPLETE

---

### 5. Test Role-Based Access - Agent

**Login as Agent:**
```
Email: jinal.chavda@petpooja.com
Password: Temp@1234
```

**Test Checklist:**
- [ ] Can see own churn data only
- [ ] Can see own visits only
- [ ] Cannot access /dashboard/approvals
- [ ] Cannot call admin APIs (test in console)

**API Test (Browser Console):**
```javascript
fetch('/api/admin/fix-churn-statuses', {
  method: 'POST',
  credentials: 'include'
}).then(r => r.json()).then(console.log)
// Expected: { success: false, error: "Forbidden..." }
```

**Time Required:** 5 minutes  
**Status:** ⬜ NOT STARTED / ⏳ IN PROGRESS / ✅ COMPLETE

---

### 6. Test Role-Based Access - Team Lead

**Login as Team Lead:**
```
Email: shaikh.farhan@petpooja.com
Password: Temp@1234
```

**Test Checklist:**
- [ ] Can see team data
- [ ] Can access /dashboard/approvals
- [ ] Can see pending MOMs
- [ ] Can approve/reject MOMs
- [ ] Cannot call admin APIs (test in console)

**API Test (Browser Console):**
```javascript
fetch('/api/admin/fix-churn-statuses', {
  method: 'POST',
  credentials: 'include'
}).then(r => r.json()).then(console.log)
// Expected: { success: false, error: "Forbidden..." }
```

**Time Required:** 5 minutes  
**Status:** ⬜ NOT STARTED / ⏳ IN PROGRESS / ✅ COMPLETE

---

### 7. Test Role-Based Access - Admin

**Login as Admin:**
```
Email: pratham.vora@petpooja.com
Password: Temp@1234
```

**Test Checklist:**
- [ ] Can see all data
- [ ] Can access /dashboard/admin
- [ ] Can call admin APIs
- [ ] No data filtering applied

**API Test (Browser Console):**
```javascript
fetch('/api/admin/fix-churn-statuses', {
  method: 'POST',
  credentials: 'include'
}).then(r => r.json()).then(console.log)
// Expected: { success: true, ... }
```

**Time Required:** 5 minutes  
**Status:** ⬜ NOT STARTED / ⏳ IN PROGRESS / ✅ COMPLETE

---

### 8. Test Debug Routes Protection

**Steps:**
```bash
# Stop dev server (Ctrl+C)

# Set NODE_ENV to production (Windows PowerShell)
$env:NODE_ENV="production"

# Start dev server
npm run dev
```

**Test in Browser Console:**
```javascript
fetch('/api/debug/env')
  .then(r => r.json())
  .then(console.log)
// Expected: { error: "Debug endpoints disabled in production" }
```

**Cleanup:**
```bash
# Stop server (Ctrl+C)

# Reset to development
$env:NODE_ENV="development"

# Restart
npm run dev
```

**Test Checklist:**
- [ ] Debug routes return 404 in production
- [ ] Debug routes work in development
- [ ] No sensitive data exposed

**Time Required:** 3 minutes  
**Status:** ⬜ NOT STARTED / ⏳ IN PROGRESS / ✅ COMPLETE

---

## 📋 DOCUMENTATION - DO THIRD (Optional but Recommended)

### 9. Review Documentation

**Read in this order:**
1. [ ] `README_SECURITY_FIXES.md` - Overview (5 min)
2. [ ] `QUICK_FIX_SUMMARY.md` - Quick reference (5 min)
3. [ ] `FIXES_APPLIED_SUMMARY.md` - Detailed fixes (10 min)
4. [ ] `FINAL_TESTING_DEPLOYMENT_GUIDE.md` - Deployment guide (15 min)

**Time Required:** 35 minutes  
**Status:** ⬜ NOT STARTED / ⏳ IN PROGRESS / ✅ COMPLETE

---

### 10. Document Test Results

**Create file:** `TESTING_RESULTS.md`

**Template:**
```markdown
# Testing Results

## Date: [TODAY'S DATE]
## Tester: [YOUR NAME]

### Critical Tests
- [ ] Service key rotated: PASS/FAIL
- [ ] Authentication works: PASS/FAIL
- [ ] Logout clears session: PASS/FAIL
- [ ] Agent role restrictions: PASS/FAIL
- [ ] Team Lead role access: PASS/FAIL
- [ ] Admin role access: PASS/FAIL
- [ ] Debug routes protected: PASS/FAIL

### Issues Found
[List any issues]

### Overall Status
- [ ] READY FOR STAGING
- [ ] NEEDS FIXES

## Notes
[Any additional notes]
```

**Time Required:** 10 minutes  
**Status:** ⬜ NOT STARTED / ⏳ IN PROGRESS / ✅ COMPLETE

---

## 🚀 DEPLOYMENT - DO FOURTH (After All Tests Pass)

### 11. Build for Production

**Steps:**
```bash
# Clean build
rm -rf .next

# Build
npm run build

# Should complete without errors
```

**Verification:**
- [ ] Build completes successfully
- [ ] No errors in build output
- [ ] No critical warnings

**Time Required:** 5 minutes  
**Status:** ⬜ NOT STARTED / ⏳ IN PROGRESS / ✅ COMPLETE

---

### 12. Test Production Build Locally

**Steps:**
```bash
# Start production server
npm run start

# Open: http://localhost:3022
# Test login and basic functionality
```

**Test Checklist:**
- [ ] Application loads
- [ ] Can login
- [ ] Debug routes return 404
- [ ] All features work

**Time Required:** 5 minutes  
**Status:** ⬜ NOT STARTED / ⏳ IN PROGRESS / ✅ COMPLETE

---

### 13. Deploy to Staging (If Available)

**Steps:**
```bash
# Deploy to staging
vercel --prod
# or your deployment method
```

**Verification:**
- [ ] Deployment successful
- [ ] Staging URL accessible
- [ ] Can login on staging
- [ ] Basic smoke tests pass

**Time Required:** 10 minutes  
**Status:** ⬜ NOT STARTED / ⏳ IN PROGRESS / ✅ COMPLETE

---

## 📊 PROGRESS TRACKER

### Overall Progress

**Critical Tasks (Must Complete):**
- [ ] 1. Rotate service key
- [ ] 2. Verify gitignore
- [ ] 3. Test authentication
- [ ] 4. Test logout
- [ ] 5. Test agent role
- [ ] 6. Test team lead role
- [ ] 7. Test admin role
- [ ] 8. Test debug protection

**Progress:** 0/8 Complete (0%)

**Testing Tasks:**
- [ ] 9. Review documentation
- [ ] 10. Document results

**Progress:** 0/2 Complete (0%)

**Deployment Tasks:**
- [ ] 11. Build for production
- [ ] 12. Test production build
- [ ] 13. Deploy to staging

**Progress:** 0/3 Complete (0%)

---

## 🎯 SUCCESS CRITERIA

You're ready for production when:

✅ All critical tasks complete (8/8)  
✅ All tests pass  
✅ Service key rotated  
✅ No security issues found  
✅ Documentation reviewed  
✅ Test results documented  
✅ Production build successful  

---

## ⏱️ TIME ESTIMATES

| Phase | Tasks | Time | Status |
|-------|-------|------|--------|
| Critical | 1-2 | 7 min | ⬜ |
| Testing | 3-8 | 31 min | ⬜ |
| Documentation | 9-10 | 45 min | ⬜ |
| Deployment | 11-13 | 20 min | ⬜ |
| **Total** | **13** | **~2 hours** | **⬜** |

---

## 🆘 IF YOU ENCOUNTER ISSUES

### Issue: Can't login after fixes
**Solution:** 
1. Check browser console for errors
2. Verify Supabase URL and keys in .env.local
3. Clear browser cache and cookies
4. Try incognito/private window

### Issue: Debug routes still accessible in production
**Solution:**
1. Verify NODE_ENV=production
2. Restart server after changing NODE_ENV
3. Check browser console for environment

### Issue: Role-based access not working
**Solution:**
1. Check user_profiles table in Supabase
2. Verify role field matches exactly (case-sensitive)
3. Check browser console for API errors

### Issue: Build fails
**Solution:**
1. Check for TypeScript errors
2. Run: npm run lint
3. Fix any errors shown
4. Try build again

---

## 📞 NEED HELP?

**Documentation:**
- Quick Reference: `QUICK_FIX_SUMMARY.md`
- Detailed Guide: `IMPLEMENTATION_GUIDE.md`
- Full Audit: `QA_AUDIT_REPORT.md`

**Testing:**
- Testing Guide: `FINAL_TESTING_DEPLOYMENT_GUIDE.md`
- Security Tests: `test-api-security.sh`

**Deployment:**
- Deployment Guide: `FINAL_TESTING_DEPLOYMENT_GUIDE.md`

---

## ✅ COMPLETION CHECKLIST

When all tasks are complete:

- [ ] All critical tasks done
- [ ] All tests passed
- [ ] Service key rotated
- [ ] Results documented
- [ ] Production build successful
- [ ] Ready for staging/production

**Sign-off:**
- Name: _______________
- Date: _______________
- Status: ⬜ READY / ⬜ NEEDS WORK

---

**Created:** February 18, 2026  
**Last Updated:** February 18, 2026  
**Version:** 1.0
