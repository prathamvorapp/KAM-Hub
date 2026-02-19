# MOM Submission Debug Guide

## What Happens When Jinal Submits a MOM

### Complete Flow:

1. **Frontend (Jinal's Browser)**
   - Location: `app/dashboard/visits/page.tsx` line 430-450
   - Jinal fills out the MOM form with open points
   - Clicks "Submit MOM"
   - Frontend calls: `convexAPI.submitVisitMOM()`

2. **API Client**
   - Location: `lib/convex-api.ts` line 393-403
   - Makes POST request to: `/api/data/visits/{visitId}/mom`
   - Sends data:
     ```json
     {
       "visit_id": "...",
       "created_by": "jinal.chavda@petpooja.com",
       "brand_name": "Biryani Zone",
       "agent_name": "Jinal Chavda",
       "open_points": [...],
       "mom_shared": "Yes"
     }
     ```

3. **API Route**
   - Location: `app/api/data/visits/[visitId]/mom/route.ts`
   - Receives the request
   - Authenticates user via `requireAuth()`
   - Calls: `visitService.submitMoM()`

4. **Service Layer**
   - Location: `lib/services/visitService.ts` line 324-420
   - **Step 1:** Fetch the visit record from database
   - **Step 2:** Validate open_points exist
   - **Step 3:** Generate ticket ID: `MOM-{timestamp}-{random}`
   - **Step 4:** Insert MOM record into `mom` table with:
     - `ticket_id`
     - `created_by`: jinal.chavda@petpooja.com
     - `team`: South_1 Team (from visit.team_name)
     - `brand_name`: Biryani Zone
     - `visit_id`: original visit ID
     - `open_points`: array of action items
   - **Step 5:** Update visit record in `visits` table:
     - `mom_shared`: "Yes"
     - `approval_status`: "Pending"
     - `visit_status`: "Pending"
     - `mom_shared_date`: current timestamp

5. **Database Storage**
   - **Table: `mom`**
     - New record created with all MOM details
     - `team` field = "South_1 Team" (critical for Team Lead filtering)
   - **Table: `visits`**
     - Existing record updated with approval status

## How to Debug

### Check Browser Console
When Jinal submits a MOM, you should see these logs:

```
📝 Submitting MOM for visit: {visit_id}
✅ MOM submitted successfully with approval workflow triggered
```

If you see an error instead, that's the problem!

### Check Server Logs
Look for these log messages in your server console:

```
🔵 [MOM API] Received MOM submission request: {...}
📦 [MOM API] Request body: {...}
🔵 [SUBMIT MOM] Starting MOM submission with params: {...}
✅ [SUBMIT MOM] Visit found: {...}
🎫 [SUBMIT MOM] Generated ticket ID: MOM-...
📋 [SUBMIT MOM] Processed open points: X
💾 [SUBMIT MOM] Inserting MOM record into database: {...}
✅ [SUBMIT MOM] MOM record inserted successfully
🔄 [SUBMIT MOM] Updating visit record: {...}
✅ [SUBMIT MOM] Visit updated successfully
🎉 [SUBMIT MOM] MOM submission completed successfully
✅ [MOM API] MOM submitted successfully
```

### Common Issues

#### Issue 1: No open_points
**Symptom:** Log shows "No open points provided"
**Cause:** Frontend didn't send open_points array
**Fix:** Ensure EnhancedSubmitMomModal has at least one open point

#### Issue 2: Visit not found
**Symptom:** Log shows "Visit not found"
**Cause:** visit_id doesn't exist in database
**Fix:** Check that the visit was created properly

#### Issue 3: Missing required information
**Symptom:** Log shows "Missing required information: brand_name, agent_name, or created_by"
**Cause:** Visit record doesn't have these fields
**Fix:** Check visit record in database

#### Issue 4: Database insert error
**Symptom:** Log shows "Database insert error"
**Cause:** Database schema mismatch or constraint violation
**Fix:** Check Supabase logs for exact error

#### Issue 5: Team field is null
**Symptom:** MOM created but Team Lead can't see it
**Cause:** Visit doesn't have team_name field
**Fix:** Ensure visits are created with team_name from user profile

## How Team Lead Sees MOMs

### Query Flow:

1. **Shaikh Farhan opens Approvals page**
   - Location: `app/dashboard/approvals/page.tsx`

2. **Fetches pending visits**
   - Calls: `convexAPI.getVisits({ email, search: 'Pending' })`
   - Returns visits where `visit_status = 'Pending'`

3. **For each visit, fetches MOM details**
   - Calls: `convexAPI.getMOM({ email, search: visit_id })`
   - Location: `lib/services/momService.ts` line 18-70
   - Query: `SELECT * FROM mom WHERE team = 'South_1 Team' AND visit_id = '...'`

4. **Displays in UI**
   - Shows brand name, agent name, open points count
   - Shows approve/reject buttons

### Why Team Lead Might Not See MOMs:

1. **Wrong team assignment**
   - MOM.team ≠ TeamLead.team_name
   - Check: `SELECT team FROM mom WHERE visit_id = '...'`
   - Should be: "South_1 Team"

2. **Visit status not Pending**
   - Visit.visit_status ≠ 'Pending'
   - Check: `SELECT visit_status, approval_status FROM visits WHERE visit_id = '...'`
   - Should be: visit_status='Pending', approval_status='Pending'

3. **MOM not created**
   - No record in mom table
   - Check: `SELECT * FROM mom WHERE visit_id = '...'`
   - Should return 1 row

## Database Queries to Check

### Check if MOM was created:
```sql
SELECT * FROM mom 
WHERE created_by = 'jinal.chavda@petpooja.com' 
ORDER BY created_at DESC 
LIMIT 5;
```

### Check visit status:
```sql
SELECT visit_id, brand_name, visit_status, approval_status, mom_shared, team_name
FROM visits 
WHERE agent_id = 'jinal.chavda@petpooja.com' 
ORDER BY scheduled_date DESC 
LIMIT 5;
```

### Check what Team Lead should see:
```sql
SELECT m.*, v.visit_status, v.approval_status
FROM mom m
JOIN visits v ON m.visit_id = v.visit_id
WHERE m.team = 'South_1 Team'
AND v.visit_status = 'Pending'
ORDER BY m.created_at DESC;
```

## Expected Database State After Submission

### mom table:
```
ticket_id: MOM-1234567890-abc123
created_by: jinal.chavda@petpooja.com
team: South_1 Team
brand_name: Biryani Zone
visit_id: {original visit id}
status: Open
priority: Medium
category: Visit MOM
open_points: [{...}, {...}]
created_at: 2026-02-17T...
```

### visits table:
```
visit_id: {original visit id}
brand_name: Biryani Zone
agent_id: jinal.chavda@petpooja.com
team_name: South_1 Team
visit_status: Pending
approval_status: Pending
mom_shared: Yes
mom_shared_date: 2026-02-17T...
```

## Next Steps

1. Have Jinal submit a MOM
2. Check browser console for errors
3. Check server logs for the detailed flow
4. Run the database queries above
5. Share the results to identify where the flow breaks
