# Approval System Fixes - Summary

## Issues Fixed

### 1. Logic Error in Team Lead Statistics (500 Error)
**Location:** `lib/services/visitService.ts` line 52

**Problem:** The condition was inverted - it threw an error when `team_name` EXISTS instead of when it DOESN'T exist.

```typescript
// BEFORE (WRONG)
if ((userProfile as any).team_name) {
  throw new Error("Team lead must have a team assigned");
}

// AFTER (CORRECT)
if (!(userProfile as any).team_name) {
  throw new Error("Team lead must have a team assigned");
}
```

**Impact:** Team leads couldn't view their statistics, getting a 500 error.

---

### 2. Wrong Visit Status After MOM Submission
**Location:** `lib/services/visitService.ts` lines 397 and 504

**Problem:** When MOM was submitted, `visit_status` was set to "Pending" instead of "Completed".

```typescript
// BEFORE (WRONG)
if (params.mom_shared === "Yes") {
  updateData.approval_status = "Pending";
  updateData.visit_status = "Pending";  // ❌ Wrong!
}

// AFTER (CORRECT)
if (params.mom_shared === "Yes") {
  updateData.approval_status = "Pending";
  updateData.visit_status = "Completed";  // ✅ Correct!
}
```

**Impact:** 
- Visits showed "Pending Approval" status even after approval
- Statistics didn't count completed visits correctly
- "Done" count remained at 0 even after approval

---

### 3. Frontend Status Display Logic
**Location:** `app/dashboard/visits/page.tsx` line 710

**Problem:** Status chip didn't properly handle the combination of `visit_status` and `approval_status`.

**Solution:** Added logic to:
- Show "Visit Done" when `visit_status = 'Completed'` AND `approval_status = 'Approved'`
- Show "Pending Approval" when `visit_status = 'Completed'` AND `approval_status = 'Pending'`
- Handle legacy "Pending" status for backward compatibility

---

### 4. Frontend Approval Filter
**Location:** `app/dashboard/approvals/page.tsx` line 108

**Problem:** Was filtering by `visit_status === 'Pending'` instead of `approval_status === 'Pending'`.

```typescript
// BEFORE (WRONG)
const pendingVisits = allVisits.filter((v: any) => 
  v.visit_status === 'Pending' && 
  v.approval_status !== 'Rejected'
);

// AFTER (CORRECT)
const pendingVisits = allVisits.filter((v: any) => 
  v.approval_status === 'Pending' || v.approval_status === 'pending'
);
```

**Impact:** Approved visits continued to show in the pending approvals list.

---

### 5. Approval Process Logic
**Location:** `lib/services/visitService.ts` line 533

**Problem:** Was changing `visit_status` to "Approved" or "Rejected" during approval, which doesn't make semantic sense.

**Solution:** Only update `approval_status`, leave `visit_status` as "Completed".

```typescript
// BEFORE (WRONG)
if (params.approval_status === "Approved") {
  updateData.visit_status = "Approved";  // ❌ Wrong!
}

// AFTER (CORRECT)
// Don't change visit_status - it should remain as Completed
// Only update approval_status
```

---

## Correct Workflow

### Visit Lifecycle States

1. **Scheduled** → Visit is created and scheduled
   - `visit_status`: "Scheduled"
   - `approval_status`: null

2. **Completed** → Visit is completed and MOM is submitted
   - `visit_status`: "Completed"
   - `approval_status`: "Pending"
   - `mom_shared`: "Yes"

3. **Approved** → Team lead approves the MOM
   - `visit_status`: "Completed" (unchanged)
   - `approval_status`: "Approved"

4. **Rejected** → Team lead rejects the MOM
   - `visit_status`: "Completed" (unchanged)
   - `approval_status`: "Rejected"

---

## Database Fix Required

Run the SQL script in `fix-visit-status.sql` to update existing visits that have the wrong status:

```sql
UPDATE visits
SET visit_status = 'Completed'
WHERE visit_status = 'Pending' 
  AND mom_shared = 'Yes'
  AND approval_status IN ('Pending', 'Approved', 'Rejected');
```

This will fix the existing visit (Biryani Zone) that shows as "Pending Approval" even after being approved.

---

## Statistics Calculation

The statistics now correctly count:

- **Done (0 → 1)**: Brands with `visit_status = 'Completed'` AND `approval_status = 'Approved'`
- **Completed**: Visits with `visit_status = 'Completed'` (regardless of approval)
- **MOM Pending**: Visits with `visit_status = 'Completed'` but `mom_shared != 'Yes'`
- **Pending Approval**: Visits with `approval_status = 'Pending'`

---

## Testing Checklist

After applying these fixes:

1. ✅ Team lead can view statistics without 500 error
2. ✅ When MOM is submitted, visit status becomes "Completed"
3. ✅ When team lead approves, visit shows as "Visit Done"
4. ✅ Approved visits disappear from pending approvals list
5. ✅ Statistics show correct "Done" count
6. ✅ Agent summary shows completed visits in "Done" column
