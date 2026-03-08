# Visit Tracking Team Filter Implementation

## Summary
Added a global team filter at the top of the Visit Tracking page that filters both the graphs and the KAM Visit Summary table.

## Features

### 1. Top Team Filter
**Location:** At the very top of the Visit Tracking page

**Design:**
- Gradient background (primary to secondary)
- Prominent placement above all content
- Dropdown selector with all available teams
- "Clear Filter" button appears when a team is selected

**Functionality:**
- Filters both trend graphs
- Filters KAM Visit Summary table
- Does NOT affect the Brand Visit Details table (which has its own separate team filter)

### 2. Filtered Components

#### Monthly Visit Trend Graph
- Shows only visits from the selected team
- Updates automatically when team filter changes
- Shows all teams when "All Teams" is selected

#### Current Month Distribution Graph
- Shows only visits from the selected team for the current month
- Updates automatically when team filter changes
- Shows all teams when "All Teams" is selected

#### KAM Visit Summary Table
- Shows only KAMs from the selected team
- Displays appropriate message when no data for selected team
- Shows all KAMs when "All Teams" is selected

### 3. Brand Visit Details Table
- NOT affected by the top team filter
- Has its own independent team filter in the filters section
- Allows users to have different team views for summary vs details

## Technical Implementation

### State Management
```typescript
const [topTeamFilter, setTopTeamFilter] = useState<string>('all')
```

### Filtered Data
```typescript
// Filter KAM Summary
const filteredKamSummary = useMemo(() => {
  if (topTeamFilter === 'all') return kamSummary
  return kamSummary.filter(kam => kam.team_name === topTeamFilter)
}, [kamSummary, topTeamFilter])

// Filter brand details for graphs
const graphBrandDetails = useMemo(() => {
  if (topTeamFilter === 'all') return brandDetails
  return brandDetails.filter(brand => brand.team_name === topTeamFilter)
}, [brandDetails, topTeamFilter])
```

### Chart Data Updates
- `monthlyVisitData` uses `graphBrandDetails` instead of `brandDetails`
- `currentMonthIntervalData` uses `graphBrandDetails` instead of `brandDetails`
- Both charts automatically recalculate when team filter changes

## User Experience

### Visual Hierarchy
1. **Top Team Filter** - Global filter for overview data
2. **Graphs** - Visual representation of filtered data
3. **KAM Visit Summary** - Filtered summary table
4. **Brand Visit Details** - Independent detailed view with own filters

### Clear Filter Button
- Only appears when a team is selected
- One-click reset to "All Teams"
- Provides quick way to return to full view

### Empty State Messages
- KAM Summary shows context-aware message when filtered team has no data
- Distinguishes between "no data at all" vs "no data for this team"

## Benefits

1. **Quick Team Analysis** - Instantly see performance metrics for specific teams
2. **Consistent View** - Graphs and summary table stay in sync
3. **Flexible Filtering** - Top filter for overview, separate filter for details
4. **Performance** - Uses `useMemo` to prevent unnecessary recalculations
5. **User-Friendly** - Clear visual feedback and easy reset option

## Use Cases

- **Team Lead Review:** Filter to see only their team's performance
- **Admin Comparison:** Switch between teams to compare metrics
- **Focused Analysis:** Isolate one team's data in graphs and summary
- **Detailed Investigation:** Use top filter for overview, then drill down with detail filters
