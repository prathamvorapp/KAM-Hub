# Demos Team Name Fix

## Problem
Team leads (like Shaikh Mohammad Farhan) are seeing 0 demos and all brands show "Get Started" buttons, even though demos exist in the database.

## Root Cause
The demos table has records, but the `team_name` column is either NULL or doesn't match the current team assignments in `user_profiles`. When the team lead queries demos with `team_name = 'South_1 Team'`, it returns 0 results.

## Evidence from Logs
```
👥 [getDemosForAgent] Team Lead - fetching demos for team: South_1 Team
📊 [getDemosForAgent] Found 0 demos
📦 [getDemosForAgent] Returning 0 brand groups
```

But we know there are 308 brands for the team:
```
📊 Found 308 brands for team South_1 Team
```

## Solution

### Step 1: Check Current State
Run `check-demos-team-name.sql` to see the current state of demos and their team_name values.

### Step 2: Fix Existing Demos
Run `fix-demos-team-name.sql` to update all demos with the correct team_name based on the agent's current team assignment in user_profiles.

This SQL will:
1. Update demos.team_name from user_profiles.team_name where agent_id matches
2. Only update records where team_name is NULL or doesn't match
3. Set updated_at to current timestamp

### Step 3: Verify
After running the fix:
1. Refresh the demos page
2. Team leads should now see all demos for their team members
3. Demo statistics should show correct counts

## Code Changes Already Made
1. ✅ Fixed `getBrandsByAgentEmail` to fetch brands for all team members (not just team lead's email)
2. ✅ Increased brand limit from 50 to 10,000 to show all brands
3. ✅ Added comprehensive logging to debug the issue
4. ✅ `initializeBrandDemosFromMasterData` already sets team_name correctly for new demos

## Next Steps
Run the SQL fix script in Supabase to update existing demos with correct team_name values.
