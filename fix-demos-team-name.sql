-- Update demos table to set team_name based on agent's current team
-- This will fix demos that were created before agents had team assignments

UPDATE demos
SET team_name = up.team_name,
    updated_at = NOW()
FROM user_profiles up
WHERE demos.agent_id = up.email
  AND (demos.team_name IS NULL OR demos.team_name != up.team_name);

-- Verify the update
SELECT 
  'After Update' as status,
  team_name,
  COUNT(*) as demo_count
FROM demos
GROUP BY team_name
ORDER BY demo_count DESC;

-- Check South_1 Team demos specifically
SELECT 
  COUNT(*) as south_1_team_demos
FROM demos
WHERE team_name = 'South_1 Team';
