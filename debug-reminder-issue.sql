-- Debug: Check what reminders Rahul should see
-- Rahul's email: rahul.taak@petpooja.com

-- 1. Check Rahul's profile
SELECT 'Rahul Profile' as check_type, email, full_name, role, team_name
FROM user_profiles
WHERE email = 'rahul.taak@petpooja.com';

-- 2. Check all overdue reminders for Kinab Shah
SELECT 'Kinab Reminders' as check_type, rid, restaurant_name, kam, 
       next_reminder_time, follow_up_status,
       CASE 
         WHEN next_reminder_time::timestamp <= NOW() THEN 'OVERDUE'
         ELSE 'NOT OVERDUE'
       END as actual_status
FROM churn_records
WHERE kam = 'Kinab Shah'
  AND follow_up_status = 'INACTIVE'
  AND next_reminder_time IS NOT NULL;

-- 3. Check all overdue reminders for Rahul Taak
SELECT 'Rahul Reminders' as check_type, rid, restaurant_name, kam, 
       next_reminder_time, follow_up_status,
       CASE 
         WHEN next_reminder_time::timestamp <= NOW() THEN 'OVERDUE'
         ELSE 'NOT OVERDUE'
       END as actual_status
FROM churn_records
WHERE kam = 'Rahul Taak'
  AND follow_up_status = 'INACTIVE'
  AND next_reminder_time IS NOT NULL;

-- 4. Check the specific record (399890)
SELECT 'Specific Record' as check_type, rid, restaurant_name, kam, 
       next_reminder_time, 
       NOW() as current_time,
       follow_up_status,
       CASE 
         WHEN next_reminder_time::timestamp <= NOW() THEN 'OVERDUE'
         ELSE 'NOT OVERDUE'
       END as actual_status
FROM churn_records
WHERE rid = '399890';
