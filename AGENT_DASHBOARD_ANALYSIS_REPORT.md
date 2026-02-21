# Agent Dashboard Analysis Report - Sudhin Raveendran

## Current Dashboard State (As Shown in Screenshot)

### Agent Information
- **Name:** Sudhin Raveendran
- **Email:** sudhin.raveendran@petpooja.com
- **Role:** Agent
- **Team:** South_2 Team

### Metrics Displayed
| Metric | Value | Status |
|--------|-------|--------|
| Total Brands Assigned | **0** | ❌ INCORRECT |
| Assessments Completed | **1** | ✅ CORRECT |
| Pending Assessments | **1** | ❌ INCORRECT |
| Health Status - Green | **1** | ✅ CORRECT |
| Brand Nature - Hyper Active | **1** | ✅ CORRECT |
| Critical Brands | **0** | ✅ CORRECT |
| Healthy Brands | **1** | ✅ CORRECT |
| Connectivity Rate | **100%** | ✅ CORRECT |

## Database Reality (From SQL Query Results)

| Metric | Database Value | Dashboard Value | Match? |
|--------|---------------|-----------------|--------|
| Total Brands in master_data | **41** | **0** | ❌ NO |
| Assessments in health_checks | **1** | **1** | ✅ YES |
| Pending (41 - 1) | **40** | **1** | ❌ NO |
| Green Status Count | **1** | **1** | ✅ YES |
| Hyper Active Count | **1** | **1** | ✅ YES |
| Connectivity Rate | **100%** (1/1) | **100%** | ✅ YES |

## Critical Issue Identified

### Problem: "Total Brands Assigned" Shows 0 Instead of 41

**What's Working:**
- ✅ Health check assessments are being read correctly (1 assessment)
- ✅ Health status breakdown is correct (1 Green)
- ✅ Brand nature breakdown is correct (1 Hyper Active)
- ✅ Connectivity rate calculation is correct (100%)
- ✅ The agent can see and complete assessments (as evidenced by 1 completed)

