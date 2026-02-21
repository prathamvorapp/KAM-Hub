# Team Lead Brands Access Issue - Complete Analysis

## Problem Statement
Team leads (Manisha Balotiya, Snehal Dwivedi) are seeing "No brands assigned to you" on the Demos page, even though they should see all brands for their team members.

---

## The Complete Flow

### 1. Frontend Request (Demos Page)
**File**: `app/dashboard/demos/page.tsx` (Lines 156-169)

```typescript
if (userProfile?.role?.toLowerCase() === 'admin') {
  // Admin: Get all brands using getMasterData
  const brandsResponse = await api.getMasterData(1, 10000);
  brandsData = brandsResponse.data?.data || [];
} else {
  // Agent/Team Lead: Get brands assigned to them
  const brandsResponse = await api.getBrandsByAgentEmail(userProfile?.email || "");
  //                                                      ^^^^^^^^^^^^^^^^^^^^
  //                                                      PROBLEM: Passes team lead's own email
  brandsData = brandsResponse.data?.data || [];
}
```

**Issue**: For team leads, the frontend passes the team lead's own email (`manisha.balotiya@petpooja.com`) to `getBrandsByAgentEmail()`.

---

### 2. API Client Call
**File**: `lib/api-client.ts` (Lines 334-356)

```typescript
getBrandsByAgentEmail: async (email: string, page?: number, limit?: number, search?: string) => {
  const url = `/api/data/master-data/brands/${encodeURIComponent(email)}?${queryString}`;
  //                                          ^^^^^
  //                                          Team lead's email is in the URL
  const response = await fetch(url, { credentials: 'include' });
  return await response.json();
}
```

**Result**: Makes request to `/api/data/master-data/brands/manisha.balotiya@petpooja.com`

---

### 3. Backend API Endpoint
**File**: `app/api/data/master-data/brands/[email]/route.ts` (Lines 50-51)

```typescript
console.log(`📊 Getting brands for agent: ${email}`);
// email = "manisha.balotiya@petpooja.com"

const brands = await masterDataService.getBrandsByAgentEmail(user as any, email);
//                                                            ^^^^       ^^^^^
//                                                            authenticated user  requested email
```

**Parameters passed to service**:
- `user` = authenticated user (Manisha, role: team_lead)
- `email` = requested email (manisha.balotiya@petpooja.com)

---

### 4. Service Layer Authorization
**File**: `lib/services/masterDataService.ts` (Lines 110-165)

```typescript
async getBrandsByAgentEmail(userProfile: UserProfile, agentEmail: string) {
  const normalizedRole = userProfile.role.toLowerCase().replace(/\s+/g, '_');
  let canAccess = false;
  
  if (normalizedRole === 'admin') {
    canAccess = true;
    query = query.eq('kam_email_id', agentEmail);
  } else if (normalizedRole === 'team_lead' || normalizedRole === 'teamlead') {
    // Team Lead can only fetch brands for agents within their team
    if (userProfile.team_name) {
      const { data: teamMembers } = await getSupabaseAdmin()
        .from('user_profiles')
        .select('email')
        .eq('team_name', userProfile.team_name)
        .in('role', ['agent', 'Agent']);  // ❌ Only queries for 'agent' role
      
      const agentEmails = teamMembers?.map(m => m.email) || [];
      // agentEmails = ['agent1@petpooja.com', 'agent2@petpooja.com', ...]
      // Does NOT include 'manisha.balotiya@petpooja.com' (team_lead)
      
      if (agentEmails.includes(agentEmail)) {  // ❌ FALSE - team lead email not in list
        canAccess = true;
        query = query.eq('kam_email_id', agentEmail);
      } else {
        // ❌ ACCESS DENIED - Team lead's email is not in the agents list
      }
    }
  } else if (normalizedRole === 'agent') {
    if (userProfile.email === agentEmail) {
      canAccess = true;
      query = query.eq('kam_email_id', agentEmail);
    }
  }
  
  if (!canAccess) {
    console.warn(`⚠️ Access denied for ${userProfile.email} to get brands for ${agentEmail}`);
    return [];  // ❌ Returns empty array
  }
}
```

