-- Fix MOM Category Check Constraint
-- Run this in your Supabase SQL Editor

-- Option 1: Check what values are currently allowed
SELECT con.conname AS constraint_name,
       pg_get_constraintdef(con.oid) AS constraint_definition
FROM pg_constraint con
JOIN pg_class rel ON rel.oid = con.conrelid
WHERE rel.relname = 'mom'
AND con.contype = 'c'
AND con.conname LIKE '%category%';

-- Option 2: Drop the existing constraint and add a new one that includes 'Visit MOM'
ALTER TABLE mom 
DROP CONSTRAINT IF EXISTS mom_category_check;

-- Add new constraint that allows 'Visit MOM' category
ALTER TABLE mom 
ADD CONSTRAINT mom_category_check 
CHECK (category IN ('General', 'Support', 'Bug', 'Feature', 'Visit MOM', 'Other'));

-- Option 3: If you want to remove the constraint entirely (not recommended)
-- ALTER TABLE mom DROP CONSTRAINT IF EXISTS mom_category_check;

-- Verify the constraint was updated
SELECT con.conname AS constraint_name,
       pg_get_constraintdef(con.oid) AS constraint_definition
FROM pg_constraint con
JOIN pg_class rel ON rel.oid = con.conrelid
WHERE rel.relname = 'mom'
AND con.contype = 'c'
AND con.conname LIKE '%category%';
