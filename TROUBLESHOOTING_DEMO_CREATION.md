# Troubleshooting Demo Creation Issue

## Issue Identified

**Problem**: Demos were not being created when submitting MOM with demo data.

**Root Cause**: The `visits` table doesn't have a `brand_id` field, but the demo creation service was expecting it. This caused the demo creation to fail silently.

## Fix Applied

### 1. Enhanced Brand ID Lookup
Modified `lib/services/visitServiceEnhanced.ts` to:
- First check if visit has `brand_id`
- If not, look up `brand_id` from `master_data` table using `brand_name`
- Provide clear error messages if brand is not found

### 2. Added Comprehensive Logging
Added detailed console logs to track:
- Brand ID lookup process
- Each demo being processed
- Success/failure of demo creation
- Final result summary

### 3. Updated TypeScript Interface
Added `brand_id?: string` to the Visit interface to make it optional.

## How to Test

### Step 1: Check Console Logs
When you submit a MOM with demos, you should now see these logs:

```
📝 Submitting MOM with demos for visit: visit_xxx
👤 User: your.email@petpooja.com
📦 Demos included: 1
📋 Demo products: Task
🔍 Looking up brand_id for brand: Demo
✅ Found brand_id: brand_xxx for brand: Demo
📦 Processing demo for product: Task
✨ Creating new demo for: Task
✅ Successfully processed 1 demos
✅ MOM submission result: { success: true, demos_created: true, demos_count: 1 }
```

### Step 2: Verify in Database
Run this SQL query to check if demo was created:

```sql
SELECT 
  demo_id,
  brand_name,
  product_name,
  is_applicable,
  demo_completed,
  conversion_status,
  current_status,
  created_at
FROM demos
WHERE brand_name = 'Demo'  -- Replace with your brand name
ORDER BY created_at DESC
LIMIT 10;
```

### Step 3: Check Demos Page
1. Go to Dashboard → Demos
2. Search for your brand name
3. Click "Get Started" button
4. You should see the demo you just created

## Common Issues and Solutions

### Issue 1: Brand Not Found in Master Data
**Error**: `❌ Brand not found in master_data: [Brand Name]`

**Solution**: 
- Verify the brand exists in master_data table
- Check if brand_name matches exactly (case-sensitive)
- Ensure the brand is assigned to the agent

### Issue 2: Demo Already Exists
**Log**: `🔄 Updating existing demo: demo_xxx`

**This is normal!** If demos were already initialized for this brand, the system will update them instead of creating new ones.

### Issue 3: No Demos in Request
**Log**: `📦 Demos included: 0`

**Solution**:
- Make sure you filled the "Product Demos" tab in the MOM modal
- Check at least one product as "Applicable"
- Verify the form data is being submitted correctly

## Testing Checklist

- [ ] Submit MOM without demos (should work as before)
- [ ] Submit MOM with 1 demo marked as applicable
- [ ] Check console logs for brand_id lookup
- [ ] Verify demo appears in database
- [ ] Check demo appears in Demos page
- [ ] Try updating an existing demo
- [ ] Test with a brand that doesn't exist (should show error)

## What Changed

### Files Modified:
1. `lib/services/visitServiceEnhanced.ts` - Added brand_id lookup logic
2. `app/api/data/visits/[visitId]/mom-with-demos/route.ts` - Enhanced logging
3. `app/dashboard/visits/page.tsx` - Added brand_id to Visit interface

### Key Improvements:
- ✅ Automatic brand_id lookup from master_data
- ✅ Detailed error messages
- ✅ Comprehensive logging for debugging
- ✅ Graceful error handling (MOM still submits even if demos fail)

## Next Steps

1. **Test the fix**: Submit a MOM with demo data
2. **Check logs**: Look for the detailed console output
3. **Verify database**: Run the SQL query above
4. **Check UI**: Verify demo appears in Demos page

If you still encounter issues, check the console logs and share them for further debugging.

## Quick Debug Commands

### Check if brand exists in master_data:
```sql
SELECT id, brand_name, kam_email_id 
FROM master_data 
WHERE brand_name = 'Demo';  -- Replace with your brand
```

### Check recent demos:
```sql
SELECT * FROM demos 
WHERE created_at > NOW() - INTERVAL '1 hour'
ORDER BY created_at DESC;
```

### Check visit details:
```sql
SELECT visit_id, brand_name, brand_id, agent_id 
FROM visits 
WHERE brand_name = 'Demo'  -- Replace with your brand
ORDER BY created_at DESC 
LIMIT 5;
```
