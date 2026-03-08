# Visit Tracking Date Filters Enhancement

## Summary
Added separate date range filters for both Scheduled Date and Completed Date in the Brand Visit Details table.

## Changes Made

### 1. Backend API (`app/api/data/visits/brand-details/route.ts`)

**New Query Parameters:**
- `scheduledStartDate` - Filter visits scheduled on or after this date
- `scheduledEndDate` - Filter visits scheduled on or before this date
- `completedStartDate` - Filter visits completed on or after this date
- `completedEndDate` - Filter visits completed on or before this date

**Filter Logic:**
```typescript
if (scheduledStartDate) {
  visitQuery = visitQuery.gte('scheduled_date', scheduledStartDate);
}
if (scheduledEndDate) {
  visitQuery = visitQuery.lte('scheduled_date', scheduledEndDate);
}
if (completedStartDate) {
  visitQuery = visitQuery.gte('visit_date', completedStartDate);
}
if (completedEndDate) {
  visitQuery = visitQuery.lte('visit_date', completedEndDate);
}
```

### 2. Frontend Component (`components/CRM/VisitTab.tsx`)

**New State Variables:**
- `scheduledStartDate` - Start date for scheduled visits filter
- `scheduledEndDate` - End date for scheduled visits filter
- `completedStartDate` - Start date for completed visits filter
- `completedEndDate` - End date for completed visits filter

**UI Layout:**
- Row 1: Search, Team, KAM, Status filters
- Row 2: Two date range sections side by side
  - Left: 📅 Scheduled Date Range (Start & End)
  - Right: ✅ Completed Date Range (Start & End)

## How to Use

### Filter by Scheduled Date
1. Select a start date in "📅 Scheduled Date Range" section
2. Optionally select an end date
3. Table will show only visits scheduled within that date range

### Filter by Completed Date
1. Select a start date in "✅ Completed Date Range" section
2. Optionally select an end date
3. Table will show only visits completed within that date range

### Combine Filters
- You can use both date filters together
- Example: Show visits scheduled in March that were completed in April
- All filters work together (Team, KAM, Status, Scheduled Date, Completed Date)

### Clear Filters
- Click "Clear Filters" button to reset all filters including both date ranges

## Technical Details

### Database Fields
- `scheduled_date` - The date when the visit is scheduled (always present)
- `visit_date` - The date when the visit was actually completed (null for scheduled visits)

### Filter Behavior
- Scheduled date filters apply to ALL visits (scheduled, completed, cancelled)
- Completed date filters only apply to visits that have been completed
- Filters use SQL `>=` (gte) and `<=` (lte) operators for inclusive date ranges
- Empty date fields are ignored (no filter applied)

## Benefits

1. **Flexible Reporting** - Filter by when visits were scheduled vs when they were completed
2. **Better Analytics** - Analyze scheduling patterns vs completion patterns separately
3. **Improved UX** - Clear labels and organized layout make filters easy to understand
4. **Performance** - Pagination ensures all data is loaded even with large datasets
