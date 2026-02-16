# Fixes Required for Visit Management System

## Issues Identified:

### 1. Duplicate Buttons (Blue "View Agent-wise Stats" button)
**Problem:** Two statistics components are being rendered for Team Lead role
**Location:** `app/dashboard/visits/page.tsx` lines 737-746
**Current Code:**
```typescript
) : (userProfile?.role === 'Team Lead' || userProfile?.role === 'TEAM LEAD') ? (
  <TeamLeadSummaryStats />
) : (userProfile?.role?.toLowerCase().includes('team') || userProfile?.role?.toLowerCase().includes('lead')) ? (
  <TeamVisitStatistics />
)
```
**Issue:** The role check is matching both conditions for team_lead role

### 2. MOM Approvals Not Being Sent
**Problem:** When MOM is submitted, visit status changes to "Pending Approval" but approval workflow is not triggered
**Location:** Need to check visit status update logic

### 3. Visit Showing "Done" Without MOM Approval
**Problem:** Visit status shows as "Completed" or "Done" before MOM is approved
**Location:** `app/dashboard/visits/page.tsx` line 1009
**Current Logic:** Shows "Submit MOM" button when `visit_status === 'Completed'`
**Issue:** Visit should not show as "Done" until MOM is approved

### 4. Kinab's MOM Not Registered
**Problem:** MOM submission not being saved to database or not appearing in approvals
**Possible Causes:**
- API route not working correctly
- Database insert failing
- Visit status not updating to "Pending Approval"

### 5. Submit MOM Button Still Showing After Submission
**Problem:** Button logic doesn't check if MOM has already been submitted
**Location:** `app/dashboard/visits/page.tsx` line 1009
**Current Condition:** `visit.visit_status === 'Completed'`
**Missing Check:** Should also check `visit.mom_shared !== 'Yes'` and `visit.approval_status !== 'Pending'`

### 6. Backdated Visit and Rescheduling Not Working
**Problem:** Backdated visit creation and visit rescheduling functionality broken
**Locations:**
- Backdated: Button at line 720, modal handler needed
- Reschedule: Button at line 1003, modal handler needed

## Fixes to Implement:

### Fix 1: Remove Duplicate Statistics Component
### Fix 2: Implement Proper MOM Approval Workflow
### Fix 3: Update Visit Status Logic
### Fix 4: Debug MOM Submission API
### Fix 5: Fix Submit MOM Button Condition
### Fix 6: Fix Backdated and Reschedule Functionality
