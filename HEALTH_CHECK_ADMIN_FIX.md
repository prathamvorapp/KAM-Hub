# Health Check Admin Dashboard - Total Brands Fix

## Issue
The admin health check dashboard was showing "0 Total Brands" for agents, even though:
- Agents had assessments (showing "1 Assessments")
- Agent and Team Lead dashboards were displaying brand data correctly
- The connectivity rate and other metrics were calculated properly

## Root Cause
The issue was caused by Supabase's default row limit of 1000 records. Multiple queries across the application were hitting this limit when fetching brand data from the `master_data` table:

1. `healthCheckService.getHealthCheckStatistics()` - Used by admin health check page
2. `healthCheckService.getBrandsForAssessment()` - Used for assessment progress
3. `healthCheckService.getAssessmentProgress()` - Used for progress tracking
4. `masterDataService.getMasterData()` - Used for brand listing
5. `masterDataService.getMasterDataStatistics()` - Used for statistics
6. `masterDataService.getBrandsByAgentEmail()` - Used for agent-specific brand queries

When there were more than 1000 total brands across all agents, these queries would only return the first 1000 records, causing:
- Incomplete brand counts
- Some agents showing 0 brands even though they had brands assigned
- Incorrect statistics and progress calculations

## The Fix
Added `.limit(10000)` to all Supabase queries that fetch brand data to explicitly fetch up to 10,000 records:

### Files Modified:
1. `lib/services/healthCheckService.ts`
   - `getHealthCheckStatistics()` - Line ~285
   - `getBrandsForAssessment()` - Line ~437
   - `getAssessmentProgress()` - Line ~586

2. `lib/services/masterDataService.ts`
   - `getMasterData()` - Line ~79
   - `getMasterDataStatistics()` - Line ~251
   - `getBrandsByAgentEmail()` - Line ~163

### Example Fix:
```typescript
// Before (hits 1000 row limit)
const { data: brandCounts } = await getSupabaseAdmin()
  .from('master_data')
  .select('kam_email_id')
  .in('kam_email_id', agentEmails);

// After (fetches up to 10,000 records)
const { data: brandCounts } = await getSupabaseAdmin()
  .from('master_data')
  .select('kam_email_id')
  .in('kam_email_id', agentEmails)
  .limit(10000);
```

**Note:** Initially tried `.range(0, 9999)` but it didn't work correctly. Using `.limit(10000)` is the proper Supabase method to override the default 1000 row limit.

## Additional Improvements
Added comprehensive logging to `healthCheckService.getHealthCheckStatistics()` to help diagnose similar issues:
- Log the number of agents being queried
- Log the agent email addresses
- Log the number of brand records fetched
- Log the brand count per agent
- Log the final statistics being returned

## Testing
To verify the fix:
1. Navigate to the admin health check page: `/admin/health-checks`
2. Check that the "Total Brands" column shows the correct number for each agent
3. Verify that the "Pending" assessments = Total Brands - Assessed
4. Check the browser console and server logs for the diagnostic messages
5. Verify master data page shows all brands (not limited to 1000)

## Diagnostic Queries
Run the queries in `HEALTH_CHECK_DIAGNOSTIC.sql` to verify:
- Agent profiles are correctly set up
- Brands are assigned to agents in master_data
- Health checks are being recorded properly
- There's no email mismatch between tables

## Notes
- The `.range(0, 9999)` limit should be sufficient for most use cases (up to 10,000 brands)
- If you have more than 10,000 brands, you'll need to implement pagination or increase the range
- Consider adding a warning if the brand count approaches this limit
- This is a Supabase-specific limitation; other databases may have different default limits

## Impact
This fix affects all queries that fetch brand data, ensuring:
- Accurate brand counts in admin dashboards
- Correct assessment progress tracking
- Complete brand listings for all users
- Accurate statistics across all dashboards
