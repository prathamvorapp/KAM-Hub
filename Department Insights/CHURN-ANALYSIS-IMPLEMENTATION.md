# Churn Analysis Implementation

## Overview
Added comprehensive churn analysis functionality to the Brand Insights dashboard, including monthly churn rates, revenue lost calculations, and brand-level churn metrics.

## Features Implemented

### 1. Monthly Churn Rate (Critical Metric)
- **Formula**: `Monthly Churn Rate = Churned Outlets in Month ÷ Active Outlets at Start of Month`
- Tracks active outlets at the beginning of each month
- Calculates accurate churn percentage based on the active base
- Prevents misleading metrics by using proper denominator

### 2. Churn Trend Analysis
- **Visual Bar Chart**: Month vs Churn Count with color-coded bars
- **Churn Rate Tracking**: Month vs Churn Rate percentage
- **3-Month Rolling Average**: Smooths volatility to identify true trends
- Interactive visualization showing:
  - Churn count per month
  - Churn rate percentage
  - Revenue lost per month
  - Rolling average trend line

### 3. Revenue Lost Calculation
Implements a two-step approach to maximize accuracy:

**Step 1: Join Data Sources**
- Joins Churn.csv with Brand Data CSV using `restaurant_id`
- Cross-references with Revenue.csv for actual revenue data
- Links to Price Data CSV for service pricing

**Value Calculation Method:**
- **Value 1**: Calculate revenue based on inactive services
  - Checks which services were active for the churned outlet
  - Multiplies active services by their prices from Price Data CSV
  
- **Value 2**: Check actual revenue from Revenue.csv
  - Sums all revenue records for the churned outlet
  
- **Final Value**: Takes the HIGHER of Value 1 or Value 2
  - Ensures we don't underestimate revenue impact
  - Accounts for both subscription and usage-based revenue

**Output Tables:**
1. Monthly View: `Month | Churn_Count | Revenue_Lost`
2. Brand View: `Brand | KAM | Churn_Count | Revenue_Lost`

## Files Created/Modified

### New Files
1. **lib/churn-calculator.ts**
   - Core calculation logic for churn analysis
   - Functions:
     - `calculateChurnAnalysis()`: Main analysis function
     - `parseChurnDate()`: Parses DD-MMM-YY format
     - `formatMonth()`: Formats dates to month strings
     - `calculateOutletRevenue()`: Calculates revenue for churned outlets
     - `getLatestKAM()`: Extracts latest KAM assignment

2. **components/ChurnAnalysis.tsx**
   - React component for churn visualization
   - Features:
     - Summary cards (total churn, revenue lost, avg rate, brands affected)
     - Monthly trend visualization with bar charts
     - Detailed monthly data table
     - Brand-level churn ranking table

### Modified Files
1. **lib/types.ts**
   - Added `ChurnRecord` interface
   - Added `PriceData` interface

2. **lib/data-context.tsx**
   - Added churn records state management
   - Added price data state management
   - New hooks: `useChurnRecords()`, `usePriceData()`

3. **lib/csv-loader.ts**
   - Added churn data loading
   - Converts PriceRecord to PriceData format

4. **lib/csv-parser.ts**
   - Added `parseChurnData()` method
   - Parses Churn.csv with proper field mapping

5. **components/DataLoader.tsx**
   - Updated to load churn and price data
   - Added state setters for new data types

6. **app/dashboard/brand-insights/page.tsx**
   - Added "Churn Analysis" tab
   - Integrated ChurnAnalysis component
   - Added hooks for churn and price data

## Data Flow

```
Churn.csv → parseChurnData() → ChurnRecord[]
                                      ↓
Brand DATA CSV → parseBrandData() → BrandRecord[] → BrandWithKAM[]
                                      ↓
Price Data CSV → parsePriceData() → PriceData[]
                                      ↓
Revenue.csv → parseRevenueData() → RevenueRecord[]
                                      ↓
                        calculateChurnAnalysis()
                                      ↓
                              ChurnAnalysis
                                      ↓
                          ChurnAnalysis Component
                                      ↓
                          Brand Insights Page
```

## Key Metrics Displayed

### Summary Cards
1. **Total Churned Outlets**: Total count across all months
2. **Total Revenue Lost**: Sum of all revenue lost (in Crores)
3. **Average Churn Rate**: Mean churn rate across all months
4. **Brands Affected**: Number of unique brands with churn

### Monthly Trend Table
- Month
- Churn Count
- Active Outlets at Start
- Churn Rate (%)
- Revenue Lost (₹)
- 3-Month Rolling Average (%)

### Brand-Level Analysis Table
- Rank (by revenue lost)
- Brand Name
- KAM Name
- Churned Outlets Count
- Revenue Lost (₹)

## Usage

1. Navigate to Brand Insights page
2. Click on "Churn Analysis" tab
3. View summary metrics at the top
4. Scroll down to see:
   - Monthly trend visualization
   - Detailed monthly data table
   - Brand-level churn rankings

## Technical Notes

### Date Handling
- Churn dates are in DD-MMM-YY format (e.g., "29-Apr-25")
- Parser handles month abbreviations correctly
- Chronological sorting ensures proper trend analysis

### Revenue Calculation Logic
```typescript
// For each churned outlet:
1. Find brand that owns the outlet
2. Calculate Value 1: Sum of active service prices
3. Calculate Value 2: Sum of actual revenue records
4. Use Math.max(Value1, Value2) as final revenue lost
```

### Performance Optimizations
- Uses `useMemo` for expensive calculations
- Caches analysis results until data changes
- Efficient data filtering and aggregation

## Future Enhancements

Potential improvements:
1. Add churn reason breakdown visualization
2. Implement churn prediction model
3. Add KAM-level churn comparison
4. Export churn analysis to CSV
5. Add date range filters
6. Implement churn cohort analysis
7. Add retention rate metrics

## Testing

To verify the implementation:
1. Check that Churn.csv loads without errors
2. Verify monthly churn rates are calculated correctly
3. Confirm revenue lost matches expected values
4. Test 3-month rolling average calculation
5. Validate brand-level aggregations
6. Check that all visualizations render properly

## Data Requirements

Ensure the following CSV files are present in the `Data/` directory:
- `Churn.csv` (required for churn analysis)
- `Brand DATA CSV.csv` (required)
- `Price Data CSV.csv` (required for revenue calculation)
- `Revenue.csv` (optional, enhances revenue accuracy)
- `KAM Data CSV.csv` (required for KAM attribution)
