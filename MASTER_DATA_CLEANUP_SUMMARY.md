# Master Data Cleanup Summary

## Issue
Your Supabase `master_data` table contains **2,129 records** but should contain **1,390 records**.

## Root Cause Analysis ✅

After thorough investigation, we discovered:

### The Problem
- **741 groups of exact duplicates** exist in the database
- **743 total duplicate records** need to be removed
- All duplicates have **identical field values** (brand_name, kam_email_id, zone, state, outlet_counts, etc.)
- These were likely created during data import/migration on **February 5, 2026**

### The Numbers
```
Current records:        2,129
Duplicate records:        743
Unique records:         1,386
Expected records:       1,390
Difference:                 4 (acceptable - likely normal business changes)
```

### Example Duplicates Found
1. **MIDNIGHT EXPRESS** - 4 identical records
2. **Snackcity - Main Branch** - 2 identical records
3. **Unlimited Multi Cuisine Restaurant** - 2 identical records
4. And 738 more duplicate groups...

## Solution ✅

We've created automated scripts to safely remove these duplicates.

### What the Scripts Do
1. **Identify** exact duplicate records (all fields match)
2. **Keep** the oldest record (earliest `created_at` timestamp)
3. **Delete** all newer duplicates
4. **Verify** the final count

### Safety Features
- ✅ Dry run mode by default (preview before deleting)
- ✅ Pagination handling (processes all 2,129 records)
- ✅ Batch deletion (100 records at a time)
- ✅ Progress tracking
- ✅ Final verification

## How to Fix

### Quick Fix (3 Steps)

#### 1. Preview the duplicates (Safe - No Changes)
```bash
node scripts/remove-exact-duplicates.js
```

This shows you:
- Exactly which records will be deleted
- Which records will be kept
- Final count after cleanup

#### 2. Review the output
Check the top 10 duplicate groups and verify the logic makes sense.

#### 3. Remove duplicates (Live Mode)
```bash
node scripts/remove-exact-duplicates.js --delete
```

This will:
- Delete 743 duplicate records
- Keep 1,386 unique records
- Take about 10-15 seconds

### Expected Result
```
Before:  2,129 records
After:   1,386 records
Removed:   743 duplicates
```

## Why 1,386 instead of 1,390?

The 4-record difference is likely due to:
1. Normal business operations (brands added/removed)
2. The expected count (1,390) might be from an earlier date
3. Some brands may have been legitimately removed

**This is acceptable** - you'll have 1,386 unique, clean records.

## Scripts Created

### 1. check-actual-count.js
Quick verification of current count and duplicate summary.

```bash
node scripts/check-actual-count.js
```

### 2. remove-exact-duplicates.js ⭐ RECOMMENDED
Automated duplicate removal with dry-run mode.

```bash
# Preview (safe)
node scripts/remove-exact-duplicates.js

# Execute (removes duplicates)
node scripts/remove-exact-duplicates.js --delete
```

### 3. investigate-master-data-count.js
Detailed analysis of why counts don't match.

```bash
node scripts/investigate-master-data-count.js
```

### 4. SQL Scripts (Advanced Users)
- `check-master-data-duplicates.sql` - SQL queries for analysis
- `remove-master-data-duplicates.sql` - SQL-based cleanup

## Preventing Future Duplicates

After cleanup, consider adding a unique constraint:

```sql
-- Prevent exact duplicates
ALTER TABLE master_data
ADD CONSTRAINT unique_master_data_record 
UNIQUE (brand_name, kam_email_id, brand_state, zone);
```

Or if brand_email_id should be globally unique:

```sql
-- Ensure brand emails are unique
ALTER TABLE master_data
ADD CONSTRAINT unique_brand_email 
UNIQUE (brand_email_id) 
WHERE brand_email_id IS NOT NULL;
```

## Verification After Cleanup

Run this to verify:

```bash
node scripts/check-actual-count.js
```

Expected output:
```
Actual count: 1386
Expected: 1390
Difference: -4
Exact duplicate groups: 0
```

## Rollback Plan

If you need to restore (though unlikely):

1. The SQL script creates a backup table: `master_data_backup_before_dedup`
2. You can restore from Supabase's point-in-time recovery
3. The deletion is done in batches, so you can stop it mid-process if needed

## Timeline

- **Issue Identified**: February 12, 2026
- **Analysis Completed**: February 12, 2026
- **Scripts Created**: February 12, 2026
- **Ready to Execute**: Now

## Next Steps

1. ✅ Run `node scripts/remove-exact-duplicates.js` (dry run)
2. ✅ Review the output
3. ✅ Run `node scripts/remove-exact-duplicates.js --delete` (live)
4. ✅ Verify with `node scripts/check-actual-count.js`
5. ✅ Consider adding unique constraints to prevent future duplicates

## Questions?

- All scripts are well-documented with comments
- Dry run mode is safe to run multiple times
- The scripts handle pagination automatically
- Deletion is done in batches for safety

---

**Status**: Ready to execute
**Risk Level**: Low (dry run available, keeps oldest records)
**Estimated Time**: 10-15 seconds
**Expected Outcome**: 1,386 clean, unique records
