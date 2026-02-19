# Complete Functionality Testing Guide

## Pre-Test Setup

1. **Stop the dev server** (Ctrl+C)
2. **Clear browser data**:
   - Open DevTools (F12)
   - Application tab → Clear site data
   - Or run in console:
     ```javascript
     localStorage.clear()
     sessionStorage.clear()
     document.cookie.split(";").forEach(c => {
       document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
     });
     location.reload()
     ```
3. **Restart dev server**: `npm run dev`
4. **Open browser**: `http://localhost:3022`

## Test Credentials

### Agent
- Email: `rahul.taak@petpooja.com`
- Password: (your password)
- Expected Role: `agent`

### Team Lead (if available)
- Email: (team lead email)
- Password: (password)
- Expected Role: `team_lead`

### Admin (if available)
- Email: (admin email)
- Password: (password)
- Expected Role: `admin`

## Test 1: Login Flow

### Steps:
1. Go to `http://localhost:3022/login`
2. Enter credentials
3. Click "Sign In"

### Expected Results:
- ✅ No errors in console
- ✅ Redirects to `/dashboard`
- ✅ Browser console shows:
  ```
  ✅ Found Supabase session for: rahul.taak@petpooja.com
  ✅ User profile loaded: rahul.taak@petpooja.com Role: agent
  ```
- ✅ Server logs show:
  ```
  🔍 [MIDDLEWARE] Session check: { hasUser: true, userId: '...', email: '...' }
  ```
- ✅ Cookies present in DevTools → Application → Cookies:
  - `sb-qvgnrdarwsnweizifech-auth-token`

### If Failed:
- Check browser console for errors
- Check server logs for middleware errors
- Verify environment variables are set
- Try clearing browser data again

## Test 2: Dashboard Loading

### Steps:
1. After login, dashboard should load automatically
2. Wait for data to appear

### Expected Results:
- ✅ Dashboard shows statistics cards
- ✅ No "Loading..." stuck screen
- ✅ No 401 errors in console
- ✅ Browser console shows:
  ```
  🔍 [useChurnData] fetchChurnData called { user: true, userProfile: true }
  🔍 Fetching churn data: page=1, limit=100
  📊 Churn data fetched: X records
  ```
- ✅ Server logs show:
  ```
  🔵 === CHURN API CALLED ===
  ✅ [API Auth] User authenticated
  📊 Churn data result: X records
  ```

### If Failed:
- Check browser console for "User not authenticated" error
- Check if AuthContext loaded user profile
- Check Network tab for failed API calls
- Verify user exists in `user_profiles` table

## Test 3: Churn Management

### Steps:
1. Go to `/dashboard/churn`
2. View churn records
3. Click on a record to update churn reason
4. Save changes

### Expected Results:
- ✅ Churn records load
- ✅ Can filter and search
- ✅ Can update churn reason
- ✅ Changes save successfully
- ✅ No 401 errors

### API Calls to Verify:
- GET `/api/churn` - Returns 200
- PATCH `/api/churn/update-reason` - Returns 200

## Test 4: Visit Management

### Steps:
1. Go to `/dashboard/visits`
2. View visits
3. Create a new visit
4. Submit MOM for a visit

### Expected Results:
- ✅ Visits load
- ✅ Can create new visit
- ✅ Can submit MOM
- ✅ No 401 errors

### API Calls to Verify:
- GET `/api/data/visits` - Returns 200
- POST `/api/data/visits/create` - Returns 200
- POST `/api/data/visits/[visitId]/mom` - Returns 200

## Test 5: MOM Tracker

### Steps:
1. Go to `/dashboard/mom-tracker`
2. View MOMs
3. Update open point status

### Expected Results:
- ✅ MOMs load
- ✅ Can view details
- ✅ Can update open points
- ✅ No 401 errors

### API Calls to Verify:
- GET `/api/data/mom` - Returns 200
- PATCH `/api/data/mom/[momId]/open-points/[pointIndex]` - Returns 200

## Test 6: Demo Management

### Steps:
1. Go to `/dashboard/demos`
2. View demos
3. Schedule a demo
4. Complete a demo

### Expected Results:
- ✅ Demos load
- ✅ Can schedule demo
- ✅ Can complete demo
- ✅ No 401 errors

### API Calls to Verify:
- GET `/api/data/demos` - Returns 200
- POST `/api/data/demos/[demoId]/schedule` - Returns 200
- POST `/api/data/demos/[demoId]/complete` - Returns 200

## Test 7: Health Checks

### Steps:
1. Go to `/dashboard/health-checks`
2. View health check data

### Expected Results:
- ✅ Health checks load
- ✅ Statistics display
- ✅ No 401 errors

### API Calls to Verify:
- GET `/api/data/health-checks` - Returns 200
- GET `/api/data/health-checks/statistics` - Returns 200

## Test 8: Approvals (Team Lead/Admin)

### Steps:
1. Go to `/dashboard/approvals`
2. View pending approvals
3. Approve or reject a visit

### Expected Results:
- ✅ Approvals load
- ✅ Can approve/reject
- ✅ No 401 errors

