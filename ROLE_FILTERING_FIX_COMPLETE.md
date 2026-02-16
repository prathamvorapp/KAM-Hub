# Role-Based Filtering - Fix Complete

## Issues Found and Fixed

### 1. ✅ Wrong Supabase Client Used
**Problem**: The `churnService.getChurnData()` was using the regular `supabase` client to query `user_profiles`, which doesn't work properly on the server side.

**Fix**: Changed to use `getSupabaseAdmin()` for all server-side queries.

**Files Modified**:
- `lib/services/churnService.ts` - Changed `supabase` to `getSupabaseAdmin()` for user profile queries

### 2. ✅ API Function Signature Mismatch
**Problem**: The `convexAPI.getChurnData()` function had the wrong signature - it expected `(email, page, limit, search)` but the frontend was calling it with an object `{ email, page, limit, search }`.

**Fix**: Updated function signature to accept an object parameter.

**Files Modified**:
- `lib/convex-api.ts` - Changed function signature to accept object params

### 3. ✅ Added Comprehensive Debug Logging
**Problem**: No visibility into what was happening with the filtering.

**Fix**: Added detailed console logs at every step:
- API route logs user email, role, team
- Service logs user profile query results
- Service logs which filter is being applied
- Service logs query results

**Files Modified**:
- `app/api/churn/route.ts` - Added detailed request logging
- `lib/services/churnService.ts` - Added filtering logic logging

## How It Works Now

### Agent Role
1. API receives request with user email from session cookie
2. Service queries `user_profiles` for that email using admin client
3. Service extracts `full_name` from profile
4. Service filters `churn_records` WHERE `kam` = user's `full_name`
5. Agent sees ONLY their own records

### Team Lead Role
1. API receives request with user email from session cookie
2. Service queries `user_profiles` for that email using admin client
3. Service finds all team members with same `team_name` and `is_active = true`
4. Service extracts all team member `full_name` values
5. Service filters `churn_records` WHERE `kam` IN (team member names)
6. Team Lead sees ALL team records

### Admin Role
1. API receives request with user email from session cookie
2. Service queries `user_profiles` for that email using admin client
3. Service detects admin role
4. Service applies NO filter
5. Admin sees ALL records

## Debug Logs to Check

When you refresh the churn dashboard, check your server console for these logs:

```
🔵 === CHURN API CALLED ===
🔵 Request URL: ...
🔵 Request headers: { x-user-email: '...', x-user-role: '...', ... }
🔵 Initial values - Email: ..., Role: ..., Team: ...
🔵 Final user info - Email: ..., Role: ..., Team: ...
🔍 Getting churn data for user: ..., role: ...
🔍 Querying user profile for email: ...
🔍 User Profile for ...: { email: '...', full_name: '...', role: '...', ... }
🔍 Normalized role: agent
👤 Agent filter - showing records for KAM: John Doe
🔒 Applying KAM filter: ["John Doe"]
📊 Query returned 15 records
📋 Sample records (first 3): [...]
```

## Testing

1. **Test as Agent**:
   - Login as an agent user
   - Go to Churn Data dashboard
   - Should see ONLY records where KAM = your full name
   - Check console logs to verify filter is applied

2. **Test as Team Lead**:
   - Login as a team lead user
   - Go to Churn Data dashboard
   - Should see records for ALL team members
   - Check console logs to see team member list

3. **Test as Admin**:
   - Login as admin user
   - Go to Churn Data dashboard
   - Should see ALL records (no filter)
   - Check console logs to confirm no filter applied

## If Still Not Working

If filtering still doesn't work after these fixes, check:

1. **User Profile Exists**: 
   ```sql
   SELECT * FROM user_profiles WHERE email = 'user@example.com';
   ```

2. **Full Name Matches KAM**:
   ```sql
   SELECT COUNT(*) FROM churn_records WHERE kam = 'User Full Name';
   ```

3. **Check Console Logs**: Look for the debug logs listed above

4. **Use Debug Endpoint**:
   ```
   GET /api/debug/user-kam-match?email=user@example.com
   ```

## Summary

The role-based filtering is now properly implemented and should work correctly. The key fixes were:
1. Using the correct Supabase client (`getSupabaseAdmin()`) for server-side queries
2. Fixing the API function signature mismatch
3. Adding comprehensive debug logging to troubleshoot issues

Refresh your browser and check the server console logs to verify the filtering is working.
