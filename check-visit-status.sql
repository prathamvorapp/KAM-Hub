-- Check the current status of the Biryani Zone visit
SELECT 
  visit_id,
  brand_name,
  agent_name,
  visit_status,
  approval_status,
  mom_shared,
  mom_shared_date,
  approved_by,
  approved_at,
  scheduled_date
FROM visits
WHERE brand_name = 'Biryani Zone'
  AND agent_name = 'Jinal Chavda'
ORDER BY scheduled_date DESC
LIMIT 5;

-- Check all visits for Jinal Chavda
SELECT 
  visit_id,
  brand_name,
  visit_status,
  approval_status,
  mom_shared,
  scheduled_date
FROM visits
WHERE agent_name = 'Jinal Chavda'
ORDER BY scheduled_date DESC;
