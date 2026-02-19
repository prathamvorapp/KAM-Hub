# Troubleshooting: 49 Brands Not Showing in List

## Problem
- Dashboard shows: 50 total, 1 completed, 49 remaining
- But "Brands Pending Assessment" shows 0 brands
- Message: "All brands assessed for this month!"

## Possible Causes

### 1. Brand Name Mismatch
The brand name in `health_checks` doesn't exactly match the name in `master_data`.

**Examples**:
- `master_data`: "Cafe Levista"
- `health_checks`: "CAFE LEVISTA" (case difference)
- `health_checks`: "Cafe Levista " (trailing space)

### 2. Caching Issue
The API response is cached for 5 minutes, showing stale data.

### 3. Frontend State Issue
The brands are fetched but not rendered due to a React state issue.

### 4. API Error
The API is returning an error that's not being displayed.

---

## Diagnostic Steps

### Step 1: Run SQL Diagnostic
```sql
-- Execute: diagnose-brand-list-issue.sql
```

This will show:
- Exact brand names in both tables
- Any case sensitivity issues
- Any whitespace issues
- Manual calculation of pending brands

**Expected Output**:
- STEP 9 should show 49 pending brands
- STEP 4 should show "MATCH FOUND"

---

### Step 2: Check Browser Console

1. Open the Health Check page
2. Open browser DevTools (F12)
3. Go to Console tab
4. Look for these logs:

```
🔍 [Health Check] Brands API Response: {
  success: true,
  dataLength: 49,  // Should be 49, not 0
  error: undefined,
  statusCode: 200
}
```

**If dataLength is 0**:
- Backend is filtering out all brands
- Check server console logs (see Step 3)

**If you see an error**:
- API request failed
- Check Network tab for details

---

### Step 3: Check Server Console

Look for these logs in your server console:

```
📊 [getBrandsForAssessment] Total brands for user: 50
📊 [getBrandsForAssessment] Assessed brands this month: 1
📊 [getBrandsForAssessment] Brands pending assessment: 49
```

**If "Brands pending assessment" shows 0**:
- All brands are being filtered out
- Check the detailed logs for brand name comparison
- Look for: "⚠️ All brands filtered out. Checking for name mismatches..."

---

### Step 4: Check Network Tab

1. Open DevTools → Network tab
2. Refresh the Health Check page
3. Find request: `brands-for-assessment?month=2026-02`
4. Click on it and check Response tab

**Expected Response**:
```json
{
  "success": true,
  "data": [
    {
      "brand_name": "Brand 1",
      "kam_email_id": "jinal.chavda@petpooja.com",
      "zone": "North",
      ...
    },
    // ... 48 more brands
  ]
}
```

**If data array is empty**:
- Backend is filtering incorrectly
- Proceed to Step 5

---

## Solutions

### Solution 1: Fix Brand Name Mismatch

If SQL diagnostic shows name mismatch, update the health_checks record:

```sql
-- Example: Fix case sensitivity
UPDATE health_checks
SET brand_name = (
    SELECT brand_name 
    FROM master_data 
    WHERE LOWER(brand_name) = LOWER(health_checks.brand_name)
    AND kam_email_id = 'jinal.chavda@petpooja.com'
    LIMIT 1
)
WHERE kam_email = 'jinal.chavda@petpooja.com'
  AND assessment_month = '2026-02';
```

---

### Solution 2: Clear Cache

**Option A - Wait**:
- Cache expires after 5 minutes
- Just wait and refresh

**Option B - Force Refresh**:
1. Change month selector to a different month
2. Wait 2 seconds
3. Change back to 2026-02

**Option C - Clear Browser Cache**:
1. Hard refresh: Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)
2. Or clear site data in DevTools

**Option D - Restart Server**:
```bash
# Stop and restart your Next.js server
```

---

### Solution 3: Fix Brand Name Comparison (Code Fix)

If brand names have inconsistent casing or whitespace, update the comparison logic:

**File**: `lib/services/healthCheckService.ts`

Change the filter to be case-insensitive and trim whitespace:

```typescript
// Current (case-sensitive)
const brandsForAssessment = allBrands?.filter(brand => 
  !assessedBrandNames.has(brand.brand_name)
) || [];

// Fixed (case-insensitive, trimmed)
const brandsForAssessment = allBrands?.filter(brand => {
  const normalizedBrandName = brand.brand_name.trim().toLowerCase();
  return !Array.from(assessedBrandNames).some(
    assessedName => assessedName.trim().toLowerCase() === normalizedBrandName
  );
}) || [];
```

---

### Solution 4: Normalize Brand Names in Database

Run this to ensure consistent naming:

```sql
-- Trim whitespace from master_data
UPDATE master_data
SET brand_name = TRIM(brand_name)
WHERE brand_name != TRIM(brand_name);

-- Trim whitespace from health_checks
UPDATE health_checks
SET brand_name = TRIM(brand_name)
WHERE brand_name != TRIM(brand_name);

-- Check for remaining mismatches
SELECT 
    hc.brand_name as health_check_name,
    md.brand_name as master_data_name
FROM health_checks hc
LEFT JOIN master_data md ON TRIM(LOWER(md.brand_name)) = TRIM(LOWER(hc.brand_name))
WHERE hc.kam_email = 'jinal.chavda@petpooja.com'
  AND hc.assessment_month = '2026-02'
  AND md.brand_name IS NULL;
```

---

## Quick Test

After applying any solution, test immediately:

1. **Clear cache**: Change month and back
2. **Check console**: Should see 49 brands
3. **Verify list**: Should see brand cards
4. **Click brand**: Modal should open

---

## Prevention

To prevent this issue in the future:

### 1. Add Brand Name Validation
When creating health checks, validate brand name exists:

```typescript
// Before creating health check
const brandExists = await supabase
  .from('master_data')
  .select('brand_name')
  .eq('brand_name', assessmentData.brand_name)
  .eq('kam_email_id', userProfile.email)
  .single();

if (!brandExists.data) {
  throw new Error('Brand not found in master data');
}
```

### 2. Use Brand ID Instead of Name
Store `brand_id` in health_checks and join on ID instead of name:

```sql
-- Already exists in schema but not used consistently
ALTER TABLE health_checks 
ADD CONSTRAINT fk_health_checks_brand_id 
FOREIGN KEY (brand_id) REFERENCES master_data(id);
```

### 3. Add Database Trigger
Automatically normalize brand names on insert/update:

```sql
CREATE OR REPLACE FUNCTION normalize_brand_name()
RETURNS TRIGGER AS $$
BEGIN
    NEW.brand_name = TRIM(NEW.brand_name);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER normalize_brand_name_trigger
BEFORE INSERT OR UPDATE ON health_checks
FOR EACH ROW
EXECUTE FUNCTION normalize_brand_name();

CREATE TRIGGER normalize_brand_name_trigger_master
BEFORE INSERT OR UPDATE ON master_data
FOR EACH ROW
EXECUTE FUNCTION normalize_brand_name();
```

---

## Files Created

1. **diagnose-brand-list-issue.sql** - SQL diagnostic queries
2. **TROUBLESHOOT_BRAND_LIST.md** - This guide
3. Updated **app/dashboard/health-checks/page.tsx** - Added detailed logging
4. Updated **lib/services/healthCheckService.ts** - Added detailed logging

---

## Next Steps

1. Run `diagnose-brand-list-issue.sql` to identify the exact issue
2. Check browser console and server logs
3. Apply the appropriate solution
4. Test to verify the fix
5. Consider implementing prevention measures
