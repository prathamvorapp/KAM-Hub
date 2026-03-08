-- Check the exact state of the Task demo
SELECT 
    demo_id,
    product_name,
    current_status,
    workflow_completed,
    is_applicable,
    non_applicable_reason,
    step1_completed_at,
    usage_status,
    step2_completed_at,
    demo_scheduled_date,
    demo_completed,
    conversion_status,
    created_at,
    updated_at
FROM demos
WHERE brand_id = '7333b0d2-f8e3-451e-ad70-cbf88d5e86cc'
  AND product_name = 'Task';

-- This will show us all the fields to understand why the reset didn't work
