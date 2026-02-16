-- =====================================================
-- Master Data Duplicate Removal Script
-- =====================================================
-- IMPORTANT: Run check-master-data-duplicates.sql first
-- to understand what duplicates exist before running this!
-- 
-- This script removes duplicate records keeping the oldest
-- record (earliest created_at) for each unique combination
-- =====================================================

-- STEP 1: Create a backup table (RECOMMENDED)
CREATE TABLE master_data_backup_before_dedup AS
SELECT * FROM master_data;

-- Verify backup
SELECT COUNT(*) as backup_count FROM master_data_backup_before_dedup;

-- STEP 2: Preview what will be deleted
-- This shows records that will be removed (keeping oldest)
WITH ranked_records AS (
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
        ROW_NUMBER() OVER (
            PARTITION BY brand_name, kam_email_id 
            ORDER BY created_at ASC
        ) as rn
    FROM master_data
)
SELECT 
    COUNT(*) as records_to_delete,
    'These are duplicates that will be removed' as note
FROM ranked_records
WHERE rn > 1;

-- STEP 3: Show sample of what will be kept vs deleted
WITH ranked_records AS (
    SELECT 
        id,
        brand_name,
        kam_email_id,
        created_at,
        ROW_NUMBER() OVER (
            PARTITION BY brand_name, kam_email_id 
            ORDER BY created_at ASC
        ) as rn
    FROM master_data
)
SELECT 
    brand_name,
    kam_email_id,
    COUNT(*) as total_records,
    MIN(CASE WHEN rn = 1 THEN id END) as id_to_keep,
    MIN(CASE WHEN rn = 1 THEN created_at END) as kept_record_date,
    COUNT(CASE WHEN rn > 1 THEN 1 END) as records_to_delete
FROM ranked_records
GROUP BY brand_name, kam_email_id
HAVING COUNT(*) > 1
ORDER BY total_records DESC
LIMIT 20;

-- =====================================================
-- STEP 4: ACTUAL DELETION (UNCOMMENT TO EXECUTE)
-- =====================================================
-- WARNING: This will permanently delete duplicate records!
-- Make sure you have reviewed the preview queries above!
-- =====================================================

/*
-- Delete duplicates keeping the oldest record
WITH ranked_records AS (
    SELECT 
        id,
        ROW_NUMBER() OVER (
            PARTITION BY brand_name, kam_email_id 
            ORDER BY created_at ASC
        ) as rn
    FROM master_data
)
DELETE FROM master_data
WHERE id IN (
    SELECT id 
    FROM ranked_records 
    WHERE rn > 1
);

-- Verify the deletion
SELECT COUNT(*) as remaining_records FROM master_data;

-- Check if we hit the target of 1390
SELECT 
    COUNT(*) as current_count,
    1390 as expected_count,
    COUNT(*) - 1390 as difference
FROM master_data;
*/

-- =====================================================
-- ALTERNATIVE: Delete based on exact field matches
-- Use this if brand_name + kam_email_id is not enough
-- =====================================================

/*
WITH ranked_records AS (
    SELECT 
        id,
        ROW_NUMBER() OVER (
            PARTITION BY 
                brand_name,
                COALESCE(brand_email_id, ''),
                kam_name,
                kam_email_id,
                brand_state,
                zone,
                outlet_counts
            ORDER BY created_at ASC
        ) as rn
    FROM master_data
)
DELETE FROM master_data
WHERE id IN (
    SELECT id 
    FROM ranked_records 
    WHERE rn > 1
);
*/

-- =====================================================
-- STEP 5: Post-deletion verification
-- =====================================================

/*
-- Count remaining records
SELECT COUNT(*) as total_records FROM master_data;

-- Check for any remaining duplicates
SELECT 
    brand_name,
    kam_email_id,
    COUNT(*) as count
FROM master_data
GROUP BY brand_name, kam_email_id
HAVING COUNT(*) > 1;

-- Compare with backup
SELECT 
    (SELECT COUNT(*) FROM master_data_backup_before_dedup) as before_count,
    (SELECT COUNT(*) FROM master_data) as after_count,
    (SELECT COUNT(*) FROM master_data_backup_before_dedup) - 
    (SELECT COUNT(*) FROM master_data) as deleted_count;
*/

-- =====================================================
-- STEP 6: If satisfied, drop the backup table
-- =====================================================

/*
DROP TABLE master_data_backup_before_dedup;
*/
