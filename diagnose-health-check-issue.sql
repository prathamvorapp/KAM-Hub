-- Diagnostic queries for health check issue
-- Run these queries in Supabase SQL Editor to diagnose the problem

-- 1. Check the logged-in user's profile
SELECT email, full_name, role, team_name
FROM user_profiles
WHERE email = '[USER_EMAIL]'; -- Replace with actual user email

-- 2. Check total brands assigned to this user in master_data
SELECT COUNT(*) as total_brands, kam_email_id
FROM master_data
WHERE kam_email_id = '[USER_EMAIL]' -- Replace with actual user email
GROUP BY kam_email_id;

-- 3. Check sample brands from master_data for this user
SELECT brand_name, kam_email_id, zone, brand_state
FROM master_data
WHERE kam_email_id = '[USER_EMAIL]' -- Replace with actual user email
LIMIT 10;

-- 4. Check health checks for current month
SELECT brand_name, kam_email, assessment_month, created_by
FROM health_checks
WHERE assessment_month = '2026-02' -- Current month from screenshot
  AND kam_email = '[USER_EMAIL]'; -- Replace with actual user email

-- 5. Check for brand name mismatches (case sensitivity, whitespace)
SELECT 
  md.brand_name as master_data_brand,
  hc.brand_name as health_check_brand,
  md.brand_name = hc.brand_name as exact_match,
  LOWER(TRIM(md.brand_name)) = LOWER(TRIM(hc.brand_name)) as normalized_match
FROM master_data md
LEFT JOIN health_checks hc 
  ON LOWER(TRIM(md.brand_name)) = LOWER(TRIM(hc.brand_name))
  AND hc.assessment_month = '2026-02'
WHERE md.kam_email_id = '[USER_EMAIL]' -- Replace with actual user email
LIMIT 20;

-- 6. Find brands that should be pending (in master_data but not in health_checks)
SELECT md.brand_name, md.kam_email_id, md.zone
FROM master_data md
WHERE md.kam_email_id = '[USER_EMAIL]' -- Replace with actual user email
  AND NOT EXISTS (
    SELECT 1 
    FROM health_checks hc 
    WHERE LOWER(TRIM(hc.brand_name)) = LOWER(TRIM(md.brand_name))
      AND hc.assessment_month = '2026-02'
      AND hc.kam_email = '[USER_EMAIL]' -- Replace with actual user email
  )
LIMIT 50;

-- 7. Check if there's a role/team mismatch
SELECT 
  up.email,
  up.role,
  up.team_name,
  COUNT(DISTINCT md.brand_name) as brands_in_master_data,
  COUNT(DISTINCT hc.brand_name) as brands_assessed
FROM user_profiles up
LEFT JOIN master_data md ON md.kam_email_id = up.email
LEFT JOIN health_checks hc ON hc.kam_email = up.email AND hc.assessment_month = '2026-02'
WHERE up.email = '[USER_EMAIL]' -- Replace with actual user email
GROUP BY up.email, up.role, up.team_name;
