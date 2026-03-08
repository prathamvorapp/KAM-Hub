-- Verify Demo Reset Status
-- This query checks if the demo was properly reset

-- Check the Task demo for the Demo brand
SELECT 
    demo_id,
    product_name,
    brand_name,
    current_status,
    workflow_completed,
    is_applicable,
    step1_completed_at,
    usage_status,
    step2_completed_at,
    demo_scheduled_date,
    demo_completed,
    conversion_status,
    updated_at
FROM demos
WHERE brand_name = 'Demo'
  AND product_name = 'Task'
  AND brand_id = '7333b0d2-f8e3-451e-ad70-cbf88d5e86cc'
ORDER BY updated_at DESC
LIMIT 1;

-- Expected result after reset:
-- current_status: 'Step 1 Pending'
-- workflow_completed: false
-- is_applicable: null
-- step1_completed_at: null
-- usage_status: null
-- step2_completed_at: null
-- demo_scheduled_date: null
-- demo_completed: false (or null)
-- conversion_status: null

-- Check all demos for this brand
SELECT 
    product_name,
    current_status,
    workflow_completed,
    step1_completed_at IS NOT NULL as step1_done,
    updated_at
FROM demos
WHERE brand_id = '7333b0d2-f8e3-451e-ad70-cbf88d5e86cc'
ORDER BY product_name;
