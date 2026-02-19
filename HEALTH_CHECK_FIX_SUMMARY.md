# Health Check Assessment Issue - Fix Summary

## Problem
The Assessment tab shows 49 brands remaining but displays "All brands assessed for this month!" with 0 brands in the list.

## Root Cause Analysis

### Issue 1: Brand-KAM Matching Logic (FIXED)
The `getBrandsForAssessment` function was creating a simple Set of assessed brand names without considering which KAM assessed them. This caused the following problem:

**Before Fix:**
```typescript
// Created a set with just brand names
const assessedBrandNamesNormalized = new Set(
  assessedChecks?.map(c => c.brand_name?.trim().toLowerCase()) || []
);

// Filtered brands without considering KAM
const brandsForAssessment = allBrands?.filter(brand => {
  const normalizedBrandName = brand.brand_name?.trim().toLowerCase();
  return !assessedBrandNamesNormalized.has(normalizedBrandName);
}) || [];
```

**Problem:** If Agent A assessed "Brand X", it would be excluded for ALL agents, including Agent B who also has "Brand X" assigned.

**After Fix:**
```typescript
// Create a map with kam_email + brand_name as key
const assessedBrandsMap = new Map<string, boolean>();
assessedChecks?.forEach(check => {
  const normalizedBrandName = check.brand_name?.trim().toLowerCase();
  const key = `${check.kam_email}:${normalizedBrandName}`;
  assessedBrandsMap.set(key, true);
});

// Filter brands considering both KAM and brand name
const brandsForAssessment = allBrands.filter(brand => {
  const normalizedBrandName = brand.brand_name?.trim().toLowerCase();
  const kamEmail = brand.kam_email_id;
  const key = `${kamEmail}:${normalizedBrandName}`;
  return !assessedBrandsMap.has(key);
});
```

### Issue 2: Enhanced Logging
Added comprehensive logging to help diagnose issues:
- User role and email
- Total brands fetched
- Assessed brands count
- Sample data from both tables
- Detailed filtering logic

## Files Modified

1. `lib/services/healthCheckService.ts`
   - Fixed `getBrandsForAssessment()` method
   - Added KAM-specific brand filtering
   - Enhanced logging for debugging

## Testing Steps

1. **Clear Cache:**
   - Click the "Clear Cache" button in the Health Check-ups page
   - This will force a fresh data fetch

2. **Verify Data:**
   - Check browser console for detailed logs
   - Look for messages starting with `📊 [getBrandsForAssessment]`
   - Verify the counts match expectations

3. **Test Assessment:**
   - Select a brand from the pending list
   - Complete the assessment
   - Verify it's removed from pending list
   - Check that the count updates correctly

## Additional Diagnostic Queries

Run the SQL queries in `diagnose-health-check-issue.sql` to check:
- User profile and role
- Brand assignments in master_data
- Health check records
- Brand name mismatches
- Pending brands calculation

## Potential Additional Issues to Check

### 1. RLS Policies
If brands still don't show, check Supabase RLS policies:

```sql
-- Check if RLS is enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('master_data', 'health_checks');

-- View existing policies
SELECT * FROM pg_policies 
WHERE tablename IN ('master_data', 'health_checks');
```

### 2. Data Integrity
Check for data mismatches:

```sql
-- Check for email mismatches
SELECT DISTINCT kam_email_id FROM master_data
WHERE kam_email_id NOT IN (SELECT email FROM user_profiles);

-- Check for duplicate brands
SELECT brand_name, kam_email_id, COUNT(*) 
FROM master_data 
GROUP BY brand_name, kam_email_id 
HAVING COUNT(*) > 1;
```

### 3. Role Normalization
Verify user roles are correctly normalized:

```sql
-- Check role values
SELECT DISTINCT role FROM user_profiles;

-- Should be one of: 'Agent', 'Team Lead', 'Admin'
```

## Expected Behavior After Fix

1. **For Agents:**
   - See only their own brands that haven't been assessed
   - Each agent can assess the same brand name independently

2. **For Team Leads:**
   - See all team members' brands that haven't been assessed
   - Brands assessed by any team member are excluded

3. **For Admins:**
   - See all brands across all agents
   - Brands assessed by any agent are excluded

## Rollback Plan

If issues persist, the previous version used a simpler Set-based approach. However, this had the cross-agent contamination bug. To rollback:

```typescript
// Revert to simple Set (not recommended)
const assessedBrandNamesNormalized = new Set(
  assessedChecks?.map(c => c.brand_name?.trim().toLowerCase()) || []
);
```

## Next Steps

1. Deploy the fix
2. Clear all caches
3. Monitor console logs for any errors
4. Run diagnostic queries if issues persist
5. Check RLS policies if data access is blocked
