-- Diagnostic queries for Health Check Admin Dashboard issue
-- Issue: Admin dashboard showing 0 total brands

-- 1. Check all agents in user_profiles
SELECT 
  email,
  full_name,
  role,
  team_name
FROM user_profiles
WHERE LOWER(role) IN ('agent')
ORDER BY team_name, email;

-- 2. Check brand counts per agent in master_data
SELECT 
  kam_email_id,
  COUNT(*) as brand_count
FROM master_data
GROUP BY kam_email_id
ORDER BY brand_count DESC;

-- 3. Check health checks for current month
SELECT 
  kam_email,
  kam_name,
  COUNT(*) as assessment_count,
  assessment_month
FROM health_checks
WHERE assessment_month = TO_CHAR(CURRENT_DATE, 'YYYY-MM')
GROUP BY kam_email, kam_name, assessment_month
ORDER BY assessment_count DESC;

-- 4. Check if there's a mismatch between agent emails in user_profiles vs master_data
SELECT 
  up.email as agent_email,
  up.full_name,
  up.team_name,
  COUNT(md.kam_email_id) as brand_count
FROM user_profiles up
LEFT JOIN master_data md ON up.email = md.kam_email_id
WHERE LOWER(up.role) IN ('agent')
GROUP BY up.email, up.full_name, up.team_name
ORDER BY brand_count DESC;

-- 5. Check for the specific agent mentioned in the issue
SELECT 
  up.email,
  up.full_name,
  up.role,
  up.team_name,
  COUNT(md.kam_email_id) as brand_count,
  COUNT(hc.check_id) as assessment_count
FROM user_profiles up
LEFT JOIN master_data md ON up.email = md.kam_email_id
LEFT JOIN health_checks hc ON up.email = hc.kam_email AND hc.assessment_month = TO_CHAR(CURRENT_DATE, 'YYYY-MM')
WHERE up.email = 'sudhin.raveendran@petpooja.com'
GROUP BY up.email, up.full_name, up.role, up.team_name;

-- 6. Sample brands for the agent
SELECT 
  brand_name,
  kam_email_id,
  zone
FROM master_data
WHERE kam_email_id = 'sudhin.raveendran@petpooja.com'
LIMIT 10;
