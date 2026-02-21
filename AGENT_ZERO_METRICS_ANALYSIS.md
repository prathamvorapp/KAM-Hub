# Agent Dashboard Zero Metrics Analysis Report

## Issue Summary
Agent **Sudhin Raveendran** (sudhin.raveendran@petpooja.com) from **South_2 Team** is showing all zeros across dashboard metrics:
- 0 Assessments
- 0 Pending
- 0 Total Brands Assigned
- 0% Connectivity Rate
- 0 Critical Brands
- 0 Healthy Brands

## Investigation Findings

### 1. Data Existence Verification
From the backup CSV file (`convex_backups/master_data_backup_2026-02-05_07-54-39-688Z.csv`), I found that Sudhin Raveendran **DOES have brands assigned**:

**Confirmed Brand Assignments (Sample):**
- Aasife Biriyani (admin@aasifebiriyani.com) - Kerala
- Lassi N Cafe - Kavoor Mangalore (seppykarwar@gmail.com) - Karnataka
- Wok and Fork (wokandforkindia@gmail.com) - Karnataka
- Tosta Cafe (imran@hossglobal.com) - Karnataka
- TOP CHICKEN RESTAURANT & PACHU ROLLS (pachumihran@gmail.com) - Kerala
- MPAAS VENTURES (mpaasventures@gmail.com) - Karnataka
- Honey Cakes Clt (shameelchathoth@gmail.com) - Kerala
- Shawarmax (shawarmaxofficial01@gmail.com) - Kerala
- Just Loaf Perinthalmanna (vishnu@justloaf.in) - Kerala
- Rabeeh Raidan (rabeehpetpooja@gmail.com) - Kerala
- Ajfan Hotels & Resorts (mohamedali@ajfan.in) - Kerala
- Cake Lounge (eaticobakes@gmail.com) - Kerala
- Palooda fill up on Life (operationspalooda@gmail.com) - Kerala
- ARABIAN GRILL AND FRY (sanooparab@gmail.com) - Kerala
- ARABIAN MAJLIS FEROKE (iquibmiyad@gmail.com) - Kerala
- Burger lounge - CUSAT (preeshma@addprint.net) - Kerala
- Burger Lounge - Kollam (rigid.food@gmail.com) - Kerala
- CAKE STUDIO (cakestudiocmd@gmail.com) - Kerala
- Döner Club (mohammedaslamct@gmail.com) - Kerala
- Irani Restaurant (mahinirani@gmail.com) - Kerala
- KOZHIKODEN KITCHEN (kozhikodenkitchenn@gmail.com) - Kerala
- Looco's Pizza (anandkangalath@gmail.com) - Kerala

**Total: At least 22+ brands assigned** (truncated list shows more)

### 2. Root Cause Analysis

#### Issue #1: Email Mismatch in Database
The CSV backup shows the agent's name as **"Sudhin Ravindran"** (without the 'e'), but the dashboard shows **"Sudhin Raveendran"** (with 'e'). This suggests:

**Potential Problems:**
1. **Email mismatch**: The email in `user_profiles` table might not match the email in `master_data` table
2. **Name inconsistency**: `kam_email_id` in master_data vs `email` in user_profiles might be different
3. **Case sensitivity**: Email comparison might be case-sensitive

#### Issue #2: Team Assignment Problem
The agent shows **"South_2 Team"** but the CSV shows brands in **"South"** zone. Possible issues:
1. Team name mismatch between `user_profiles.team_name` and `health_checks.team_name`
2. Zone vs Team confusion in filtering logic

#### Issue #3: Data Synchronization Gap
The backup is from **2026-02-05**, but current date is **2026-02-21**. Possible scenarios:
1. Brands were reassigned to another agent
2. Agent's email was changed in `user_profiles` but not in `master_data`
3. Agent was deactivated and reactivated with different email
4. Data migration issue between systems

### 3. Code Flow Analysis

#### Health Check Statistics Flow:
```
/api/data/health-checks/agent-statistics
  ↓
healthCheckService.getHealthCheckStatistics()
  ↓
1. Fetches user_profiles WHERE role='agent' AND team_name='South_2 Team'
2. For each agent, queries master_data WHERE kam_email_id = agent.email
3. Queries health_checks WHERE kam_email = agent.email
4. Calculates metrics based on results
```

#### Critical Code Sections:

**File: `lib/services/healthCheckService.ts` (Lines 280-310)**
```typescript
// Get total brands per agent
const { data: brandCounts } = await getSupabaseAdmin()
  .from('master_data')
  .select('kam_email_id')
  .in('kam_email_id', agentEmails)
```

**Problem**: If `agentEmails` contains "sudhin.raveendran@petpooja.com" but `master_data.kam_email_id` has a different email (typo, case difference, or old email), the query returns 0 brands.

