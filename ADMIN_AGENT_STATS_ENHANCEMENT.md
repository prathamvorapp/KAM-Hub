# Admin Agent Statistics Enhancement

## Overview

Added Agent-wise Performance section to the Statistics tab for Admin users, displaying all agents grouped by team.

## Problem

Admin users could see overall statistics but not individual agent performance. Team Leads could see their team's agent performance, but Admins couldn't see all agents across all teams.

## Solution

Modified the health check statistics service and UI to:
1. Include all agents for Admin users (not just team-specific)
2. Group agents by team in the UI for better organization
3. Display team headers when multiple teams exist

## Changes Made

### 1. Service Layer (`lib/services/healthCheckService.ts`)

**Fixed Role Check:**
```typescript
// Before (broken for Admin)
if (userProfile && (userProfile.role === 'Team Lead' || userProfile.role === 'team_lead' || userProfile.role === 'Admin')) {

// After (works for all roles)
if (normalizedRole === 'teamlead' || normalizedRole === 'team_lead' || normalizedRole === 'admin') {
```

**Added Team Name to Query:**
```typescript
// Now fetches team_name for grouping
.select('email, full_name, team_name')
```

**Added Team Name to Agent Stats:**
```typescript
agentMap.set(agent.email, {
  kam_email: agent.email,
  kam_name: agent.full_name || (agent as any).fullName,
  team_name: agent.team_name || 'No Team',  // NEW
  total: 0,
  totalBrands,
  // ... rest of stats
});
```

**Conditional Filtering:**
```typescript
// Team Leads see only their team
if (normalizedRole === 'teamlead' || normalizedRole === 'team_lead') {
  if (teamName) {
    agentEmailsQuery = agentEmailsQuery.eq('team_name', teamName);
  }
}
// Admin sees all agents (no filter)
```

### 2. Frontend Layer (`app/dashboard/health-checks/page.tsx`)

**Updated Interface:**
```typescript
interface AgentStats {
  kam_email: string
  kam_name: string
  team_name?: string  // NEW
  total: number
  totalBrands: number
  // ... rest of properties
}
```

**Added Team Grouping Logic:**
```typescript
// Group agents by team
const agentsByTeam = stats.byAgent.reduce((acc, agent) => {
  const team = agent.team_name || 'No Team';
  if (!acc[team]) acc[team] = [];
  acc[team].push(agent);
  return acc;
}, {} as Record<string, typeof stats.byAgent>);
```

**Added Team Headers:**
```typescript
{/* Team Header (only show for Admin with multiple teams) */}
{Object.keys(agentsByTeam).length > 1 && (
  <div className="flex items-center space-x-2 mb-3">
    <h4 className="text-sm font-semibold text-gray-700 px-3 py-1 bg-gray-100 rounded-full">
      {teamName}
    </h4>
  </div>
)}
```

**Added Team Badge to Agent Cards:**
```typescript
{agent.team_name && (
  <span className="text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded">
    {agent.team_name}
  </span>
)}
```

## UI Behavior

### For Team Leads
- See only agents from their team
- No team headers (single team view)
- Same as before

### For Admins
- See all agents from all teams
- Agents grouped by team with headers
- Team badge on each agent card
- Scrollable list with all agents

## Visual Example

```
Statistics Tab (Admin View)
├── Overall Summary
│   ├── Total Assessments: 6
│   ├── Healthy Brands: 4
│   └── Critical Brands: 1
│
├── Health Status Distribution
│   └── [Colored circles with counts]
│
├── Brand Nature Distribution
│   └── [Active, Hyper Active, Inactive counts]
│
└── Agent-wise Performance
    ├── ─────── Team Alpha ───────
    │   ├── Agent 1 (Team Alpha)
    │   │   ├── Total Brands: 50
    │   │   ├── Health Status: [breakdown]
    │   │   ├── Brand Nature: [breakdown]
    │   │   ├── Key Metrics: [critical/healthy]
    │   │   └── Connectivity: 67%
    │   │
    │   └── Agent 2 (Team Alpha)
    │       └── [same metrics]
    │
    ├── ─────── Team Beta ───────
    │   ├── Agent 3 (Team Beta)
    │   │   └── [metrics]
    │   │
    │   └── Agent 4 (Team Beta)
    │       └── [metrics]
    │
    └── ─────── No Team ───────
        └── Agent 5 (No Team)
            └── [metrics]
```

