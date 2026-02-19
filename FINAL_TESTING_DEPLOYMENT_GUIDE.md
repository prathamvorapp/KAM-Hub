# 🚀 FINAL TESTING & DEPLOYMENT GUIDE

## Pre-Deployment Checklist

---

## ⚠️ CRITICAL: BEFORE YOU DO ANYTHING

### 1. Rotate Service Role Key (MANDATORY)

**Why:** The service role key was exposed in `.env.local.example` and needs to be rotated immediately.

**Steps:**
1. Go to https://supabase.com/dashboard
2. Select your project: `qvgnrdarwsnweizifech`
3. Navigate to: Settings → API
4. Find "Service Role Key" section
5. Click "Reset" button
6. Copy the new key
7. Update your `.env.local` file:
   ```env
   SUPABASE_SERVICE_ROLE_KEY=<new-key-here>
   ```
8. **DO NOT** commit this file
9. Restart your development server

**Verification:**
```bash
# Check that .env.local is gitignored
git status
# Should NOT show .env.local

# Verify the key works
npm run dev
# Check console for any Supabase errors
```

---

## 🧪 TESTING PHASE 1: Local Development

### Test 1: Authentication Flow

**Agent Account:**
- Email: `jinal.chavda@petpooja.com`
- Password: `Temp@1234`

```bash
# Start dev server
npm run dev
```

**Test Steps:**
1. Open http://localhost:3022
2. Should redirect to /login
3. Enter agent credentials
4. Should redirect to /dashboard
5. ✅ Verify you see dashboard

**Expected Results:**
- ✅ Login successful
- ✅ Dashboard loads
- ✅ No console errors
- ✅ Session persists on refresh

---

### Test 2: Logout Flow

**Test Steps:**
1. Click logout button
2. Should redirect to /login
3. Try to access http://localhost:3022/dashboard
4. Should redirect back to /login

**Expected Results:**
- ✅ Logout redirects to login
- ✅ Cannot access dashboard after logout
- ✅ Session completely cleared
- ✅ Cookies cleared (check DevTools → Application → Cookies)

**Verification:**
```javascript
// Open browser console after logout
localStorage.length // Should be 0
sessionStorage.length // Should be 0
document.cookie // Should not contain sb-access-token
```

---

### Test 3: Role-Based Access - Agent

**Login as Agent:**
- Email: `jinal.chavda@petpooja.com`
- Password: `Temp@1234`

**Test Steps:**
1. Navigate to /dashboard/churn
2. ✅ Should see only YOUR churn data
3. Navigate to /dashboard/visits
4. ✅ Should see only YOUR visits
5. Try to access /dashboard/approvals
6. ✅ Should be blocked or show "no permission"

**API Test (Browser Console):**
```javascript
// Try to access admin endpoint
fetch('/api/admin/fix-churn-statuses', {
  method: 'POST',
  credentials: 'include'
}).then(r => r.json()).then(console.log)
// Expected: { success: false, error: "Forbidden..." }
```

---

### Test 4: Role-Based Access - Team Lead

**Login as Team Lead:**
- Email: `shaikh.farhan@petpooja.com`
- Password: `Temp@1234`

**Test Steps:**
1. Navigate to /dashboard/churn
2. ✅ Should see TEAM data
3. Navigate to /dashboard/approvals
4. ✅ Should see pending MOMs for approval
5. Try to approve a MOM
6. ✅ Should work

**API Test (Browser Console):**
```javascript
// Try to access admin endpoint
fetch('/api/admin/fix-churn-statuses', {
  method: 'POST',
  credentials: 'include'
}).then(r => r.json()).then(console.log)
// Expected: { success: false, error: "Forbidden..." }
```

---

### Test 5: Role-Based Access - Admin

**Login as Admin:**
- Email: `pratham.vora@petpooja.com`
- Password: `Temp@1234`

**Test Steps:**
1. Navigate to /dashboard/churn
2. ✅ Should see ALL churn data
3. Navigate to /dashboard/admin
4. ✅ Should have access
5. Try admin functions
6. ✅ Should work

**API Test (Browser Console):**
```javascript
// Try to access admin endpoint
fetch('/api/admin/fix-churn-statuses', {
  method: 'POST',
  credentials: 'include'
}).then(r => r.json()).then(console.log)
// Expected: { success: true, ... }
```

---

### Test 6: Debug Routes Protection

**Test Steps:**
```bash
# Set NODE_ENV to production
$env:NODE_ENV="production"
npm run dev
```

**API Test:**
```javascript
// Try to access debug endpoint
fetch('/api/debug/env').then(r => r.json()).then(console.log)
// Expected: { error: "Debug endpoints disabled in production" }
```

**Reset:**
```bash
# Reset to development
$env:NODE_ENV="development"
```

