# Completed Category Logic - Detailed Explanation

## Overview
The "Completed" category represents churn records that have reached a final state and require no further action from the KAM (Key Account Manager).

## Three Ways a Record Becomes "Completed"

### 1. Completed Churn Reason (Primary Method)
A record is marked as completed if the `churn_reason` field contains one of the following values:

```typescript
COMPLETED_CHURN_REASONS = [
  "Outlet once out of Sync- now Active",
  "Renewal Payment Overdue",
  "Temporarily Closed (Renovation / Relocation/Internet issue)",
  "Permanently Closed (Outlet/brand)",
  "Event Account / Demo Account",
  "Switched to Another POS",
  "Ownership Transferred"
]
```

**How it works:**
- The system checks if the record's `churn_reason` contains any of these strings (case-insensitive substring match)
- Example: If `churn_reason = "Event Account / Demo Account"`, the record is completed
- This is checked using the helper function: `isCompletedReason(churnReason)`

**Why these reasons are "completed":**
- **"Outlet once out of Sync- now Active"** - Issue resolved, outlet is active again
- **"Renewal Payment Overdue"** - Payment issue identified, finance team handles it
- **"Temporarily Closed"** - Temporary closure documented, will reactivate later
- **"Permanently Closed"** - Business permanently closed, no further action possible
- **"Event Account / Demo Account"** - Not a real customer, demo/test account
- **"Switched to Another POS"** - Customer moved to competitor, lost customer
- **"Ownership Transferred"** - Business sold/transferred, new owner decision

### 2. Follow-Up Status = "COMPLETED"
A record is marked as completed if the `follow_up_status` field is set to "COMPLETED".

**How it works:**
```typescript
record.follow_up_status === "COMPLETED"
```

**When this happens:**
- After the agent makes a call and selects "Connected" with a completed churn reason
- After 3 unsuccessful call attempts (auto-completed)
- When the system determines no further follow-up is needed

**Database fields involved:**
- `follow_up_status`: "COMPLETED"
- `follow_up_completed_at`: Timestamp when completed
- `is_follow_up_active`: false
- `next_reminder_time`: null (no more reminders)

### 3. Three or More Call Attempts
A record is automatically marked as completed if the agent has made 3 or more call attempts.

**How it works:**
```typescript
record.call_attempts && record.call_attempts.length >= 3
```

**Why 3 attempts:**
- Industry standard for follow-up attempts
- After 3 attempts, further calls are unlikely to succeed
- Prevents infinite follow-up loops
- Allows KAM to focus on other customers

**Call attempts structure:**
```typescript
call_attempts: [
  {
    call_number: 1,
    timestamp: "2026-02-14T10:00:00Z",
    call_response: "Not Reachable",
    churn_reason: "I don't know",
    notes: "Phone switched off"
  },
  {
    call_number: 2,
    timestamp: "2026-02-15T10:00:00Z",
    call_response: "Busy",
    churn_reason: "I don't know",
    notes: "Line busy"
  },
  {
    call_number: 3,
    timestamp: "2026-02-16T10:00:00Z",
    call_response: "Requested Callback",
    churn_reason: "I don't know",
    notes: "Will call back later"
  }
]
```

After 3rd attempt, the record automatically moves to Completed even if no final churn reason was provided.

## Complete Logic Flow

### Step 1: Check Completed Churn Reason
```typescript
const churnReason = record.churn_reason?.trim() || "";
const isCompletedByReason = isCompletedReason(churnReason);
// Uses COMPLETED_CHURN_REASONS array for matching
```

### Step 2: Check Follow-Up Status
```typescript
const isCompletedByStatus = record.follow_up_status === "COMPLETED";
```

### Step 3: Check Call Attempts
```typescript
const isCompletedByAttempts = record.call_attempts && record.call_attempts.length >= 3;
```

### Step 4: Combine All Conditions (OR Logic)
```typescript
const completed = isCompletedByReason || isCompletedByStatus || isCompletedByAttempts;

if (completed) {
  acc.completed++;
  return acc; // Exit early, don't check other categories
}
```

## Categorization Priority

The system checks categories in this order:

1. **Completed** (checked first)
   - If completed → goes to Completed category
   - If not completed → continue to next check

2. **Follow Ups** (checked second)
   - Has call attempts OR
   - Has active follow-up OR
   - Has real churn reason (not "I don't know" or "KAM needs to respond")

3. **New Count** (checked third)
   - No agent response AND
   - Within last 3 days AND
   - No agent action

4. **Overdue** (checked last)
   - No agent response AND
   - Older than 3 days AND
   - No agent action

## Example Scenarios

### Scenario 1: Agent Connected and Filled Reason
```
Record:
- RID: 60198
- Date: 08-Feb-2026 (6 days ago)
- churn_reason: "Event Account / Demo Account"
- call_attempts: [{ call_number: 1, call_response: "Connected", ... }]
- follow_up_status: "COMPLETED"

Result: COMPLETED ✅
Reason: Has completed churn reason + follow_up_status = "COMPLETED"
```

