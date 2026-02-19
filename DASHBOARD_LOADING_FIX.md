# Dashboard Loading Issue - Diagnosis & Fix

## Problem

Dashboard is stuck on "Loading..." after successful login. Middleware shows authentication is working (`hasUser: true`), but the dashboard doesn't load data.

## Root Cause

The `useChurnData` hook is waiting for `user` and `userProfile` from `AuthContext`, but the profile might not be loading due to:

1. **RLS Policy Issue** - User can't read their own profile from `user_profiles` table
2. **Missing Profile** - User doesn't exist in `user_profiles` table
3. **Auth ID Mismatch** - `auth_id` in profile doesn't match Supabase user ID

## Diagnosis Steps

### Step 1: Check Browser Console

Open DevTools (F12) and look for these logs:

**Expected (Working):**
```
✅ Found Supabase session for: pratham.vora@petpooja.com
🔍 Loading user profile for auth_id: 3d9bc87a-32fe-450a-b0db-737c001256ad
✅ Profile loaded successfully: pratham.vora@petpooja.com
✅ User profile loaded: pratham.vora@petpooja.com Role: agent
🔍 [useChurnData] Conditions met, fetching data
```

**Problem Indicators:**
```
❌ Failed to load user profile: [error details]
❌ No profile found for auth_id: 3d9bc87a-32fe-450a-b0db-737c001256ad
⏳ [useChurnData] Waiting for conditions { hasUser: true, hasUserProfile: false }
```

### Step 2: Use Debug Page

Go to `http://localhost:3022/auth-debug` to see:
- Current auth state
- Profile loading status
- Detailed error messages

### Step 3: Check Database

Run this SQL in Supabase SQL Editor:

```sql
-- Check if user exists
SELECT * FROM user_profiles 
WHERE email = 'pratham.vora@petpooja.com';

-- Check if auth_id matches
SELECT * FROM user_profiles 
WHERE auth_id = '3d9bc87a-32fe-450a-b0db-737c001256ad';

-- Check all users
SELECT auth_id, email, role, is_active FROM user_profiles;
```

## Solutions

### Solution 1: Fix RLS Policies

Run the migration to fix RLS policies:

```bash
# In Supabase SQL Editor, run:
migrations/004_fix_user_profiles_rls.sql
```

Or manually:

```sql
-- Drop existing policies
DROP POLICY IF EXISTS "Users can read own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can read their own profile" ON user_profiles;

-- Create new policy
CREATE POLICY "Users can read own profile"
ON user_profiles
FOR SELECT
TO authenticated
USING (auth_id = auth.uid());

-- Enable RLS
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
```

### Solution 2: Create Missing Profile

If user doesn't exist in `user_profiles`:

```sql
-- Insert user profile
INSERT INTO user_profiles (
  auth_id,
  email,
  full_name,
  role,
  team_name,
  is_active
) VALUES (
  '3d9bc87a-32fe-450a-b0db-737c001256ad',  -- From Supabase auth
  'pratham.vora@petpooja.com',
  'Pratham Vora',
  'agent',  -- or 'team_lead' or 'admin'
  'Team A',  -- or NULL
  true
);
```

### Solution 3: Fix Auth ID Mismatch

If `auth_id` doesn't match:

```sql
-- Update auth_id to match Supabase user ID
UPDATE user_profiles
SET auth_id = '3d9bc87a-32fe-450a-b0db-737c001256ad'
WHERE email = 'pratham.vora@petpooja.com';
```

### Solution 4: Temporary Bypass (For Testing)

If you need to test immediately, temporarily disable the user/profile check:

```typescript
// In hooks/useChurnData.ts
// Comment out the check temporarily:
/*
if (!user || !userProfile) {
  console.log('❌ [useChurnData] User not authenticated');
  setError('User not authenticated')
  return
}
*/
```

**Note:** This is only for testing. Don't use in production!

## Verification

After applying fixes:

1. **Clear browser data**
   ```javascript
   localStorage.clear()
   sessionStorage.clear()
   location.reload()
   ```

2. **Login again**
   - Go to `/login`
   - Enter credentials
   - Should redirect to `/dashboard`

3. **Check console logs**
   ```
   ✅ Found Supabase session for: pratham.vora@petpooja.com
   ✅ Profile loaded successfully: pratham.vora@petpooja.com
   ✅ User profile loaded: pratham.vora@petpooja.com Role: agent
   ✅ [useChurnData] Conditions met, fetching data
   🔍 Fetching churn data: page=1, limit=100
   📊 Churn data fetched: X records
   ```

4. **Dashboard should load**
   - Statistics cards appear
   - Churn data table loads
   - No "Loading..." stuck screen

## Common Issues

### Issue 1: RLS Policy Blocking Access

**Symptom:**
```
❌ Failed to load user profile: new row violates row-level security policy
```

**Fix:** Run migration `004_fix_user_profiles_rls.sql`

### Issue 2: User Not in Database

**Symptom:**
```
❌ No profile found for auth_id: 3d9bc87a-32fe-450a-b0db-737c001256ad
```

**Fix:** Insert user profile (see Solution 2)

### Issue 3: Auth ID Mismatch

**Symptom:**
```
✅ Found Supabase session for: pratham.vora@petpooja.com
❌ No profile found for auth_id: 3d9bc87a-32fe-450a-b0db-737c001256ad
```

But user exists with different `auth_id`.

**Fix:** Update `auth_id` (see Solution 3)

### Issue 4: Inactive User

**Symptom:**
```
✅ Profile loaded successfully: pratham.vora@petpooja.com
```

But `is_active = false` in database.

**Fix:**
```sql
UPDATE user_profiles
SET is_active = true
WHERE email = 'pratham.vora@petpooja.com';
```

## Prevention

To prevent this issue for new users:

1. **Create profile on signup**
   - When user signs up in Supabase Auth
   - Automatically create profile in `user_profiles`
   - Use Supabase trigger or API

2. **Validate on login**
   - Check if profile exists
   - Create if missing
   - Show helpful error message

3. **Better error handling**
   - Show specific error messages
   - Guide user to contact admin
   - Log errors for debugging

## Files Modified

1. **contexts/AuthContext.tsx** - Added better logging
2. **hooks/useChurnData.ts** - Added detailed logging
3. **migrations/004_fix_user_profiles_rls.sql** - Fix RLS policies
4. **app/auth-debug/page.tsx** - Debug page for troubleshooting

## Next Steps

1. Run the migration to fix RLS policies
2. Check if user exists in database
3. Create profile if missing
4. Test login and dashboard loading
5. Verify all functionality works

## Success Criteria

- ✅ Login redirects to dashboard
- ✅ Dashboard loads within 2 seconds
- ✅ Statistics cards appear
- ✅ Churn data table loads
- ✅ No errors in console
- ✅ No "Loading..." stuck screen
- ✅ User can interact with dashboard

If all criteria are met, the issue is resolved! 🎉