---

### Test 7: API Authentication

**Test without login:**
```bash
# Open incognito/private window
# Open browser console
fetch('http://localhost:3022/api/churn')
  .then(r => r.json())
  .then(console.log)
// Expected: { success: false, error: "Unauthorized..." }
```

---

## 🧪 TESTING PHASE 2: Automated Tests

### Run Security Test Script

```bash
# Make script executable (if on Linux/Mac)
chmod +x test-api-security.sh

# Run tests
./test-api-security.sh
```

**Expected Output:**
```
✅ PASS - API returns 401 for unauthenticated request
✅ PASS - Agent login successful
✅ PASS - Agent can access own data
✅ PASS - Agent blocked from admin endpoint (403)
✅ PASS - Team Lead login successful
✅ PASS - Team Lead can access visits
✅ PASS - Team Lead blocked from admin endpoint
✅ PASS - Admin login successful
✅ PASS - Admin can access admin endpoint
✅ PASS - Session persists after 2 seconds
```

---

## 🧪 TESTING PHASE 3: Manual Page Testing

### Test Each Page

**For Each Role (Agent, Team Lead, Admin):**

1. **Churn Page** (`/dashboard/churn`)
   - [ ] Page loads without errors
   - [ ] Data displays correctly
   - [ ] Filters work
   - [ ] Search works
   - [ ] Can update churn reason
   - [ ] Data reflects role (own/team/all)

2. **Visits Page** (`/dashboard/visits`)
   - [ ] Page loads without errors
   - [ ] Can schedule visit
   - [ ] Can view visits
   - [ ] Can submit MOM
   - [ ] Data reflects role

3. **Health Checks Page** (`/dashboard/health-checks`)
   - [ ] Page loads without errors
   - [ ] Can perform health check
   - [ ] Can view history
   - [ ] Statistics display correctly

4. **Demos Page** (`/dashboard/demos`)
   - [ ] Page loads without errors
   - [ ] Can view demos
   - [ ] Can update demo status
   - [ ] Workflow functions correctly

5. **MOM Tracker** (`/dashboard/mom-tracker`)
   - [ ] Page loads without errors
   - [ ] Can view MOMs
   - [ ] Can update open points
   - [ ] Export works

6. **Approvals Page** (`/dashboard/approvals`) - Team Lead Only
   - [ ] Page loads without errors
   - [ ] Shows pending MOMs
   - [ ] Can approve MOM
   - [ ] Can reject MOM with remarks
   - [ ] Resubmissions tracked correctly

---

## 📊 TESTING RESULTS TEMPLATE

Create a file `TESTING_RESULTS.md`:

```markdown
# Testing Results

## Date: [DATE]
## Tester: [NAME]

### Authentication Tests
- [ ] Login with correct credentials: PASS/FAIL
- [ ] Login with incorrect credentials: PASS/FAIL
- [ ] Session persistence: PASS/FAIL
- [ ] Logout clears session: PASS/FAIL

### Role-Based Access Tests
- [ ] Agent sees only own data: PASS/FAIL
- [ ] Team Lead sees team data: PASS/FAIL
- [ ] Admin sees all data: PASS/FAIL
- [ ] Agent blocked from admin APIs: PASS/FAIL
- [ ] Team Lead blocked from admin APIs: PASS/FAIL

### Page Functionality Tests
- [ ] Churn page works: PASS/FAIL
- [ ] Visits page works: PASS/FAIL
- [ ] Health checks page works: PASS/FAIL
- [ ] Demos page works: PASS/FAIL
- [ ] MOM tracker works: PASS/FAIL
- [ ] Approvals page works (Team Lead): PASS/FAIL

### Security Tests
- [ ] Debug routes protected in production: PASS/FAIL
- [ ] Unauthenticated API calls blocked: PASS/FAIL
- [ ] Service key not exposed: PASS/FAIL

## Issues Found
[List any issues discovered during testing]

## Overall Status
- [ ] READY FOR STAGING
- [ ] NEEDS FIXES
```

---

## 🚀 DEPLOYMENT PHASE 1: Staging

### Prerequisites
- [ ] All tests passed
- [ ] Service role key rotated
- [ ] Testing results documented
- [ ] No critical issues found

### Staging Deployment Steps

1. **Prepare Environment Variables**
   ```bash
   # Create .env.production file
   cp .env.local.example .env.production
   
   # Update with production values
   # - Use production Supabase URL
   # - Use production Supabase keys
   # - Set NODE_ENV=production
   ```

2. **Build Application**
   ```bash
   npm run build
   ```

3. **Check Build Output**
   ```bash
   # Should complete without errors
   # Check for any warnings
   ```

4. **Test Production Build Locally**
   ```bash
   npm run start
   ```

