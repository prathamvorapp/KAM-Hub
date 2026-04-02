# Expense Analysis Implementation

## Overview
Added a comprehensive Expense Analysis section to the Brand Insights dashboard with month-wise and KAM-wise expense breakdowns.

## Changes Made

### 1. Data Standardization
- **File**: `standardize-expense-names.js`
- Standardized all KAM names in `Expense.csv` to match the format in `KAM Data CSV.csv`
- Mapped 269 name variations to standardized names
- Removed leading/trailing spaces and normalized name formats

### 2. Type Definitions
- **File**: `lib/types.ts`
- Added `ExpenseRecord` interface:
  ```typescript
  export interface ExpenseRecord {
    date: string // DD-MM-YYYY format
    kam: string
    total: number
  }
  ```

### 3. Data Context Updates
- **File**: `lib/data-context.tsx`
- Added `expenseRecords` state management
- Added `useExpenseRecords()` hook
- Added `setExpenseRecords()` setter

### 4. CSV Parser
- **File**: `lib/csv-parser.ts`
- Added `parseExpenseData()` method to parse Expense.csv
- Handles date, KAM name, and total amount fields
- Validates and filters invalid records

### 5. CSV Loader
- **File**: `lib/csv-loader.ts`
- Integrated expense data loading into the main data loading pipeline
- Added logging for expense records count

### 6. Data Loader Component
- **File**: `components/DataLoader.tsx`
- Updated to load and set expense records
- Added `setExpenseRecords` to dependency array

### 7. Expense Analysis Component
- **File**: `components/ExpenseAnalysis.tsx`
- New component with two main sections:
  
  #### Monthly Expense Analysis
  - Shows expense trends by month
  - Displays total expense, transaction count, and average per transaction
  - Shows month-over-month percentage change
  - Includes visual trend indicators (↑ ↓ →)
  
  #### KAM-wise Expense Analysis
  - Ranks KAMs by total expense
  - Shows transaction count and average per transaction
  - Displays percentage of total expense with visual progress bars
  - Includes medals for top 3 KAMs (🥇🥈🥉)

### 8. Brand Insights Page
- **File**: `app/dashboard/brand-insights/page.tsx`
- Added "Expense Analysis" tab to view mode
- Integrated ExpenseAnalysis component
- Respects existing KAM and outlet filters

## Features

### Summary Cards
1. **Total Expense**: Shows total in Lakhs with transaction count
2. **Avg per Transaction**: Average expense amount
3. **Active KAMs**: Number of KAMs with expenses
4. **Time Period**: Number of months covered

### Monthly Expense Table
- Month name (e.g., "Jul 2025")
- Total expense for the month
- Number of transactions
- Average per transaction
- Trend indicator with percentage change

### KAM-wise Expense Table
- Rank with medals for top 3
- KAM name
- Total expense
- Transaction count
- Average per transaction
- Percentage of total with visual bar

## Data Flow
1. `Expense.csv` → `parseExpenseData()` → `ExpenseRecord[]`
2. Loaded via `loadCSVData()` in API route
3. Stored in React Context via `DataProvider`
4. Consumed by `ExpenseAnalysis` component
5. Filtered by selected KAM from Brand Insights filters

## Filter Integration
The Expense Analysis respects the KAM filter from the Brand Insights page:
- **All KAMs**: Shows all expense records
- **Specific KAM**: Shows only expenses for that KAM
- **Unassigned**: Shows no expenses (since all expenses have KAM names)

## Usage
1. Navigate to Brand Insights page
2. Click on "Expense Analysis" tab
3. Use KAM filter to view specific KAM expenses
4. View month-wise trends and KAM-wise rankings

## Files Modified
- `lib/types.ts` - Added ExpenseRecord type
- `lib/data-context.tsx` - Added expense state management
- `lib/csv-parser.ts` - Added parseExpenseData method
- `lib/csv-loader.ts` - Integrated expense loading
- `components/DataLoader.tsx` - Updated to load expenses
- `app/dashboard/brand-insights/page.tsx` - Added expense tab
- `components/ExpenseAnalysis.tsx` - New component (created)
- `Data/Expense.csv` - Standardized KAM names

## Files Created
- `components/ExpenseAnalysis.tsx` - Main expense analysis component
- `standardize-expense-names.js` - Script to standardize KAM names
- `EXPENSE-ANALYSIS-IMPLEMENTATION.md` - This documentation
