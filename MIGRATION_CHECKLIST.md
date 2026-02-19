# Supabase Auth Migration Checklist

Use this checklist to ensure a smooth migration.

## Pre-Migration

### Environment Setup
- [ ] Verify `.env.local` has correct Supabase credentials
  - [ ] `NEXT_PUBLIC_SUPABASE_URL`
  - [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - [ ] `SUPABASE_SERVICE_ROLE_KEY`
- [ ] Confirm users are created in Supabase Auth
- [ ] Backup database (just in case)

### Code Review
- [ ] Review all modified files
- [ ] Check TypeScript compilation: `npm run build`
- [ ] Run linter: `npm run lint`

## Migration Steps

### 1. Database Migration
- [ ] Open Supabase SQL Editor
- [ ] Run `migrations/001_migrate_to_supabase_auth.sql`
- [ ] Verify `auth_id` column exists in `user_profiles`
- [ ] Check RLS policies are created
- [ ] Verify trigger is created

### 2. Link Auth Users
- [ ] Run: `npm run migrate:link-auth`
- [ ] Review output for any errors
- [ ] Note any users that couldn't be linked
- [ ] Fix any issues and re-run if needed

### 3. Verify Migration
- [ ] Run: `npm run migrate:verify`
- [ ] Check all profiles have `auth_id`
- [ ] Verify no orphaned auth users
- [ ] Confirm no email mismatches

## Testing

### Local Testing

#### Login Flow
- [ ] Test login with admin user
- [ ] Test login with team lead user
- [ ] Test login with agent user
- [ ] Verify error messages for wrong password
- [ ] Check rate limiting works

#### Session Management
- [ ] Login and refresh page - session persists
- [ ] Check browser cookies (should see `sb-*` cookies)
- [ ] Wait 5 minutes, verify auto-refresh works
- [ ] Open in new tab, verify session is shared

#### Logout
- [ ] Logout clears session
- [ ] Cookies are removed
- [ ] Redirects to login page
- [ ] Can't access protected routes after logout

#### Role-Based Access
- [ ] Admin can access admin routes
- [ ] Admin can see all data
- [ ] Team Lead can access team routes
- [ ] Team Lead can see team data only
- [ ] Agent can access own routes
- [ ] Agent can see own data only

#### API Routes
- [ ] Test protected API routes
- [ ] Verify API authentication works correctly
- [ ] Check 401 errors for unauthenticated requests
- [ ] Verify data filtering by role

### Browser Testing
- [ ] Chrome
- [ ] Firefox
- [ ] Safari
- [ ] Edge

### Device Testing
- [ ] Desktop
- [ ] Tablet
- [ ] Mobile

## Post-Migration

### Monitoring (First 24 Hours)
- [ ] Monitor error logs
- [ ] Check for authentication failures
- [ ] Watch for session issues
- [ ] Track user complaints

### Week 1
- [ ] Collect user feedback
- [ ] Fix any edge cases
- [ ] Document any issues found
- [ ] Update migration guide if needed

### Week 2-4
- [ ] Verify stability
- [ ] Check performance metrics
- [ ] Review security logs
- [ ] Plan for cleanup

## Cleanup (After 2-4 Weeks)

### Database Cleanup
- [ ] Verify all users are migrated
- [ ] Remove `password` column:
  ```sql
  ALTER TABLE user_profiles DROP COLUMN password;
  ```
- [ ] Make `auth_id` required:
  ```sql
  ALTER TABLE user_profiles ALTER COLUMN auth_id SET NOT NULL;
  ```

### Code Cleanup
- [ ] Remove any legacy auth code
- [ ] Update comments and documentation
- [ ] Archive migration scripts

## Rollback (If Needed)

### Immediate Rollback
- [ ] Revert code: `git revert HEAD`
- [ ] Keep database changes (don't drop columns)
- [ ] Notify team of rollback
- [ ] Document issues encountered

### Fix and Retry
- [ ] Identify root cause
- [ ] Fix issues in code
- [ ] Test thoroughly
- [ ] Retry migration

## Success Criteria

- [ ] All users can login successfully
- [ ] Sessions persist correctly
- [ ] Role-based access works
- [ ] No authentication errors in logs
- [ ] Performance is acceptable
- [ ] Users report no issues

## Emergency Contacts

- **Database Issues**: Check Supabase dashboard
- **Auth Issues**: Review Supabase Auth logs
- **Code Issues**: Check application logs
- **User Issues**: Check support tickets

## Notes

Use this space to document any issues or observations during migration:

```
Date: ___________
Issue: ___________
Resolution: ___________

Date: ___________
Issue: ___________
Resolution: ___________
```

---

**Migration Date**: ___________
**Completed By**: ___________
**Status**: ⬜ Not Started | ⬜ In Progress | ⬜ Complete | ⬜ Rolled Back
