# Demo Reset Feature - Setup Guide

## Issue Found

The `reset_history` column doesn't exist in the `demos` table yet. This is why the reset functionality works but doesn't save the history.

## Quick Fix (Reset Works Without History)

The code has been updated to work even without the `reset_history` column. The reset functionality will work immediately, but the history won't be saved until you run the migration.

**Current Status:**
- ✅ Reset functionality works
- ✅ Demo returns to "Step 1 Pending"
- ✅ All workflow fields are cleared
- ❌ Reset history is not saved (until migration is run)

## Setup Steps

### Step 1: Run the Migration

Execute the migration SQL to add the `reset_history` column:

```bash
# Option 1: Using psql command line
psql -U your_username -d your_database -f migrations/add_reset_history_to_demos.sql

# Option 2: Using your database client (pgAdmin, DBeaver, etc.)
# Open migrations/add_reset_history_to_demos.sql and execute it
```

**Migration Contents:**
```sql
-- Add the reset_history column as JSONB
ALTER TABLE demos 
ADD COLUMN IF NOT EXISTS reset_history JSONB DEFAULT '[]'::jsonb;

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_demos_reset_history ON demos USING GIN (reset_history);
```

### Step 2: Verify Migration

Run this query to confirm the column was added:

```sql
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'demos' 
  AND column_name = 'reset_history';
```

**Expected Output:**
```
column_name   | data_type | column_default
--------------+-----------+----------------
reset_history | jsonb     | '[]'::jsonb
```

### Step 3: Test Reset Functionality

1. Go to the Demo page
2. Find a completed demo (Not Applicable, Already Using, Converted, etc.)
3. Click the red "Reset" button
4. Enter a reason
5. Confirm the action
6. Page will reload automatically
7. Demo should show "Step 1 Pending"

### Step 4: Verify Reset History (After Migration)

```sql
-- Check if reset history is being saved
SELECT 
    product_name,
    brand_name,
    current_status,
    reset_history
FROM demos
WHERE reset_history IS NOT NULL 
  AND reset_history != '[]'::jsonb
LIMIT 5;
```

## What the Reset Does

### Before Reset
```json
{
  "current_status": "Not Applicable",
  "workflow_completed": true,
  "is_applicable": false,
  "step1_completed_at": "2026-03-08T10:47:02.817Z",
  "non_applicable_reason": "Testing"
}
```

### After Reset
```json
{
  "current_status": "Step 1 Pending",
  "workflow_completed": false,
  "is_applicable": null,
  "step1_completed_at": null,
  "non_applicable_reason": null,
  "usage_status": null,
  "step2_completed_at": null,
  "demo_scheduled_date": null,
  "demo_scheduled_time": null,
  "demo_completed": false,
  "conversion_status": null
}
```

### Reset History (After Migration)
```json
{
  "reset_history": [
    {
      "reset_at": "2026-03-08T11:00:00.000Z",
      "reset_by": "pratham.vora@petpooja.com",
      "reset_by_role": "admin",
      "reason": "Agent entered wrong data",
      "previous_state": {
        "current_status": "Not Applicable",
        "workflow_completed": true,
        "is_applicable": false,
        "usage_status": null,
        "demo_scheduled_date": null,
        "demo_completed": false,
        "conversion_status": null
      }
    }
  ]
}
```

## Testing Checklist

### Without Migration (Current State)
- [x] Reset button appears for Team Lead/Admin
- [x] Reset button hidden for Agents
- [x] Reset clears all workflow fields
- [x] Demo returns to "Step 1 Pending"
- [x] Page reloads automatically after reset
- [x] Quick Complete button appears after reset
- [ ] Reset history is saved (requires migration)

### After Migration
- [ ] Reset history is saved in database
- [ ] Multiple resets create multiple history entries
- [ ] History includes reset_by, reason, and previous_state
- [ ] Can query reset history for audit purposes

## Troubleshooting

### Issue: "Column reset_history does not exist"

**Cause:** Migration hasn't been run yet.

**Solution:** 
1. Run the migration SQL (Step 1 above)
2. Or continue using without history tracking (works fine)

### Issue: Reset doesn't unlock the demo

**Cause:** Browser cache or page didn't reload.

**Solution:**
1. The page now auto-reloads after reset
2. If still locked, do hard refresh: `Ctrl + Shift + R`
3. Check database to verify reset worked:

```sql
SELECT current_status, workflow_completed, step1_completed_at
FROM demos
WHERE demo_id = 'YOUR_DEMO_ID';
```

Should show:
- `current_status`: 'Step 1 Pending'
- `workflow_completed`: false
- `step1_completed_at`: null

### Issue: Reset button not visible

**Cause:** User doesn't have permission.

**Solution:**
- Only Team Leads and Admins can reset
- Check user role: `SELECT role FROM user_profiles WHERE email = 'your@email.com'`
- Your role: admin ✅

## Database Schema

### Current demos Table Structure

```sql
CREATE TABLE demos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    demo_id TEXT UNIQUE NOT NULL,
    brand_name TEXT NOT NULL,
    brand_id UUID NOT NULL,
    product_name TEXT NOT NULL,
    agent_id TEXT NOT NULL,
    agent_name TEXT NOT NULL,
    team_name TEXT,
    zone TEXT,
    
    -- Step 1: Applicability
    is_applicable BOOLEAN,
    non_applicable_reason TEXT,
    step1_completed_at TIMESTAMPTZ,
    
    -- Step 2: Usage Status
    usage_status TEXT,
    step2_completed_at TIMESTAMPTZ,
    
    -- Step 3: Schedule
    demo_scheduled_date DATE,
    demo_scheduled_time TIME,
    demo_rescheduled_count INTEGER DEFAULT 0,
    demo_scheduling_history JSONB,
    
    -- Step 4: Complete
    demo_completed BOOLEAN DEFAULT FALSE,
    demo_completed_date TIMESTAMPTZ,
    demo_conducted_by TEXT,
    demo_completion_notes TEXT,
    
    -- Step 5: Conversion
    conversion_status TEXT,
    non_conversion_reason TEXT,
    conversion_decided_at TIMESTAMPTZ,
    
    -- Workflow State
    current_status TEXT NOT NULL,
    workflow_completed BOOLEAN DEFAULT FALSE,
    
    -- NEW: Reset History (after migration)
    reset_history JSONB DEFAULT '[]'::jsonb,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

## API Endpoints

### Reset Demo
```
POST /api/data/demos/[demoId]/reset
```

**Request Body:**
```json
{
  "resetReason": "Agent entered wrong data"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "success": true,
    "resetBy": "pratham.vora@petpooja.com",
    "resetByRole": "admin",
    "message": "Demo has been reset to initial state"
  }
}
```

## Summary

1. **Reset works NOW** - even without the migration
2. **History tracking** - requires running the migration
3. **Page auto-reloads** - ensures fresh data is displayed
4. **Backward compatible** - code checks if column exists before using it

Run the migration when you're ready to enable history tracking. The reset functionality is fully operational without it.
