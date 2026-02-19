# Health Check Cache Fix - Summary

## Issue

The Assessment Progress card was showing stale data (2 completed) while the actual count was 3 completed. This was because the progress API was serving cached data while the brands API was getting fresh data.

## Root Cause

The progress, health checks, and statistics API routes were not respecting the cache buster parameter (`_t`) that the frontend was sending. They were always checking the cache first, regardless of the cache buster.

## Evidence from Logs

```
📊 [getBrandsForAssessment] Assessed checks this month: 3  ← Fresh data
📈 Assessment progress served from cache                    ← Stale cache (showing 2)
```

## Solution

Modified all three API routes to respect the cache buster parameter:

1. **`app/api/data/health-checks/progress/route.ts`**
2. **`app/api/data/health-checks/route.ts`**
3. **`app/api/data/health-checks/statistics/route.ts`**

### Changes Made

**Before:**
```typescript
const cachedData = progressCache.get(cacheKey);
if (cachedData) {
  console.log(`📈 Assessment progress served from cache`);
  return NextResponse.json(cachedData);
}
```

**After:**
```typescript
const bustCache = searchParams.get('_t'); // Cache buster from frontend

// Skip cache if cache buster is present
if (!bustCache) {
  const cachedData = progressCache.get(cacheKey);
  if (cachedData) {
    console.log(`📈 Assessment progress served from cache`);
    return NextResponse.json(cachedData);
  }
} else {
  console.log(`🔄 Progress cache bypassed due to cache buster`);
}
```

Also changed cache headers from:
```typescript
'Cache-Control': 'public, max-age=300, s-maxage=300'
```

To:
```typescript
'Cache-Control': 'no-cache, no-store, must-revalidate',
'Pragma': 'no-cache',
'Expires': '0'
```

## Expected Behavior After Fix

### Before Fix
```
Assessment Progress:
  Total: 50
  Completed: 2  ← Stale cache
  Remaining: 48 ← Wrong count

Brands Pending Assessment: (47)  ← Fresh data
  [Shows 47 brands correctly]
```

### After Fix
```
Assessment Progress:
  Total: 50
  Completed: 3  ← Fresh data
  Remaining: 47 ← Correct count

Brands Pending Assessment: (47)  ← Fresh data
  [Shows 47 brands correctly]
```

## Testing Steps

1. **Clear Cache:**
   - Click the "Clear Cache" button
   - Refresh the page

2. **Verify Progress Card:**
   - Total Brands: Should show 50
   - Completed: Should show 3 (not 2)
   - Remaining: Should show 47 (not 48)

3. **Check Console Logs:**
   - Should see: `🔄 Progress cache bypassed due to cache buster`
   - Should NOT see: `📈 Assessment progress served from cache` on first load

4. **Test Assessment Flow:**
   - Complete a new assessment
   - Verify counts update immediately:
     - Completed: 4
     - Remaining: 46

## Files Modified

1. **`app/api/data/health-checks/progress/route.ts`**
   - Added cache buster check
   - Changed cache headers to no-cache

2. **`app/api/data/health-checks/route.ts`**
   - Added cache buster check
   - Changed cache headers to no-cache

3. **`app/api/data/health-checks/statistics/route.ts`**
   - Added cache buster check
   - Changed cache headers to no-cache

## Why This Happened

The frontend was already sending the cache buster parameter (`_t=timestamp`), but the API routes were ignoring it. They were checking the cache first, regardless of whether a cache buster was present.

The brands-for-assessment route was already correctly implemented with cache buster support, which is why it showed fresh data (47 brands) while progress showed stale data (2 completed instead of 3).

## Cache Strategy

### When Cache Buster is Present (Normal Operation)
- Frontend sends `_t=timestamp` on every request
- API bypasses cache and fetches fresh data
- Response is cached for subsequent requests within TTL
- This ensures users always see fresh data on page load

### When Cache Buster is Absent (Rare)
- API checks cache first
- Returns cached data if available
- This provides fallback behavior for edge cases

### Cache TTL (Time To Live)
- Brands Cache: 5 minutes (300 seconds)
- Progress Cache: 5 minutes (300 seconds)
- Health Checks Cache: 3 minutes (180 seconds)
- Statistics Cache: 10 minutes (600 seconds)

## Impact

### Before Fix
- ❌ Progress card showed stale data
- ❌ Counts didn't match between progress and brands
- ❌ Confusing user experience
- ❌ Required manual cache clearing

### After Fix
- ✅ Progress card shows fresh data
- ✅ All counts are consistent
- ✅ Clear user experience
- ✅ Automatic cache bypassing on page load

## Deployment

1. Deploy the code changes
2. No database changes needed
3. No migration required
4. Existing caches will expire naturally
5. Users should clear cache once after deployment

## Monitoring

After deployment, check console logs for:
- `🔄 Progress cache bypassed due to cache buster` - Good, cache is being bypassed
- `📈 Assessment progress served from cache` - Should only appear on subsequent requests, not first load
- Verify counts match between progress card and brands list

## Related Issues

This fix complements the earlier fix for brand filtering. Together they ensure:
1. Brands are filtered correctly (previous fix)
2. Counts are always fresh (this fix)

## Success Criteria

- ✅ Progress card shows correct completed count (3, not 2)
- ✅ Remaining count matches brands list count (47)
- ✅ Console shows cache bypass on first load
- ✅ Subsequent loads can use cache (within TTL)
- ✅ All tabs show consistent data

## Rollback

If issues occur, revert these three files:
```bash
git checkout HEAD~1 app/api/data/health-checks/progress/route.ts
git checkout HEAD~1 app/api/data/health-checks/route.ts
git checkout HEAD~1 app/api/data/health-checks/statistics/route.ts
```

Note: After rollback, the stale cache issue will return.

---

**Fix Version:** 1.1.0
**Date:** 2026-02-19
**Status:** ✅ Ready for Deployment
