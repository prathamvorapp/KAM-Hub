# Implementation Plan: Brand Journey Dashboard

## Overview

This implementation plan breaks down the Brand Journey Dashboard into discrete coding tasks. The approach follows a bottom-up strategy: build data processing foundations first, then business logic, and finally the presentation layer. Each task builds incrementally, with testing integrated throughout to catch errors early.

## Tasks

- [x] 1. Set up Next.js project structure and dependencies
  - Initialize Next.js 14+ project with TypeScript and App Router
  - Install dependencies: papaparse, framer-motion, fast-check (dev), date-fns
  - Create folder structure: /lib (data processing), /components (UI), /app (routes)
  - Set up TypeScript configuration with strict mode
  - Create /Data folder for CSV files
  - _Requirements: All (foundation)_

- [x] 2. Implement CSV Parser
  - [x] 2.1 Create TypeScript interfaces for CSV records
    - Define BrandRecord, KAMRecord, PriceRecord interfaces
    - Define BrandWithKAM and supporting types
    - _Requirements: 1.2, 1.3, 1.4_
  
  - [x] 2.2 Implement CSV file reading and parsing
    - Create CSVParser class with methods for each CSV file
    - Use papaparse to parse CSV files
    - Handle file system operations with error catching
    - _Requirements: 1.1, 1.2, 1.3, 1.4_
  
  - [x] 2.3 Write property test for CSV field extraction
    - **Property 1: CSV field extraction completeness**
    - **Validates: Requirements 1.2, 1.3, 1.4**
  
  - [x] 2.4 Implement CSV error handling
    - Add try-catch for file not found errors
    - Add validation for malformed CSV structure
    - Return descriptive error messages with file names
    - _Requirements: 1.5, 12.1_
  
  - [x] 2.5 Write property test for CSV error handling
    - **Property 2: CSV error handling**
    - **Validates: Requirements 1.5**
  
  - [x] 2.6 Write unit tests for CSV parsing edge cases
    - Test empty CSV files
    - Test CSV with missing optional fields
    - Test invalid date formats
    - _Requirements: 12.2_

- [x] 3. Implement data cross-referencing
  - [x] 3.1 Create cross-reference function
    - Implement logic to match BrandRecord and KAMRecord by email
    - Implement fallback matching by Brand UID
    - Handle cases where no match is found
    - _Requirements: 1.6, 8.1, 8.2_
  
  - [x] 3.2 Write property test for cross-reference consistency
    - **Property 3: Cross-reference consistency**
    - **Validates: Requirements 1.6, 8.1, 8.2**

- [x] 4. Checkpoint - Ensure CSV parsing works
  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. Implement Metrics Calculator
  - [x] 5.1 Create MetricsCalculator class
    - Implement calculateBrandCount method
    - Filter brands by Assign Date 1
    - Deduplicate by email
    - _Requirements: 3.1, 3.2, 3.3_
  
  - [x] 5.2 Write property test for brand count accuracy
    - **Property 4: Brand count accuracy**
    - **Validates: Requirements 3.1, 3.2, 3.3**
  
  - [x] 5.3 Implement calculateOutletCount method
    - Filter outlets by POS_Subscription_status "Active"
    - Check expiry dates against target month
    - _Requirements: 4.1, 4.2_
  
  - [x] 5.4 Write property test for outlet count with expiry logic
    - **Property 5: Outlet count with expiry logic**
    - **Validates: Requirements 4.1, 4.2**