**What happens**:
1. Team lead Manisha requests brands for email `manisha.balotiya@petpooja.com`
2. Service queries for team members with role `'agent'` only
3. Manisha's email is NOT in the agents list (she has role `'team_lead'`)
4. Check `agentEmails.includes('manisha.balotiya@petpooja.com')` returns `false`
5. `canAccess` remains `false`
6. Returns empty array `[]`
7. Frontend shows "No brands assigned to you"

---

## Root Cause Summary

**There are TWO separate but related problems:**

### Problem 1: Frontend Logic Issue
The Demos page assumes that team leads should fetch brands using their own email, just like agents do. This is incorrect because:
- Team leads don't have brands assigned to their own email in `master_data.kam_email_id`
- Team leads should see brands for ALL their team members, not just themselves

### Problem 2: Backend Authorization Logic Issue
The `getBrandsByAgentEmail()` method doesn't allow team leads to access their own email because:
- It only checks if the requested email is in the list of team members with role `'agent'`
- Team leads have role `'team_lead'`, so they're not in that list
- There's no self-access exception for team leads

---

## Why Other Pages Work

### Health Checks, Visits, Demos Data (NOT Brands)
These services use a different pattern:

**File**: `lib/services/healthCheckService.ts` (Lines 52-60)
```typescript
if (normalizedRole === 'team_lead' || normalizedRole === 'teamlead') {
  const teamName = userProfile.team_name || userProfile.teamName;
  if (teamName) {
    query = query.eq('team_name', teamName);  // ✅ Filters by team_name directly
  }
}
```

**Why it works**: These services filter by `team_name` in the data table, returning ALL records for the team without needing a specific agent email.

---

## The Fundamental Design Mismatch

### Current Brands Flow (BROKEN for Team Leads)
```
Frontend → Pass team lead's email → Backend checks if email is an agent → FAIL → Empty array
```

### Working Flow (Health Checks, Visits, Demos)
```
Frontend → Pass user profile → Backend filters by team_name → SUCCESS → All team data
```

### Expected Brands Flow (What Should Happen)
```
Frontend → Pass user profile → Backend gets all team agents → Query brands for all agents → SUCCESS
```

---

## Solutions

### Solution 1: Fix Backend Only (Quick Fix)
Modify `getBrandsByAgentEmail()` to return ALL team brands when a team lead requests their own email.

**File**: `lib/services/masterDataService.ts` (Lines 125-145)

```typescript
} else if (normalizedRole === 'team_lead' || normalizedRole === 'teamlead') {
  if (userProfile.team_name) {
    // Get all team members (agents only)
    const { data: teamMembers } = await getSupabaseAdmin()
      .from('user_profiles')
      .select('email')
      .eq('team_name', userProfile.team_name)
      .in('role', ['agent', 'Agent']);
    
    const agentEmails = teamMembers?.map(m => m.email) || [];
    
    // ✅ NEW: If team lead requests their own email, return all team brands
    if (agentEmail === userProfile.email) {
      if (agentEmails.length > 0) {
        canAccess = true;
        query = query.in('kam_email_id', agentEmails);  // ✅ Query for ALL team agents
      } else {
        // No agents in team, return empty
        return [];
      }
    } else if (agentEmails.includes(agentEmail)) {
      // Team lead requesting specific agent's brands
      canAccess = true;
      query = query.eq('kam_email_id', agentEmail);
    }
  }
}
```

**Pros**:
- Minimal code change
- No frontend changes needed
- Works with existing API contract

