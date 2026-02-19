-- Check master_data table for brands
SELECT 
  id,
  brand_name,
  kam_email_id,
  kam_name,
  zone,
  brand_state
FROM master_data
ORDER BY brand_name
LIMIT 20;

-- Check if there are any brands at all
SELECT COUNT(*) as total_brands FROM master_data;

-- Check brands for the specific admin user
SELECT 
  id,
  brand_name,
  kam_email_id,
  kam_name
FROM master_data
WHERE kam_email_id = 'pratham.vora@petpooja.com';

-- Check what kam_email_ids exist in master_data
SELECT DISTINCT kam_email_id, COUNT(*) as brand_count
FROM master_data
GROUP BY kam_email_id
ORDER BY brand_count DESC;
