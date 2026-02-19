-- Investigate why only 1298 brands are showing instead of 1366

-- 1. Total count of all records in master_data
SELECT COUNT(*) as total_records FROM master_data;

-- 2. Count distinct brand names (in case there are duplicates)
SELECT COUNT(DISTINCT brand_name) as distinct_brands FROM master_data;

-- 3. Check for NULL brand names
SELECT COUNT(*) as null_brand_names 
FROM master_data 
WHERE brand_name IS NULL OR brand_name = '';

-- 4. Check for duplicate brand names
SELECT 
  brand_name,
  COUNT(*) as count
FROM master_data
WHERE brand_name IS NOT NULL
GROUP BY brand_name
HAVING COUNT(*) > 1
ORDER BY count DESC
LIMIT 20;

-- 5. Count brands by various conditions
SELECT 
  COUNT(*) as total_rows,
  COUNT(DISTINCT brand_name) as distinct_brands,
  COUNT(DISTINCT CASE WHEN kam_email_id IS NOT NULL THEN brand_name END) as brands_with_agent,
  COUNT(DISTINCT CASE WHEN kam_email_id IS NULL THEN brand_name END) as brands_without_agent
FROM master_data;

-- 6. Check if there are any soft-deleted or inactive brands
SELECT 
  column_name, 
  data_type 
FROM information_schema.columns 
WHERE table_name = 'master_data' 
  AND (column_name LIKE '%active%' OR column_name LIKE '%deleted%' OR column_name LIKE '%status%')
ORDER BY column_name;

-- 7. Sample of brands to see the data structure
SELECT 
  brand_name,
  kam_email_id,
  kam_name
FROM master_data
LIMIT 10;
