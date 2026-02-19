# Supabase Auth Migration

This project has been refactored to use **Supabase Auth** instead of custom authentication.

## 📚 Documentation

Choose the guide that fits your needs:

### Quick Start (Recommended)
**[MIGRATION_QUICK_START.md](./MIGRATION_QUICK_START.md)**
- Step-by-step instructions
- For users already created in Supabase Auth
- Takes 15-30 minutes

### Detailed Guide
**[SUPABASE_AUTH_MIGRATION_GUIDE.md](./SUPABASE_AUTH_MIGRATION_GUIDE.md)**
- Comprehensive migration documentation
- Explains all changes in detail
- Includes troubleshooting

### Summary
**[MIGRATION_SUMMARY.md](./MIGRATION_SUMMARY.md)**
- What was changed
- Files modified
- Key improvements

### Checklist
**[MIGRATION_CHECKLIST.md](./MIGRATION_CHECKLIST.md)**
- Pre-migration checks
- Testing checklist
- Post-migration tasks

## 🚀 Quick Migration (TL;DR)

```bash
# 1. Run database migration in Supabase SQL Editor
migrations/001_migrate_to_supabase_auth.sql

# 2. Link existing auth users to profiles
npm run migrate:link-auth

# 3. Verify everything is linked
npm run migrate:verify

# 4. Test login
npm run dev
```

## 📦 What's Included

### Core Files
- `lib/supabase.ts` - Supabase client utilities
- `lib/services/userService.ts` - Updated authentication service
- `contexts/AuthContext.tsx` - React auth context with Supabase
- `components/RouteGuard.tsx` - Client-side route protection
- `app/api/auth/login/route.ts` - Login API route

### Migration Scripts
- `scripts/link-existing-auth-users.ts` - Link auth users to profiles
- `scripts/migrate-users-to-supabase-auth.ts` - Create new auth users
- `scripts/verify-migration.ts` - Verify migration completeness

### Database
- `migrations/001_migrate_to_supabase_auth.sql` - Database schema changes

## 🔑 Key Changes

### Before (Custom Auth)
```typescript
// Login with bcrypt
const isValid = await bcrypt.compare(password, hash);

// Session in JSON cookie
document.cookie = `user-session=${JSON.stringify(user)}`;

// Email as identifier
.eq('email', userEmail)
```

### After (Supabase Auth)
```typescript
// Login with Supabase Auth
const { data } = await supabase.auth.signInWithPassword({ email, password });

// Session in JWT tokens (automatic)
// Handled by Supabase

// UUID as identifier
.eq('auth_id', userId)
```

## 🎯 Benefits

1. **Better Security** - Industry-standard JWT authentication
2. **Auto Session Management** - No manual token refresh
3. **Built-in Features** - Password reset, email verification
4. **Scalability** - Supabase handles auth infrastructure
5. **Less Code** - Simpler authentication logic

## ⚙️ NPM Scripts

```bash
# Link existing Supabase Auth users to user_profiles
npm run migrate:link-auth

# Verify migration is complete
npm run migrate:verify

# Create new auth users (if needed)
npm run migrate:users
```

## 🔒 Security

### Row Level Security (RLS)
The migration sets up RLS policies:
- Users can read their own profile
- Users can update their own profile (except role)
- Admins can read/update all profiles
- Service role has full access

### Session Management
- JWT tokens with automatic refresh
- Secure httpOnly cookies
- PKCE flow for SPAs
- Token expiry and rotation

## 🧪 Testing

### Test Login
```bash
npm run dev
# Navigate to http://localhost:3022/login
# Login with existing credentials
```

### Test API
```bash
# Should return 401 (no session)
curl http://localhost:3022/api/data/visits

# Login first, then test with session
```

## 📊 Migration Status

- ✅ Code refactored
- ✅ Migration scripts created
- ✅ Documentation complete
- ⬜ Database migration run
- ⬜ Users linked
- ⬜ Testing complete
- ⬜ Production deployment

## 🆘 Troubleshooting

### "No auth user found"
→ User needs to be created in Supabase Auth first

### "Authentication required"
→ Check if `auth_id` is set in `user_profiles`

### Session not persisting
→ Check browser cookies for `sb-*` cookies

### Role-based access not working
→ Verify API routes are using `requireAuth()` correctly

## 📞 Support

- **Documentation**: See guides above
- **Supabase Docs**: https://supabase.com/docs/guides/auth
- **Issues**: Check application logs and Supabase dashboard

## 🔄 Rollback

If needed, you can rollback:
```bash
git revert HEAD
```

The `password` column is kept for backward compatibility.

---

**Ready to migrate?** Start with [MIGRATION_QUICK_START.md](./MIGRATION_QUICK_START.md)
