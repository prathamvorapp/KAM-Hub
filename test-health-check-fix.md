# Health Check Fix - Testing Guide

## Pre-Testing Checklist

1. **Backup Current Data** (Optional but recommended)
   ```sql
   -- Export current health_checks
   COPY (SELECT * FROM health_checks WHERE assessment_month = '2026-02') 
   TO '/tmp/health_checks_backup.csv' CSV HEADER;
   ```

2. **Verify User Profile**
   ```sql
   -- Check the logged-in user's details
   SELECT email, full_name, role, team_name
   FROM user_profiles
   WHERE email = 'jinal.chavda@example.com'; -- Replace with actual email
   ```

3. **Check Brand Assignments**
   ```sql
   -- Count brands assigned to the user
   SELECT COUNT(*) as total_brands
   FROM master_data
   WHERE kam_email_id = 'jinal.chavda@example.com'; -- Replace with actual email
   ```

## Testing Steps

### Step 1: Clear All Caches
1. Navigate to Health Check-ups page
2. Click the "Clear Cache" button (🗑️)
3. Wait for confirmation message
4. Refresh the page

### Step 2: Verify Assessment Tab
1. Go to the "Assessment" tab
2. Check the progress card:
   - Total Brands: Should show 50
   - Completed: Should show 1
   - Remaining: Should show 49
3. Check the "Brands Pending Assessment" section:
   - Should now show 49 brands (not 0)
   - Brands should be displayed in a grid

### Step 3: Check Browser Console
Open browser DevTools (F12) and look for these log messages:

```
📊 [getBrandsForAssessment] User: [email], Role: agent, Month: 2026-02
📊 [getBrandsForAssessment] Total brands for user: 50
📊 [getBrandsForAssessment] Assessed checks this month: 1
📊 [getBrandsForAssessment] Assessed brands map size: 1
📊 [getBrandsForAssessment] Brands pending assessment: 49
```

### Step 4: Test Assessment Flow
1. Click on any brand from the pending list
2. Fill in the assessment form:
   - Health Status: Select any status
   - Brand Nature: Select any nature
   - Remarks: Optional
3. Submit the assessment
4. Verify:
   - Brand is removed from pending list
   - Completed count increases to 2
   - Remaining count decreases to 48
   - Brand appears in History tab

### Step 5: Verify History Tab
1. Switch to "History" tab
2. Should see 2 assessments (the original 1 + the new one)
3. Search for the brand you just assessed
4. Verify all details are correct

### Step 6: Check Statistics Tab
1. Switch to "Statistics" tab
2. Verify counts match:
   - Total Assessments: 2
   - Health Status Distribution: Should reflect your assessments
   - Brand Nature Distribution: Should reflect your assessments

## Expected Results

### Before Fix
- ❌ Assessment tab shows 0 brands despite 49 remaining
- ❌ Message: "All brands assessed for this month!"
- ❌ Progress shows 49 remaining but no brands to assess

### After Fix
- ✅ Assessment tab shows 49 brands
- ✅ Brands are displayed in a grid
- ✅ Progress matches the actual pending brands
- ✅ Each agent sees only their own pending brands
- ✅ Assessing a brand updates counts immediately

## Troubleshooting

### Issue: Still showing 0 brands

**Check 1: Verify user email matches**
```sql
-- Check if kam_email_id in master_data matches user email
SELECT DISTINCT kam_email_id 
FROM master_data 
WHERE kam_email_id LIKE '%jinal%'; -- Adjust search term
```

**Check 2: Verify role normalization**
```sql
-- Check user role
SELECT email, role, 
       LOWER(REPLACE(REPLACE(role, '_', ''), ' ', '')) as normalized_role
FROM user_profiles
WHERE email = 'jinal.chavda@example.com'; -- Replace with actual email
```

**Check 3: Check for RLS policies blocking access**
```sql
-- Disable RLS temporarily for testing (ONLY IN DEVELOPMENT)
ALTER TABLE master_data DISABLE ROW LEVEL SECURITY;
ALTER TABLE health_checks DISABLE ROW LEVEL SECURITY;

-- Re-enable after testing
ALTER TABLE master_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE health_checks ENABLE ROW LEVEL SECURITY;
```

### Issue: Brands showing but wrong count

**Check for duplicate assessments**
```sql
-- Find duplicate assessments
SELECT brand_name, kam_email, COUNT(*) as count
FROM health_checks
WHERE assessment_month = '2026-02'
GROUP BY brand_name, kam_email
HAVING COUNT(*) > 1;
```

**Check for brand name mismatches**
```sql
-- Compare brand names between tables
SELECT 
  md.brand_name as master_brand,
  hc.brand_name as health_check_brand,
  md.brand_name = hc.brand_name as exact_match
FROM master_data md
LEFT JOIN health_checks hc 
  ON LOWER(TRIM(md.brand_name)) = LOWER(TRIM(hc.brand_name))
  AND hc.assessment_month = '2026-02'
  AND hc.kam_email = md.kam_email_id
WHERE md.kam_email_id = 'jinal.chavda@example.com' -- Replace with actual email
LIMIT 20;
```

### Issue: Assessment not saving

**Check foreign key constraints**
```sql
-- Verify user exists in user_profiles
SELECT email FROM user_profiles 
WHERE email = 'jinal.chavda@example.com'; -- Replace with actual email

-- Check if foreign key constraints are causing issues
SELECT conname, conrelid::regclass, confrelid::regclass
FROM pg_constraint
WHERE conrelid = 'health_checks'::regclass;
```

## Performance Monitoring

### Check Cache Hit Rates
Monitor console logs for cache performance:
- `📈 Brands for assessment served from cache` - Cache hit
- `🔄 Cache bypassed due to cache buster` - Cache miss (expected on first load)

### Check Query Performance
```sql
-- Check slow queries
SELECT query, calls, total_time, mean_time
FROM pg_stat_statements
WHERE query LIKE '%health_checks%' OR query LIKE '%master_data%'
ORDER BY mean_time DESC
LIMIT 10;
```

## Success Criteria

✅ All 49 pending brands are visible in Assessment tab
✅ Progress card shows correct counts (50 total, 1 completed, 49 remaining)
✅ Clicking a brand opens the assessment modal
✅ Submitting assessment removes brand from pending list
✅ History tab shows all completed assessments
✅ Statistics tab shows accurate aggregations
✅ No console errors
✅ Cache clears successfully
✅ Multiple agents can assess the same brand name independently

## Rollback Procedure

If the fix causes issues:

1. **Revert code changes**
   ```bash
   git revert HEAD
   ```

2. **Clear all caches**
   - Click "Clear Cache" button
   - Or restart the application

3. **Report the issue** with:
   - Browser console logs
   - Network tab showing API responses
   - SQL query results from diagnostic queries
   - User role and email
   - Expected vs actual behavior
