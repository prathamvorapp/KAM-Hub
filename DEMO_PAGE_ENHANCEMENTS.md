# Demo Page Enhancements

## Overview
Two major enhancements have been implemented for the Demo Management page to improve workflow efficiency and error correction capabilities.

## 1. Reset/Revert Demo Functionality (Team Lead & Admin Only)

### Purpose
Allows Team Leads and Admins to reset a demo entry back to its initial state when an agent makes a mistake.

### Features
- **Authorization**: Only Team Leads and Admins can reset demos
- **Team Scope**: Team Leads can only reset demos from their team
- **Audit Trail**: All resets are logged with:
  - Reset timestamp
  - Who performed the reset
  - Reason for reset
  - Previous state snapshot
- **Complete Reset**: Clears all 5 steps and returns demo to "Step 1 Pending"

### How to Use
1. Navigate to the demo you want to reset
2. Click the red "Reset" button (visible only to Team Leads/Admins)
3. Enter a reason for the reset
4. Confirm the action
5. Demo will be reset to initial state

### UI Location
- Red "Reset" button appears next to Reschedule button
- Only visible for demos that have started (step1_completed_at exists)
- Icon: Circular arrow (reset symbol)

## 2. Bulk Complete Demo Workflow (All Users)

### Purpose
Allows agents to complete all 5 steps of the demo workflow at once, reducing latency and improving efficiency.

### Features
- **Single Form**: All 5 steps in one comprehensive form
- **Smart Validation**: Form adapts based on selections:
  - If "Not Applicable" → Only Step 1 required
  - If "Already Using" → Steps 1 & 2 required
  - If "Demo Pending" → All 5 steps required
- **Visual Step Indicators**: Color-coded sections for each step
- **Real-time Validation**: Prevents submission with incomplete data

### How to Use
1. Find a demo in "Step 1 Pending" status
2. Click the purple "Quick Complete" button
3. Fill out the form:
   - **Step 1**: Is product applicable?
   - **Step 2**: Usage status (if applicable)
   - **Step 3**: Schedule date/time (if demo needed)
   - **Step 4**: Who conducted demo (if demo needed)
   - **Step 5**: Conversion decision (if demo needed)
4. Click "Complete Workflow"
5. All steps are saved at once

### UI Location
- Purple gradient "Quick Complete" button
- Only visible for demos in "Step 1 Pending" status
- Icon: Lightning bolt (quick action symbol)
- Opens a modal form overlay

### Form Workflow Paths

#### Path 1: Not Applicable
- Step 1: Select "Not Applicable" + provide reason
- Result: Demo marked as "Not Applicable" (workflow complete)

#### Path 2: Already Using
- Step 1: Select "Applicable"
- Step 2: Select "Already Using"
- Result: Demo marked as "Already Using" (workflow complete)

#### Path 3: Full Demo Flow
- Step 1: Select "Applicable"
- Step 2: Select "Demo Pending"
- Step 3: Enter demo date and time
- Step 4: Select conductor + optional notes
- Step 5: Select "Converted" or "Not Converted" + reason if not converted
- Result: Demo marked as "Converted" or "Not Converted" (workflow complete)

## Technical Implementation

### Backend Changes

#### New Service Methods (lib/services/demoService.ts)
1. `resetDemo()` - Resets demo to initial state
2. `bulkCompleteDemo()` - Completes all 5 steps at once

#### New API Routes
1. `/api/data/demos/[demoId]/reset` - POST endpoint for reset
2. `/api/data/demos/[demoId]/bulk-complete` - POST endpoint for bulk complete

#### New API Client Methods (lib/api-client.ts)
1. `resetDemo(demoId, resetReason)` - Calls reset endpoint
2. `bulkCompleteDemo(demoId, data)` - Calls bulk complete endpoint

### Frontend Changes

#### New Component
- `components/BulkDemoForm.tsx` - Modal form for bulk completion

#### Updated Component
- `app/dashboard/demos/page.tsx` - Added:
  - Reset button with handler
  - Quick Complete button with handler
  - Bulk form modal integration
  - Authorization checks

## Benefits

### For Agents
- **Faster Workflow**: Complete all steps in one go
- **Reduced Latency**: No waiting between steps
- **Better UX**: Single form instead of 5 separate interactions
- **Fewer Errors**: See all fields at once, validate before submit

### For Team Leads & Admins
- **Error Correction**: Can fix agent mistakes
- **Audit Trail**: Track all resets with reasons
- **Team Management**: Reset demos when needed
- **Quality Control**: Ensure data accuracy

## Security & Authorization

### Reset Demo
- ✅ Admin: Can reset any demo
- ✅ Team Lead: Can reset demos from their team only
- ❌ Agent: Cannot reset demos

### Bulk Complete
- ✅ Admin: Can bulk complete any demo they have access to
- ✅ Team Lead: Can bulk complete demos from their team
- ✅ Agent: Can bulk complete their own demos

## Data Integrity

### Reset History
Each reset is logged with:
```json
{
  "reset_at": "2024-03-08T10:30:00Z",
  "reset_by": "teamlead@example.com",
  "reset_by_role": "Team Lead",
  "reason": "Agent entered wrong product applicability",
  "previous_state": {
    "current_status": "Converted",
    "workflow_completed": true,
    "is_applicable": true,
    "usage_status": "Demo Pending",
    "demo_scheduled_date": "2024-03-10",
    "demo_completed": true,
    "conversion_status": "Converted"
  }
}
```

### Bulk Complete Validation
- Prevents bulk complete if demo already started
- Validates all required fields based on workflow path
- Ensures data consistency across all 5 steps
- Atomic operation (all or nothing)

## Testing Checklist

### Reset Functionality
- [ ] Team Lead can reset demos from their team
- [ ] Team Lead cannot reset demos from other teams
- [ ] Admin can reset any demo
- [ ] Agent cannot see reset button
- [ ] Reset reason is required
- [ ] Reset history is saved
- [ ] Demo returns to "Step 1 Pending"
- [ ] All workflow fields are cleared

### Bulk Complete Functionality
- [ ] Form opens for "Step 1 Pending" demos
- [ ] Not Applicable path works
- [ ] Already Using path works
- [ ] Full demo flow path works
- [ ] Validation prevents incomplete submissions
- [ ] Form closes after successful submission
- [ ] Demo statistics update after completion
- [ ] Cannot bulk complete already-started demos

## Future Enhancements

### Potential Improvements
1. **Partial Bulk Complete**: Allow completing remaining steps for in-progress demos
2. **Bulk Actions**: Reset or complete multiple demos at once
3. **Templates**: Save common demo configurations for quick reuse
4. **History View**: Show reset history in UI
5. **Undo Reset**: Allow undoing a reset within a time window
