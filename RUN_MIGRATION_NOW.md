# ⚡ Run Migration Now

## Step 1: Run Database Migration (REQUIRED FIRST)

1. Open Supabase Dashboard: https://supabase.com/dashboard/project/qvgnrdarwsnweizifech
2. Go to **SQL Editor**
3. Click **New Query**
4. Copy and paste the entire contents of `migrations/001_migrate_to_supabase_auth.sql`
5. Click **Run** (or press Ctrl+Enter)
6. Wait for "Success. No rows returned" message

## Step 2: Link Auth Users to Profiles

```bash
npm run migrate:link-auth
```

This will:
- Find all 50 Supabase Auth users
- Match them to user_profiles by email
- Update the `auth_id` column

## Step 3: Verify Migration

```bash
npm run migrate:verify
```

This will show:
- How many profiles have auth_id
- Any mismatches or issues
- Orphaned auth users

## Step 4: Test Login

```bash
npm run dev
```

Then:
1. Go to http://localhost:3022/login
2. Login with existing credentials
3. Check that session persists
4. Verify role-based access works

## Current Status

✅ Code refactored
✅ Migration scripts ready
✅ Environment configured
❌ **Database migration NOT run yet** ← DO THIS FIRST
❌ Users not linked yet
❌ Testing not done

## Error You Just Saw

```
column user_profiles.auth_id does not exist
```

This is expected! You need to run Step 1 first to add the `auth_id` column.

## After Migration

Once all steps are complete:
- Users will login via Supabase Auth
- Sessions will be JWT-based
- Automatic token refresh
- Better security

## Need Help?

- Check `MIGRATION_QUICK_START.md` for detailed instructions
- Check `SUPABASE_AUTH_MIGRATION_GUIDE.md` for troubleshooting
- Review Supabase dashboard for auth users
