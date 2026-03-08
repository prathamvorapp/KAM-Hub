-- Check Rahul Taak's brand assignments
SELECT 
    kam_name,
    kam_email_id,
    COUNT(*) as total_brands,
    COUNT(DISTINCT brand_name) as unique_brands
FROM master_data
WHERE kam_email_id LIKE '%rahul%' OR kam_name LIKE '%Rahul%'
GROUP BY kam_name, kam_email_id;

-- List all brands assigned to Rahul
SELECT 
    brand_name,
    kam_name,
    kam_email_id
FROM master_data
WHERE kam_email_id LIKE '%rahul%' OR kam_name LIKE '%Rahul%'
ORDER BY brand_name;

-- Check visits for Rahul
SELECT 
    visit_status,
    COUNT(*) as count
FROM visits
WHERE agent_id LIKE '%rahul%' OR agent_name LIKE '%Rahul%'
GROUP BY visit_status;