5. **Verify Production Mode**
   - Debug routes should return 404
   - All features should work
   - No console errors

6. **Deploy to Staging Server**
   ```bash
   # Example for Vercel
   vercel --prod
   
   # Or your deployment method
   ```

7. **Smoke Test Staging**
   - Login as each role
   - Test critical paths
   - Verify data access
   - Check logout

---

## 🚀 DEPLOYMENT PHASE 2: Production

### Prerequisites
- [ ] Staging tested successfully
- [ ] All stakeholders approved
- [ ] Backup plan ready
- [ ] Rollback plan documented

### Production Deployment Steps

1. **Final Security Check**
   ```bash
   # Verify no secrets in code
   git grep -i "service_role"
   git grep -i "password"
   git grep -i "secret"
   
   # Should only find references in .env files (gitignored)
   ```

2. **Database Backup**
   - Backup Supabase database
   - Document current state
   - Test restore procedure

3. **Deploy to Production**
   ```bash
   # Your production deployment command
   npm run vercel:deploy
   # or
   git push production main
   ```

4. **Post-Deployment Verification**
   - [ ] Application loads
   - [ ] Login works
   - [ ] All pages accessible
   - [ ] No console errors
   - [ ] API responses correct

5. **Monitor for Issues**
   - Check error logs
   - Monitor performance
   - Watch for user reports
   - Be ready to rollback

---

## 🔄 ROLLBACK PLAN

If issues are discovered in production:

1. **Immediate Rollback**
   ```bash
   # Revert to previous deployment
   vercel rollback
   # or
   git revert HEAD
   git push production main
   ```

2. **Notify Users**
   - Post status update
   - Explain issue
   - Provide timeline

3. **Fix Issues**
   - Identify root cause
   - Apply fixes
   - Test thoroughly
   - Redeploy

---

## 📈 POST-DEPLOYMENT MONITORING

### Week 1: Intensive Monitoring

**Daily Checks:**
- [ ] Error logs review
- [ ] Performance metrics
- [ ] User feedback
- [ ] Security alerts

**Metrics to Track:**
- Login success rate
- API response times
- Error rates
- User session duration

### Week 2-4: Regular Monitoring

**Weekly Checks:**
- [ ] Error trends
- [ ] Performance trends
- [ ] User satisfaction
- [ ] Security incidents

---

## 🆘 TROUBLESHOOTING GUIDE

### Issue: Users Can't Login

**Diagnosis:**
1. Check Supabase status
2. Verify environment variables
3. Check browser console errors
4. Test with different browsers

**Solution:**
- Verify Supabase URL and keys
- Check network connectivity
- Clear browser cache
- Check for CORS issues

---

### Issue: Session Not Persisting

**Diagnosis:**
1. Check cookie settings
2. Verify middleware configuration
3. Check browser cookie settings

**Solution:**
- Ensure cookies are HTTP-only
- Verify domain settings
- Check SameSite attribute

---

### Issue: Role-Based Access Not Working

**Diagnosis:**
1. Check user profile in database
2. Verify role field value
3. Check API authentication

**Solution:**
- Verify user_profiles.role matches expected values
- Check case sensitivity
- Verify API uses requireAuth

---

### Issue: Debug Routes Accessible in Production

**Diagnosis:**
1. Check NODE_ENV value
2. Verify build configuration

**Solution:**
```bash
# Verify environment
echo $NODE_ENV
# Should be "production"

# Check build
npm run build
# Should set NODE_ENV=production
```

---

## ✅ FINAL CHECKLIST

### Before Going Live
- [ ] Service role key rotated
- [ ] All tests passed
- [ ] Staging tested
- [ ] Backup created
- [ ] Rollback plan ready
- [ ] Monitoring configured
- [ ] Team notified
- [ ] Documentation updated

### After Going Live
- [ ] Smoke tests passed
- [ ] No critical errors
- [ ] Performance acceptable
- [ ] Users can login
- [ ] All features working
- [ ] Monitoring active

---

## 📞 SUPPORT CONTACTS

**Technical Issues:**
- Development Team: [contact]
- DevOps Team: [contact]

**Security Issues:**
- Security Team: [contact]
- Supabase Support: support@supabase.io

**Business Issues:**
- Product Owner: [contact]
- Stakeholders: [contact]

---

## 📚 ADDITIONAL RESOURCES

- [QA Audit Report](./QA_AUDIT_REPORT.md)
- [Implementation Guide](./IMPLEMENTATION_GUIDE.md)
- [Fixes Applied Summary](./FIXES_APPLIED_SUMMARY.md)
- [Security Warning](./SECURITY_WARNING_DEBUG_ROUTES.md)

---

**Last Updated:** February 18, 2026  
**Version:** 1.0  
**Status:** Ready for Testing
