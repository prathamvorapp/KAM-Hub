# Master Data Duplicate Cleanup Guide

## Problem Summary
Your Supabase `master_data` table has **2,129 records** but should only have **1,390 records**.

### Analysis Results ✅
After running the analysis scripts, we found:
- **Total records**: 2,129
- **Exact duplicate groups**: 741 groups
- **Duplicate records to remove**: 743 records
- **Unique records after cleanup**: 1,386 records
- **Difference from expected (1,390)**: Only 4 records (likely normal business changes)

The duplicates are **exact matches** - all fields (brand_name, kam_email_id, zone, state, etc.) are identical. These were likely created during data import or migration.

## Quick Start (Recommended)

### Step 1: Check Current Status

```bash
node scripts/check-actual-count.js
```

This shows the current count and duplicate analysis.

### Step 2: Preview What Will Be Removed (Safe - No Changes)

```bash
node scripts/remove-exact-duplicates.js
```

This will show you:
- How many duplicate groups exist
- Top 10 duplicate examples
- Exactly which records will be kept vs deleted
- Final count after cleanup

### Step 3: Remove Duplicates (Live Mode)

Once you're satisfied with the preview:

```bash
node scripts/remove-exact-duplicates.js --delete
```

This will:
- Keep the **oldest record** (earliest `created_at`) for each duplicate group
- Delete all newer duplicates
- Process in batches of 100 for safety
- Show progress as it deletes
- Verify the final count

**Expected Result**: 2,129 → 1,386 records (very close to your target of 1,390!)

## Solution Overview
We've created four tools to help you analyze and fix this issue:

1. **check-actual-count.js** - Quick count verification with duplicate summary
2. **remove-exact-duplicates.js** - Automated exact duplicate removal (RECOMMENDED)
3. **SQL Analysis Script** - For direct database inspection
4. **SQL Cleanup Script** - For manual SQL-based cleanup

## Recommended Approach

Use the Node.js scripts - they're the safest and most automated.

## Alternative: Manual SQL Approach (Advanced)

If you prefer to work directly with SQL:

### Step 1: Analyze with SQL

Run the queries in `scripts/check-master-data-duplicates.sql` in your Supabase SQL Editor:

1. Open Supabase Dashboard
2. Go to SQL Editor
3. Copy and paste queries from the file
4. Run each query to understand the duplicates

### Step 2: Remove Duplicates with SQL

Use `scripts/remove-master-data-duplicates.sql`:

1. **IMPORTANT**: The script creates a backup table first
2. Review the preview queries (they're safe)
3. Uncomment the DELETE statement when ready
4. Run the deletion
5. Verify the results

## Safety Features

Both approaches include:

✅ **Backup Creation** - SQL script creates `master_data_backup_before_dedup`
✅ **Dry Run Mode** - Node.js script defaults to simulation
✅ **Keeps Oldest** - Preserves the original record (earliest `created_at`)
✅ **Batch Processing** - Deletes in batches to avoid timeouts
✅ **Verification** - Shows before/after counts

## What Gets Deleted?

For each duplicate group:
- ✅ **KEPT**: The record with the earliest `created_at` timestamp
- ❌ **DELETED**: All other records with the same `brand_name` + `kam_email_id`

Example:
```
Brand: "Restaurant ABC", KAM: "agent@example.com"
- Record 1: created_at = 2024-01-15 → KEPT ✅
- Record 2: created_at = 2024-02-20 → DELETED ❌
- Record 3: created_at = 2024-03-10 → DELETED ❌
```

## Expected Results

After cleanup:
- **Before**: 2,129 records
- **After**: ~1,390 records (or close to it)
- **Deleted**: ~739 duplicate records

## Troubleshooting

### If the count doesn't match exactly 1,390:

This could mean:
1. Some brands legitimately have multiple entries (different KAMs)
2. The expected count of 1,390 might not be accurate
3. There might be other data quality issues

### To investigate further:

```bash
# Run the analysis script to see detailed breakdown
node scripts/analyze-master-data-duplicates.js

# Check the zone statistics
# Check the KAM statistics
# Review the top duplicate groups
```

### If you need to restore:

If using SQL script:
```sql
-- Restore from backup
DELETE FROM master_data;
INSERT INTO master_data SELECT * FROM master_data_backup_before_dedup;
```

## Preventing Future Duplicates

Consider adding a unique constraint to prevent duplicates:

```sql
-- Add unique constraint on brand_name + kam_email_id
ALTER TABLE master_data
ADD CONSTRAINT unique_brand_kam 
UNIQUE (brand_name, kam_email_id);
```

Or if brand_email_id should be unique:

```sql
-- Add unique constraint on brand_email_id
ALTER TABLE master_data
ADD CONSTRAINT unique_brand_email 
UNIQUE (brand_email_id) 
WHERE brand_email_id IS NOT NULL;
```

## Questions?

- Check the analysis output for detailed statistics
- Review the SQL scripts for the exact logic
- The Node.js script is well-commented and safe to modify

## Next Steps

1. Run the analysis script first (dry run)
2. Review the output carefully
3. If everything looks good, run with `--delete` flag
4. Verify the final count
5. Consider adding constraints to prevent future duplicates
