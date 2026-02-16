-- =====================================================
-- Master Data Duplicate Analysis Script
-- =====================================================
-- This script identifies duplicate records in master_data table
-- Expected: 1390 records
-- Current: 2129 records
-- Difference: 739 potential duplicates
-- =====================================================

-- 1. Check total count
SELECT COUNT(*) as total_records FROM master_data;

-- 2. Find duplicate brand_name + kam_email_id combinations
SELECT 
    brand_name,
    kam_email_id,
    COUNT(*) as duplicate_count,
    STRING_AGG(id::text, ', ') as duplicate_ids
FROM master_data
GROUP BY brand_name, kam_email_id
HAVING COUNT(*) > 1
ORDER BY duplicate_count DESC;

-- 3. Find duplicate brand_email_id (if not null)
SELECT 
    brand_email_id,
    COUNT(*) as duplicate_count,
    STRING_AGG(brand_name, ', ') as brand_names,
    STRING_AGG(id::text, ', ') as duplicate_ids
FROM master_data
WHERE brand_email_id IS NOT NULL
GROUP BY brand_email_id
HAVING COUNT(*) > 1
ORDER BY duplicate_count DESC;

-- 4. Find exact duplicate rows (all fields match)
SELECT 
    brand_name,
    brand_email_id,
    kam_name,
    kam_email_id,
    brand_state,
    zone,
    outlet_counts,
    COUNT(*) as duplicate_count,
    STRING_AGG(id::text, ', ') as duplicate_ids,
    MIN(created_at) as first_created,
    MAX(created_at) as last_created
FROM master_data
GROUP BY 
    brand_name,
    brand_email_id,
    kam_name,
    kam_email_id,
    brand_state,
    zone,
    outlet_counts
HAVING COUNT(*) > 1
ORDER BY duplicate_count DESC;

-- 5. Count unique brands by brand_name only
SELECT COUNT(DISTINCT brand_name) as unique_brand_names FROM master_data;

-- 6. Count unique brands by brand_name + kam_email_id
SELECT COUNT(*) as unique_brand_kam_combinations
FROM (
    SELECT DISTINCT brand_name, kam_email_id
    FROM master_data
) as unique_combos;

-- 7. Show sample of duplicates with all details
SELECT 
    id,
    brand_name,
    brand_email_id,
    kam_name,
    kam_email_id,
    brand_state,
    zone,
    outlet_counts,
    created_at,
    updated_at
FROM master_data
WHERE brand_name IN (
    SELECT brand_name
    FROM master_data
    GROUP BY brand_name, kam_email_id
    HAVING COUNT(*) > 1
    LIMIT 5
)
ORDER BY brand_name, created_at;

-- 8. Statistics by zone
SELECT 
    zone,
    COUNT(*) as total_records,
    COUNT(DISTINCT brand_name) as unique_brands
FROM master_data
GROUP BY zone
ORDER BY total_records DESC;

-- 9. Statistics by KAM
SELECT 
    kam_name,
    kam_email_id,
    COUNT(*) as total_records,
    COUNT(DISTINCT brand_name) as unique_brands
FROM master_data
GROUP BY kam_name, kam_email_id
ORDER BY total_records DESC;
