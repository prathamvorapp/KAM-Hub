-- Check Visit Status After MOM Submission
-- Run this in your Supabase SQL Editor

-- Check the specific visit that Jinal submitted MOM for
SELECT 
    visit_id,
    brand_name,
    agent_name,
    team_name,
    visit_status,
    approval_status,
    mom_shared,
    mom_shared_date,
    scheduled_date,
    created_at,
    updated_at
FROM visits
WHERE visit_id = '1cd5d630-6da1-4be3-a5be-afef01eb92ab';

-- Expected result:
-- visit_status: 'Pending'
-- approval_status: 'Pending'
-- mom_shared: 'Yes'
-- team_name: 'South_1 Team'

-- Check all pending visits for South_1 Team
SELECT 
    visit_id,
    brand_name,
    agent_name,
    visit_status,
    approval_status,
    mom_shared
FROM visits
WHERE team_name = 'South_1 Team'
AND visit_status = 'Pending'
ORDER BY mom_shared_date DESC;

-- Check if the MOM was created
SELECT 
    ticket_id,
    brand_name,
    created_by,
    team,
    visit_id,
    status,
    created_at
FROM mom
WHERE visit_id = '1cd5d630-6da1-4be3-a5be-afef01eb92ab';

-- Expected result:
-- team: 'South_1 Team'
-- created_by: 'jinal.chavda@petpooja.com'
-- visit_id: '1cd5d630-6da1-4be3-a5be-afef01eb92ab'
