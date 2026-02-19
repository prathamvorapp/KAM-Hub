-- Find brands that don't have demos initialized
-- These are brands in master_data that don't have corresponding records in demos table

SELECT 
  m.id as brand_id,
  m.brand_name,
  m.kam_name,
  m.kam_email_id,
  up.team_name,
  m.zone,
  m.brand_state,
  COUNT(d.demo_id) as demo_count
FROM master_data m
LEFT JOIN demos d ON m.id::text = d.brand_id
LEFT JOIN user_profiles up ON m.kam_email_id = up.email
WHERE up.team_name = 'South_1 Team'
GROUP BY m.id, m.brand_name, m.kam_name, m.kam_email_id, up.team_name, m.zone, m.brand_state
HAVING COUNT(d.demo_id) = 0
ORDER BY m.brand_name
LIMIT 50;

-- Summary: How many brands need demo initialization
SELECT 
  up.team_name,
  COUNT(DISTINCT m.id) as brands_without_demos
FROM master_data m
LEFT JOIN demos d ON m.id::text = d.brand_id
LEFT JOIN user_profiles up ON m.kam_email_id = up.email
WHERE up.team_name = 'South_1 Team'
  AND d.demo_id IS NULL
GROUP BY up.team_name;

-- Check total brands vs brands with demos for South_1 Team
SELECT 
  'Total Brands' as category,
  COUNT(DISTINCT m.id) as count
FROM master_data m
JOIN user_profiles up ON m.kam_email_id = up.email
WHERE up.team_name = 'South_1 Team'

UNION ALL

SELECT 
  'Brands with Demos' as category,
  COUNT(DISTINCT d.brand_id) as count
FROM demos d
WHERE d.team_name = 'South_1 Team';
