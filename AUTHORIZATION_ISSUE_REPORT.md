# Authorization Issue Report - Team Lead Access Denied

## Executive Summary
User `snehal.dwivedi@petpooja.com` with role `team_lead` is experiencing access denial when trying to fetch brands data for their own email. The issue is **INCONSISTENT** across different endpoints - health checks work correctly, but brands, demos, and visits fail.

---

## Issue Details

### Error Message
```
⚠️ Access denied for snehal.dwivedi@petpooja.com to get brands for snehal.dwivedi@petpooja.com
```

### User Context
- **Email**: snehal.dwivedi@petpooja.com
- **Role**: team_lead
- **Team**: North-East Team
- **Endpoint**: `/api/data/brands/[email]`

---

## Root Cause Analysis

### The Problem: Inconsistent Authorization Logic

The authorization logic in `masterDataService.getBrandsByAgentEmail()` is **TOO RESTRICTIVE** for team leads compared to other services.

### Comparison of Authorization Logic Across Services

#### ✅ WORKING: Health Checks Service
**File**: `lib/services/healthCheckService.ts` (Lines 52-60)

```typescript
if (normalizedRole === 'agent') {
  query = query.eq('kam_email', userProfile.email);
} else if (normalizedRole === 'team_lead' || normalizedRole === 'teamlead') {
  const teamName = userProfile.team_name || userProfile.teamName;
  if (teamName) {
    query = query.eq('team_name', teamName);  // ✅ Filters by team_name
  }
} else if (normalizedRole === 'admin') {
  // Admin sees all
}
```

**Why it works**: Team leads can see ALL health checks for their entire team by filtering on `team_name`.

---

#### ✅ WORKING: Demos Service
**File**: `lib/services/demoService.ts` (Lines 199-210)

```typescript
if (normalizedRole === "admin") {
  // Admin can see all demos
} else if (normalizedRole === "team_lead") {
  const teamName = userProfile.team_name || userProfile.teamName;
  if (teamName) {
    query = query.eq('team_name', teamName);  // ✅ Filters by team_name
  } else {
    query = query.eq('agent_id', 'NON_EXISTENT_EMAIL');
  }
} else {
  query = query.eq('agent_id', userProfile.email);
}
```

**Why it works**: Team leads can see ALL demos for their entire team by filtering on `team_name`.

---

#### ✅ WORKING: Visits Service
**File**: `lib/services/visitService.ts` (Lines 316-328)

```typescript
if (normalizedRole === 'agent') {
  query = query.eq('agent_id', userProfile.email);
} else if (normalizedRole === 'team_lead' || normalizedRole === 'teamlead') {
  const teamName = userProfile.team_name || userProfile.teamName;
  if (teamName) {
    query = query.eq('team_name', teamName);  // ✅ Filters by team_name
  } else {
    query = query.eq('agent_id', 'NON_EXISTENT_EMAIL');
  }
} else if (normalizedRole === 'admin') {
  // Admin sees all
}
```

**Why it works**: Team leads can see ALL visits for their entire team by filtering on `team_name`.

---

#### ❌ BROKEN: Brands Service (getBrandsByAgentEmail)
**File**: `lib/services/masterDataService.ts` (Lines 110-165)

```typescript
if (normalizedRole === 'admin') {
  canAccess = true;
  query = query.eq('kam_email_id', agentEmail);
} else if (normalizedRole === 'team_lead' || normalizedRole === 'teamlead') {
  // ❌ PROBLEM: Team Lead can ONLY fetch brands for specific team members
  if (userProfile.team_name) {
    const { data: teamMembers } = await getSupabaseAdmin()
      .from('user_profiles')
      .select('email')
      .eq('team_name', userProfile.team_name)
      .in('role', ['agent', 'Agent']);  // ❌ Only looks for 'agent' role
    
    const agentEmails = teamMembers?.map(m => m.email) || [];
    if (agentEmails.includes(agentEmail)) {  // ❌ Checks if requested email is in agents list
      canAccess = true;
      query = query.eq('kam_email_id', agentEmail);
    } else {
      // ❌ DENIAL: Team lead's own email is NOT in the agents list!
    }
  }
} else if (normalizedRole === 'agent') {
  if (userProfile.email === agentEmail) {
    canAccess = true;
    query = query.eq('kam_email_id', agentEmail);
  }
}
```

**Why it fails**: 
1. The method queries for team members with role `'agent'` or `'Agent'` only
2. Team lead's email (`snehal.dwivedi@petpooja.com`) has role `'team_lead'`, NOT `'agent'`
3. Therefore, the team lead's email is NOT in the `agentEmails` array
4. When team lead tries to fetch their own brands, the check `agentEmails.includes(agentEmail)` returns `false`
5. Access is denied

---

## The Fundamental Design Flaw

