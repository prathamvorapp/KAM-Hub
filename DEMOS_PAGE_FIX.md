# Demos Page Brand Loading Fix

## Problem
The demos page was not loading brands for admin users, showing "No brands assigned to you" even though demos existed in the system.

## Root Cause
The demos page was calling `api.getBrandsByAgentEmail(userProfile?.email)` for all users, including admins. This API endpoint filters brands by `kam_email_id` in the `master_data` table.

For admin users:
- Admin email: `pratham.vora@petpooja.com`
- This email is NOT a KAM (Key Account Manager), so no brands have `kam_email_id = 'pratham.vora@petpooja.com'`
- Result: 0 brands returned

However, demos existed for 3 brands assigned to other agents (like "Rahul Taak"), which is why the statistics were loading correctly but the brand list was empty.

## Solution
Modified the demos page to use different API endpoints based on user role:

### For Admins
- Use `api.getMasterData()` which returns ALL brands (no filtering)
- This allows admins to see all brands in the system

### For Agents and Team Leads
- Continue using `api.getBrandsByAgentEmail()` which filters brands by their assigned email
- Agents see only their brands
- Team Leads see brands for their team members

## Changes Made

### 1. `app/dashboard/demos/page.tsx`
```typescript
// Before: All users used the same API
const brandsResponse = await api.getBrandsByAgentEmail(userProfile?.email || "");

// After: Different APIs based on role
if (userProfile?.role?.toLowerCase() === 'admin') {
  // Admin: Get all brands
  const brandsResponse = await api.getMasterData(1, 10000);
  brandsData = brandsResponse.data?.data || [];
} else {
  // Agent/Team Lead: Get assigned brands
  const brandsResponse = await api.getBrandsByAgentEmail(userProfile?.email || "");
  brandsData = brandsResponse.data?.data || [];
}
```

### 2. Cleaned up debug logging
- Removed temporary debug logs from frontend and API client
- Kept essential error logging

### 3. Re-enabled caching
- Cache was temporarily disabled for debugging
- Now re-enabled for performance

## Testing
After the fix, admins should see:
- All brands in the system
- Demos for each brand (if initialized)
- Ability to manage demos across all brands

Agents and Team Leads should continue to see only their assigned brands.

## Related Files
- `app/dashboard/demos/page.tsx` - Main fix
- `lib/api-client.ts` - API client methods
- `lib/services/masterDataService.ts` - Service layer with role-based filtering
- `app/api/data/master-data/route.ts` - API endpoint for all brands
- `app/api/data/master-data/brands/[email]/route.ts` - API endpoint for agent-specific brands
