-- Check visits for Shaikh Mohammad Farhan's team
SELECT 
  visit_id,
  brand_name,
  agent_name,
  scheduled_date,
  visit_status,
  approval_status,
  mom_shared,
  visit_year
FROM visits
WHERE team_name = 'South_1 Team'
  AND visit_year = '2026'
  AND visit_status != 'Cancelled'
ORDER BY scheduled_date DESC;

-- Count by status
SELECT 
  visit_status,
  approval_status,
  COUNT(*) as count
FROM visits
WHERE team_name = 'South_1 Team'
  AND visit_year = '2026'
  AND visit_status != 'Cancelled'
GROUP BY visit_status, approval_status
ORDER BY visit_status, approval_status;

-- Check unique brands with approved MOMs
SELECT 
  brand_name,
  COUNT(*) as visit_count,
  COUNT(CASE WHEN approval_status = 'Approved' THEN 1 END) as approved_count
FROM visits
WHERE team_name = 'South_1 Team'
  AND visit_year = '2026'
  AND visit_status != 'Cancelled'
GROUP BY brand_name
ORDER BY brand_name;
