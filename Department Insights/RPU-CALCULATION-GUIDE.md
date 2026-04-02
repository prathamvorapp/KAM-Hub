# RPU (Revenue Per Unit) Calculation Guide

## Overview

RPU (Revenue Per Unit) has been added to the brand journey dashboard to provide insights into revenue efficiency at both department and brand levels.

## Calculation Formulas

### Department Level
```
RPU = Total Revenue / Total Brands
```

### Brand Level
```
RPU = Total Revenue / Total Outlets
```

## Implementation

### 1. Revenue Calculator Methods

Two new methods have been added to `RevenueCalculator`:

#### `calculateDepartmentRPU(brands, targetMonth, brandCount)`
Calculates RPU for the entire department.

**Parameters:**
- `brands`: Array of all brands in the department
- `targetMonth`: The month to calculate RPU for
- `brandCount`: Total number of brands for that month

**Returns:** `RevenueBreakdown` with `new`, `renewal`, and `total` RPU values

#### `calculateBrandRPU(brand, targetMonth, outletCount, assumeRenewal)`
Calculates RPU for a specific brand.

**Parameters:**
- `brand`: The brand to calculate RPU for
- `targetMonth`: The month to calculate RPU for
- `outletCount`: Total number of outlets for that brand in that month
- `assumeRenewal`: Whether to assume renewals for projected months

**Returns:** `RevenueBreakdown` with `new`, `renewal`, and `total` RPU values

### 2. Type Updates

The `DepartmentMetrics` and `BrandMetrics` interfaces now include an `rpu` field:

```typescript
export interface DepartmentMetrics {
  brandCount: number
  outletCount: number
  revenue: RevenueBreakdown
  rpu: RevenueBreakdown  // NEW
  isProjected: boolean
}

export interface BrandMetrics {
  outletCount: number
  revenue: RevenueBreakdown
  rpu: RevenueBreakdown  // NEW
  isProjected: boolean
}
```

### 3. Milestone Generator Updates

The `MilestoneGenerator` now automatically calculates RPU for each milestone:

- **Department Timeline**: RPU is calculated for each month using total revenue divided by brand count
- **Brand Timeline**: RPU is calculated for each month using brand revenue divided by outlet count

## Usage Example

```typescript
import { RevenueCalculator } from './lib/revenue-calculator'
import { MetricsCalculator } from './lib/metrics-calculator'

// Initialize calculators
const revenueCalculator = new RevenueCalculator(prices, revenueRecords)
const metricsCalculator = new MetricsCalculator()

// Calculate department RPU for a specific month
const targetMonth = new Date(2026, 1, 28) // Feb 2026
const brandCount = metricsCalculator.calculateBrandCount(brands, targetMonth)
const departmentRPU = revenueCalculator.calculateDepartmentRPU(
  brands, 
  targetMonth, 
  brandCount
)

console.log(`Department RPU: ${departmentRPU.total}`)
// Output: Department RPU: 8500 (example)

// Calculate brand RPU for a specific brand
const brand = brands[0]
const outletCount = metricsCalculator.calculateOutletCount([brand], targetMonth)
const brandRPU = revenueCalculator.calculateBrandRPU(
  brand, 
  targetMonth, 
  outletCount
)

console.log(`Brand RPU: ${brandRPU.total}`)
// Output: Brand RPU: 7000 (example)
```

## Accessing RPU in Timeline Data

RPU is automatically included in milestone metrics:

```typescript
import { MilestoneGenerator } from './lib/milestone-generator'

const generator = new MilestoneGenerator(prices, revenueRecords)

// Department timeline
const departmentTimeline = generator.generateDepartmentTimeline(brands)
departmentTimeline.milestones.forEach(milestone => {
  console.log(`${milestone.label}:`)
  console.log(`  Total Revenue: ${milestone.metrics.revenue.total}`)
  console.log(`  Brand Count: ${milestone.metrics.brandCount}`)
  console.log(`  RPU: ${milestone.metrics.rpu.total}`)
})

// Brand timeline
const brandTimeline = generator.generateBrandTimeline(brand)
brandTimeline.milestones.forEach(milestone => {
  console.log(`${milestone.label}:`)
  console.log(`  Total Revenue: ${milestone.metrics.revenue.total}`)
  console.log(`  Outlet Count: ${milestone.metrics.outletCount}`)
  console.log(`  RPU: ${milestone.metrics.rpu.total}`)
})
```

## Edge Cases

### Zero Division Protection
Both RPU methods return zero values when the denominator is zero:
- Department RPU returns 0 when `brandCount` is 0
- Brand RPU returns 0 when `outletCount` is 0

### Historical vs Projected Months
- **Historical months** (April 2025 - January 2026): Uses actual revenue data from Revenue.csv
- **Projected months** (February 2026 onwards): Uses projected revenue based on subscription expiry dates

## Testing

Comprehensive tests have been added in `lib/revenue-calculator.test.ts`:
- Zero brand/outlet count handling
- Division calculations
- Mixed new and renewal revenue
- Historical and projected month scenarios

Run tests with:
```bash
npm test -- lib/revenue-calculator.test.ts -t "RPU" --run
```
