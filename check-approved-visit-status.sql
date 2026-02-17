-- Check the visit_status of approved visits
SELECT 
  visit_id,
  brand_name,
  agent_name,
  visit_status,
  approval_status,
  mom_shared,
  approved_at,
  scheduled_date
FROM visits
WHERE team_name = 'South_1 Team'
  AND visit_year = '2026'
  AND approval_status = 'Approved'
ORDER BY approved_at DESC;