### API Calls to Verify:
- GET `/api/data/visits/statistics` - Returns 200
- POST `/api/data/visits/[visitId]/approve` - Returns 200

## Test 9: Admin Panel (Admin Only)

### Steps:
1. Go to `/admin`
2. View admin dashboard
3. Go to `/admin/fix-churn`
4. Fix churn statuses

### Expected Results:
- ✅ Admin pages load (if admin role)
- ✅ Or redirected/blocked (if not admin)
- ✅ Can fix churn statuses
- ✅ No 401 errors

### API Calls to Verify:
- GET `/api/admin/fix-churn-statuses` - Returns 200
- POST `/api/admin/fix-single-record` - Returns 200

## Test 10: Session Persistence

### Steps:
1. After logging in, refresh the page (F5)
2. Navigate to different pages
3. Close and reopen browser tab
4. Navigate to dashboard

### Expected Results:
- ✅ Session persists across refreshes
- ✅ No need to login again
- ✅ Dashboard loads immediately
- ✅ Cookies still present

### If Failed:
- Check cookie expiration
- Check if cookies are being cleared
- Verify Supabase session refresh is working

## Test 11: Logout

### Steps:
1. Click logout button in navbar
2. Verify redirect to login page

### Expected Results:
- ✅ Redirects to `/login`
- ✅ Cookies cleared
- ✅ Cannot access `/dashboard` without login
- ✅ Browser console shows:
  ```
  🔗 Signing out from Supabase Auth
  ✅ Logout successful
  ```

### If Failed:
- Check if logout function is called
- Verify cookies are cleared
- Check Supabase signOut is working

## Test 12: Role-Based Access

### Agent Role:
- ✅ Can see own data only
- ✅ Cannot see team data
- ✅ Cannot access admin panel
- ✅ Cannot approve visits

### Team Lead Role:
- ✅ Can see team data
- ✅ Can approve team visits
- ✅ Cannot see other teams' data
- ✅ Cannot access admin panel

### Admin Role:
- ✅ Can see all data
- ✅ Can approve any visit
- ✅ Can access admin panel
- ✅ Can fix churn statuses

## Test 13: Error Handling

### Steps:
1. Try to access protected page without login
2. Try to access admin page as agent
3. Try to update data you don't have access to

### Expected Results:
- ✅ Redirected to login if not authenticated
- ✅ Access denied if insufficient permissions
- ✅ Proper error messages displayed
- ✅ No crashes or blank screens

## Test 14: Network Resilience

### Steps:
1. Open DevTools → Network tab
2. Throttle network to "Slow 3G"
3. Navigate between pages
4. Perform actions

### Expected Results:
- ✅ Loading states show properly
- ✅ Requests eventually complete
- ✅ No timeout errors
- ✅ Retry logic works

## Test 15: Multiple Tabs

### Steps:
1. Open dashboard in one tab
2. Open another tab with same site
3. Logout in one tab
4. Check other tab

### Expected Results:
- ✅ Both tabs share session
- ✅ Logout in one affects both
- ✅ No session conflicts

## Verification Checklist

### Browser Console (No Errors)
- [ ] No "User not authenticated" errors
- [ ] No 401 errors
- [ ] No "No access token available" errors
- [ ] No CORS errors
- [ ] No cookie errors

### Server Logs (Correct Flow)
- [ ] Middleware shows `hasUser: true`
- [ ] API routes receive user headers
- [ ] No authentication errors
- [ ] Proper role-based filtering

### Network Tab (All 200s)
- [ ] All GET requests return 200
- [ ] All POST requests return 200
- [ ] All PATCH requests return 200
- [ ] Cookies sent with each request

### Cookies (Present and Valid)
- [ ] `sb-qvgnrdarwsnweizifech-auth-token` present
- [ ] Cookie has value (JWT token)
- [ ] Cookie is HTTP-only
- [ ] Cookie persists across refreshes

### User Experience (Smooth)
- [ ] Login is fast
- [ ] Dashboard loads quickly
- [ ] No stuck loading screens
- [ ] No blank pages
- [ ] Proper error messages
- [ ] Logout works correctly

## Success Criteria

All tests above should pass with ✅ marks. If any test fails:

1. Note which test failed
2. Check browser console for errors
3. Check server logs for errors
4. Check Network tab for failed requests
5. Refer to `COMPREHENSIVE_AUTH_AUDIT.md` for troubleshooting
6. Refer to `CURRENT_STATUS.md` for debugging steps

## Quick Debug Commands

### Browser Console
```javascript
// Check if user is logged in
console.log('User:', localStorage.getItem('user_data'))

// Check cookies
console.log('Cookies:', document.cookie)

// Check Supabase session
// (Run in component with access to supabase client)
```

### Server Logs
Look for these patterns:
```
✅ = Success
❌ = Error
🔍 = Debug info
🔵 = API call
🟢 = Middleware
```

## Final Verification

After all tests pass:
1. Test with different user roles
2. Test on different browsers
3. Test with different network conditions
4. Test with browser extensions disabled
5. Test in incognito mode

If all tests pass, authentication is working correctly across all pages and functionality! 🎉