### Current Design (BROKEN)
`getBrandsByAgentEmail()` requires an `agentEmail` parameter and checks if the authenticated user has permission to view that specific agent's brands.

**Problem**: This design assumes team leads will always request brands for their subordinate agents, never for themselves.

### Other Services Design (WORKING)
All other services (`getHealthChecks`, `getDemosForAgent`, `getVisits`) filter by `team_name` directly, returning ALL records for the team without requiring a specific agent email.

---

## Solution Options

### Option 1: Allow Team Leads to Access Their Own Brands (Quick Fix)
Add a self-access check for team leads in `getBrandsByAgentEmail()`:

```typescript
} else if (normalizedRole === 'team_lead' || normalizedRole === 'teamlead') {
  // Team Lead can access their own brands OR their team members' brands
  if (userProfile.email === agentEmail) {
    // ✅ Allow team lead to access their own brands
    canAccess = true;
    query = query.eq('kam_email_id', agentEmail);
  } else if (userProfile.team_name) {
    // Check if requested email is a team member
    const { data: teamMembers } = await getSupabaseAdmin()
      .from('user_profiles')
      .select('email')
      .eq('team_name', userProfile.team_name)
      .in('role', ['agent', 'Agent']);
    
    const agentEmails = teamMembers?.map(m => m.email) || [];
    if (agentEmails.includes(agentEmail)) {
      canAccess = true;
      query = query.eq('kam_email_id', agentEmail);
    }
  }
}
```

**Location**: `lib/services/masterDataService.ts`, Lines 125-145

---

### Option 2: Align with Other Services (Recommended)
Refactor the brands endpoint to match the pattern used by health checks, demos, and visits:

1. **Change the API endpoint** from `/api/data/brands/[email]` to `/api/data/brands`
2. **Remove the `agentEmail` parameter** from `getBrandsByAgentEmail()`
3. **Filter by `team_name`** for team leads, just like other services
4. **Return ALL brands** for the team, not just for a specific agent

This would make the authorization logic consistent across all endpoints.

---

### Option 3: Include Team Leads in Agent Query (Alternative)
Modify the team member query to include team leads:

```typescript
.in('role', ['agent', 'Agent', 'team_lead', 'Team Lead'])
```

**Location**: `lib/services/masterDataService.ts`, Line 135

**Caveat**: This assumes team leads should be treated as agents in the data model, which may not be semantically correct.

---

## Recommended Solution

**Use Option 1 (Quick Fix)** for immediate resolution, then plan for **Option 2 (Refactor)** for long-term consistency.

### Why Option 1 First?
- Minimal code change
- No API contract changes
- Fixes the immediate issue
- Low risk

### Why Option 2 Long-Term?
- Consistent authorization pattern across all services
- Simpler logic (no need to check individual agent emails)
- Better performance (single query instead of checking membership)
- Easier to maintain

---

## Files to Modify

### Immediate Fix (Option 1)
- **File**: `lib/services/masterDataService.ts`
- **Method**: `getBrandsByAgentEmail()`
- **Lines**: 125-145 (team_lead authorization block)

### Long-Term Refactor (Option 2)
- `lib/services/masterDataService.ts` - Refactor `getBrandsByAgentEmail()`
- `app/api/data/brands/[email]/route.ts` - Update API endpoint
- `lib/api-client.ts` - Update client method
- Frontend components calling the brands API

---

## Testing Checklist

After implementing the fix, verify:

- [ ] Team lead can access their own brands
- [ ] Team lead can access their team members' brands
- [ ] Team lead CANNOT access brands for agents outside their team
- [ ] Agents can still only access their own brands
- [ ] Admins can access any agent's brands
- [ ] Health checks, demos, and visits still work correctly

---

## Additional Notes

### Database Schema Observation
From the `user_profiles` table screenshot:
- Multiple users with role `'agent'` in North-East Team
- One user with role `'team_lead'` in North-East Team (snehal.dwivedi@petpooja.com)
- The `master_data` table uses `kam_email_id` to link brands to agents

### Normalization Inconsistency
Different services normalize roles differently:
- `normalizedRole.replace(/\s+/g, '_')` → `team_lead`
- `normalizedRole.replace(/\s+/g, '')` → `teamlead`
- `normalizedRole.replace(/[_\s]/g, '')` → `teamlead`

This inconsistency is handled by checking multiple variations (`'team_lead' || normalizedRole === 'teamlead'`), but it would be cleaner to standardize the normalization approach.

---

## Conclusion

The issue is a **design inconsistency** in the brands authorization logic. While health checks, demos, and visits allow team leads to access all team data via `team_name` filtering, the brands service requires team leads to specify individual agent emails and only allows access to subordinate agents, not themselves.

The quickest fix is to add a self-access check for team leads in `getBrandsByAgentEmail()`. The proper long-term solution is to refactor the brands endpoint to match the authorization pattern used by other services.
