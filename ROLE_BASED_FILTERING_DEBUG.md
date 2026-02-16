# Role-Based Filtering - Debug Guide

## Current Implementation

Role-based filtering IS implemented in all services. Here's how it works:

### Churn Records (`churnService.getChurnData`)
- **Agent**: Sees only records where `churn_records.kam` = `user_profiles.full_name`
- **Team Lead**: Sees records for all team members where `churn_records.kam` IN (team member full names)
- **Admin**: Sees ALL records (no filter)

### Master Data / Brands (`masterDataService.getMasterData`)
- **Agent**: Sees only brands where `master_data.kam_email_id` = user's email
- **Team Lead**: Sees brands for all team members where `master_data.kam_email_id` IN (team member emails)
- **Admin**: Sees ALL brands (no filter)

### Visits (`visitService.getVisits`)
- **Agent**: Sees only visits where `visits.agent_id` = user's email
- **Team Lead**: Sees visits for all team members
- **Admin**: Sees ALL visits (no filter)

## Common Issues

### Issue 1: User's full_name doesn't match KAM field
**Problem**: The `user_profiles.full_name` doesn't exactly match the `churn_records.kam` field

**Example**:
- User profile: `full_name = "Rahul Task"`
- Churn record: `kam = "Rahul Tsak"` (typo)
- Result: No match, user sees no records

**Solution**: 
1. Check user profile: `SELECT * FROM user_profiles WHERE email = 'user@example.com'`
2. Check KAM names: `SELECT DISTINCT kam FROM churn_records ORDER BY kam`
3. Fix mismatches in either table

### Issue 2: Role field has inconsistent casing
**Problem**: Role might be stored as "Agent", "agent", "AGENT", etc.

**Solution**: Code now normalizes role to lowercase for comparison

### Issue 3: Team Lead not seeing team data
**Problem**: Team members might not have matching `team_name` or `is_active = false`

**Solution**:
1. Check team members: `SELECT * FROM user_profiles WHERE team_name = 'Team Name' AND is_active = true`
2. Verify team_name matches exactly (case-sensitive)

## Debug Endpoint

Use the debug endpoint to diagnose filtering issues:

```
GET /api/debug/user-kam-match?email=user@example.com
```

This returns:
- User profile details
- Count of matching churn records
- All unique KAM names in the system
- Team members (if Team Lead)
- Possible name matches

## Debug Logs

The services now log detailed information:

```
🔍 User Profile for email@example.com: { full_name: "...", role: "...", ... }
🔍 Normalized role: agent
👤 Agent filter - showing records for KAM: John Doe
🔒 Applying KAM filter: ["John Doe"]
📊 Query returned 15 records
📋 Sample records (first 3): [...]
```

Check your server console for these logs when loading the churn dashboard.

## Verification Steps

1. **Check user profile**:
   ```sql
   SELECT email, full_name, role, team_name, is_active 
   FROM user_profiles 
   WHERE email = 'user@example.com';
   ```

2. **Check churn records for that user**:
   ```sql
   SELECT COUNT(*), kam 
   FROM churn_records 
   WHERE kam = 'User Full Name'
   GROUP BY kam;
   ```

3. **Check all KAM names**:
   ```sql
   SELECT DISTINCT kam 
   FROM churn_records 
   ORDER BY kam;
   ```

4. **For Team Leads, check team members**:
   ```sql
   SELECT email, full_name, role 
   FROM user_profiles 
   WHERE team_name = 'Team Name' 
   AND is_active = true;
   ```

## Expected Behavior

### Agent Login
- Should see ONLY their own churn records
- Should see ONLY their own brands
- Should see ONLY their own visits

### Team Lead Login
- Should see churn records for ALL team members
- Should see brands for ALL team members
- Should see visits for ALL team members

### Admin Login
- Should see ALL churn records
- Should see ALL brands
- Should see ALL visits

## Quick Fix

If filtering is not working, the most common issue is name mismatch. Run this query to find mismatches:

```sql
-- Find user profiles that don't have matching churn records
SELECT 
  up.email,
  up.full_name as profile_name,
  up.role,
  COUNT(cr.id) as matching_records
FROM user_profiles up
LEFT JOIN churn_records cr ON cr.kam = up.full_name
WHERE up.role IN ('Agent', 'agent')
GROUP BY up.email, up.full_name, up.role
HAVING COUNT(cr.id) = 0;
```

Then either:
1. Update user_profiles.full_name to match churn_records.kam
2. Update churn_records.kam to match user_profiles.full_name
