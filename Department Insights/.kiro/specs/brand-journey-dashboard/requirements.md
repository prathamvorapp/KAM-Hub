# Requirements Document

## Introduction

This document specifies the requirements for a Next.js dashboard application that visualizes Key Accounts Department and Brand journeys as interactive roadmaps. The system processes CSV data to create professional, animated visualizations showing business metrics, revenue tracking, and projections over time.

## Glossary

- **Brand**: A restaurant business entity identified by email address
- **Outlet**: A physical restaurant location with active POS subscription
- **KAM**: Key Account Manager assigned to manage brand relationships
- **Bundle_Plan**: A package combining multiple products/services (Growth, Scale, Ultimate variants)
- **Realized_Data**: Historical data from actual transactions and subscriptions
- **Projected_Data**: Future estimates based on expiry dates and historical trends
- **Milestone**: A significant point in time on the journey timeline
- **Dashboard**: The web application displaying journey visualizations
- **CSV_Parser**: Component responsible for reading and parsing CSV files
- **Revenue_Calculator**: Component that computes revenue based on business rules
- **Journey_Visualizer**: Component that renders the roadmap-style UI

## Requirements

### Requirement 1: CSV Data Ingestion

**User Story:** As a system administrator, I want to load data from three CSV files, so that the dashboard can display accurate brand and department information.

#### Acceptance Criteria

1. WHEN the Dashboard starts, THE CSV_Parser SHALL read all three CSV files from the /Data folder
2. WHEN parsing Brand DATA CSV.csv, THE CSV_Parser SHALL extract restaurant_id, email, and all product/service status, creation, and expiry date fields
3. WHEN parsing KAM Data CSV.csv, THE CSV_Parser SHALL extract Brand UID, Brand Name, email, and KAM assignment dates
4. WHEN parsing Price Data CSV.csv, THE CSV_Parser SHALL extract Service/Product names and their corresponding prices
5. IF any CSV file is missing or malformed, THEN THE Dashboard SHALL display a descriptive error message
6. WHEN all CSV files are successfully parsed, THE Dashboard SHALL cross-reference data using email and Brand UID as keys

### Requirement 2: Key Accounts Department Journey Visualization

**User Story:** As a department manager, I want to view the Key Accounts Department journey timeline, so that I can track overall business growth and revenue trends.

#### Acceptance Criteria

1. WHEN accessing /dashboard/key-accounts-department-journey, THE Dashboard SHALL display a roadmap-style visualization from April 2025 to March 2027
2. WHEN displaying the timeline, THE Journey_Visualizer SHALL show monthly milestones from April 2025 to January 2026 as realized data
3. WHEN displaying the timeline, THE Journey_Visualizer SHALL show monthly milestones from February 2026 to March 2027 as projected data
4. WHEN rendering each milestone, THE Dashboard SHALL display Total Brand Count, Total Outlet Count, and Revenue breakdown
5. THE Journey_Visualizer SHALL visually distinguish realized data from projected data using different styling
6. WHEN displaying the journey, THE Dashboard SHALL show visual connections between Brand Count, Outlet Count, and Revenue metrics
7. THE Dashboard SHALL use smooth animations when transitioning between milestones

### Requirement 3: Brand Count Calculation

**User Story:** As a department manager, I want accurate brand counts for each month, so that I can track customer acquisition over time.

#### Acceptance Criteria

1. WHEN calculating Total Brand Count for a given month, THE Revenue_Calculator SHALL count unique email addresses where Assign Date 1 is on or before that month
2. WHEN an email appears in both Brand DATA CSV and KAM Data CSV, THE Revenue_Calculator SHALL count it as one brand
3. WHEN calculating brand count, THE Revenue_Calculator SHALL exclude brands with no valid Assign Date 1

### Requirement 4: Outlet Count Calculation

**User Story:** As a department manager, I want accurate outlet counts for each month, so that I can track active restaurant locations.

#### Acceptance Criteria

1. WHEN calculating Total Outlet Count for a given month, THE Revenue_Calculator SHALL count all outlets where POS_Subscription_status equals "Active"
2. WHEN an outlet has a POS_Subscription_expiry date, THE Revenue_Calculator SHALL only count it if the expiry date is after the target month
3. WHEN calculating outlet count for projected months, THE Revenue_Calculator SHALL use expiry dates to determine active status

### Requirement 5: Revenue Calculation with Bundle Plan Priority

**User Story:** As a financial analyst, I want revenue calculated according to business rules, so that I can see accurate financial projections.

#### Acceptance Criteria

