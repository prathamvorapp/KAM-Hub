# Switching Cost Index (SCI) Implementation

## Overview

The Switching Cost Index (SCI) measures how difficult it would be for a brand to switch from Petpooja to a competitor. A higher SCI indicates that the brand has adopted more non-core products across their outlets, making switching more costly and complex.

## Product Weight Categories

Products are weighted based on their operational embeddedness and switching difficulty:

### High Switching Cost Products (Weight: 3)
These products are deeply embedded in daily operations and require significant training/process changes:
- **Captain_Application** - Core service operations
- **Self_Order_Kiosk** - Customer-facing ordering
- **Inventory_Application** - Supply chain management
- **Petpooja_Loyalty** - Customer relationship data
- **Dynamic_Reports** - Business intelligence
- **Reservation_Manager_App** - Booking management
- **Kitchen_Display_System** - Kitchen operations
- **Waiter_Calling_Device** - Service coordination

### Medium Switching Cost Products (Weight: 2)
Important products but less operationally embedded:
- Petpooja_Payroll
- Petpooja_Growth_Plan
- Petpooja_Scan_Order
- Petpooja_Scale_Plan
- Petpooja_POS_Scale_Plan
- Petpooja_POS_Growth_Plan

### Standard Products (Weight: 1)
All other non-core products

## Calculation Methodology

### 1. Non-Core Products Identification

All products EXCEPT `POS_Subscription` are considered non-core products. Products are weighted by their switching difficulty:

**Weight 3 (High Switching Cost):**
- Captain_Application
- Self_Order_Kiosk
- Inventory_Application
- Petpooja_Loyalty
- Dynamic_Reports
- Reservation_Manager_App
- Kitchen_Display_System
- Waiter_Calling_Device

**Weight 2 (Medium Switching Cost):**
- Petpooja_Payroll
- Petpooja_Growth_Plan
- Petpooja_Scan_Order
- Petpooja_Scale_Plan
- Petpooja_POS_Scale_Plan
- Petpooja_POS_Growth_Plan

**Weight 1 (Standard):**
- All other non-core products (30+ products)

### 2. Per-Brand Calculations

For each brand (grouped by email):

#### a. Total Outlets
```
total_outlets = count of unique restaurant_id for the brand
```

#### b. Active Module Count
For each outlet:
```
active_module_count = count of non-core products where status = 'active'
```

#### c. Total Active Modules
```
total_active_modules = sum of active_module_count across all outlets
```

#### d. Density Score
```
Density = If total_outlets == 0: 0
          Else: total_active_modules / total_outlets
```

This measures the average number of active non-core products per outlet.

#### e. Product Spread
For each non-core product:
```
product_spread = (number of outlets where product is Active) / total_outlets
```

#### f. Spread Score
```
Spread Score = average(product_spread across all non-core products)
```

This measures how evenly products are distributed across outlets.

#### g. SCI Embedded (Weighted Product Adoption)
```
total_weight = sum(weight of all non-core products)
               (This is constant across all brands)

SCI_embedded = If total_weight == 0: 0
               Else: Σ(product_spread × weight) / total_weight
```

Where:
- High-priority products have weight = 2
- Other products have weight = 1

#### h. Scale Score (Logarithmic Outlet Scaling)
```
max_outlets_in_dataset = maximum outlet count across all brands

scale_score = If total_outlets <= 1 OR max_outlets_in_dataset <= 1: 0
              Else: log(total_outlets) / log(max_outlets_in_dataset)
```

This gives larger brands a higher score, but with diminishing returns (logarithmic).

#### i. Final Switching Cost Index (SCI)
```
SCI_final = If total_outlets == 0 OR total_weight == 0: 0
            Else: SCI_embedded × (0.5 + 0.5 × scale_score)
```

The formula ensures:
- Single-outlet brands get 50% of their embedded score (0.5 multiplier)
- Brands with max outlets get 100% of their embedded score (1.0 multiplier)
- Brands in between scale logarithmically

### 3. Categorization

Based on the calculated SCI:

- **High**: SCI ≥ 0.6 (close to 1)
- **Medium**: 0.3 ≤ SCI < 0.6
- **Low**: SCI < 0.3 (close to 0)

## Output Format

The SCI calculation produces a table with the following columns:

| Column | Description |
|--------|-------------|
| Rank | Position when sorted by SCI (descending) |
| Brand Name | Name from KAM data or email |
| KAM | Key Account Manager name |
| Total Outlets | Number of outlets for the brand |
| Density | Average active modules per outlet |
| Spread Score | Average product distribution |
| SCI | Switching Cost Index (0-1) |
| Category | High, Medium, or Low |

## Implementation Files

### Core Logic
- `lib/switching-cost-calculator.ts` - Main calculation logic
- `lib/switching-cost-calculator.test.ts` - Unit tests

### Integration
- `app/dashboard/brand-insights/page.tsx` - UI integration
- `lib/data-context.tsx` - Data context with brandRecords and kamRecords
- `components/DataLoader.tsx` - Data loading with raw records
- `lib/csv-loader.ts` - CSV loading with raw records export

## Usage

### In the Dashboard

1. Navigate to `/dashboard/brand-insights`
2. Click on the "Switching Cost Index" tab
3. Use filters to narrow down by KAM or outlet count
4. View brands ranked by their switching cost

### Programmatically

```typescript
import { calculateSwitchingCostIndex } from '@/lib/switching-cost-calculator'
import { BrandRecord, KAMRecord } from '@/lib/types'

const sciResults = calculateSwitchingCostIndex(brandRecords, kamRecords)

// Results are sorted by SCI descending
sciResults.forEach(result => {
  console.log(`${result.brandName}: SCI = ${result.sci.toFixed(3)} (${result.switchingCostCategory})`)
})
```

## Key Insights

1. **High SCI brands** are deeply integrated with Petpooja's ecosystem and would face significant switching costs
2. **Density** shows product adoption intensity per outlet
3. **Spread Score** indicates how uniformly products are adopted across outlets
4. **Three-tier weighting system**:
   - Weight 3: Operationally embedded products (Captain, Kiosk, Inventory, Loyalty, Reports, Reservation, KDS, Waiter Device)
   - Weight 2: Important products (Payroll, Growth/Scale Plans)
   - Weight 1: Standard products
5. **Scale adjustment** rewards brands with more outlets using logarithmic scaling:
   - Single-outlet brands: 50% of embedded score
   - Maximum-outlet brands: 100% of embedded score
   - Logarithmic scaling ensures diminishing returns for very large brands
6. **High-weight products** like Captain Application and Inventory across multiple outlets significantly increase switching costs

## Testing

Run the test suite:
```bash
npm test -- lib/switching-cost-calculator.test.ts
```

Test with real data:
```bash
node test-sci-calculation.js
```

## Future Enhancements

Potential improvements:
- Time-based SCI tracking to see adoption trends
- Product category grouping for deeper insights
- Revenue correlation with SCI
- Churn risk prediction based on SCI
- Export SCI data to CSV
