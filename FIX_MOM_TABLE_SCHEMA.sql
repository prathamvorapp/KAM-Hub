-- Fix MOM Table Schema
-- Run this in your Supabase SQL Editor

-- Check if the 'team' column exists in the mom table
-- If this query returns 0, the column doesn't exist and needs to be added
SELECT COUNT(*) 
FROM information_schema.columns 
WHERE table_name = 'mom' 
AND column_name = 'team';

-- Add the 'team' column if it doesn't exist
ALTER TABLE mom 
ADD COLUMN IF NOT EXISTS team TEXT;

-- Check if the 'open_points' column is JSONB type
-- It should be JSONB to store array of objects
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'mom' 
AND column_name = 'open_points';

-- If open_points is not JSONB, you might need to convert it
-- (Only run this if the above query shows it's not JSONB)
-- ALTER TABLE mom 
-- ALTER COLUMN open_points TYPE JSONB USING open_points::JSONB;

-- Verify all required columns exist
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'mom'
ORDER BY ordinal_position;

-- Expected columns:
-- ticket_id (TEXT, NOT NULL, PRIMARY KEY)
-- title (TEXT)
-- description (TEXT)
-- status (TEXT)
-- priority (TEXT)
-- category (TEXT)
-- created_by (TEXT)
-- team (TEXT) <- This is critical for Team Lead filtering
-- brand_name (TEXT)
-- customer_name (TEXT)
-- visit_id (TEXT)
-- open_points (JSONB)
-- is_resubmission (BOOLEAN)
-- resubmission_notes (TEXT)
-- created_at (TIMESTAMP)
-- updated_at (TIMESTAMP)
