# Visit Statistics Search Behavior Fix

## Issue
When searching in the "Your Brands" section, the Visit Statistics component was also reloading/refreshing unnecessarily. This caused:
- Unnecessary API calls
- Flickering/loading states in statistics
- Confusion about whether statistics were being filtered

## Expected Behavior
- **Brand Search**: Should only filter the brand cards, NOT reload visit statistics
- **Visit Search**: Should only filter the visits table, NOT reload visit statistics
- **Visit Actions**: Should reload visit statistics (create, update, complete, cancel, etc.)

---

## Root Cause

The `loadData()` function was always incrementing `refreshKey` which triggered the Visit Statistics component to reload:

```typescript
// BEFORE (Wrong):
const loadData = async (search = '', visitsSearch = '') => {
  // ... load brands and visits ...
  setRefreshKey(prev => prev + 1); // Always triggered!
}
```

This meant:
- Searching brands → `loadData()` → `refreshKey++` → Statistics reload ❌
- Searching visits → `loadData()` → `refreshKey++` → Statistics reload ❌
- Creating visit → `loadData()` → `refreshKey++` → Statistics reload ✅

---

## The Fix

Added a `shouldRefreshStats` parameter to `loadData()` to control when statistics should reload:

```typescript
// AFTER (Correct):
const loadData = async (search = '', visitsSearch = '', shouldRefreshStats = false) => {
  // ... load brands and visits ...
  
  // Only refresh statistics if explicitly requested
  if (shouldRefreshStats) {
    setRefreshKey(prev => prev + 1);
    console.log('📊 [Visits] Refreshing visit statistics');
  }
}
```

---

## Changes Made

### 1. Updated `loadData` Function Signature
```typescript
// Added shouldRefreshStats parameter (default: false)
const loadData = useCallback(async (
  search = '', 
  visitsSearch = '', 
  shouldRefreshStats = false
) => {
```

### 2. Conditional Statistics Refresh
```typescript
// Only refresh statistics when explicitly requested
if (shouldRefreshStats) {
  setRefreshKey(prev => prev + 1);
  console.log('📊 [Visits] Refreshing visit statistics');
}
```

### 3. Updated Search Handlers
```typescript
// Brand search - DON'T refresh stats
const handleSearchClick = () => {
  loadData(searchTerm, visitsSearchTerm, false); // false = don't refresh stats
};

// Visit search - DON'T refresh stats
const handleVisitsSearchClick = () => {
  loadData(searchTerm, visitsSearchTerm, false); // false = don't refresh stats
};
```

### 4. Updated Visit Action Handlers
```typescript
// After creating visit - DO refresh stats
await loadData('', '', true); // true = refresh stats

// After updating visit status - DO refresh stats
await loadData('', '', true);

// After submitting MOM - DO refresh stats
await loadData('', '', true);

// After rescheduling - DO refresh stats
await loadData('', '', true);

// After backdated visit - DO refresh stats
await loadData('', '', true);

// After resubmitting MOM - DO refresh stats
await loadData('', '', true);
```

### 5. Updated Initial Load
```typescript
// Initial page load - DO refresh stats
useEffect(() => {
  if (userProfile) {
    loadData('', '', true); // true = refresh stats on initial load
  }
}, []);
```

---

## Behavior After Fix

### ✅ Brand Search (No Stats Reload)
```
User types in brand search → Click Search
  ↓
loadData(searchTerm, '', false)
  ↓
Brands filtered
  ↓
Visit Statistics NOT reloaded ✅
```

### ✅ Visit Search (No Stats Reload)
```
User types in visit search → Click Search
  ↓
loadData('', visitsSearchTerm, false)
  ↓
Visits filtered
  ↓
Visit Statistics NOT reloaded ✅
```

### ✅ Create Visit (Stats Reload)
```
User creates new visit → Submit
  ↓
api.createVisit()
  ↓
loadData('', '', true)
  ↓
Brands and visits reloaded
  ↓
Visit Statistics reloaded ✅
```

### ✅ Update Visit (Stats Reload)
```
User completes/cancels visit → Confirm
  ↓
api.updateVisitStatus()
  ↓
loadData('', '', true)
  ↓
Visits reloaded
  ↓
Visit Statistics reloaded ✅
```

---

## Testing Checklist

### Brand Search (Should NOT reload stats)
- [ ] Type brand name in search
- [ ] Click Search button
- [ ] Verify brands are filtered
- [ ] Verify Visit Statistics do NOT show loading state
- [ ] Verify Visit Statistics numbers stay the same

### Visit Search (Should NOT reload stats)
- [ ] Type visit info in search
- [ ] Click Search button
- [ ] Verify visits are filtered
- [ ] Verify Visit Statistics do NOT show loading state
- [ ] Verify Visit Statistics numbers stay the same

### Create Visit (Should reload stats)
- [ ] Click "Schedule Visit" on a brand
- [ ] Fill in visit details
- [ ] Submit
- [ ] Verify Visit Statistics show loading state
- [ ] Verify Visit Statistics numbers update

### Update Visit (Should reload stats)
- [ ] Complete or cancel a visit
- [ ] Verify Visit Statistics show loading state
- [ ] Verify Visit Statistics numbers update

### Submit MOM (Should reload stats)
- [ ] Submit MOM for a completed visit
- [ ] Verify Visit Statistics show loading state
- [ ] Verify Visit Statistics numbers update

---

## Console Logs

### Brand Search (No Stats Refresh)
```
🔄 [Visits] Loading data for user: user@example.com, search: "star", visitsSearch: "", shouldRefreshStats: false
✅ [Visits] Data loaded successfully
(No statistics refresh log)
```

### Visit Search (No Stats Refresh)
```
🔄 [Visits] Loading data for user: user@example.com, search: "", visitsSearch: "scheduled", shouldRefreshStats: false
✅ [Visits] Data loaded successfully
(No statistics refresh log)
```

### Create Visit (Stats Refresh)
```
🔄 [Visits] Loading data for user: user@example.com, search: "", visitsSearch: "", shouldRefreshStats: true
✅ [Visits] Data loaded successfully
📊 [Visits] Refreshing visit statistics
```

---

## Benefits

### 1. Better Performance
- Fewer unnecessary API calls
- Faster search experience
- Reduced server load

### 2. Better UX
- No flickering statistics during search
- Clear distinction between search and data changes
- Statistics only update when they should

### 3. Clearer Intent
- Code explicitly shows when statistics should refresh
- Easier to understand and maintain
- Better debugging with console logs

---

## Files Modified

1. ✅ `app/dashboard/visits/page.tsx` - Updated loadData function and all callers

---

## Summary

**Before:**
- Every search triggered statistics reload ❌
- Unnecessary API calls ❌
- Confusing UX ❌

**After:**
- Brand search does NOT reload statistics ✅
- Visit search does NOT reload statistics ✅
- Visit actions DO reload statistics ✅
- Clear, intentional behavior ✅

---

**Date**: February 19, 2026
**Status**: ✅ Fixed
**Impact**: Visit Statistics only reload when visit data actually changes
