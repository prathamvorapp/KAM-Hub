# Supabase Auth Migration - Quick Start

## Prerequisites

✅ Users are already created in Supabase Auth
✅ Database has `user_profiles` table
✅ Environment variables are configured

## Step-by-Step Migration

### 1. Run Database Migration

Open Supabase SQL Editor and run:

```bash
migrations/001_migrate_to_supabase_auth.sql
```

This adds the `auth_id` column and sets up RLS policies.

### 2. Link Existing Auth Users

Since users are already created in Supabase Auth, run the linking script:

```bash
npm run migrate:link-auth
```

This will:
- Find all Supabase Auth users
- Match them to `user_profiles` by email
- Update `auth_id` column in `user_profiles`

### 3. Verify Migration

Check that everything is linked correctly:

```bash
npm run migrate:verify
```

This will show:
- Total users and profiles
- Profiles with/without auth_id
- Any mismatches or issues

### 4. Test Login

1. Try logging in with an existing user
2. Check browser console for Supabase session
3. Verify role-based access works
4. Test logout functionality

### 5. Deploy Changes

Once tested locally:

```bash
git add .
git commit -m "Migrate to Supabase Auth"
git push
```

## What Changed?

### Login Flow
- **Before**: Email/password → bcrypt validation → JSON cookie
- **After**: Email/password → Supabase Auth → JWT session

### Session Management
- **Before**: Manual cookie with user data
- **After**: Supabase JWT tokens (auto-refresh)

### User Identification
- **Before**: Email as primary identifier
- **After**: UUID (`auth_id`) as primary identifier

### Middleware
- **Before**: Parse JSON cookie
- **After**: Validate Supabase session + fetch profile

## Testing Checklist

- [ ] Login works with existing credentials
- [ ] Session persists across page refresh
- [ ] Logout clears session properly
- [ ] Role-based access control works
- [ ] Admin can access admin routes
- [ ] Team Lead can access team data
- [ ] Agent can only access own data
- [ ] API routes validate sessions correctly

## Troubleshooting

### "No auth user found for email"
→ User needs to be created in Supabase Auth first

### "Authentication required" error
→ Check if `auth_id` is set in `user_profiles`
→ Verify Supabase session exists (check browser cookies)

### Session not persisting
→ Check browser cookies for `sb-*` cookies
→ Verify environment variables are correct

### Role-based access not working
→ Ensure API routes are using `requireAuth()` correctly
→ Check user profile has correct role

## Rollback

If needed, you can rollback:

1. Revert code changes: `git revert HEAD`
2. Keep `auth_id` column (don't drop it)
3. Old authentication will still work with `password` column

## Next Steps After Migration

1. ✅ All users migrated and tested
2. Monitor for issues for 1-2 weeks
3. Remove `password` column from database:
   ```sql
   ALTER TABLE user_profiles DROP COLUMN password;
   ```
4. Make `auth_id` required:
   ```sql
   ALTER TABLE user_profiles ALTER COLUMN auth_id SET NOT NULL;
   ```

## Support

- Full guide: `SUPABASE_AUTH_MIGRATION_GUIDE.md`
- Supabase docs: https://supabase.com/docs/guides/auth
- Check logs for detailed error messages