## Testing Steps

### 1. Test as Admin
1. Log in as Admin user (Helly Gandhi)
2. Navigate to Health Check-ups
3. Click Statistics tab
4. Verify:
   - ✅ Agent-wise Performance section appears
   - ✅ All agents are visible (not just one team)
   - ✅ Agents are grouped by team
   - ✅ Team headers appear between groups
   - ✅ Each agent shows team badge

### 2. Test as Team Lead
1. Log in as Team Lead
2. Navigate to Health Check-ups
3. Click Statistics tab
4. Verify:
   - ✅ Agent-wise Performance section appears
   - ✅ Only team members are visible
   - ✅ No team headers (single team)
   - ✅ Metrics are accurate

### 3. Test as Agent
1. Log in as Agent
2. Navigate to Health Check-ups
3. Click Statistics tab
4. Verify:
   - ✅ Agent-wise Performance section does NOT appear
   - ✅ Only personal statistics shown

## Files Modified

1. **`lib/services/healthCheckService.ts`**
   - Fixed role check to use normalized role
   - Added team_name to query and agent stats
   - Conditional filtering for Team Lead vs Admin

2. **`app/dashboard/health-checks/page.tsx`**
   - Updated AgentStats interface
   - Added team grouping logic
   - Added team headers and badges

## Expected Results

### Before Enhancement
```
Admin Statistics Tab:
├── Overall Summary ✅
├── Health Status Distribution ✅
├── Brand Nature Distribution ✅
└── Agent-wise Performance ❌ (not showing)
```

### After Enhancement
```
Admin Statistics Tab:
├── Overall Summary ✅
├── Health Status Distribution ✅
├── Brand Nature Distribution ✅
└── Agent-wise Performance ✅ (showing all agents by team)
    ├── Team Alpha
    │   ├── Jinal Chavda
    │   └── [other agents]
    ├── Team Beta
    │   └── Aman Kota
    └── No Team
        └── [unassigned agents]
```

## Benefits

1. **Better Visibility:** Admins can now see all agent performance at a glance
2. **Team Organization:** Agents grouped by team for easy comparison
3. **Consistent UX:** Same UI for Team Leads and Admins
4. **Scalability:** Works with any number of teams and agents
5. **Performance:** Single query fetches all data efficiently

## Performance Considerations

- Single query fetches all agents and their stats
- Client-side grouping is fast (O(n) complexity)
- Scrollable container handles large agent lists
- No additional API calls needed

## Future Enhancements

1. **Team Summary Cards:** Show team-level aggregates
2. **Sorting Options:** Sort by performance, team, name
3. **Filtering:** Filter by team, performance level
4. **Export:** Export agent stats to CSV
5. **Comparison View:** Compare agents side-by-side

## Rollback

If issues occur, revert these two files:
```bash
git checkout HEAD~1 lib/services/healthCheckService.ts
git checkout HEAD~1 app/dashboard/health-checks/page.tsx
```

## Success Criteria

- ✅ Admin sees all agents across all teams
- ✅ Agents are grouped by team with headers
- ✅ Team badges appear on agent cards
- ✅ Team Lead view unchanged (only their team)
- ✅ Agent view unchanged (no agent stats)
- ✅ No TypeScript errors
- ✅ No console errors
- ✅ Performance is acceptable

---

**Version:** 1.2.0
**Date:** 2026-02-19
**Status:** ✅ Ready for Testing
