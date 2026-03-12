# Adding "Completed without Reason" Category

## Changes Required:

### 1. lib/services/churnService.ts
- Line 208-216: Update completed logic to separate completed with/without reason
- Line 248: Add completedWithoutReason: 0 to initial accumulator
- Line 270: Add filter case for 'completedWithoutReason'
- Line 360: Add completedWithoutReason to return categorization

### 2. app/dashboard/churn/page.tsx
- Add completedWithoutReason to Categorization interface
- Add completedWithoutReason to pagination state
- Add new summary box for "Completed without Reason"
- Add filter button for completedWithoutReason
- Update filter logic to handle new category

### 3. app/api/churn/route.ts
- Update filter type to include 'completedWithoutReason'
- Ensure categorization includes completedWithoutReason in response

### 4. lib/models/churn.ts (if exists)
- Update ChurnQuerySchema to include completedWithoutReason filter option
