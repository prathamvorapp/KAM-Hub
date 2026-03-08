# Debug Guide: Brand Not Showing in Search

## Issue
Searching for "Demo" brand shows "No brands found matching 'Demo'"

## Possible Causes & Solutions

### 1. Search Logic Fixed ✅
**Problem**: The chunked fetching logic was incorrectly determining if more pages exist when searching.

**Fix Applied**: 
- Now uses `total_pages` from API response instead of checking if `brands.length === 1000`
- Properly fetches all pages of search results

### 2. Check if Brand Exists in Database

Run this SQL query in your Supabase SQL Editor:

```sql
-- Check if "Demo" brand exists
SELECT * FROM master_data 
WHERE brand_name ILIKE '%Demo%';
```

**Expected Result**: Should return at least one row with brand_name containing "Demo"

### 3. Check Brand Assignment (Role-Based Access)

The brand visibility depends on your user role:

#### For Agents:
```sql
-- Check if Demo brand is assigned to your email
SELECT * FROM master_data 
WHERE brand_name ILIKE '%Demo%' 
AND kam_email_id = 'your-email@example.com';
```

#### For Team Leads:
```sql
-- Check if Demo brand is assigned to anyone in your team
SELECT md.* 
FROM master_data md
JOIN user_profiles up ON md.kam_email_id = up.email
WHERE md.brand_name ILIKE '%Demo%'
AND up.team_name = 'Your Team Name';
```

#### For Admins:
- Should see ALL brands regardless of assignment

### 4. Check Your User Profile

```sql
-- Verify your user profile and role
SELECT email, role, team_name, full_name 
FROM user_profiles 
WHERE email = 'your-email@example.com';
```

### 5. Test Search in Browser Console

Open browser console (F12) and check for:

1. **Network Tab**: Look for `/api/data/master-data?page=1&limit=1000&search=Demo`
   - Check the response to see if brands are returned
   - Look at the `total` and `total_pages` values

2. **Console Logs**: Look for these messages:
   ```
   📊 Page 1: X brands, Total: Y, Pages: Z
   ✅ Finished loading X brands (expected: Y)
   ```

### 6. Clear Search and Verify All Brands Load

1. Click "Clear search" link
2. Wait for all brands to load
3. Manually scroll through the brand cards
4. Check if "Demo" appears in the full list

### 7. Check Backend Service Limit

The `masterDataService.ts` has a limit of 10,000 records per query:

```typescript
const { data: allRecords, count } = await query.limit(10000)
```

If you have more than 10,000 brands, some might not be fetched. Check total brand count:

```sql
SELECT COUNT(*) as total_brands FROM master_data;
```

## Testing the Fix

1. **Clear your browser cache** (Ctrl+Shift+Delete)
2. **Refresh the page** (F5)
3. **Search for "Demo"** and click the "Go" button
4. **Check browser console** for debug logs
5. **Verify the brand appears**

## If Still Not Working

### Enable Debug Logs

The code now includes console.log statements. Check browser console for:

```
📊 Page 1: 1 brands, Total: 1, Pages: 1
✅ Finished loading 1 brands (expected: 1)
```

### Check API Response

In Network tab, find the request to `/api/data/master-data` and check:

```json
{
  "success": true,
  "data": {
    "data": [
      {
        "id": "...",
        "brand_name": "Demo",
        "kam_email_id": "...",
        ...
      }
    ],
    "total": 1,
    "page": 1,
    "limit": 1000,
    "total_pages": 1
  }
}
```

### Verify Search Term

Make sure:
- No extra spaces before/after "Demo"
- Correct spelling
- Case doesn't matter (search is case-insensitive)

## Common Issues

1. **Brand not assigned to you**: Check `kam_email_id` in database
2. **Wrong team**: Team Leads only see brands assigned to their team members
3. **Typo in brand name**: Check exact spelling in database
4. **Cache issue**: Clear browser cache and refresh
5. **Backend limit**: If you have >10,000 brands, increase the limit in `masterDataService.ts`