**Cons**:
- Semantically confusing (requesting your own email returns other people's brands)
- Inconsistent with other services

---

### Solution 2: Align with Other Services (Recommended)
Create a new method that matches the pattern used by health checks, visits, and demos.

**Step 1**: Add new method to `masterDataService.ts`

```typescript
// Get brands for user based on role (consistent with other services)
async getBrandsForUser(userProfile: UserProfile) {
  let query = getSupabaseAdmin().from('master_data').select('*');
  
  const normalizedRole = userProfile.role.toLowerCase().replace(/\s+/g, '_');
  
  if (normalizedRole === 'agent') {
    query = query.eq('kam_email_id', userProfile.email);
  } else if (normalizedRole === 'team_lead' || normalizedRole === 'teamlead') {
    if (userProfile.team_name) {
      // Get all team members
      const { data: teamMembers } = await getSupabaseAdmin()
        .from('user_profiles')
        .select('email')
        .eq('team_name', userProfile.team_name)
        .in('role', ['agent', 'Agent']);
      
      const agentEmails = teamMembers?.map(m => m.email) || [];
      if (agentEmails.length > 0) {
        query = query.in('kam_email_id', agentEmails);  // All team brands
      } else {
        return [];
      }
    } else {
      return [];
    }
  } else if (normalizedRole === 'admin') {
    // Admin sees all
  } else {
    return [];
  }
  
  const { data: brands } = await query;
  return brands || [];
}
```

**Step 2**: Update Demos page frontend

```typescript
// OLD (BROKEN)
const brandsResponse = await api.getBrandsByAgentEmail(userProfile?.email || "");

// NEW (WORKING)
const brandsResponse = await api.getBrandsForUser();  // No email parameter needed
```

**Step 3**: Create new API endpoint `/api/data/brands` (without [email] parameter)

**Pros**:
- Consistent with other services
- Semantically correct
- Cleaner API design
- Better performance (single query)

**Cons**:
- Requires frontend changes
- Requires new API endpoint
- More work upfront

---

### Solution 3: Hybrid Approach (Pragmatic)
Keep both methods:
- Use `getBrandsByAgentEmail()` for specific agent lookups (admin use case)
- Use new `getBrandsForUser()` for role-based access (agent/team lead use case)

Update Demos page to use the appropriate method based on role.

---

## Recommended Implementation

**Immediate Fix (Today)**: Implement Solution 1 to unblock team leads

**Long-term Refactor (Next Sprint)**: Implement Solution 2 for consistency

---

## Testing Checklist

After implementing the fix:

### Team Lead Tests
- [ ] Team lead can see all brands for their team members on Demos page
- [ ] Team lead can initialize demos for team brands
- [ ] Team lead can see demo progress for team brands
- [ ] Team lead CANNOT see brands from other teams

### Agent Tests
- [ ] Agents can still see only their own brands
- [ ] Agents can initialize demos for their brands
- [ ] Agents CANNOT see other agents' brands

### Admin Tests
- [ ] Admins can see all brands
- [ ] Admins can initialize demos for any brand

### Data Verification
- [ ] Verify team_name is correctly set in master_data table
- [ ] Verify user_profiles has correct team_name for all team members
- [ ] Verify role values are consistent ('agent' vs 'Agent', 'team_lead' vs 'Team Lead')

---

## Database Schema Verification Needed

Check if `master_data` table has `team_name` column:

```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'master_data';
```

If `team_name` doesn't exist in `master_data`, it needs to be added and populated based on the agent's team from `user_profiles`.

---

## Additional Findings

### Role Normalization Inconsistency
Different parts of the codebase normalize roles differently:
- `.replace(/\s+/g, '_')` → `team_lead`
- `.replace(/\s+/g, '')` → `teamlead`
- `.replace(/[_\s]/g, '')` → `teamlead`

**Recommendation**: Standardize on one normalization method across all services.

### Database Role Values
From the screenshot, roles in `user_profiles` are:
- `'agent'` (lowercase)
- `'team_lead'` (lowercase with underscore)

Ensure all role checks account for these exact values.

---

## Conclusion

Team leads cannot see brands because:
1. **Frontend** passes the team lead's own email to `getBrandsByAgentEmail()`
2. **Backend** only allows team leads to access emails that belong to agents with role `'agent'`
3. Team lead's email has role `'team_lead'`, so it's not in the allowed list
4. Access is denied, empty array is returned

The quickest fix is to modify the backend to return all team brands when a team lead requests their own email. The proper long-term solution is to create a new method that filters by team_name, consistent with other services.
