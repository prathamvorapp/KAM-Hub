-- Check if user exists in user_profiles
SELECT id, email, auth_id, role, full_name 
FROM user_profiles 
WHERE email = 'shaikh.farhan@petpooja.com';

-- If the user exists but auth_id is NULL, update it:
UPDATE user_profiles
SET auth_id = 'a7d82a82-2c0b-49df-ab62-f3fa96335ec9',
    updated_at = NOW()
WHERE email = 'shaikh.farhan@petpooja.com'
  AND auth_id IS NULL;

-- Verify the update
SELECT id, email, auth_id, role, full_name 
FROM user_profiles 
WHERE email = 'shaikh.farhan@petpooja.com';