### Scenario 2: Three Failed Attempts
```
Record:
- RID: 12345
- Date: 01-Feb-2026 (13 days ago)
- churn_reason: "I don't know"
- call_attempts: [
    { call_number: 1, call_response: "Not Reachable" },
    { call_number: 2, call_response: "Busy" },
    { call_number: 3, call_response: "Not Reachable" }
  ]
- follow_up_status: "COMPLETED"

Result: COMPLETED ✅
Reason: Has 3 call attempts (auto-completed)
```

### Scenario 3: Permanently Closed
```
Record:
- RID: 67890
- Date: 10-Feb-2026 (4 days ago)
- churn_reason: "Permanently Closed (Outlet/brand)"
- call_attempts: []
- follow_up_status: "COMPLETED"

Result: COMPLETED ✅
Reason: Has completed churn reason
```

### Scenario 4: NOT Completed (Still in Follow-Up)
```
Record:
- RID: 11111
- Date: 05-Feb-2026 (9 days ago)
- churn_reason: "I don't know"
- call_attempts: [
    { call_number: 1, call_response: "Not Reachable" }
  ]
- follow_up_status: "INACTIVE"
- next_reminder_time: "2026-02-15T10:00:00Z"

Result: FOLLOW UPS ⏳
Reason: Has call attempts but < 3, not completed reason, waiting for next call
```

### Scenario 5: NOT Completed (Overdue)
```
Record:
- RID: 22222
- Date: 01-Feb-2026 (13 days ago)
- churn_reason: "" (empty)
- call_attempts: []
- follow_up_status: "INACTIVE"

Result: OVERDUE ⚠️
Reason: No agent response, older than 3 days, no action taken
```

## Database Fields Reference

### Fields Used for Completed Logic

| Field | Type | Purpose |
|-------|------|---------|
| `churn_reason` | string | The reason for churn (checked against COMPLETED_CHURN_REASONS) |
| `follow_up_status` | string | "ACTIVE", "INACTIVE", or "COMPLETED" |
| `is_follow_up_active` | boolean | Whether follow-up is currently active |
| `call_attempts` | array | List of all call attempts made |
| `current_call` | number | Next call number (1, 2, 3, 4) |
| `follow_up_completed_at` | timestamp | When follow-up was completed |
| `next_reminder_time` | timestamp | When next call should be made (null if completed) |

## Helper Functions

### isCompletedReason(churnReason)
```typescript
export function isCompletedReason(churnReason: string | null | undefined): boolean {
  if (!churnReason || churnReason.trim() === '') return false;
  const normalized = churnReason.trim();
  return COMPLETED_CHURN_REASONS.some(reason => 
    normalized.toLowerCase().includes(reason.toLowerCase())
  );
}
```

**How it works:**
1. Returns false if churn_reason is null, undefined, or empty
2. Trims whitespace from the churn_reason
3. Checks if any COMPLETED_CHURN_REASONS string is contained in the churn_reason (case-insensitive)
4. Returns true if match found, false otherwise

**Examples:**
- `isCompletedReason("Event Account / Demo Account")` → true
- `isCompletedReason("Permanently Closed (Outlet/brand)")` → true
- `isCompletedReason("I don't know")` → false
- `isCompletedReason("KAM needs to respond")` → false
- `isCompletedReason("")` → false

## UI Display

### Completed Badge
```tsx
<span className="bg-blue-100 text-blue-800 px-2 py-1 rounded">
  Completed
</span>
```

### Completed Count Card
```tsx
<div className="bg-white rounded-lg shadow p-6">
  <div className="text-3xl font-bold text-blue-600">{completedCount}</div>
  <div className="text-sm text-gray-600">Completed records</div>
</div>
```

## API Response Structure

### Categorization Object
```json
{
  "categorization": {
    "newCount": 0,
    "overdue": 7,
    "followUps": 0,
    "completed": 1
  }
}
```

### Completed Record Example
```json
{
  "rid": "60198",
  "date": "08-Feb-2026",
  "restaurant_name": "JP Nagar (Absolute Shawarma)",
  "churn_reason": "Event Account / Demo Account",
  "follow_up_status": "COMPLETED",
  "is_follow_up_active": false,
  "call_attempts": [
    {
      "call_number": 1,
      "timestamp": "2026-02-14T16:12:03Z",
      "call_response": "Connected",
      "churn_reason": "Event Account / Demo Account",
      "notes": ""
    }
  ],
  "current_call": 2,
  "follow_up_completed_at": "2026-02-14T16:12:03Z",
  "next_reminder_time": null
}
```

## Summary

A record is **COMPLETED** if ANY of these conditions are true:

1. ✅ `churn_reason` is one of 7 completed reasons
2. ✅ `follow_up_status` = "COMPLETED"
3. ✅ `call_attempts.length` >= 3

Once completed:
- Record moves to Completed category
- No further follow-up reminders
- KAM doesn't need to take action
- Record is excluded from Overdue/New Count/Follow Ups

This ensures KAMs focus only on actionable records and don't waste time on already-resolved cases.
