-- Check all demos and their team_name values
SELECT 
  demo_id,
  brand_name,
  brand_id,
  product_name,
  agent_name,
  agent_id,
  team_name,
  current_status
FROM demos
LIMIT 20;

-- Count demos by team_name
SELECT 
  team_name,
  COUNT(*) as demo_count
FROM demos
GROUP BY team_name
ORDER BY demo_count DESC;

-- Check if there are any demos with NULL team_name
SELECT 
  COUNT(*) as null_team_name_count
FROM demos
WHERE team_name IS NULL;

-- Check demos for specific agents in South_1 Team
SELECT 
  demo_id,
  brand_name,
  agent_name,
  agent_id,
  team_name
FROM demos
WHERE agent_id IN (
  'kinab.shah@petpooja.com',
  'anchal.nair@petpooja.com',
  'rahul.taak@petpooja.com',
  'aman.kota@petpooja.com',
  'arpit.acharya@petpooja.com',
  'gautam.parmar@petpooja.com',
  'antolina.francis@petpooja.com',
  'jinal.chavda@petpooja.com'
)
LIMIT 20;
