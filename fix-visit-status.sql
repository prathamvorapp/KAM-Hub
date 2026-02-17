-- Fix visits that have visit_status = 'Pending' but should be 'Completed'
-- These are visits where MOM was submitted (mom_shared = 'Yes') but visit_status wasn't set correctly

UPDATE visits
SET visit_status = 'Completed'
WHERE visit_status = 'Pending' 
  AND mom_shared = 'Yes'
  AND approval_status IN ('Pending', 'Approved', 'Rejected');

-- Verify the update
SELECT 
  visit_id,
  brand_name,
  agent_name,
  visit_status,
  approval_status,
  mom_shared,
  mom_shared_date
FROM visits
WHERE mom_shared = 'Yes'
ORDER BY mom_shared_date DESC
LIMIT 10;
