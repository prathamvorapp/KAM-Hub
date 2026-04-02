# Revenue.csv Integration Implementation

## Overview
Integrated actual revenue data from `Revenue.csv` (April 2025 - January 2026) into the revenue calculation system with simplified New + Renewal structure.

## Data Structure

### Revenue.csv
- **Date Range:** April 1, 2025 to January 31, 2026 (10 months)
- **Total Records:** 25,996 transactions
- **Columns:**
  - `Date` - Transaction date (DD-MM-YYYY format)
  - `Product Or service Name` - Product/service type
  - `Amount` - Revenue amount
  - `restaurant_id` - Restaurant identifier

### Revenue Structure (Simplified)
```
Revenue
├── New: ₹X,XXX,XXX
├── Renewal: ₹X,XXX,XXX
└── Total: ₹X,XXX,XXX (New + Renewal)
```

**No more Products/Services/Bundles bifurcation** - All revenue is categorized as either New or Renewal.

## Implementation

### 1. Type Definitions (`lib/types.ts`)
Simplified RevenueBreakdown:
```typescript
export interface RevenueBreakdown {
  new: number        // New subscription revenue
  renewal: number    // Renewal revenue
  total: number      // Total = new + renewal
}

export interface RevenueRecord {
  date: Date
  product_or_service_name: string
  amount: number
  restaurant_id: string
}
```

### 2. Revenue Calculator (`lib/revenue-calculator.ts`)

#### Constructor
```typescript
constructor(prices: PriceRecord[], revenueRecords: RevenueRecord[] = [])
```
- Accepts price data and optional revenue records
- Stores revenue data for actual revenue calculations

#### Key Methods

**a) `calculateActualMonthlyRevenue(targetMonth: Date): RevenueBreakdown`**
- Calculates actual revenue from Revenue.csv for a specific month
- Segregates into New and Renewal based on product name
- Used for historical months (April 2025 - January 2026)

**b) `calculateActualBrandRevenue(brand: BrandWithKAM, targetMonth: Date): RevenueBreakdown`**
- Calculates actual revenue for a specific brand
- Matches transactions using `restaurant_id` from brand outlets
- Returns breakdown of new vs renewal revenue

**c) `calculateProjectedRevenue(brands: BrandWithKAM[], targetMonth: Date): RevenueBreakdown`**
- For future months (Feb 2026+)
- Combines three data sources:
  1. **Historical Data:** Uses actual revenue from Revenue.csv for past months
  2. **Expiry Dates:** Subscriptions expiring after Jan 2026 assumed to renew
  3. **Price Data:** Uses Price Data CSV for pricing

**d) `calculateBrandRevenue(brand: BrandWithKAM, targetMonth: Date, assumeRenewal: boolean): RevenueBreakdown`**
- Unified method for brand revenue calculation
- Uses actual data if available, otherwise projects

**e) `calculateMonthlyRevenue(brands: BrandWithKAM[], targetMonth: Date, assumeRenewal: boolean): RevenueBreakdown`**
- Unified method for monthly revenue calculation
- Automatically uses actual or projected data based on date

## Revenue Categorization

### New Revenue
All products/services WITHOUT "Renewal" in the name:
- Android POS
- Pos subscription
- POS Subscription
- EBill
- Petpooja Purchase
- etc.

### Renewal Revenue
All products/services WITH "Renewal" in the name:
- Android POS - Renewal income
- POS Subscription - Renewal
- Petpooja Payroll - Renewal
- POS Subscription - Renewal
- etc.

**Detection:** Case-insensitive check for "renewal" keyword in product name

## Usage Examples

### Department Revenue (Monthly)
```typescript
// For historical months (Apr 2025 - Jan 2026) - uses actual data
const aprilRevenue = calculator.calculateMonthlyRevenue(brands, new Date(2025, 3, 1))
console.log(`April 2025: New=₹${aprilRevenue.new}, Renewal=₹${aprilRevenue.renewal}, Total=₹${aprilRevenue.total}`)

// For future months (Feb 2026+) - uses projections
const juneRevenue = calculator.calculateMonthlyRevenue(brands, new Date(2026, 5, 1), true)
console.log(`June 2026 (Projected): New=₹${juneRevenue.new}, Renewal=₹${juneRevenue.renewal}`)
```

### Brand Journey Revenue
```typescript
// Get revenue for a specific brand (actual or projected)
const brandRevenue = calculator.calculateBrandRevenue(brand, new Date(2025, 3, 1))
console.log(`Brand Revenue: New=₹${brandRevenue.new}, Renewal=₹${brandRevenue.renewal}, Total=₹${brandRevenue.total}`)
```

## Forecasting Logic

### For Historical Months (Apr 2025 - Jan 2026)
1. Read actual transactions from Revenue.csv
2. Filter by target month
3. Categorize as New or Renewal based on product name
4. Sum amounts

### For Future Months (Feb 2026+)
1. Check all active subscriptions with expiry dates
2. If expiry date is after Jan 2026, assume renewal
3. Calculate renewal revenue using:
   - `POS_Subscription_Renewal` price (₹7,000) if available
   - Otherwise, `POS_Subscription` price (₹10,000)
4. Add new subscriptions created in target month

## Data Relationships

### Brand to Revenue Mapping
```
Brand (KAM Data CSV)
  └─> Outlets (Brand DATA CSV - restaurant_id)
       └─> Revenue Transactions (Revenue.csv - restaurant_id)
```

### Price Lookup
```
Revenue Transaction
  └─> Product/Service Name
       └─> Price Data CSV (for projections)
```

## Display Format

```
Revenue
New:      ₹8,150,000
Renewal:  ₹0
Total:    ₹8,150,000
```

## Next Steps

1. **CSV Loader Update:** Modify `lib/csv-loader.ts` to load Revenue.csv
2. **Data Context Update:** Add revenue records to data context
3. **UI Integration:** Update dashboard components to display simplified structure
4. **Testing:** Add tests for revenue calculation methods

## Notes

- Historical data (Apr 2025 - Jan 2026) uses actual transactions from Revenue.csv
- Future projections (Feb 2026+) use subscription expiry dates + price data
- Renewal detection is case-insensitive and looks for "renewal" keyword
- All amounts are in INR (Indian Rupees)
- Products/Services/Bundles categorization has been removed for simplicity