- [x] 6. Implement Revenue Calculator
  - [x] 6.1 Create RevenueCalculator class with price lookup
    - Implement price lookup from PriceRecord array
    - Add fallback to zero with warning logging
    - _Requirements: 8.3, 8.4_
  
  - [x] 6.2 Write property test for price lookup with fallback
    - **Property 11: Price lookup with fallback**
    - **Validates: Requirements 8.3, 8.4**
  
  - [x] 6.3 Implement bundle plan detection and priority logic
    - Check for any active bundle plan (Growth, Scale, Ultimate variants)
    - Return bundle price if found, skip individual products/services
    - _Requirements: 5.1, 5.2_
  
  - [x] 6.4 Write property test for bundle plan priority
    - **Property 7: Bundle plan priority**
    - **Validates: Requirements 5.1, 5.2**
  
  - [x] 6.5 Implement revenue calculation without bundle
    - Sum product prices (Petpooja_Tasks, Petpooja_Payroll, POS_Subscription)
    - Sum service prices (all others)
    - _Requirements: 5.3_
  
  - [x] 6.6 Write property test for revenue without bundle
    - **Property 8: Revenue without bundle**
    - **Validates: Requirements 5.3**
  
  - [x] 6.7 Implement creation date revenue attribution
    - Check if creation date matches target month
    - Count as one-time payment in creation month
    - _Requirements: 5.4_
  
  - [x] 6.8 Write property test for creation date revenue attribution
    - **Property 9: Creation date revenue attribution**
    - **Validates: Requirements 5.4**
  
  - [x] 6.9 Implement projected revenue with expiry logic
    - Filter out subscriptions with expiry before target month
    - _Requirements: 5.5, 10.1_
  
  - [x] 6.10 Write property test for projected revenue with expiry
    - **Property 10: Projected revenue with expiry**
    - **Validates: Requirements 5.5, 10.1**
  
  - [x] 6.11 Implement revenue breakdown structure
    - Return RevenueBreakdown with products, services, bundlePlans, total
    - Ensure total equals sum of three categories
    - _Requirements: 5.6_
  
  - [x] 6.12 Write property test for revenue breakdown structure
    - **Property 6: Revenue breakdown structure**
    - **Validates: Requirements 5.6**

- [x] 7. Checkpoint - Ensure all calculation logic works
  - Ensure all tests pass, ask the user if questions arise.

- [x] 8. Create data store and state management
  - [x] 8.1 Set up React Context for application state
    - Create DataContext to hold parsed CSV data
    - Create hooks for accessing brand, KAM, and price data
    - Implement state preservation across navigation
    - _Requirements: 11.3_
  
  - [x] 8.2 Write property test for state preservation
    - **Property 19: State preservation across navigation**
    - **Validates: Requirements 11.3**
  
  - [x] 8.3 Create data loading component
    - Load CSV files on app initialization
    - Display loading state while parsing
    - Handle and display parsing errors
    - _Requirements: 1.1, 1.5, 12.1, 12.3_

- [x] 9. Implement milestone generation logic
  - [x] 9.1 Create timeline generator for department journey
    - Generate monthly milestones from April 2025 to March 2027
    - Mark milestones after January 2026 as projected
    - Calculate metrics for each milestone
    - _Requirements: 2.2, 2.3_
  
  - [x] 9.2 Create timeline generator for brand journey
    - Start from POS_Subscription_creation date
    - Add KAM assignment as first milestone
    - Add April 2025 as second milestone
    - Generate monthly milestones to March 2027
    - _Requirements: 6.2, 6.3, 6.4, 6.5, 6.6_
  
  - [x] 9.3 Write property test for brand journey start date
    - **Property 14: Brand journey start date**
    - **Validates: Requirements 6.2**
  
  - [x] 9.4 Write property test for KAM assignment milestone ordering
    - **Property 15: KAM assignment milestone ordering**
    - **Validates: Requirements 6.3**
  
  - [x] 9.5 Write property test for brand-specific metric filtering
    - **Property 16: Brand-specific metric filtering**
    - **Validates: Requirements 6.7**

