# MOM Pending Count Fix

## Issue
When a MOM is rejected by the team lead, it was NOT being counted in the "MOM Pending" statistic. This is incorrect because a rejected MOM means the agent needs to resubmit it, so it should be counted as pending.

## Root Cause
The "MOM Pending" calculation only counted visits where MOM hadn't been submitted yet:

```typescript
// BEFORE (WRONG)
const mom_pending = nonCancelledVisits.filter((v: any) => 
  v.visit_status === 'Completed' && (!v.mom_shared || v.mom_shared === 'No' || v.mom_shared === 'Pending')
).length;
```

This missed visits with `approval_status = 'Rejected'`.

## Solution
Updated the calculation to include BOTH:
1. Visits that are completed but MOM not yet submitted
2. Visits where MOM was rejected (agent needs to resubmit)

```typescript
// AFTER (CORRECT)
const mom_pending = nonCancelledVisits.filter((v: any) => 
  (v.visit_status === 'Completed' && (!v.mom_shared || v.mom_shared === 'No' || v.mom_shared === 'Pending')) ||
  (v.approval_status === 'Rejected')
).length;
```

## Files Updated
1. `lib/services/visitService.ts` - Main statistics calculation
2. `app/api/data/visits/direct-statistics/route.ts` - Direct statistics endpoint

## Expected Behavior

### Before Fix
- Rahul Taak's Platform65 visit: MOM rejected
- "MOM Pending" count: 0 ❌ (incorrect)

### After Fix
- Rahul Taak's Platform65 visit: MOM rejected
- "MOM Pending" count: 1 ✅ (correct)

## Workflow States

| Visit State | MOM Status | Approval Status | Counted In |
|-------------|------------|-----------------|------------|
| Completed | Not submitted | - | MOM Pending |
| Completed | Submitted | Pending | Pending Approval |
| Completed | Submitted | Approved | Done |
| Completed | Submitted | Rejected | MOM Pending ✅ |

## Testing
After this fix, refresh the dashboard and verify:
1. Rahul Taak's "MOM Pending" shows 1 (not 0)
2. Team statistics correctly count rejected MOMs as pending
3. When agent resubmits, it moves from "MOM Pending" to "Pending Approval"
