-- Check agent counts by role and active status
-- This will help identify why only 53 agents are showing

-- 1. Count agents by role (case-sensitive)
SELECT 
  role,
  is_active,
  COUNT(*) as count
FROM user_profiles
WHERE role ILIKE '%agent%'
GROUP BY role, is_active
ORDER BY role, is_active;

-- 2. Total agents regardless of active status
SELECT 
  COUNT(*) as total_agents
FROM user_profiles
WHERE role IN ('agent', 'Agent', 'AGENT');

-- 3. Active agents only
SELECT 
  COUNT(*) as active_agents
FROM user_profiles
WHERE role IN ('agent', 'Agent', 'AGENT')
  AND is_active = true;

-- 4. Inactive agents
SELECT 
  COUNT(*) as inactive_agents
FROM user_profiles
WHERE role IN ('agent', 'Agent', 'AGENT')
  AND (is_active = false OR is_active IS NULL);

-- 5. List all agents with their status
SELECT 
  email,
  full_name,
  role,
  is_active,
  team_name
FROM user_profiles
WHERE role ILIKE '%agent%'
ORDER BY is_active DESC, full_name;

-- 6. Check brand counts
SELECT COUNT(*) as total_brands FROM master_data;

-- 7. Check brands assigned to agents
SELECT 
  COUNT(DISTINCT brand_name) as brands_with_agents
FROM master_data
WHERE kam_email_id IS NOT NULL;

-- 8. Check brands without agents
SELECT 
  COUNT(DISTINCT brand_name) as brands_without_agents
FROM master_data
WHERE kam_email_id IS NULL;
