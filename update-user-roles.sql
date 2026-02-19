-- Update User Roles and Teams
-- Run this in Supabase SQL Editor

-- Update Shaikh Mohammad Farhan
UPDATE user_profiles
SET 
  full_name = 'Shaikh Mohammad Farhan',
  role = 'team_lead',
  team_name = 'South_1 Team',
  updated_at = NOW()
WHERE email = 'shaikh.farhan@petpooja.com';

-- Update Helly Gandhi
UPDATE user_profiles
SET 
  full_name = 'Helly Gandhi',
  role = 'admin',
  team_name = NULL,
  updated_at = NOW()
WHERE email = 'helly.gandhi@petpooja.com';

-- Update Sagar Prakashkumar Kothari
UPDATE user_profiles
SET 
  full_name = 'Sagar Prakashkumar Kothari',
  role = 'team_lead',
  team_name = 'South_2 Team',
  updated_at = NOW()
WHERE email = 'sagar.kothari@petpooja.com';

-- Update Dwivedi Snehal
UPDATE user_profiles
SET 
  full_name = 'Dwivedi Snehal',
  role = 'team_lead',
  team_name = 'North-East Team',
  updated_at = NOW()
WHERE email = 'snehal.dwivedi@petpooja.com';

-- Update Pratham Jatilbhai Vora
UPDATE user_profiles
SET 
  full_name = 'Pratham Jatilbhai Vora',
  role = 'admin',
  team_name = NULL,
  updated_at = NOW()
WHERE email = 'pratham.vora@petpooja.com';

-- Update Ranjan Singh
UPDATE user_profiles
SET 
  full_name = 'Ranjan Singh',
  role = 'admin',
  team_name = 'BO Team',
  updated_at = NOW()
WHERE email = 'ranjan.singh@petpooja.com';

-- Update Akash Yedur
UPDATE user_profiles
SET 
  full_name = 'Akash Yedur',
  role = 'team_lead',
  team_name = 'BO Team',
  updated_at = NOW()
WHERE email = 'akash.yedur@petpooja.com';

-- Update Manisha Balotiya
UPDATE user_profiles
SET 
  full_name = 'Manisha Balotiya',
  role = 'team_lead',
  team_name = 'Central-West Team',
  updated_at = NOW()
WHERE email = 'manisha.balotiya@petpooja.com';

-- Verify updates
SELECT email, full_name, role, team_name, auth_id
FROM user_profiles
WHERE email IN (
  'shaikh.farhan@petpooja.com',
  'helly.gandhi@petpooja.com',
  'sagar.kothari@petpooja.com',
  'snehal.dwivedi@petpooja.com',
  'pratham.vora@petpooja.com',
  'ranjan.singh@petpooja.com',
  'akash.yedur@petpooja.com',
  'manisha.balotiya@petpooja.com'
)
ORDER BY role, email;
