# Server Logs Check

## Where to Find Server Logs

The detailed error logs I added will appear in your **SERVER TERMINAL**, not the browser console.

Look for the terminal window where you ran:
```bash
npm run dev
```

## What to Look For

When Jinal submits a MOM, you should see these messages in the server terminal:

### Success Flow:
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

### Error Flow (what you're probably seeing):
```
🔵 [MOM API] Received MOM submission request: {...}
📦 [MOM API] Request body: {...}
🔵 [SUBMIT MOM] Starting MOM submission with params: {...}
✅ [SUBMIT MOM] Visit found: {...}
🎫 [SUBMIT MOM] Generated ticket ID: MOM-...
📋 [SUBMIT MOM] Processed open points: X
💾 [SUBMIT MOM] Inserting MOM record into database: {...}
❌ [SUBMIT MOM] Database insert error: {THE ACTUAL ERROR}
❌ [SUBMIT MOM] Failed to insert MOM: {THE ACTUAL ERROR}
❌ [MOM API] Error submitting MOM: {THE ACTUAL ERROR}
```

## Common Database Errors

### 1. Column doesn't exist
```
column "team" of relation "mom" does not exist
```
**Fix:** Add the `team` column to the `mom` table in Supabase

### 2. Data type mismatch
```
invalid input syntax for type json
```
**Fix:** The `open_points` field needs to be JSONB type

### 3. Constraint violation
```
duplicate key value violates unique constraint
```
**Fix:** The `ticket_id` might already exist (unlikely with timestamp)

### 4. Foreign key violation
```
insert or update on table "mom" violates foreign key constraint
```
**Fix:** The `visit_id` doesn't exist in the visits table

## Next Steps

1. **Find your server terminal** (where you ran `npm run dev`)
2. **Submit a MOM** from Jinal's account
3. **Copy the error message** from the server terminal
4. **Share the error** so I can fix it

The error message will tell us exactly what's wrong with the database schema or data.
