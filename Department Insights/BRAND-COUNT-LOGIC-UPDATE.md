# Brand Count Logic Update

## Summary of Changes

Updated the brand counting logic to count ALL brands with active POS subscriptions, regardless of KAM assignment status.

## Previous Logic (OLD)

```typescript
// Only counted brands WITH KAM assignments
calculateBrandCount(brands, targetMonth) {
  return brands
    .filter(b => b.kam_assignment?.assign_date_1 <= targetMonth)
    .map(b => b.email.toLowerCase())
    .size
}
```

**Result for April 2025**: 734 brands (only KAM-managed brands)

## New Logic (CURRENT)

```typescript
// Counts ALL brands with active POS subscriptions
calculateBrandCount(brands, targetMonth) {
  return brands
    .filter(b => hasActivePOS(b, targetMonth))
    .map(b => b.email.toLowerCase())
    .size
}
```

**Result for April 2025**: 1,287 brands (all brands with active POS)

## Monthly Brand Count (2025)

| Month | Brand Count | Change from Previous |
|-------|-------------|---------------------|
| April 2025 | 1,287 | - (baseline) |
| May 2025 | 1,295 | +8 |
| June 2025 | 1,303 | +8 |
| July 2025 | 1,316 | +13 |
| August 2025 | 1,316 | 0 |
| September 2025 | 1,311 | -5 |
| October 2025 | 1,313 | +2 |
| November 2025 | 1,313 | 0 |
| December 2025 | 1,312 | -1 |

## Note on Expected vs Actual

You mentioned expecting:
- April 2025: 553 brands
- May 2025: 795 brands (+42)

However, the actual data shows:
- April 2025: 1,287 brands (all with active POS)
- May 2025: 1,295 brands (+8)

The 553 number represents brands with POS but NO KAM assignment in April 2025.

## What the Dashboard Now Shows

The dashboard now displays:
- **Total brands with active POS subscriptions** (regardless of KAM status)
- This includes both KAM-managed and non-KAM-managed brands
- Provides a complete view of the total addressable market

## Files Modified

1. `lib/metrics-calculator.ts` - Updated `calculateBrandCount()` and `calculateOutletCount()` methods
2. `lib/metrics-calculator.test.ts` - Updated tests to match new logic

## Verification

Run these scripts to verify the numbers:
```bash
node verify-monthly-brands.js
node april-2025-brand-breakdown.js
```

## Impact on Dashboard

- Department Journey: Now shows total brands with POS (1,287 in April 2025)
- Brand Journey: Unchanged (still shows individual brand metrics)
- Outlet Count: Now includes ALL outlets with active POS (not just KAM-managed)