- [x] 10. Build base UI components
  - [x] 10.1 Create Timeline component
    - Render horizontal timeline with date range
    - Add responsive layout (horizontal on desktop, vertical on mobile)
    - Use muted color palette
    - _Requirements: 7.1, 9.1, 9.2_
  
  - [x] 10.2 Create Milestone component
    - Render milestone node with date
    - Display metric cards (brand count, outlet count, revenue)
    - Add distinct styling for projected milestones
    - _Requirements: 2.4, 2.5, 10.4_
  
  - [x] 10.3 Write property test for milestone data completeness
    - **Property 12: Milestone data completeness**
    - **Validates: Requirements 2.4**
  
  - [x] 10.4 Write property test for realized vs projected styling
    - **Property 13: Realized vs projected styling**
    - **Validates: Requirements 2.5**
  
  - [x] 10.5 Write property test for projected data labeling
    - **Property 18: Projected data labeling**
    - **Validates: Requirements 10.4**
  
  - [x] 10.6 Add Framer Motion animations
    - Animate milestone appearance on scroll
    - Add hover animations for milestone nodes
    - Smooth transitions between states
    - _Requirements: 7.5_
  
  - [x] 10.7 Add interactive event handlers
    - Attach click handlers to milestones
    - Attach hover handlers for detail display
    - _Requirements: 7.4_
  
  - [x] 10.8 Write property test for interactive element handlers
    - **Property 17: Interactive element handlers**
    - **Validates: Requirements 7.4**

- [x] 11. Create JourneyVisualizer component
  - [x] 11.1 Implement department journey visualization
    - Compose Timeline and Milestone components
    - Pass department-level metrics to milestones
    - Show visual connections between metrics
    - _Requirements: 2.1, 2.6_
  
  - [x] 11.2 Implement brand journey visualization
    - Compose Timeline and Milestone components for brand view
    - Pass brand-specific metrics to milestones
    - _Requirements: 6.1, 6.7_

- [x] 12. Implement page routes
  - [x] 12.1 Create /dashboard/key-accounts-department-journey page
    - Use App Router page.tsx structure
    - Load data from context
    - Generate department timeline
    - Render JourneyVisualizer with department data
    - _Requirements: 2.1, 11.1_
  
  - [x] 12.2 Write unit test for department route rendering
    - Test route renders with correct date range
    - _Requirements: 2.1_
  
  - [x] 12.3 Create /dashboard/brand-journey/[brand_id] dynamic route
    - Extract brand_id from params
    - Filter data for specific brand
    - Generate brand timeline
    - Render JourneyVisualizer with brand data
    - Handle invalid brand_id with 404 message
    - _Requirements: 6.1, 11.2_
  
  - [x] 12.4 Write unit test for brand route rendering
    - Test route renders for valid brand_id
    - Test 404 handling for invalid brand_id
    - _Requirements: 6.1_

- [x] 13. Add navigation UI
  - [x] 13.1 Create navigation component
    - Add links to department journey
    - Add search/select for brand journeys
    - Style with muted palette
    - _Requirements: 11.4_
  
  - [x] 13.2 Write unit test for navigation elements
    - Test navigation links exist
    - _Requirements: 11.4_

- [x] 14. Implement error handling UI
  - [x] 14.1 Create error display components
    - Create error modal for file read errors
    - Create warning banner for data quality issues
    - Create empty state for no data
    - _Requirements: 1.5, 12.1, 12.3_
  
  - [x] 14.2 Write property test for file read error specificity
    - **Property 20: File read error specificity**
    - **Validates: Requirements 12.1**
  
  - [x] 14.3 Write property test for invalid date handling
    - **Property 21: Invalid date handling**
    - **Validates: Requirements 12.2**
  
  - [x] 14.4 Write property test for missing field validation
    - **Property 22: Missing field validation**
    - **Validates: Requirements 12.3**

- [x] 15. Final integration and polish
  - [x] 15.1 Wire all components together
    - Ensure data flows from CSV → Parser → Calculator → Visualizer
    - Test complete user flows (load app → view department → view brand)
    - _Requirements: All_
  
  - [x] 15.2 Write integration tests
    - Test end-to-end department journey generation
    - Test end-to-end brand journey generation
    - Test navigation preserves state
    - _Requirements: 11.3_
  
  - [x] 15.3 Add loading states and transitions
    - Show loading spinner during CSV parsing
    - Add skeleton screens for timeline loading
    - _Requirements: 2.7_

- [x] 16. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Each task references specific requirements for traceability
- Property tests validate universal correctness properties with 100+ iterations
- Unit tests validate specific examples and edge cases
- Integration tests ensure components work together correctly
- Use TypeScript strict mode throughout for type safety
- Follow Next.js 14+ App Router conventions
- Use fast-check library for property-based testing