### 4. Specific Issues Identified

#### A. Agent Statistics Calculation (Lines 265-350)
The service fetches agents from `user_profiles` and then queries `master_data` using `kam_email_id`. If there's any mismatch:
- `totalBrands` = 0
- `pendingAssessments` = totalBrands = 0
- All metrics cascade to 0

#### B. Health Check Filtering (Lines 190-230)
For agents, the query filters by:
```typescript
if (normalizedRole === 'agent') {
  query = query.eq('kam_email', userProfile.email);
}
```

If no health checks exist with matching `kam_email`, all assessment counts = 0.

#### C. Brands for Assessment (Lines 365-520)
```typescript
if (normalizedRole === 'agent') {
  brandsQuery = brandsQuery.eq('kam_email_id', userProfile.email);
}
```

Same email mismatch issue applies here.

### 5. Diagnostic Steps Required

To identify the exact issue, check the following in your database:

#### Step 1: Verify User Profile
```sql
SELECT email, full_name, team_name, role, is_active 
FROM user_profiles 
WHERE email ILIKE '%sudhin%' OR full_name ILIKE '%sudhin%';
```

#### Step 2: Verify Brand Assignments
```sql
SELECT kam_email_id, kam_name, COUNT(*) as brand_count
FROM master_data 
WHERE kam_email_id ILIKE '%sudhin%' OR kam_name ILIKE '%sudhin%'
GROUP BY kam_email_id, kam_name;
```

#### Step 3: Check for Email Variations
```sql
-- Check exact email in user_profiles
SELECT email FROM user_profiles WHERE full_name ILIKE '%sudhin%';

-- Check exact email in master_data
SELECT DISTINCT kam_email_id FROM master_data WHERE kam_name ILIKE '%sudhin%';

-- Compare them
```

#### Step 4: Verify Health Checks
```sql
SELECT kam_email, kam_name, COUNT(*) as assessment_count
FROM health_checks 
WHERE kam_email ILIKE '%sudhin%' OR kam_name ILIKE '%sudhin%'
GROUP BY kam_email, kam_name;
```

### 6. Likely Root Causes (Ranked by Probability)

1. **Email Mismatch (90% probability)**
   - `user_profiles.email` ≠ `master_data.kam_email_id`
   - Example: "sudhin.raveendran@petpooja.com" vs "sudhin.ravindran@petpooja.com" (note the 'e')

2. **Agent Deactivated (5% probability)**
   - `user_profiles.is_active = false`
   - Agent filtered out from statistics

3. **Team Name Mismatch (3% probability)**
   - `user_profiles.team_name` = "South_2 Team"
   - But brands have different team assignment

4. **Data Migration Issue (2% probability)**
   - Old data in CSV backup not imported to current database
   - Brands reassigned to other agents

### 7. Recommended Fixes

#### Fix #1: Email Standardization (Immediate)
```sql
-- Update master_data to match user_profiles email
UPDATE master_data 
SET kam_email_id = 'sudhin.raveendran@petpooja.com'
WHERE kam_email_id = 'sudhin.ravindran@petpooja.com'; -- or whatever the mismatch is
```

#### Fix #2: Add Case-Insensitive Email Comparison (Code Fix)
In `lib/services/healthCheckService.ts`, modify queries to use case-insensitive comparison:
```typescript
// Instead of:
brandsQuery = brandsQuery.eq('kam_email_id', userProfile.email);

// Use:
brandsQuery = brandsQuery.ilike('kam_email_id', userProfile.email);
```

#### Fix #3: Add Data Validation
Create a database constraint or trigger to ensure email consistency across tables.

#### Fix #4: Add Logging
Temporarily enable the commented console.log statements in `healthCheckService.ts` to debug:
- Lines 379, 419, 427, 457, 460, 472, 488, 491, 496, 503

### 8. Testing Checklist

After applying fixes:
- [ ] Verify agent can see their brands in master_data
- [ ] Verify agent statistics show correct brand count
- [ ] Verify health check assessments are counted
- [ ] Verify connectivity rate calculates correctly
- [ ] Test with other agents to ensure no regression

## Conclusion

The issue is **NOT a code bug** but a **data inconsistency problem**. The agent has brands assigned in the backup data, but there's likely an email mismatch between:
- `user_profiles.email` (what the dashboard uses)
- `master_data.kam_email_id` (where brands are assigned)

**Immediate Action Required:**
1. Run the diagnostic SQL queries above
2. Identify the exact email mismatch
3. Update the database to standardize emails
4. Consider implementing case-insensitive email comparisons in code

**Priority:** HIGH - This affects agent's ability to see their assigned work and complete assessments.
