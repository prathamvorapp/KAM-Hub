-- Verify Demo Creation After MOM Submission
-- Run this after submitting a MOM with demo data

-- 1. Check if the brand exists in master_data
SELECT 
  id as brand_id,
  brand_name,
  kam_email_id,
  kam_name
FROM master_data 
WHERE brand_name = 'Demo'  -- Replace 'Demo' with your actual brand name
LIMIT 1;

-- 2. Check recent demos created (last hour)
SELECT 
  demo_id,
  brand_name,
  product_name,
  is_applicable,
  demo_scheduled_date,
  demo_completed,
  conversion_status,
  current_status,
  created_at,
  updated_at
FROM demos
WHERE created_at > NOW() - INTERVAL '1 hour'
ORDER BY created_at DESC;

-- 3. Check demos for specific brand
SELECT 
  demo_id,
  product_name,
  is_applicable,
  non_applicable_reason,
  demo_scheduled_date,
  demo_completed,
  demo_conducted_by,
  conversion_status,
  current_status,
  workflow_completed,
  created_at
FROM demos
WHERE brand_name = 'Demo'  -- Replace with your brand name
ORDER BY created_at DESC;

-- 4. Check recent visits for the brand
SELECT 
  visit_id,
  brand_name,
  brand_id,
  agent_id,
  visit_status,
  mom_shared,
  approval_status,
  created_at
FROM visits
WHERE brand_name = 'Demo'  -- Replace with your brand name
ORDER BY created_at DESC
LIMIT 5;

-- 5. Count demos by status for the brand
SELECT 
  current_status,
  COUNT(*) as count
FROM demos
WHERE brand_name = 'Demo'  -- Replace with your brand name
GROUP BY current_status
ORDER BY count DESC;

-- 6. Check if demos were created today
SELECT 
  brand_name,
  product_name,
  current_status,
  created_at
FROM demos
WHERE DATE(created_at) = CURRENT_DATE
  AND brand_name = 'Demo'  -- Replace with your brand name
ORDER BY created_at DESC;
