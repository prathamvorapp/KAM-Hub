# Churn Data Fetching Issue - Fix Guide

## Problem Summary

The churn page is not fetching data correctly from the database due to **missing RLS (Row Level Security) policies**.

### Root Cause

1. **RLS is enabled** on `churn_records` table (and other tables)
2. **No RLS policies exist** for most operations (INSERT, UPDATE, DELETE)
3. Only a SELECT policy was created, but the application needs full CRUD access

### Evidence

- `supabase_schema.sql` line 531: `ALTER TABLE churn_records ENABLE ROW LEVEL SECURITY;`
- No comprehensive policies found in migrations
- Service uses `getSupabaseAdmin()` which should bypass RLS, but policies are still needed for authenticated users

## Solution Steps

### Step 1: Run the RLS Fix Migration

Execute the comprehensive RLS fix migration:

```bash
# Run this in your Supabase SQL Editor or via CLI
psql -h <your-host> -U postgres -d postgres -f migrations/006_fix_all_tables_rls.sql
```

Or run it directly in Supabase Dashboard → SQL Editor.

### Step 2: Verify RLS Status

Run the diagnostic script to check current state:

```bash
# Run this in Supabase SQL Editor
psql -h <your-host> -U postgres -d postgres -f check-rls-status.sql
```

Expected output:
- All tables should show `rls_enabled = true`
- Each table should have 5 policies (service role + 4 CRUD operations)
- Should see churn records count and sample data

### Step 3: Verify Environment Variables

Check your `.env.local` file has:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key  # ← CRITICAL!
```

The service role key is essential for bypassing RLS in API routes.

### Step 4: Test the Churn Page

1. Restart your Next.js development server
2. Navigate to `/dashboard/churn`
3. Check browser console for any errors
4. Verify data loads correctly

## Files Created

1. **migrations/005_fix_churn_records_rls.sql** - Fixes churn_records table only
2. **migrations/006_fix_all_tables_rls.sql** - Comprehensive fix for all tables
3. **check-rls-status.sql** - Diagnostic script to verify RLS configuration

## What the Migrations Do

Each table gets 5 RLS policies:

1. **Service role full access** - Allows API routes to bypass RLS
2. **SELECT policy** - Authenticated users can read all records
3. **INSERT policy** - Authenticated users can create records
4. **UPDATE policy** - Authenticated users can modify records
5. **DELETE policy** - Authenticated users can delete records

Note: Fine-grained access control (e.g., agents only see their records) is handled in application code, not RLS policies.

## Troubleshooting

### If data still doesn't load:

1. **Check browser console** for errors
2. **Check server logs** for Supabase errors
3. **Verify service role key** is correct
4. **Run check-rls-status.sql** to verify policies exist
5. **Check API route logs** in `/api/churn/route.ts`

### Common Issues:

- **"No rows returned"** - RLS is blocking access, policies not applied
- **"Permission denied"** - Service role key missing or incorrect
- **"Authentication required"** - User not logged in or session expired
- **Empty array returned** - Data exists but filtering logic excludes it

## Technical Details

### Why This Happened

The migration from Convex to Supabase enabled RLS on all tables but didn't create the necessary policies. Convex didn't require RLS policies, so this was overlooked during migration.

### Service Role vs Authenticated Users

- **Service role** (used in API routes): Bypasses RLS completely
- **Authenticated users** (direct client queries): Subject to RLS policies

The application uses service role in API routes (`getSupabaseAdmin()`), which should work even without policies, but it's best practice to have policies defined.

## Next Steps After Fix

1. Consider implementing more granular RLS policies for better security
2. Add role-based policies (e.g., agents only see their records)
3. Add audit logging for sensitive operations
4. Review other tables for similar issues

## Questions?

If the issue persists after running these migrations, check:
- Supabase dashboard → Authentication → Policies
- Supabase dashboard → Table Editor → churn_records
- Server logs for detailed error messages
