-- Update existing MOM records that have 'General' category but are actually Visit MOMs
-- These are MOMs that have a visit_id (indicating they're from visits)

UPDATE mom
SET category = 'Visit MOM'
WHERE category = 'General' 
  AND visit_id IS NOT NULL
  AND title LIKE 'Visit MOM%';

-- Verify the update
SELECT 
  ticket_id,
  title,
  category,
  visit_id,
  brand_name,
  created_at
FROM mom
WHERE visit_id IS NOT NULL
ORDER BY created_at DESC
LIMIT 10;
