# Churn Analysis Filter Integration Fix

## Problem
The filters (KAM selection and outlet count range) on the Brand Insights page were not being applied to the Churn Analysis tab. When users selected a specific KAM or outlet range, the churn data, graphs, and summary metrics remained unchanged.

## Root Cause
The `ChurnAnalysis` component was receiving the full unfiltered dataset and calculating metrics independently without considering the active filters from the parent page.

## Solution Implemented

### 1. Updated ChurnAnalysis Component Props
Added filter parameters to the component interface:
```typescript
interface ChurnAnalysisProps {
  churnRecords: ChurnRecord[]
  brands: BrandWithKAM[]
  priceData: PriceData[]
  revenueRecords: RevenueRecord[]
  selectedKAM?: string        // NEW
  minOutlets?: number         // NEW
  maxOutlets?: number         // NEW
}
```

### 2. Added Brand Filtering Logic
Implemented filtering within the ChurnAnalysis component:
```typescript
const filteredBrands = useMemo(() => {
  return brands.filter(brand => {
    // KAM filter
    if (selectedKAM !== 'all') {
      const latestKAM = getLatestKAM(brand)
      if (selectedKAM === 'Unassigned') {
        if (latestKAM) return false
      } else {
        if (latestKAM !== selectedKAM) return false
      }
    }
    
    // Outlet count filter
    const outletCount = brand.outlets.length
    if (outletCount < minOutlets || outletCount > maxOutlets) {
      return false
    }
    
    return true
  })
}, [brands, selectedKAM, minOutlets, maxOutlets])
```

### 3. Added Churn Record Filtering
Filter churn records to only include outlets from filtered brands:
```typescript
const filteredChurnRecords = useMemo(() => {
  const filteredBrandIds = new Set<string>()
  filteredBrands.forEach(brand => {
    filteredBrandIds.add(brand.restaurant_id)
    brand.outlets.forEach(outlet => {
      filteredBrandIds.add(outlet.restaurant_id)
    })
  })
  
  return churnRecords.filter(churn => 
    filteredBrandIds.has(churn.restaurant_id)
  )
}, [churnRecords, filteredBrands])
```

### 4. Updated Analysis Calculation
Changed to use filtered data:
```typescript
const analysis = useMemo(() => 
  calculateChurnAnalysis(filteredChurnRecords, filteredBrands, priceData, revenueRecords),
  [filteredChurnRecords, filteredBrands, priceData, revenueRecords]
)
```

### 5. Added Pagination Reset
Reset pagination when filters change:
```typescript
React.useEffect(() => {
  setCurrentPage(1)
  setKamCurrentPage(1)
}, [selectedKAM, minOutlets, maxOutlets])
```

### 6. Updated Parent Component
Modified Brand Insights page to pass filter values:
```typescript
{viewMode === 'churn-analysis' && (
  <ChurnAnalysis
    churnRecords={churnRecords}
    brands={brands}
    priceData={priceData}
    revenueRecords={revenueRecords}
    selectedKAM={selectedKAM}      // PASSED
    minOutlets={minOutlets}        // PASSED
    maxOutlets={maxOutlets}        // PASSED
  />
)}
```

## What Now Updates with Filters

### Summary Cards
- ✅ Total Churned Outlets
- ✅ Total Revenue Lost
- ✅ Average Churn Rate
- ✅ Brands Affected

### Monthly Churn Trend Chart
- ✅ Churn count line (red)
- ✅ Churn rate line (blue)
- ✅ 3-month rolling average (orange)
- ✅ All data point annotations

### Monthly Data Table
- ✅ All rows filtered
- ✅ Metrics recalculated

### KAM-wise Churn Analysis
- ✅ Only shows selected KAM (if filtered)
- ✅ Metrics recalculated for filtered data
- ✅ Pagination resets

### Brand-Level Churn Analysis
- ✅ Only shows brands matching filters
- ✅ Rankings recalculated
- ✅ Pagination resets

## Example Use Cases

### Filter by Specific KAM
1. Select "Mahima Sali" from KAM dropdown
2. Churn Analysis tab now shows:
   - Only churn from Mahima Sali's brands
   - Updated total churn count
   - Updated revenue lost
   - Updated average churn rate
   - KAM table shows only Mahima Sali
   - Brand table shows only her brands

### Filter by Outlet Count Range
1. Set Min Outlets: 10, Max Outlets: 50
2. Churn Analysis tab now shows:
   - Only churn from brands with 10-50 outlets
   - All metrics recalculated
   - Charts updated
   - Tables filtered

### Combined Filters
1. Select KAM + Outlet Range
2. Shows intersection of both filters
3. All metrics reflect the combined filter

## Technical Details

### Performance Optimization
- Uses `useMemo` for expensive filtering operations
- Filters are applied once and cached
- Recalculates only when filter values change

### Data Integrity
- Maintains referential integrity between brands and outlets
- Ensures churn records match filtered brand set
- Preserves global rankings in paginated views

### User Experience
- Pagination automatically resets to page 1 when filters change
- Prevents showing empty pages after filtering
- Maintains consistent behavior across all tabs

## Files Modified
1. `components/ChurnAnalysis.tsx` - Added filtering logic
2. `app/dashboard/brand-insights/page.tsx` - Pass filter props

## Testing Checklist
- [x] Filter by single KAM - metrics update
- [x] Filter by outlet range - metrics update
- [x] Combined filters work correctly
- [x] Reset filters returns to full dataset
- [x] Pagination resets on filter change
- [x] Charts update with filtered data
- [x] All tables show filtered results
- [x] Summary cards reflect filtered totals
