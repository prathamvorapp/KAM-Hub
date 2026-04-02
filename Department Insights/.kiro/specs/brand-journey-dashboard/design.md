# Design Document: Brand Journey Dashboard

## Overview

The Brand Journey Dashboard is a Next.js application that transforms CSV data into interactive, animated roadmap visualizations. The system processes three CSV files containing brand, KAM assignment, and pricing data to generate two primary views: a department-level journey showing aggregate metrics and individual brand journeys showing specific progress.

The architecture follows a clear separation between data processing (CSV parsing, revenue calculation) and presentation (React components with Framer Motion animations). The system distinguishes between realized historical data (April 2025 - January 2026) and projected future data (February 2026 - March 2027) based on subscription expiry dates.

## Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Next.js App                          │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────────┐      ┌──────────────┐                   │
│  │   Pages      │      │  Components  │                   │
│  │              │      │              │                   │
│  │ - Dept View  │─────▶│ - Journey    │                   │
│  │ - Brand View │      │   Visualizer │                   │
│  └──────────────┘      │ - Milestone  │                   │
│         │              │ - Timeline   │                   │
│         │              └──────────────┘                   │
│         │                                                  │
│         ▼                                                  │
│  ┌──────────────────────────────────────────┐            │
│  │         Data Processing Layer            │            │
│  │                                          │            │
│  │  ┌──────────┐  ┌──────────┐  ┌────────┐│            │
│  │  │   CSV    │  │ Revenue  │  │ Data   ││            │
│  │  │  Parser  │─▶│Calculator│─▶│ Store  ││            │
│  │  └──────────┘  └──────────┘  └────────┘│            │
│  └──────────────────────────────────────────┘            │
│         ▲                                                  │
│         │                                                  │
│  ┌──────────────┐                                         │
│  │  CSV Files   │                                         │
│  │  (/Data)     │                                         │
│  └──────────────┘                                         │
└─────────────────────────────────────────────────────────────┘
```

### Component Architecture

The application is structured into three main layers:

1. **Data Layer**: Handles CSV parsing, data validation, and cross-referencing
2. **Business Logic Layer**: Implements revenue calculation rules and projection generation
3. **Presentation Layer**: Renders interactive roadmap visualizations

## Components and Interfaces

### CSV Parser

**Responsibility**: Read and parse CSV files, validate data structure, cross-reference records

**Interface**:
```typescript
interface CSVParser {
  parseBrandData(): Promise<BrandRecord[]>
  parseKAMData(): Promise<KAMRecord[]>
  parsePriceData(): Promise<PriceRecord[]>
  crossReference(brands: BrandRecord[], kams: KAMRecord[]): BrandWithKAM[]
}

interface BrandRecord {
  restaurant_id: string
  email: string
  POS_Subscription_status: string
  POS_Subscription_creation: Date | null
  POS_Subscription_expiry: Date | null
  // Product fields
  Petpooja_Tasks_status: string
  Petpooja_Tasks_creation: Date | null
  Petpooja_Payroll_status: string
  Petpooja_Payroll_creation: Date | null
  // Bundle plan fields
  Petpooja_Growth_Plan_status: string
  Petpooja_Growth_Plan_creation: Date | null
  Petpooja_Scale_Plan_status: string
  Petpooja_Ultimate_Plan_status: string
  // ... other product/service fields
}

interface KAMRecord {
  brand_uid: string
  brand_name: string
  email: string
  assign_date_1: Date | null
}

interface PriceRecord {
  service_product_name: string
  price: number
}
```

**Implementation Notes**:
- Use papaparse library for CSV parsing
- Handle missing or malformed date fields gracefully
- Log warnings for data quality issues
- Cache parsed data to avoid re-parsing on navigation

### Revenue Calculator

**Responsibility**: Calculate monthly revenue based on business rules, handle bundle plan priority

**Interface**:
```typescript
interface RevenueCalculator {
  calculateMonthlyRevenue(
    brands: BrandWithKAM[],
    prices: PriceRecord[],
    month: Date
  ): RevenueBreakdown
  
  calculateBrandRevenue(
    brand: BrandWithKAM,
    prices: PriceRecord[],
    month: Date
  ): RevenueBreakdown
  
  isSubscriptionActive(
    creation: Date | null,
    expiry: Date | null,
    targetMonth: Date
  ): boolean
}

