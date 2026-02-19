-- Link Supabase Auth users to user_profiles
-- Run this in Supabase SQL Editor

-- This script links auth.users to user_profiles by matching email addresses

-- First, let's see what we have
SELECT 
  up.email,
  up.auth_id,
  au.id as auth_user_id,
  CASE 
    WHEN up.auth_id IS NULL THEN '❌ Not Linked'
    WHEN up.auth_id = au.id THEN '✅ Linked'
    ELSE '⚠️ Mismatch'
  END as status
FROM user_profiles up
LEFT JOIN auth.users au ON au.email = up.email
WHERE up.email IN (
  'shaikh.farhan@petpooja.com',
  'helly.gandhi@petpooja.com',
  'sagar.kothari@petpooja.com',
  'snehal.dwivedi@petpooja.com',
  'pratham.vora@petpooja.com',
  'ranjan.singh@petpooja.com',
  'akash.yedur@petpooja.com',
  'manisha.balotiya@petpooja.com'
)
ORDER BY up.email;

-- Now link them (update auth_id where it's NULL or doesn't match)
UPDATE user_profiles up
SET 
  auth_id = au.id,
  updated_at = NOW()
FROM auth.users au
WHERE au.email = up.email
  AND (up.auth_id IS NULL OR up.auth_id != au.id)
  AND up.email IN (
    'shaikh.farhan@petpooja.com',
    'helly.gandhi@petpooja.com',
    'sagar.kothari@petpooja.com',
    'snehal.dwivedi@petpooja.com',
    'pratham.vora@petpooja.com',
    'ranjan.singh@petpooja.com',
    'akash.yedur@petpooja.com',
    'manisha.balotiya@petpooja.com'
  );

-- Verify the linking
SELECT 
  up.email,
  up.full_name,
  up.role,
  up.team_name,
  up.auth_id,
  au.id as auth_user_id,
  CASE 
    WHEN up.auth_id IS NULL THEN '❌ Not Linked'
    WHEN up.auth_id = au.id THEN '✅ Linked'
    ELSE '⚠️ Mismatch'
  END as status
FROM user_profiles up
LEFT JOIN auth.users au ON au.email = up.email
WHERE up.email IN (
  'shaikh.farhan@petpooja.com',
  'helly.gandhi@petpooja.com',
  'sagar.kothari@petpooja.com',
  'snehal.dwivedi@petpooja.com',
  'pratham.vora@petpooja.com',
  'ranjan.singh@petpooja.com',
  'akash.yedur@petpooja.com',
  'manisha.balotiya@petpooja.com'
)
ORDER BY up.role, up.email;
