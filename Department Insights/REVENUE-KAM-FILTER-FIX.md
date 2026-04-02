# Revenue KAM Filter Fix

## Problem

Revenue calculation was including ALL brands regardless of whether they had been assigned a KAM by the target month. This was inconsistent with the brand count and outlet count logic.

## Solution

Updated `calculateMonthlyRevenue()` in `lib/revenue-calculator.ts` to filter brands by KAM assignment date before calculating revenue.

### Code Changes

**Before:**
```typescript
calculateMonthlyRevenue(brands: BrandWithKAM[], targetMonth: Date): RevenueBreakdown {
  let totalProducts = 0
  let totalServices = 0
  let totalBundlePlans = 0
  
  for (const brand of brands) {
    // Calculated revenue for ALL brands
    const brandRevenue = this.calculateBrandRevenue(brand, targetMonth)
    totalProducts += brandRevenue.products
    totalServices += brandRevenue.services
    totalBundlePlans += brandRevenue.bundlePlans
  }
  
  return { products, services, bundlePlans, total }
}
```

**After:**
```typescript
calculateMonthlyRevenue(brands: BrandWithKAM[], targetMonth: Date): RevenueBreakdown {
  let totalProducts = 0
  let totalServices = 0
  let totalBundlePlans = 0
  
  for (const brand of brands) {
    // NEW: Skip brands without valid Assign Date 1
    if (!brand.kam_assignment?.assign_date_1) {
      continue
    }
    
    // NEW: Check if brand was assigned on or before target month
    const assignDate = new Date(brand.kam_assignment.assign_date_1)
    if (assignDate > targetMonth) {
      continue
    }
    
    // Now calculate revenue only from assigned brands
    const brandRevenue = this.calculateBrandRevenue(brand, targetMonth)
    totalProducts += brandRevenue.products
    totalServices += brandRevenue.services
    totalBundlePlans += brandRevenue.bundlePlans
  }
  
  return { products, services, bundlePlans, total }
}
```

## Impact

### Consistency Across Metrics

All three metrics now follow the same filtering logic:

| Metric | Filtering Logic |
|--------|-----------------|
| Brand Count | Only brands with `assign_date_1 ≤ target month` |
| Outlet Count | Only outlets from brands with `assign_date_1 ≤ target month` |
| Revenue | Only revenue from brands with `assign_date_1 ≤ target month` |

### Your Data

With 4 brands assigned at different times:
- La Pinoz Pizza: Dec 21, 2021
- Bay City Grill: Aug 5, 2024
- 7th Heaven: Jan 7, 2025
- ERAMBUR: Aug 5, 2025

### Expected Behavior

| Month | Brands Included | Revenue Calculated From |
|-------|-----------------|-------------------------|
| April-July 2025 | 3 brands | La Pinoz + Bay City + 7th Heaven |
| August 2025+ | 4 brands | All 4 brands |

## Note on Current Revenue Values

Revenue is currently showing ₹0 for all months due to the price mapping issue (field names in code don't match price CSV names). However, the KAM filtering is now working correctly - once the price mapping is fixed, revenue will only be calculated from brands that have been assigned a KAM by that month.

## Tests

All tests pass ✓ including:
- Revenue calculator tests
- Metrics calculator tests  
- Integration tests
- CSV parser tests

The fix ensures that revenue grows over time as more brands are assigned KAMs, creating a consistent narrative across all dashboard metrics.