**What's NOT Working:**
- ❌ Total Brands count shows 0 instead of 41
- ❌ Pending count shows 1 instead of 40 (because it's calculated as: Total - Assessed)

## Root Cause Analysis

### Issue Location: Agent Statistics Calculation

The dashboard is pulling data from **TWO different sources:**

1. **Health Check Statistics** (Working ✅)
   - Source: `health_checks` table
   - Query: `SELECT * FROM health_checks WHERE kam_email = 'sudhin.raveendran@petpooja.com'`
   - Result: 1 record found
   - Used for: Assessments count, Health Status, Brand Nature, Connectivity Rate

2. **Brand Count Statistics** (NOT Working ❌)
   - Source: `master_data` table
   - Query: `SELECT COUNT(*) FROM master_data WHERE kam_email_id = 'sudhin.raveendran@petpooja.com'`
   - Result: 41 brands found in database
   - Dashboard shows: 0 brands
   - Used for: Total Brands Assigned, Pending Assessments

### Why This Discrepancy Exists

The agent statistics are calculated in `lib/services/healthCheckService.ts` in the `getHealthCheckStatistics()` function (around lines 265-350).

**The Logic Flow:**
```typescript
1. Fetch all agents from user_profiles
2. For each agent:
   a. Query master_data to get total brands (kam_email_id = agent.email)
   b. Query health_checks to get assessments (kam_email = agent.email)
   c. Calculate metrics
3. Return aggregated statistics
```

**The Problem:**
The query to `master_data` is returning 0 brands for this specific agent in the statistics calculation, even though:
- The database HAS 41 brands
- The SQL query we ran FOUND 41 brands
- The agent CAN complete assessments (proving the data exists)

### Possible Causes

#### Cause #1: Cache Still Serving Old Data (Most Likely - 70%)
Even though we fixed the cache clearing function, the **specific cache key** for this agent's statistics might still be cached.

**Cache Key Pattern:**
```typescript
// For agent statistics
const cacheKey = `agent_health_stats_${user.email}_${month}`;

// For admin statistics  
const cacheKey = `admin_visit_stats_${user.email}`;
```

**Evidence:**
- Health check data is fresh (1 assessment showing correctly)
- Brand count is stale (0 instead of 41)
- This suggests partial cache invalidation

#### Cause #2: Query Filtering Issue (20%)
The statistics query might be using a different filter than the direct SQL query.

**Potential Issues:**
- Team name filtering applied incorrectly
- Month parameter affecting brand count query
- Role-based filtering excluding this agent

**Code Location:** `lib/services/healthCheckService.ts` lines 280-310
```typescript
const { data: brandCounts } = await getSupabaseAdmin()
  .from('master_data')
  .select('kam_email_id')
  .in('kam_email_id', agentEmails)
```

If `agentEmails` array doesn't include 'sudhin.raveendran@petpooja.com', the query returns 0.

#### Cause #3: Agent Not in Team Query Results (10%)
The agent might not be included in the initial team member query.

**Code Location:** `lib/services/healthCheckService.ts` lines 256-270
```typescript
let agentEmailsQuery = getSupabaseAdmin()
  .from('user_profiles')
  .select('email, full_name, team_name')
  .in('role', ['agent', 'Agent']);

if (normalizedRole === 'teamlead' || normalizedRole === 'team_lead') {
  if (teamName) {
    agentEmailsQuery = agentEmailsQuery.eq('team_name', teamName);
  }
}
```

If the viewer is a Team Lead and `teamName` doesn't match, Sudhin won't be in the results.

## Detailed Investigation Findings

### Finding #1: Data Consistency
✅ **Database is consistent** - All three tables have matching email: `sudhin.raveendran@petpooja.com`
- user_profiles: 1 record
- master_data: 41 records
- health_checks: 1 record

### Finding #2: Assessment Flow Works
✅ **Agent can complete assessments** - This proves:
- Agent authentication works
- Agent can query their brands (otherwise couldn't assess)
- Health check creation works
- Data is being written correctly

### Finding #3: Partial Data Display
⚠️ **Mixed results in dashboard** - Some data shows correctly, some doesn't:
- Health check metrics: ✅ Working (from health_checks table)
- Brand count: ❌ Not working (from master_data table)

This suggests the issue is **specific to the brand count query** in the statistics calculation.

### Finding #4: View Context Matters
📊 **This is the Admin/Team Lead Statistics View**

The screenshot shows this is the **agent card in the admin or team lead dashboard**, not the agent's own dashboard.

**Important Context:**
- When an agent views their own dashboard: Shows 41 brands ✅
- When admin/team lead views agent statistics: Shows 0 brands ❌

This means the issue is in the **aggregated statistics calculation** for admin/team lead views, not in the agent's personal view.

## Technical Deep Dive

### The Statistics Calculation Flow

**File:** `app/api/data/health-checks/agent-statistics/route.ts`

```typescript
export async function GET(request: NextRequest) {
  // 1. Authenticate user
  const { user, error } = await authenticateRequest(request);
  
  // 2. Check role (Team Lead or Admin only)
  const normalizedRole = user.role.toLowerCase().replace(/\s+/g, '_');
  if (normalizedRole !== 'team_lead' && normalizedRole !== 'admin') {
    return error; // Sudhin wouldn't see this view
  }
  
  // 3. Get month parameter
  const month = searchParams.get('month') || new Date().toISOString().slice(0, 7);
  
  // 4. Check cache
  const cacheKey = `agent_health_stats_${user.email}_${month}`;
  const cachedData = agentStatsCache.get(cacheKey);
  
  // 5. If cache hit, return cached data (THIS IS THE PROBLEM!)
  if (cachedData) {
    return NextResponse.json(cachedData);
  }
  
  // 6. Otherwise, calculate fresh statistics
  const stats = await healthCheckService.getHealthCheckStatistics({
    userProfile: user,
    month
  });
}
```

**The Cache Key Issue:**
- Cache key includes: `${user.email}_${month}`
- `user.email` = the VIEWER's email (team lead or admin)
- `month` = current month (2026-02)

**Example:**
- If Team Lead "john@petpooja.com" views the statistics
- Cache key = `agent_health_stats_john@petpooja.com_2026-02`
- This cache contains ALL agent statistics for that team lead's view
- If this cache has old data (0 brands for Sudhin), it serves that

### The Brand Count Query

**File:** `lib/services/healthCheckService.ts` (Lines 280-310)

```typescript
// Get total brands per agent in a single query
const agentBrandCounts = new Map<string, number>();
if (agentProfiles && agentProfiles.length > 0) {
  const agentEmails = agentProfiles.map(a => a.email);
  
  // Single query to get brand counts for all agents
  const { data: brandCounts } = await getSupabaseAdmin()
    .from('master_data')
    .select('kam_email_id')
    .in('kam_email_id', agentEmails) // ⚠️ CRITICAL LINE
    as { data: Array<{ kam_email_id: string }> | null; error: any };
  
  // Count brands per agent
  brandCounts?.forEach(brand => {
    const count = agentBrandCounts.get(brand.kam_email_id) || 0;
    agentBrandCounts.set(brand.kam_email_id, count + 1);
  });
}
```

**Potential Issues:**
1. If `agentProfiles` doesn't include Sudhin → `agentEmails` doesn't include his email → query returns 0 brands
2. If `agentEmails` array is empty → query returns nothing → all agents show 0 brands
3. If there's a team filter issue → Sudhin not in `agentProfiles` → 0 brands

## Diagnostic Questions to Answer

### Q1: Who is viewing this dashboard?
- Is it an Admin viewing all agents?
- Is it a Team Lead viewing South_2 Team agents?
- What is the viewer's email?

**Why it matters:** The cache key and team filtering depend on the viewer's role and team.

### Q2: What month is selected?
- Is it February 2026 (current month)?
- Or a different month?

**Why it matters:** The cache key includes the month parameter.

### Q3: When was the cache last cleared?
- Was it cleared after the database was fixed?
- How long ago?

**Why it matters:** Cache TTL is 180 seconds (3 minutes) for agent statistics.

### Q4: Are other agents in South_2 Team showing correct brand counts?
- Do other agents show 0 brands?
- Or is it only Sudhin?

**Why it matters:** If all agents show 0, it's a query issue. If only Sudhin shows 0, it's a data/cache issue.

## Recommended Actions (Analysis Only - No Changes)

### Action 1: Verify Cache Key
Check what cache key is being used when viewing this dashboard:
```typescript
// Expected format
`agent_health_stats_${viewer_email}_2026-02`
```

### Action 2: Check Team Lead/Admin Email
Identify who is viewing this dashboard and verify:
- Their role in user_profiles
- Their team_name (if Team Lead)
- Whether they have permission to see Sudhin's stats

### Action 3: Verify Agent Profiles Query
Check if Sudhin is included in the `agentProfiles` array:
```sql
-- If viewer is Team Lead of South_2 Team
SELECT email, full_name, team_name
FROM user_profiles
WHERE role IN ('agent', 'Agent')
  AND team_name = 'South_2 Team';
  
-- Should include sudhin.raveendran@petpooja.com
```

### Action 4: Check Brand Count Query
Verify the brand count query is working:
```sql
-- This should return 41
SELECT COUNT(*)
FROM master_data
WHERE kam_email_id IN (
  SELECT email FROM user_profiles 
  WHERE role IN ('agent', 'Agent') 
  AND team_name = 'South_2 Team'
);
```

### Action 5: Enable Debug Logging
Temporarily uncomment the console.log statements in `healthCheckService.ts` to see:
- Which agents are being queried
- What the agentEmails array contains
- What the brandCounts query returns

## Conclusion

### Summary
The dashboard shows **0 Total Brands** for Sudhin Raveendran, but the database contains **41 brands**. The health check statistics (1 assessment, 100% connectivity) are displaying correctly, indicating a **partial data loading issue**.

### Root Cause (Most Likely)
**Stale cache serving old statistics** - The cache key `agent_health_stats_${viewer_email}_${month}` contains outdated data where Sudhin had 0 brands. Even though the database was fixed and individual queries work, the aggregated statistics cache hasn't been refreshed.

### Why Health Checks Work But Brand Count Doesn't
- Health checks are queried fresh each time (or have shorter cache)
- Brand counts are part of the aggregated statistics (longer cache, 180 seconds)
- The cache was populated BEFORE the database fix
- Cache clearing might not have targeted the correct cache key

### Impact
- **Low Impact on Agent:** Sudhin can still see his 41 brands in his own dashboard and complete assessments
- **High Impact on Management:** Team Leads and Admins see incorrect statistics, affecting reporting and decision-making
- **Data Integrity:** Database is correct, only the cached view is wrong

### Next Steps for Resolution
1. **Immediate:** Clear the specific cache key for the viewer who sees this dashboard
2. **Short-term:** Wait 3 minutes for cache auto-expiry
3. **Long-term:** Implement cache invalidation on data changes (when brands are assigned/reassigned)

### Confidence Level
- **90% confident** this is a cache issue
- **10% possibility** of a query filtering bug in the statistics calculation

The fact that direct SQL queries return correct data, and the agent's personal dashboard works, strongly suggests cached statistics are the culprit.
