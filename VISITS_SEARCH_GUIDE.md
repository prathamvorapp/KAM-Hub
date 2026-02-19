# Visits Page Search Functionality Guide

## Location
`http://localhost:3000/dashboard/visits`

---

## What Can You Search For?

The search functionality on the Visits page searches across **multiple fields** in the visits table. You can search by:

### 1. **Brand Name** ✅
- Example: `"Starbucks"`, `"McDonald's"`, `"Pizza Hut"`
- Searches in: `brand_name` field
- Case-insensitive partial match

### 2. **Agent Name** ✅
- Example: `"John Doe"`, `"Sarah"`, `"Kumar"`
- Searches in: `agent_name` field
- Case-insensitive partial match

### 3. **Visit Status** ✅
- Example: `"Scheduled"`, `"Completed"`, `"Cancelled"`
- Searches in: `visit_status` field
- Case-insensitive partial match

### 4. **Purpose** ✅
- Example: `"Product Demo"`, `"Follow-up"`, `"Training"`
- Searches in: `purpose` field (if visit has a purpose)
- Case-insensitive partial match

### 5. **Notes** ✅
- Example: `"discussed pricing"`, `"customer feedback"`
- Searches in: `notes` field (visit notes/comments)
- Case-insensitive partial match

---

## How Search Works

### Search Implementation
```typescript
// From lib/services/visitService.ts (lines 360-368)
if (search && search.trim()) {
  const searchLower = search.toLowerCase().trim();
  
  filteredVisits = filteredVisits.filter((visit: any) => 
    visit.brand_name?.toLowerCase().includes(searchLower) ||
    visit.agent_name?.toLowerCase().includes(searchLower) ||
    visit.visit_status?.toLowerCase().includes(searchLower) ||
    visit.purpose?.toLowerCase().includes(searchLower) ||
    visit.notes?.toLowerCase().includes(searchLower)
  );
}
```

### Key Features
- **Case-Insensitive**: Searches work regardless of uppercase/lowercase
- **Partial Match**: Finds results containing your search term anywhere in the field
- **Multi-Field**: Searches across all 5 fields simultaneously
- **OR Logic**: Returns results if ANY field matches

---

## Search Examples

### Example 1: Search by Brand Name
```
Search: "star"
Results: All visits for brands containing "star" (e.g., "Starbucks", "Star Pizza")
```

### Example 2: Search by Agent Name
```
Search: "john"
Results: All visits handled by agents with "john" in their name (e.g., "John Doe", "Johnny Smith")
```

### Example 3: Search by Status
```
Search: "scheduled"
Results: All visits with status "Scheduled"
```

### Example 4: Search by Purpose
```
Search: "demo"
Results: All visits with "demo" in the purpose field (e.g., "Product Demo", "Demo Follow-up")
```

### Example 5: Search by Notes
```
Search: "pricing"
Results: All visits with "pricing" mentioned in notes
```

### Example 6: Combined Search
```
Search: "completed"
Results: Could match:
- Visits with status "Completed"
- Visits with "completed" in notes
- Visits with "completed" in purpose
```

---

## What You CANNOT Search By

The following fields are NOT included in the search:

- ❌ Email addresses (agent_id, brand_email_id)
- ❌ Visit ID (visit_id)
- ❌ Dates (scheduled_date, visit_date)
- ❌ Zone
- ❌ Team name
- ❌ Approval status
- ❌ MOM shared status

---

## How to Use the Search

### Step 1: Type Your Search Term
- Enter any text in the search box
- Can be brand name, agent name, status, purpose, or notes

### Step 2: Click Search Button
- Click the "Search" button OR
- Press Enter key

### Step 3: View Results
- Results are filtered immediately
- Shows only visits matching your search term

### Step 4: Clear Search
- Delete the search term
- Click Search button or press Enter
- All visits will be displayed again

---

## Search Behavior

### Auto-Clear
- If you clear the search box (empty string), it automatically shows all visits
- No need to click search button for clearing

### Manual Search
- For non-empty search terms, you must click the Search button or press Enter
- This prevents unnecessary API calls while typing

### Role-Based Filtering
Search results are filtered by your role FIRST, then by search term:

- **Agent**: Searches only in YOUR visits
- **Team Lead**: Searches only in YOUR TEAM's visits
- **Admin**: Searches in ALL visits

---

## Technical Details

### API Endpoint
```
GET /api/data/visits?search={searchTerm}
```

### Search Fields (in order)
1. `brand_name` - Brand/restaurant name
2. `agent_name` - Agent handling the visit
3. `visit_status` - Current status of visit
4. `purpose` - Purpose/reason for visit
5. `notes` - Any notes or comments

### Search Logic
- **Type**: Substring match (contains)
- **Case**: Insensitive
- **Operator**: OR (matches any field)
- **Trim**: Whitespace removed from search term

---

## Tips for Better Search Results

### 1. Use Specific Terms
```
✅ Good: "Starbucks"
❌ Less specific: "star"
```

### 2. Use Status Keywords
```
✅ "Scheduled" - Find all scheduled visits
✅ "Completed" - Find all completed visits
✅ "Cancelled" - Find all cancelled visits
```

### 3. Search by Agent
```
✅ "John" - Find all visits by agents named John
✅ "Kumar" - Find all visits by agents named Kumar
```

### 4. Search by Purpose
```
✅ "Demo" - Find all demo-related visits
✅ "Training" - Find all training visits
✅ "Follow-up" - Find all follow-up visits
```

### 5. Partial Matches Work
```
✅ "star" matches "Starbucks"
✅ "john" matches "John Doe"
✅ "sched" matches "Scheduled"
```

---

## Common Search Queries

### Find All Scheduled Visits
```
Search: "scheduled"
```

### Find All Completed Visits
```
Search: "completed"
```

### Find Visits for a Specific Brand
```
Search: "Brand Name"
Example: "Starbucks"
```

### Find Visits by a Specific Agent
```
Search: "Agent Name"
Example: "John Doe"
```

### Find Demo-Related Visits
```
Search: "demo"
```

### Find Visits with Specific Notes
```
Search: "keyword from notes"
Example: "pricing discussion"
```

---

## Troubleshooting

### No Results Found?
1. Check spelling
2. Try shorter search term (e.g., "star" instead of "Starbucks")
3. Try different field (e.g., agent name instead of brand name)
4. Clear search and verify visits exist

### Too Many Results?
1. Use more specific search term
2. Include full brand name
3. Add status keyword (e.g., "Starbucks Scheduled")

### Search Not Working?
1. Make sure to click Search button or press Enter
2. Check if you have permission to view visits
3. Verify you're logged in
4. Check console for errors

---

## Summary

**Searchable Fields:**
1. ✅ Brand Name
2. ✅ Agent Name
3. ✅ Visit Status
4. ✅ Purpose
5. ✅ Notes

**Search Type:** Case-insensitive partial match across all fields

**How to Search:** Type term → Click Search button or press Enter

**Clear Search:** Delete term → Click Search or press Enter

---

**Quick Reference:**
- Brand: `"Starbucks"`, `"McDonald's"`
- Agent: `"John"`, `"Sarah"`
- Status: `"Scheduled"`, `"Completed"`, `"Cancelled"`
- Purpose: `"Demo"`, `"Training"`, `"Follow-up"`
- Notes: Any text from visit notes

---

**Date**: February 19, 2026
**Location**: `/dashboard/visits`
**API**: `/api/data/visits?search={term}`
