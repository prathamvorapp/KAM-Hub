-- Check if the demo_id matches what we're trying to reset
SELECT 
    demo_id,
    product_name,
    current_status,
    workflow_completed,
    updated_at
FROM demos
WHERE brand_id = '7333b0d2-f8e3-451e-ad70-cbf88d5e86cc'
  AND product_name = 'Task';

-- The demo_id from the logs was:
-- 7333b0d2-f8e3-451e-ad70-cbf88d5e86cc_Task_1772966744535
-- 
-- Check if this matches the demo_id in the database

-- Also check if there are multiple Task demos for this brand
SELECT COUNT(*) as task_demo_count
FROM demos
WHERE brand_id = '7333b0d2-f8e3-451e-ad70-cbf88d5e86cc'
  AND product_name = 'Task';
