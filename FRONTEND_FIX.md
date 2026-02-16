# Frontend Error Fix

## Problem Identified

The frontend was showing a 500 error because the `/api/data/visits/statistics` endpoint was failing with:
```
Error: User profile not found
```

## Root Cause

The `visitService.getVisitStatistics()` function was using the regular `supabase` client (which has Row Level Security enabled) instead of `getSupabaseAdmin()` to fetch user profiles. This caused the query to fail because RLS policies were blocking access.

## Fix Applied

Changed three functions in `lib/services/visitService.ts` to use `getSupabaseAdmin()` instead of `supabase`:

### 1. getVisitStatistics() - Line 15
**Before:**
```typescript
const { data: userProfile } = await supabase
  .from('user_profiles')
  .select('*')
  .eq('email', email)
  .single();
```

**After:**
```typescript
const { data: userProfile, error: profileError } = await getSupabaseAdmin()
  .from('user_profiles')
  .select('*')
  .eq('email', email)
  .single();
```

### 2. getVisitStatistics() - Team Lead section - Line 48
**Before:**
```typescript
const { data: teamAgents } = await supabase
  .from('user_profiles')
  .select('email')
  .eq('team_name', userProfile.team_name)
  .in('role', ['agent', 'Agent']);
```

**After:**
```typescript
const { data: teamAgents } = await getSupabaseAdmin()
  .from('user_profiles')
  .select('email')
  .eq('team_name', userProfile.team_name)
  .in('role', ['agent', 'Agent']);
```

### 3. getVisits() - Line 168
**Before:**
```typescript
const { data: userProfile } = await supabase
  .from('user_profiles')
  .select('*')
  .eq('email', email)
  .single();
```

**After:**
```typescript
const { data: userProfile } = await getSupabaseAdmin()
  .from('user_profiles')
  .select('*')
  .eq('email', email)
  .single();
```

## How to Test

1. **Refresh the browser page** (press F5 or Ctrl+R)
2. The page should now load without errors
3. You should see:
   - Your brands list (40 brands)
   - Visit statistics
   - Ability to schedule visits

## Expected Behavior After Fix

- ✅ No more 500 errors
- ✅ Visit statistics load correctly
- ✅ Brands display with proper names
- ✅ Can schedule visits for brands
- ✅ Can view existing visits

## Next Steps

Please **refresh your browser** to see the changes take effect. The Next.js development server will automatically recompile the changed files.

If you still see errors after refreshing, please share the new error message.
