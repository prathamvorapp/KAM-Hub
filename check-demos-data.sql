-- Check demos for South_1 Team
SELECT 
  demo_id,
  brand_name,
  brand_id,
  product_name,
  agent_name,
  team_name,
  current_status,
  workflow_completed
FROM demos
WHERE team_name = 'South_1 Team'
ORDER BY brand_name, product_name;

-- Count demos by brand for South_1 Team
SELECT 
  brand_name,
  brand_id,
  COUNT(*) as demo_count,
  COUNT(CASE WHEN workflow_completed = true THEN 1 END) as completed_count,
  COUNT(CASE WHEN conversion_status = 'Converted' THEN 1 END) as converted_count
FROM demos
WHERE team_name = 'South_1 Team'
GROUP BY brand_name, brand_id
ORDER BY brand_name;

-- Check all demos statistics
SELECT 
  current_status,
  COUNT(*) as count
FROM demos
WHERE team_name = 'South_1 Team'
GROUP BY current_status
ORDER BY current_status;

-- Check if brand_id matches master_data id
SELECT 
  d.brand_name,
  d.brand_id as demo_brand_id,
  m.id as master_data_id,
  CASE WHEN d.brand_id = m.id THEN 'MATCH' ELSE 'MISMATCH' END as match_status
FROM demos d
LEFT JOIN master_data m ON d.brand_name = m.brand_name
WHERE d.team_name = 'South_1 Team'
GROUP BY d.brand_name, d.brand_id, m.id
ORDER BY d.brand_name;
