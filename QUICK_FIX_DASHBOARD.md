# Quick Fix - Dashboard Not Loading

## Problem
Dashboard stuck on "Loading..." after login.

## Quick Diagnosis

### 1. Check Browser Console (F12)
Look for this error:
```
❌ Failed to load user profile: [error]
⏳ [useChurnData] Waiting for conditions { hasUser: true, hasUserProfile: false }
```

### 2. Go to Debug Page
Visit: `http://localhost:3022/auth-debug`

This will show you:
- If session exists
- If profile can be loaded
- Exact error message

## Quick Fix

### Option 1: Run SQL Fix (Recommended)

1. Open Supabase Dashboard
2. Go to SQL Editor
3. Copy and paste from `fix-user-profile.sql`
4. Replace the auth_id with yours: `3d9bc87a-32fe-450a-b0db-737c001256ad`
5. Replace the email with yours: `pratham.vora@petpooja.com`
6. Click "Run"

### Option 2: Manual Fix

Run this in Supabase SQL Editor:

```sql
-- Create/update user profile
INSERT INTO user_profiles (
  auth_id,
  email,
  full_name,
  role,
  is_active
) VALUES (
  '3d9bc87a-32fe-450a-b0db-737c001256ad',  -- Your auth_id from logs
  'pratham.vora@petpooja.com',              -- Your email
  'Pratham Vora',                           -- Your name
  'agent',                                  -- Your role
  true
)
ON CONFLICT (email) DO UPDATE
SET 
  auth_id = EXCLUDED.auth_id,
  is_active = true;

-- Fix RLS policy
DROP POLICY IF EXISTS "Users can read own profile" ON user_profiles;

CREATE POLICY "Users can read own profile"
ON user_profiles
FOR SELECT
TO authenticated
USING (auth_id = auth.uid());
```

## After Fix

1. **Clear browser data**
   - Press F12
   - Console tab
   - Run: `localStorage.clear(); location.reload()`

2. **Login again**
   - Go to `/login`
   - Enter credentials
   - Dashboard should load immediately

## Expected Result

Browser console should show:
```
✅ Found Supabase session for: pratham.vora@petpooja.com
✅ Profile loaded successfully: pratham.vora@petpooja.com
✅ User profile loaded: pratham.vora@petpooja.com Role: agent
✅ [useChurnData] Conditions met, fetching data
📊 Churn data fetched: X records
```

Dashboard should load with data in 1-2 seconds.

## Still Not Working?

1. Check `DASHBOARD_LOADING_FIX.md` for detailed troubleshooting
2. Check server logs for errors
3. Verify user exists: `SELECT * FROM user_profiles WHERE email = 'pratham.vora@petpooja.com'`
4. Check RLS policies: `SELECT * FROM pg_policies WHERE tablename = 'user_profiles'`

## Get Your Auth ID

From server logs, look for:
```
🔍 [MIDDLEWARE] Session check: {
  userId: '3d9bc87a-32fe-450a-b0db-737c001256ad',  ← This is your auth_id
  email: 'pratham.vora@petpooja.com'
}
```

Or from browser console after login:
```javascript
// Run this in console
const supabase = createBrowserClient()
const { data: { session } } = await supabase.auth.getSession()
console.log('Auth ID:', session?.user?.id)
```
