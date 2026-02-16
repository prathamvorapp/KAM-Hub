# Fixes Applied to Visit Management System

## Summary of Changes

### ✅ Fix 1: Removed Duplicate Blue Button
**File:** `app/dashboard/visits/page.tsx`
**Change:** Simplified role-based statistics component rendering
- Removed the duplicate condition that was showing both `TeamLeadSummaryStats` and `TeamVisitStatistics`
- Now only shows `TeamLeadSummaryStats` for Team Lead role (handles both 'Team Lead' and 'team_lead' formats)
- Removed the extra blue "View Agent-wise Stats" button

### ✅ Fix 2 & 3: MOM Approval Workflow Fixed
**File:** `app/dashboard/visits/page.tsx` - `handleSubmitMom` function
**Changes:**
1. When MOM is submitted, visit status now changes to "Pending Approval" instead of staying "Completed"
2. Added proper logging for debugging
3. Added success message to user
4. Visit will only show as "Done" after Team Lead approves the MOM

**Workflow:**
1. Agent completes visit → Status: "Completed"
2. Agent submits MOM → Status: "Pending Approval"
3. Team Lead approves MOM → Status: "Approved" (visit shows as done)

### ✅ Fix 4: MOM Registration Issue
**Root Cause:** Visit status wasn't being updated to "Pending Approval" after MOM submission
**Solution:** 
- Added `updateVisitStatus` call to set status to "Pending Approval"
- This ensures the visit appears in the Team Lead's approval queue
- Added logging to track MOM submission flow

### ✅ Fix 5: Submit MOM Button Logic Fixed
**File:** `app/dashboard/visits/page.tsx`
**Changes:**
- Button now only shows when:
  - Visit status is "Completed" AND
  - MOM has not been shared AND
  - Approval status is not "Pending" AND
  - Approval status is not "Approved"
- Added "MOM Pending Approval" badge when status is "Pending"
- Button disappears after MOM is submitted

### ✅ Fix 6: Backdated Visit and Rescheduling Fixed
**File:** `app/dashboard/visits/page.tsx`
**Changes:**
- Updated role checks to handle both 'Team Lead' and 'team_lead' formats
- Fixed backdated visit button visibility
- Fixed reschedule button visibility
- Both features now work for Team Leads with 'team_lead' role from database

**Locations Fixed:**
1. Backdated visit button (top of page)
2. Reschedule button in scheduled visits table

### Additional Fix: Visit Status Type Updated
**File:** `lib/convex-api.ts`
**Change:** Updated `updateVisitStatus` function to accept "Pending Approval" as a valid status
- Type changed from: `'Completed' | 'Cancelled'`
- Type changed to: `'Completed' | 'Cancelled' | 'Pending Approval'`

## Testing Checklist

- [ ] Test MOM submission as Agent (Kinab's account)
- [ ] Verify visit appears in Team Lead's approval queue
- [ ] Test MOM approval as Team Lead
- [ ] Verify "Submit MOM" button disappears after submission
- [ ] Test backdated visit creation as Team Lead
- [ ] Test visit rescheduling as Team Lead
- [ ] Verify no duplicate blue buttons appear
- [ ] Check that visit only shows as "Done" after MOM approval

## Database Status Values

**Visit Status Flow:**
1. `Scheduled` - Visit is scheduled
2. `Completed` - Visit completed, waiting for MOM
3. `Pending Approval` - MOM submitted, waiting for Team Lead approval
4. `Approved` - MOM approved by Team Lead (visit is truly done)
5. `Rejected` - MOM rejected, needs resubmission
6. `Cancelled` - Visit was cancelled

**Approval Status Values:**
- `null` or empty - No MOM submitted yet
- `Pending` - MOM submitted, waiting for approval
- `Approved` - MOM approved
- `Rejected` - MOM rejected with feedback
