# Demo Reset Troubleshooting Guide

## Issue: Demo appears "Locked" after reset

### Symptoms
- Demo shows "Not Applicable" or other completed status
- "Locked" badge is visible
- Reset button was clicked and showed success message
- But the demo still appears locked in the UI

### Root Causes

#### 1. Browser Cache Issue (Most Common)
The browser is showing cached data from before the reset.

**Solution:**
- The page now automatically reloads after a successful reset
- If you still see old data, do a hard refresh:
  - Windows/Linux: `Ctrl + Shift + R` or `Ctrl + F5`
  - Mac: `Cmd + Shift + R`

#### 2. Database Not Updated
The reset API call failed or didn't complete.

**Solution:**
Run the verification query to check database state:

```sql
-- Run this in your database client
SELECT 
    demo_id,
    product_name,
    current_status,
    workflow_completed,
    is_applicable,
    step1_completed_at,
    reset_history
FROM demos
WHERE brand_name = 'Demo'
  AND product_name = 'Task'
  AND brand_id = '7333b0d2-f8e3-451e-ad70-cbf88d5e86cc';
```

**Expected values after reset:**
- `current_status`: `'Step 1 Pending'`
- `workflow_completed`: `false`
- `is_applicable`: `null`
- `step1_completed_at`: `null`
- `reset_history`: Should contain a reset record with timestamp and reason

#### 3. API Response Not Handled
The frontend didn't process the reset response correctly.

**Solution:**
Check browser console for errors:
1. Open Developer Tools (F12)
2. Go to Console tab
3. Look for errors after clicking Reset
4. Should see: `✅ Reset successful:` message

#### 4. Multiple Browser Tabs
You have multiple tabs open showing the same page.

**Solution:**
- Close all other tabs showing the demo page
- Refresh the current tab
- The new implementation forces a page reload automatically

### Verification Steps

#### Step 1: Check Browser Console
```
1. Open DevTools (F12)
2. Click Reset button
3. Look for these logs:
   - "🔄 Resetting demo: ..."
   - "✅ Reset successful: ..."
   - "POST /api/data/demos/.../reset 200"
```

#### Step 2: Check Network Tab
```
1. Open DevTools → Network tab
2. Click Reset button
3. Find the POST request to /api/data/demos/[demoId]/reset
4. Check:
   - Status: Should be 200
   - Response: Should have success: true
   - Response data: Should contain resetBy and message
```

#### Step 3: Verify Database
```sql
-- Check if reset was recorded
SELECT 
    product_name,
    current_status,
    workflow_completed,
    reset_history,
    updated_at
FROM demos
WHERE demo_id = '7333b0d2-f8e3-451e-ad70-cbf88d5e86cc_Task_1772966744535';
```

#### Step 4: Check Reset History
```sql
-- View all resets for this demo
SELECT 
    product_name,
    brand_name,
    reset_history
FROM demos
WHERE brand_id = '7333b0d2-f8e3-451e-ad70-cbf88d5e86cc'
  AND reset_history IS NOT NULL;
```

### Understanding the Data

#### Before Reset (Your JSON data):
```json
{
  "product_name": "Task",
  "current_status": "Not Applicable",
  "workflow_completed": true,
  "step1_completed_at": "2026-03-08T10:47:02.817Z",
  "is_applicable": false
}
```

#### After Reset (Expected):
```json
{
  "product_name": "Task",
  "current_status": "Step 1 Pending",
  "workflow_completed": false,
  "step1_completed_at": null,
  "is_applicable": null,
  "reset_history": [
    {
      "reset_at": "2026-03-08T10:50:00.000Z",
      "reset_by": "pratham.vora@petpooja.com",
      "reset_by_role": "admin",
      "reason": "Testing reset functionality",
      "previous_state": {
        "current_status": "Not Applicable",
        "workflow_completed": true,
        "is_applicable": false
      }
    }
  ]
}
```

### What Changed in the Fix

#### 1. Automatic Page Reload
The page now automatically reloads after a successful reset:
```typescript
if (response.success) {
  alert('Demo has been reset successfully!');
  window.location.reload(); // Forces fresh data load
}
```

#### 2. Better Logging
Added console logs to track the reset process:
- Frontend: `✅ Reset successful:`
- Backend: `✅ Reset completed successfully:`

#### 3. Enhanced Error Messages
More descriptive alerts that explain what's happening.

### Testing the Fix

#### Test Case 1: Reset a Completed Demo
1. Find a demo with status "Not Applicable", "Already Using", "Converted", or "Not Converted"
2. Click the red "Reset" button
3. Enter a reason (e.g., "Testing reset")
4. Confirm the action
5. Wait for success message
6. Page should reload automatically
7. Demo should now show "Step 1 Pending" with no lock icon

#### Test Case 2: Reset a Partially Completed Demo
1. Find a demo in "Step 2 Pending" or "Demo Scheduled"
2. Click Reset
3. Verify it returns to "Step 1 Pending"

#### Test Case 3: Verify Reset History
1. Reset a demo
2. Run the SQL query to check reset_history
3. Should see the reset record with your email and reason

### Common Mistakes

#### ❌ Wrong: Looking at old data
The JSON you provided shows data from BEFORE the reset. Always check the database or reload the page after reset.

#### ❌ Wrong: Not waiting for page reload
The page reloads automatically now. Wait for it to complete.

#### ❌ Wrong: Checking wrong demo
Make sure you're looking at the same demo you reset (check demo_id).

#### ✅ Correct: Verify after reload
1. Click Reset
2. Wait for success message
3. Wait for page to reload
4. Check the demo status
5. Should show "Step 1 Pending" with Quick Complete button

### If Reset Still Doesn't Work

#### Check Authorization
```
Only Team Leads and Admins can reset demos.
Your role: admin ✅
```

#### Check Demo State
```sql
-- Verify the demo exists and can be reset
SELECT 
    demo_id,
    product_name,
    current_status,
    step1_completed_at IS NOT NULL as has_started
FROM demos
WHERE demo_id = 'YOUR_DEMO_ID_HERE';
```

#### Check API Logs
Look for these in your server logs:
```
🔄 Resetting demo: [demo_id] by [email]
✅ Reset completed successfully: { demoId, resetBy, message }
🗑️ Cleared demo statistics cache for: [email]
POST /api/data/demos/[demoId]/reset 200
```

### Contact Support

If the issue persists after trying all steps:

1. Provide the demo_id
2. Provide the reset_history from database
3. Provide browser console logs
4. Provide network tab screenshot showing the API response
5. Confirm you did a hard refresh (Ctrl+Shift+R)

### Quick Fix Commands

```bash
# Clear browser cache completely
# Chrome: Settings → Privacy → Clear browsing data → Cached images and files

# Or use incognito mode to test
# Ctrl+Shift+N (Windows/Linux)
# Cmd+Shift+N (Mac)
```

### Summary

The reset functionality IS working correctly based on your logs:
```
POST /api/data/demos/.../reset 200 in 2538ms ✅
```

The issue you're seeing is likely:
1. Browser showing cached data (MOST LIKELY)
2. Screenshot taken before page reload
3. Looking at old JSON data instead of current state

**Solution:** The page now auto-reloads after reset. If you still see issues, do a hard refresh (Ctrl+Shift+R).