interface RevenueBreakdown {
  products: number
  services: number
  bundlePlans: number
  total: number
}
```

**Business Rules**:
1. Check for bundle plans first (Growth, Scale, Ultimate variants)
2. If bundle plan exists, use only bundle price
3. If no bundle, sum individual products and services
4. Products: Petpooja_Tasks, Petpooja_Payroll, POS_Subscription
5. Services: All others not in products or bundles
6. Creation date = one-time payment in that month
7. Use expiry dates for active status determination

### Metrics Calculator

**Responsibility**: Calculate brand count, outlet count, and aggregate metrics

**Interface**:
```typescript
interface MetricsCalculator {
  calculateBrandCount(brands: BrandWithKAM[], month: Date): number
  calculateOutletCount(brands: BrandWithKAM[], month: Date): number
  calculateDepartmentMetrics(
    brands: BrandWithKAM[],
    prices: PriceRecord[],
    month: Date
  ): DepartmentMetrics
}

interface DepartmentMetrics {
  brandCount: number
  outletCount: number
  revenue: RevenueBreakdown
  isProjected: boolean
}
```

**Calculation Logic**:
- Brand count: Unique emails with Assign Date 1 <= target month
- Outlet count: Active POS subscriptions (status = "Active" AND expiry > target month)
- Projected flag: true for months after January 2026

### Journey Visualizer Component

**Responsibility**: Render roadmap-style timeline with milestones

**Interface**:
```typescript
interface JourneyVisualizerProps {
  milestones: Milestone[]
  startDate: Date
  endDate: Date
  type: 'department' | 'brand'
}

interface Milestone {
  date: Date
  label: string
  metrics: DepartmentMetrics | BrandMetrics
  isProjected: boolean
}
```

**Visual Design**:
- Horizontal timeline with milestone nodes
- Connecting lines between milestones
- Animated transitions using Framer Motion
- Distinct styling for realized vs projected data
- Interactive hover states showing detailed metrics
- Muted color palette (grays, blues, subtle accents)

### Timeline Component

**Responsibility**: Render the base timeline structure

**Props**:
```typescript
interface TimelineProps {
  startDate: Date
  endDate: Date
  milestones: Milestone[]
  onMilestoneClick?: (milestone: Milestone) => void
}
```

**Features**:
- Responsive layout (horizontal on desktop, vertical on mobile)
- Smooth scroll to milestone
- Visual indicators for current position
- Date labels at regular intervals

### Milestone Component

**Responsibility**: Render individual milestone with metrics

**Props**:
```typescript
interface MilestoneProps {
  milestone: Milestone
  isProjected: boolean
  onClick?: () => void
}
```

**Visual Elements**:
- Circular node with date
- Metric cards showing counts and revenue
- Connection lines to adjacent milestones
- Hover animation revealing details
- Distinct styling for projected milestones (dashed borders, lighter colors)

## Data Models

### Core Data Structures

```typescript
interface BrandWithKAM extends BrandRecord {
  kam_assignment: KAMRecord | null
  outlets: OutletInfo[]
}

interface OutletInfo {
  restaurant_id: string
  pos_status: string
  pos_creation: Date | null
  pos_expiry: Date | null
}

interface TimelineData {
  milestones: Milestone[]
  startDate: Date
  endDate: Date
  realizedEndDate: Date // January 2026
}

