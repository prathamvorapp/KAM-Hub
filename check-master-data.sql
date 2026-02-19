-- Check master_data for team members
SELECT 
  id,
  brand_name,
  kam_name,
  kam_email_id,
  zone,
  brand_state
FROM master_data
WHERE kam_email_id IN (
  SELECT email 
  FROM user_profiles 
  WHERE team_name = 'South_1 Team'
)
ORDER BY brand_name;

-- Check user profiles for South_1 Team
SELECT 
  email,
  full_name,
  role,
  team_name
FROM user_profiles
WHERE team_name = 'South_1 Team'
ORDER BY full_name;

-- Check if Shaikh Mohammad Farhan has any brands directly assigned
SELECT 
  id,
  brand_name,
  kam_name,
  kam_email_id
FROM master_data
WHERE kam_email_id = 'shaikh.farhan@petpooja.com';
