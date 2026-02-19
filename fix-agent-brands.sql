-- Fix Agent Brand Assignment
-- This script helps assign brands to agents who have none

-- STEP 1: Check current situation
SELECT 
    'Current Status' as step,
    COUNT(*) as brand_count
FROM master_data
WHERE kam_email_id = 'jinal.chavda@petpooja.com';

-- STEP 2: Find unassigned brands or brands from inactive agents
SELECT 
    brand_name,
    kam_email_id,
    kam_name,
    zone,
    brand_state,
    outlet_counts
FROM master_data
WHERE kam_email_id IS NULL 
   OR kam_email_id = ''
   OR kam_email_id NOT IN (
       SELECT email FROM user_profiles WHERE is_active = true
   )
LIMIT 50;

-- STEP 3: Example - Assign specific brands to the agent
-- UNCOMMENT AND MODIFY THE BRANDS YOU WANT TO ASSIGN:

/*
UPDATE master_data
SET kam_email_id = 'jinal.chavda@petpooja.com'
WHERE brand_name IN (
    'Brand Name 1',
    'Brand Name 2',
    'Brand Name 3'
);
*/

-- STEP 4: Or assign brands by zone
-- UNCOMMENT AND MODIFY THE ZONE:

/*
UPDATE master_data
SET kam_email_id = 'jinal.chavda@petpooja.com'
WHERE zone = 'North'
  AND (kam_email_id IS NULL OR kam_email_id = '')
LIMIT 10;
*/

-- STEP 5: Verify the assignment
SELECT 
    'After Assignment' as step,
    COUNT(*) as brand_count
FROM master_data
WHERE kam_email_id = 'jinal.chavda@petpooja.com';

-- STEP 6: Check the brands assigned
SELECT 
    brand_name,
    kam_name,
    zone,
    brand_state,
    outlet_counts
FROM master_data
WHERE kam_email_id = 'jinal.chavda@petpooja.com'
ORDER BY brand_name;

-- ALTERNATIVE: Reassign brands from another agent
-- UNCOMMENT AND MODIFY:

/*
-- First, check which agent has brands
SELECT 
    kam_email_id,
    COUNT(*) as brand_count
FROM master_data
GROUP BY kam_email_id
HAVING COUNT(*) > 0
ORDER BY brand_count DESC;

-- Then reassign some brands
UPDATE master_data
SET kam_email_id = 'jinal.chavda@petpooja.com'
WHERE kam_email_id = 'other.agent@petpooja.com'
  AND brand_name IN (
      'Brand to reassign 1',
      'Brand to reassign 2'
  );
*/

-- STEP 7: Clear cache after assignment (run in application)
-- The application caches data for 5 minutes
-- Either wait 5 minutes or restart the application
-- Or manually clear the cache by changing the month and back
