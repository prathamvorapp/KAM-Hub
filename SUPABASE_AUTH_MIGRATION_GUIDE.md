# Supabase Auth Migration Guide

This guide explains how to migrate from the custom authentication system to Supabase Auth.

## Overview

The authentication system has been refactored to use Supabase Auth instead of custom email/password validation. This provides:

- Built-in session management
- Automatic token refresh
- Better security with JWT tokens
- Row Level Security (RLS) support
- Password reset functionality
- Email verification (optional)

## Migration Steps

### 1. Run Database Migration

First, run the SQL migration to prepare your database:

```sql
-- Run migrations/001_migrate_to_supabase_auth.sql in your Supabase SQL Editor
```

This migration:
- Adds `auth_id` column to `user_profiles` table
- Creates a trigger to sync Supabase Auth users with user_profiles
- Sets up Row Level Security (RLS) policies
- Keeps the `password` column temporarily for backward compatibility

### 2. Create Supabase Auth Users

For each existing user in `user_profiles`, create a corresponding Supabase Auth user:

```sql
-- Example: Create auth user for existing profile
-- Run this in Supabase SQL Editor for each user

-- Method 1: Using Supabase Dashboard
-- Go to Authentication > Users > Add User
-- Enter email and password
-- The trigger will automatically link to user_profiles

-- Method 2: Using SQL (requires service role)
-- This will be done programmatically via the migration script
```

### 3. Migration Script

Create a migration script to sync existing users:

```typescript
// scripts/migrate-users-to-auth.ts
import { createServiceRoleClient } from '../lib/supabase';

async function migrateUsers() {
  const supabase = createServiceRoleClient();
  
  // Get all users without auth_id
  const { data: users, error } = await supabase
    .from('user_profiles')
    .select('*')
    .is('auth_id', null);
  
  if (error) {
    console.error('Error fetching users:', error);
    return;
  }
  
  console.log(`Found ${users.length} users to migrate`);
  
  for (const user of users) {
    try {
      // Create Supabase Auth user
      const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
        email: user.email,
        password: 'TEMP_PASSWORD_' + Math.random().toString(36), // Generate temp password
        email_confirm: true, // Auto-confirm email
        user_metadata: {
          full_name: user.full_name
        }
      });
      
      if (authError) {
        console.error(`Failed to create auth user for ${user.email}:`, authError);
        continue;
      }
      
      // Update user_profiles with auth_id
      const { error: updateError } = await supabase
        .from('user_profiles')
        .update({ auth_id: authUser.user.id })
        .eq('email', user.email);
      
      if (updateError) {
        console.error(`Failed to update profile for ${user.email}:`, updateError);
        continue;
      }
      
      console.log(`✅ Migrated ${user.email}`);
      
      // Send password reset email
      await supabase.auth.resetPasswordForEmail(user.email, {
        redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/reset-password`
      });
      
      console.log(`📧 Password reset email sent to ${user.email}`);
      
    } catch (error) {
      console.error(`Error migrating ${user.email}:`, error);
    }
  }
  
  console.log('Migration complete!');
}

migrateUsers();
```

### 4. Update Environment Variables

Ensure your `.env.local` has the correct Supabase credentials:

```env
NEXT_PUBLIC_SUPABASE_URL=https://qvgnrdarwsnweizifech.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### 5. Test the Migration

1. **Test Login**: Try logging in with an existing user
2. **Test Session**: Verify session persists across page refreshes
3. **Test Logout**: Ensure logout clears the session
4. **Test Password Reset**: Verify password reset flow works
5. **Test Role-Based Access**: Ensure role-based permissions still work

### 6. Remove Legacy Code (After Migration)

Once all users are migrated and tested:

```sql
-- Remove password column from user_profiles
ALTER TABLE user_profiles DROP COLUMN password;

-- Make auth_id required
ALTER TABLE user_profiles ALTER COLUMN auth_id SET NOT NULL;
```

## Key Changes

### Authentication Flow

**Before:**
1. User submits email/password
2. Backend queries `user_profiles` by email
3. Backend verifies password with bcrypt
4. Backend creates session cookie
5. API routes validate session cookie

**After:**
1. User submits email/password
2. Frontend calls `supabase.auth.signInWithPassword()`
3. Supabase Auth validates credentials
4. Supabase creates JWT session
5. Backend fetches user profile using `auth_id`
6. API routes validate Supabase session using `requireAuth()`

### Session Management

**Before:**
- Simple JSON cookie with user data
- No automatic refresh
- Manual session validation

**After:**
- Supabase JWT tokens (access + refresh)
- Automatic token refresh
- Built-in session validation
- `onAuthStateChange` listener for real-time updates

### User Identification

**Before:**
- Email used as primary identifier
- Queries: `.eq('email', userEmail)`

**After:**
- UUID (`auth_id`) used as primary identifier
- Queries: `.eq('auth_id', user.id)`
- Email still available but not used for identification

## API Changes

### UserService

```typescript
// Before
authenticateUser(email, password) → { success, user, error }

// After
authenticateUser(email, password) → { success, user, authUserId, error }
```

### AuthContext

```typescript
// Before
- Uses localStorage for persistence
- Manual cookie management
- No automatic session refresh

// After
- Uses Supabase session
- Automatic cookie management via Supabase SSR
- Automatic token refresh
- onAuthStateChange listener
```

### Middleware

```typescript
// Before
- Reads user-session cookie
- Parses JSON manually
- Adds x-user-email, x-user-role, x-user-team headers

// After
- Validates Supabase session
- Fetches user profile from database
- Adds x-user-id, x-user-email, x-user-role, x-user-team headers
```

## Rollback Plan

If you need to rollback:

1. Revert code changes (git revert)
2. Keep `auth_id` column (don't drop it)
3. Keep `password` column
4. Old authentication will continue to work

## Security Improvements

1. **JWT Tokens**: More secure than simple JSON cookies
2. **Automatic Expiry**: Tokens expire and refresh automatically
3. **Row Level Security**: Database-level access control
4. **Password Reset**: Built-in secure password reset flow
5. **Email Verification**: Optional email verification support

## Troubleshooting

### Users can't log in after migration

- Check if `auth_id` is set in `user_profiles`
- Verify Supabase Auth user exists
- Check if user is active (`is_active = true`)

### Session not persisting

- Check browser cookies (should see `sb-*` cookies)
- Verify Supabase URL and keys are correct
- Check browser console for errors

### API routes rejecting requests

- Verify Supabase session is valid
- Check if user profile exists with matching `auth_id`
- Ensure user is active

### Password reset not working

- Configure email templates in Supabase Dashboard
- Set redirect URL in Supabase settings
- Check SMTP configuration

## Next Steps

1. Run the database migration
2. Create migration script to sync users
3. Test with a few users first
4. Gradually migrate all users
5. Send password reset emails to all users
6. Monitor for issues
7. Remove legacy password column after successful migration

## Support

For issues or questions:
- Check Supabase Auth documentation: https://supabase.com/docs/guides/auth
- Review migration logs
- Test in development environment first
