-- Check Rahul Taak's profile and role
SELECT email, full_name, role, team_name, is_active
FROM user_profiles
WHERE full_name = 'Rahul Taak' OR email LIKE '%rahul%';

-- If Rahul is a Team Lead, check his team members
SELECT full_name, email, role, team_name
FROM user_profiles
WHERE team_name = (
  SELECT team_name 
  FROM user_profiles 
  WHERE full_name = 'Rahul Taak'
)
AND is_active = true;