interface BrandMetrics {
  outletCount: number
  revenue: RevenueBreakdown
  isProjected: boolean
}
```

### Data Flow

1. **Initial Load**:
   - Parse all three CSV files
   - Cross-reference using email/Brand UID
   - Store in application state (React Context or Zustand)

2. **Department View**:
   - Generate monthly milestones from April 2025 to March 2027
   - For each milestone, calculate aggregate metrics
   - Mark milestones after January 2026 as projected

3. **Brand View**:
   - Filter data for specific brand
   - Start timeline from POS_Subscription_creation
   - Add KAM assignment as first milestone
   - Generate monthly milestones with brand-specific metrics

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*


### CSV Parsing Properties

Property 1: CSV field extraction completeness
*For any* valid CSV file with expected schema, parsing should extract all required fields without data loss
**Validates: Requirements 1.2, 1.3, 1.4**

Property 2: CSV error handling
*For any* missing or malformed CSV file, the parser should signal an error with a descriptive message indicating the specific file and issue
**Validates: Requirements 1.5**

Property 3: Cross-reference consistency
*For any* set of brand and KAM records with matching email or Brand UID, cross-referencing should link all matching records without duplicates
**Validates: Requirements 1.6, 8.1, 8.2**

### Metrics Calculation Properties

Property 4: Brand count accuracy
*For any* collection of brands and target month, the brand count should equal the number of unique emails with Assign Date 1 on or before that month, excluding brands without valid assignment dates
**Validates: Requirements 3.1, 3.2, 3.3**

Property 5: Outlet count with expiry logic
*For any* collection of outlets and target month, the outlet count should include only outlets with POS_Subscription_status "Active" and expiry date after the target month (or no expiry date)
**Validates: Requirements 4.1, 4.2**

Property 6: Revenue breakdown structure
*For any* calculated revenue, the breakdown should contain exactly three categories: Products, Services, and Bundle Plans, with total equaling their sum
**Validates: Requirements 5.6**

### Revenue Calculation Properties

Property 7: Bundle plan priority
*For any* brand with an active bundle plan, revenue calculation should use only the bundle plan price and should not include individual product or service prices
**Validates: Requirements 5.1, 5.2**

Property 8: Revenue without bundle
*For any* brand without a bundle plan, revenue calculation should sum all active product prices (Petpooja_Tasks, Petpooja_Payroll, POS_Subscription) and service prices (all others)
**Validates: Requirements 5.3**

Property 9: Creation date revenue attribution
*For any* product or service with a creation date, revenue should be attributed to the month of creation as a one-time payment
**Validates: Requirements 5.4**

Property 10: Projected revenue with expiry
*For any* projected month, revenue calculation should exclude subscriptions with expiry dates before that month
**Validates: Requirements 5.5, 10.1**

Property 11: Price lookup with fallback
*For any* product or service name, the revenue calculator should look up its price in the price data, and if not found, use zero and log a warning
**Validates: Requirements 8.3, 8.4**

### Visualization Properties

Property 12: Milestone data completeness
*For any* rendered milestone, it should display brand count, outlet count, and revenue breakdown fields
**Validates: Requirements 2.4**

Property 13: Realized vs projected styling
*For any* milestone, if it is marked as projected (date after January 2026), it should have distinct styling from realized milestones
**Validates: Requirements 2.5**

Property 14: Brand journey start date
*For any* brand with a POS_Subscription_creation date, the journey timeline should start from that date
**Validates: Requirements 6.2**

Property 15: KAM assignment milestone ordering
*For any* brand with an Assign Date 1, it should appear as a milestone after the journey start and before April 2025
**Validates: Requirements 6.3**

Property 16: Brand-specific metric filtering
*For any* brand journey milestone, all displayed metrics should be calculated using only that brand's data, not aggregate data
**Validates: Requirements 6.7**

Property 17: Interactive element handlers
*For any* milestone element, it should have attached event handlers for user interactions (click, hover)
**Validates: Requirements 7.4**

Property 18: Projected data labeling
*For any* milestone with isProjected flag set to true, the rendered output should include text indicating it is an estimate or projection
**Validates: Requirements 10.4**

### Navigation and State Properties

Property 19: State preservation across navigation
*For any* navigation between routes, the application state (parsed CSV data, calculated metrics) should remain available without re-parsing or re-calculation
**Validates: Requirements 11.3**

### Error Handling Properties

Property 20: File read error specificity
*For any* CSV file that cannot be read, the error message should identify the specific file name that is missing or inaccessible
**Validates: Requirements 12.1**

Property 21: Invalid date handling
*For any* CSV record with invalid date format, the parser should log a warning with the record identifier and skip that record without crashing
**Validates: Requirements 12.2**

Property 22: Missing field validation
*For any* CSV record missing required fields, the parser should display a validation error identifying the missing fields
**Validates: Requirements 12.3**

## Error Handling

### CSV Parsing Errors

**File Not Found**:
- Catch file system errors during CSV read
- Display error modal with specific file name
- Provide guidance: "Place CSV files in /Data folder"
- Allow retry without page reload

**Malformed CSV**:
- Catch parsing exceptions from papaparse
- Log row number and error details
- Skip malformed rows, continue parsing valid rows
- Display warning summary after parsing completes

**Invalid Data Types**:
- Validate date fields using date parsing library
- Log warnings for invalid dates with record identifier
- Set invalid dates to null
- Continue processing with null values

### Calculation Errors

**Missing Price Data**:
- When product/service price not found in Price Data CSV
- Log warning: "Price not found for {product_name}, using 0"
- Use 0 as fallback price
- Continue revenue calculation

**Invalid Date Ranges**:
- When expiry date is before creation date
- Log warning with brand/outlet identifier
- Treat as data quality issue
- Use creation date only, ignore expiry

### UI Error States

**No Data Available**:
- When CSV files are empty or all records invalid
- Display empty state with instructions
- Provide link to data format documentation

**Brand Not Found**:
- When accessing /dashboard/brand-journey/[invalid_id]
- Display 404-style message
- Provide link back to department view
- Suggest checking brand ID

## Testing Strategy

### Dual Testing Approach

The testing strategy combines unit tests for specific examples and edge cases with property-based tests for universal correctness properties. Both approaches are complementary and necessary for comprehensive coverage.

**Unit Tests** focus on:
- Specific CSV parsing examples with known data
- Edge cases (empty files, single record, missing fields)
- Error conditions (file not found, malformed CSV)
- Integration between components
- Specific milestone rendering examples

**Property-Based Tests** focus on:
- Universal properties that hold for all inputs
- Comprehensive input coverage through randomization
- Revenue calculation rules across all possible brand configurations
- Metrics calculation across all possible date ranges
- Cross-referencing logic across all possible data combinations

### Property-Based Testing Configuration

**Library Selection**: Use **fast-check** for TypeScript/JavaScript property-based testing

**Test Configuration**:
- Minimum 100 iterations per property test
- Each test must reference its design document property
- Tag format: `// Feature: brand-journey-dashboard, Property {number}: {property_text}`