1. WHEN calculating revenue for a brand, THE Revenue_Calculator SHALL first check if any Bundle_Plan exists (Petpooja_Growth_Plan, Petpooja_Scale_Plan, Petpooja_Ultimate_Plan, Petpooja_POS_Ultimate_Plan, Petpooja_POS_Growth_Plan, Petpooja_POS_Scale_Plan)
2. IF a Bundle_Plan exists for a brand, THEN THE Revenue_Calculator SHALL use only the Bundle_Plan price and SHALL NOT count individual product or service revenue
3. IF no Bundle_Plan exists, THEN THE Revenue_Calculator SHALL sum revenue from Products (Petpooja_Tasks, Petpooja_Payroll, POS_Subscription) and Services (all others not in products or bundles)
4. WHEN a product or service has a creation date, THE Revenue_Calculator SHALL count it as a one-time payment in the month of creation
5. WHEN calculating projected revenue, THE Revenue_Calculator SHALL use expiry dates to determine which subscriptions remain active
6. WHEN displaying revenue, THE Dashboard SHALL break it down into three categories: Products, Services, and Bundle Plans

### Requirement 6: Individual Brand Journey Visualization

**User Story:** As a Key Account Manager, I want to view an individual brand's journey, so that I can track their specific progress and engagement.

#### Acceptance Criteria

1. WHEN accessing /dashboard/brand-journey/[brand_id], THE Dashboard SHALL display a roadmap-style visualization for that specific brand
2. WHEN the brand has a POS_Subscription_creation date, THE Journey_Visualizer SHALL use it as the journey start point
3. WHEN the brand has an Assign Date 1, THE Journey_Visualizer SHALL display it as the first milestone after journey start
4. THE Journey_Visualizer SHALL display April 2025 as the second milestone
5. THE Journey_Visualizer SHALL display monthly milestones from April 2025 to January 2026 as realized data
6. THE Journey_Visualizer SHALL display monthly milestones from February 2026 to March 2027 as projected data
7. WHEN rendering each milestone, THE Dashboard SHALL display the same metrics as the department journey but filtered for the specific brand

### Requirement 7: Professional Visual Design

**User Story:** As a user, I want a professional and visually appealing interface, so that I can easily understand complex data.

#### Acceptance Criteria

1. THE Dashboard SHALL use a muted, professional color palette without bright colors
2. THE Dashboard SHALL NOT display data in typical table format
3. THE Journey_Visualizer SHALL render all data as visual journey storytelling elements
4. WHEN displaying milestones, THE Dashboard SHALL use interactive elements that respond to user interaction
5. THE Dashboard SHALL use Framer Motion for smooth animations and transitions
6. THE Dashboard SHALL maintain visual consistency across all routes

### Requirement 8: Data Cross-Referencing

**User Story:** As a system, I need to accurately link data across multiple CSV files, so that brand information is complete and consistent.

#### Acceptance Criteria

1. WHEN cross-referencing data, THE CSV_Parser SHALL use email as the primary key to link Brand DATA CSV and KAM Data CSV
2. WHEN cross-referencing data, THE CSV_Parser SHALL use Brand UID as a secondary key for linking
3. WHEN a Service/Product name appears in Brand DATA CSV, THE Revenue_Calculator SHALL look up its price in Price Data CSV
4. IF a price is not found for a product or service, THEN THE Dashboard SHALL log a warning and use zero as the price

### Requirement 9: Responsive Design

**User Story:** As a user on different devices, I want the dashboard to work well on various screen sizes, so that I can access it from desktop, tablet, or mobile.

#### Acceptance Criteria

1. WHEN the Dashboard is viewed on desktop screens, THE Journey_Visualizer SHALL display the full roadmap horizontally
2. WHEN the Dashboard is viewed on tablet or mobile screens, THE Journey_Visualizer SHALL adapt the layout for smaller viewports
3. THE Dashboard SHALL maintain readability and usability across all supported screen sizes

### Requirement 10: Projection Generation

**User Story:** As a business analyst, I want to see projected data based on historical trends, so that I can plan for future growth.

#### Acceptance Criteria

1. WHEN generating projections for February 2026 to March 2027, THE Revenue_Calculator SHALL use expiry dates from subscription data
2. WHEN an outlet's subscription expires before March 2027, THE Revenue_Calculator SHALL exclude it from outlet count after expiry
3. WHEN calculating projected revenue, THE Revenue_Calculator SHALL only include active subscriptions based on expiry dates
4. THE Dashboard SHALL clearly label all projected data as estimates

### Requirement 11: Navigation and Routing

**User Story:** As a user, I want to navigate between different views, so that I can access department-level and brand-level information.

#### Acceptance Criteria

1. THE Dashboard SHALL provide a route at /dashboard/key-accounts-department-journey for department-level view
2. THE Dashboard SHALL provide routes at /dashboard/brand-journey/[brand_id] for individual brand views
3. WHEN a user navigates between routes, THE Dashboard SHALL preserve application state
4. THE Dashboard SHALL provide navigation elements to move between department and brand views

### Requirement 12: Error Handling and Data Validation

**User Story:** As a user, I want clear error messages when data issues occur, so that I can understand and resolve problems.

#### Acceptance Criteria

1. IF a CSV file cannot be read, THEN THE Dashboard SHALL display an error message indicating which file is missing
2. IF date fields contain invalid formats, THEN THE CSV_Parser SHALL log a warning and skip that record
3. IF required fields are missing from CSV data, THEN THE Dashboard SHALL display a validation error
4. WHEN data validation fails, THE Dashboard SHALL provide actionable guidance for resolving the issue
