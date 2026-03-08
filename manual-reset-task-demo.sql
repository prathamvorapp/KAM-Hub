-- Manual reset for the Task demo
-- Run this if the API reset didn't work

UPDATE demos
SET 
    -- Reset all workflow fields
    is_applicable = NULL,
    non_applicable_reason = NULL,
    step1_completed_at = NULL,
    usage_status = NULL,
    step2_completed_at = NULL,
    demo_scheduled_date = NULL,
    demo_scheduled_time = NULL,
    demo_rescheduled_count = 0,
    demo_scheduling_history = NULL,
    demo_completed = false,
    demo_completed_date = NULL,
    demo_conducted_by = NULL,
    demo_completion_notes = NULL,
    conversion_status = NULL,
    non_conversion_reason = NULL,
    conversion_decided_at = NULL,
    current_status = 'Step 1 Pending',
    workflow_completed = false,
    updated_at = NOW()
WHERE brand_id = '7333b0d2-f8e3-451e-ad70-cbf88d5e86cc'
  AND product_name = 'Task';

-- Verify the reset worked
SELECT 
    product_name,
    current_status,
    workflow_completed,
    step1_completed_at,
    updated_at
FROM demos
WHERE brand_id = '7333b0d2-f8e3-451e-ad70-cbf88d5e86cc'
  AND product_name = 'Task';

-- Expected result:
-- product_name: Task
-- current_status: Step 1 Pending
-- workflow_completed: false
-- step1_completed_at: NULL
-- updated_at: (current timestamp)
