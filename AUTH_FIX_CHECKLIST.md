# Authentication Fix - Testing Checklist

## Pre-Testing Setup

- [ ] Stop the development server (Ctrl+C)
- [ ] Clear browser data for `localhost:3022`:
  - [ ] Open DevTools (F12)
  - [ ] Go to Application tab
  - [ ] Click "Clear site data"
  - [ ] Confirm and close DevTools
- [ ] Restart development server: `npm run dev`

## Testing Steps

### 1. Login Test
- [ ] Navigate to `http://localhost:3022/login`
- [ ] Enter credentials:
  - Email: `rahul.taak@petpooja.com`
  - Password: (your password)
- [ ] Click "Sign In"
- [ ] Should redirect to `/dashboard`

### 2. Check Browser Console
Look for these logs:
- [ ] `✅ Found Supabase session for: rahul.taak@petpooja.com`
- [ ] `✅ User profile loaded: rahul.taak@petpooja.com Role: agent`
- [ ] `✅ Login successful`

### 3. Check Server Logs
Look for these logs in terminal:
- [ ] `🔍 [MIDDLEWARE] Session check: { hasUser: true, ... }`
- [ ] `✅ [MIDDLEWARE] Headers set, forwarding request`
- [ ] `✅ [AUTH] User authenticated: rahul.taak@petpooja.com`

### 4. Check Cookies
- [ ] Open DevTools > Application > Cookies
- [ ] Look for `sb-qvgnrdarwsnweizifech-auth-token`
- [ ] Cookie should have a value (JWT token)
- [ ] Cookie should be HTTP-only

### 5. Check API Responses
- [ ] Dashboard loads without errors
- [ ] No 401 errors in console
- [ ] Follow-up notifications load (if any)
- [ ] Check Network tab: API calls return 200

### 6. Test Session Persistence
- [ ] Refresh the page (F5)
- [ ] Should stay logged in
- [ ] Dashboard should load immediately
- [ ] No redirect to login page

### 7. Test Logout
- [ ] Click logout button
- [ ] Should redirect to `/login`
- [ ] Cookies should be cleared
- [ ] Trying to access `/dashboard` should redirect to login

## Expected Results

### ✅ Success Indicators
- Middleware logs show `hasUser: true`
- API routes return 200 status
- Dashboard loads with data
- Session persists across refreshes
- Cookies are set and readable

### ❌ Failure Indicators
- Middleware logs show `hasUser: false`
- API routes return 401 status
- Dashboard shows "Authentication required"
- Session lost on refresh
- No cookies in browser

## Troubleshooting

If tests fail, check:

1. **Environment Variables**
   ```bash
   # Verify these are set in .env.local
   NEXT_PUBLIC_SUPABASE_URL=https://qvgnrdarwsnweizifech.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   ```

2. **Browser Issues**
   - Try incognito/private mode
   - Try different browser
   - Check if cookies are blocked

3. **Server Issues**
   - Restart dev server
   - Check for TypeScript errors
   - Check for port conflicts

4. **Supabase Issues**
   - Verify Supabase project is active
   - Check user exists in `auth.users` table
   - Check user profile exists in `user_profiles` table

## Success Criteria

All checkboxes above should be checked ✅

If any checkbox fails, refer to `SUPABASE_AUTH_FIX.md` for detailed troubleshooting.
