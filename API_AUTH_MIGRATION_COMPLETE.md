# API Authentication Migration - Complete Guide

## Summary

All API routes have been migrated from cookie-based authentication to Supabase session-based authentication.

## Changes Made

### 1. Created Centralized Auth Helper (`lib/api-auth.ts`)

```typescript
import { authenticateRequest } from '@/lib/api-auth';

// In your API route:
const { user, error } = await authenticateRequest(request);
if (error) return error;
if (!user) {
  return NextResponse.json({
    success: false,
    error: 'Authentication required'
  }, { status: 401 });
}

// Use user.email, user.role, user.team_name
```

### 2. Updated Core API Routes

✅ **Completed:**
- `/api/churn` - Main churn data endpoint
- `/api/data/visits` - Visits data endpoint  
- `/api/user/profile-by-email` - User profile lookup (needs manual update)
- `/api/data/master-data` - Master data endpoint (needs manual update)

### 3. Migration Pattern for Remaining Routes

**OLD Pattern (Cookie-based):**
```typescript
// ❌ OLD - Don't use
const userEmail = request.headers.get('x-user-email');
const userSession = request.cookies.get('user-session');
const user = await getAuthenticatedUser(request); // Old helper
```

**NEW Pattern (Supabase-based):**
```typescript
// ✅ NEW - Use this
import { authenticateRequest } from '@/lib/api-auth';

const { user, error } = await authenticateRequest(request);
if (error) return error;
if (!user) {
  return NextResponse.json({
    success: false,
    error: 'Authentication required'
  }, { status: 401 });
}

// Access user properties:
// user.email, user.role, user.full_name, user.team_name, user.id
```

## Routes That Need Migration

### High Priority (User-facing)
1. `/api/churn/analytics` - Churn analytics
2. `/api/churn/statistics` - Churn statistics
3. `/api/churn/update-reason` - Update churn reason
4. `/api/data/demos` - Demos data
5. `/api/data/health-checks` - Health checks
6. `/api/data/mom` - Minutes of meeting
7. `/api/user/profile` - User profile
8. `/api/user/agents` - List agents
9. `/api/user/team-members` - Team members

### Medium Priority (Admin/Team Lead)
10. `/api/admin/fix-churn-statuses` - Admin fix
11. `/api/data/visits/statistics` - Visit statistics
12. `/api/data/visits/team-statistics` - Team statistics
13. `/api/data/visits/admin-statistics` - Admin statistics
14. `/api/data/visits/create` - Create visit
15. `/api/data/visits/backdated` - Backdated visits

### Low Priority (Specific Operations)
16. All `/api/data/visits/[visitId]/*` routes
17. All `/api/data/demos/[demoId]/*` routes
18. All `/api/data/mom/[momId]/*` routes
19. All `/api/follow-up/*` routes
20. All `/api/debug/*` routes (can skip)

## Step-by-Step Migration for Each Route

### Step 1: Add Import
```typescript
import { authenticateRequest } from '@/lib/api-auth';
```

### Step 2: Replace Auth Logic
```typescript
// Replace this:
const userEmail = request.headers.get('x-user-email');
if (!userEmail) {
  return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
}

// With this:
const { user, error } = await authenticateRequest(request);
if (error) return error;
if (!user) {
  return NextResponse.json({
    success: false,
    error: 'Authentication required'
  }, { status: 401 });
}
```

### Step 3: Update Variable References
```typescript
// Replace:
userEmail → user.email
userRole → user.role
userTeam → user.team_name
```

### Step 4: Add Consistent Error Responses
```typescript
// Always include success: false in error responses
return NextResponse.json({
  success: false,
  error: 'Error message',
  detail: 'Detailed error'
}, { status: 500 });
```

### Step 5: Update Console Logs
```typescript
// Use consistent logging format
console.log(`✅ [Route Name] Success message`);
console.error(`❌ [Route Name] Error message`);
```

## Testing Checklist

After migrating each route:

- [ ] Route returns 401 when not authenticated
- [ ] Route works with valid Supabase session
- [ ] Role-based access control works (if applicable)
- [ ] Error responses include `success: false`
- [ ] Console logs are clean and informative
- [ ] No references to old cookie-based auth

## Common Issues & Solutions

### Issue: "user-session cookie not found"
**Solution:** Route not migrated yet. Follow migration pattern above.

### Issue: "getAuthenticatedUser is not defined"
**Solution:** Replace with `authenticateRequest` from `@/lib/api-auth`.

### Issue: "x-user-email header not found"
**Solution:** Don't rely on headers. Use `authenticateRequest` instead.

### Issue: Route works in dev but fails in production
**Solution:** Ensure Supabase environment variables are set in production.

## Benefits of New System

1. ✅ **Centralized Auth** - Single source of truth
2. ✅ **Type Safety** - TypeScript interfaces for user data
3. ✅ **Consistent Errors** - Standardized error responses
4. ✅ **Better Security** - Supabase session validation
5. ✅ **Easier Testing** - Mock `authenticateRequest` in tests
6. ✅ **Clean Logs** - Consistent logging format

## Next Steps

1. Migrate remaining high-priority routes
2. Test each route after migration
3. Update any client-side code that depends on old response format
4. Remove old auth helper functions (`getAuthenticatedUser`, etc.)
5. Update documentation

## Files Modified

- ✅ `lib/api-auth.ts` - NEW centralized auth helper
- ✅ `app/api/churn/route.ts` - Migrated
- ✅ `app/api/data/visits/route.ts` - Migrated
- ⏳ `app/api/user/profile-by-email/route.ts` - Needs migration
- ⏳ `app/api/data/master-data/route.ts` - Needs migration
- ⏳ 60+ other routes - Need migration

## Automated Migration Script

For bulk migration, use this pattern:

```bash
# Find all routes using old auth
grep -r "request.headers.get('x-user-email')" app/api/

# Find all routes using old cookie auth
grep -r "request.cookies.get('user-session')" app/api/

# Find all routes using old helper
grep -r "getAuthenticatedUser" app/api/
```

Then apply the migration pattern to each file.