**Example Property Test Structure**:
```typescript
import fc from 'fast-check'

// Feature: brand-journey-dashboard, Property 4: Brand count accuracy
test('brand count equals unique emails with valid assignment dates', () => {
  fc.assert(
    fc.property(
      fc.array(brandRecordArbitrary()),
      fc.date(),
      (brands, targetMonth) => {
        const count = calculateBrandCount(brands, targetMonth)
        const expected = new Set(
          brands
            .filter(b => b.assign_date_1 && b.assign_date_1 <= targetMonth)
            .map(b => b.email)
        ).size
        expect(count).toBe(expected)
      }
    ),
    { numRuns: 100 }
  )
})
```

### Unit Test Examples

**CSV Parsing**:
- Test parsing valid Brand DATA CSV with known records
- Test parsing with missing optional fields
- Test parsing with empty file
- Test error handling for missing file

**Revenue Calculation**:
- Test bundle plan priority with specific example
- Test revenue calculation without bundle
- Test creation date attribution for specific month
- Test expiry date exclusion for projected months

**Visualization**:
- Test department journey renders correct date range
- Test brand journey starts from POS creation date
- Test milestone contains all required metric fields
- Test projected milestones have distinct styling

### Integration Tests

**End-to-End Data Flow**:
- Load CSV files → Parse → Calculate metrics → Render visualization
- Test complete department journey generation
- Test complete brand journey generation
- Test navigation between views preserves state

**Error Recovery**:
- Test graceful degradation with partial data
- Test error messages display correctly
- Test retry mechanisms work after errors

### Test Data Generation

**Arbitrary Generators for Property Tests**:
```typescript
// Generate random brand records
const brandRecordArbitrary = () => fc.record({
  restaurant_id: fc.uuid(),
  email: fc.emailAddress(),
  POS_Subscription_status: fc.constantFrom('Active', 'Inactive'),
  POS_Subscription_creation: fc.option(fc.date()),
  POS_Subscription_expiry: fc.option(fc.date()),
  // ... other fields
})

// Generate random KAM records
const kamRecordArbitrary = () => fc.record({
  brand_uid: fc.uuid(),
  brand_name: fc.string(),
  email: fc.emailAddress(),
  assign_date_1: fc.option(fc.date())
})

// Generate random price records
const priceRecordArbitrary = () => fc.record({
  service_product_name: fc.string(),
  price: fc.float({ min: 0, max: 10000 })
})
```

### Coverage Goals

- **Unit Test Coverage**: 80%+ of business logic functions
- **Property Test Coverage**: All 22 correctness properties implemented
- **Integration Test Coverage**: All major user flows (department view, brand view, navigation)
- **Error Handling Coverage**: All error paths tested with invalid inputs

### Continuous Testing

- Run unit tests on every commit
- Run property tests (100 iterations) on every commit
- Run integration tests before deployment
- Monitor test execution time (property tests may be slower)
- Use test parallelization for faster feedback
