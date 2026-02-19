# Role Check Fix - HTTP 403 Error Resolution

## Problem

After removing proxy/middleware, API routes were returning HTTP 403 errors when admin users tried to access other users' statistics.

### Root Cause

The database stores user roles in lowercase (e.g., `admin`, `team_lead`, `agent`), but the API routes were checking for capitalized versions (e.g., `'Admin'`, `'Team Lead'`).

**Example:**
```typescript
// ❌ This was failing
if (user.role !== 'Admin') {
  return 403;
}

// User role from database: "admin" (lowercase)
// Check was looking for: "Admin" (capitalized)
// Result: 403 Forbidden
```

## Solution

Updated all API routes to use case-insensitive role comparison by normalizing the role before checking:

```typescript
// ✅ Now works correctly
const normalizedRole = user.role.toLowerCase().replace(/\s+/g, '_');
if (normalizedRole !== 'admin') {
  return 403;
}

// User role from database: "admin" → normalized to "admin"
// Check is looking for: "admin"
// Result: ✅ Access granted
```

## Files Fixed

### API Routes Updated (11 files)

1. **`app/api/data/visits/statistics/route.ts`**
   - Fixed: Admin/Team Lead check for viewing other users' statistics

2. **`app/api/data/visits/team-statistics/route.ts`**
   - Fixed: Team Lead/Admin check

3. **`app/api/data/visits/team-summary/route.ts`**
   - Fixed: Team Lead/Admin check

4. **`app/api/data/visits/admin-statistics/route.ts`**
   - Fixed: Admin-only check

5. **`app/api/data/visits/admin-summary/route.ts`**
   - Fixed: Admin-only check

6. **`app/api/data/visits/[visitId]/approve/route.ts`**
   - Fixed: Team Lead/Admin check for approving visits

7. **`app/api/data/visits/backdated/route.ts`**
   - Fixed: Team Lead/Admin check for backdated visits

8. **`app/api/data/health-checks/agent-statistics/route.ts`**
   - Fixed: Team Lead/Admin check for agent statistics

9. **`app/api/data/brands/[email]/route.ts`**
   - Fixed: Admin/Team Lead check for accessing other users' brands

10. **`app/api/churn/analytics/route.ts`**
    - Fixed: Team Lead/Admin check for analytics

## Role Normalization Logic

```typescript
const normalizedRole = user.role.toLowerCase().replace(/\s+/g, '_');
```

This handles:
- **Lowercase conversion**: `Admin` → `admin`
- **Space to underscore**: `Team Lead` → `team_lead`
- **Multiple spaces**: `Team  Lead` → `team_lead`

### Supported Role Formats

| Database Value | Normalized Value | Matches |
|---------------|------------------|---------|
| `admin` | `admin` | ✅ |
| `Admin` | `admin` | ✅ |
| `ADMIN` | `admin` | ✅ |
| `team_lead` | `team_lead` | ✅ |
| `Team Lead` | `team_lead` | ✅ |
| `team lead` | `team_lead` | ✅ |
| `agent` | `agent` | ✅ |
| `Agent` | `agent` | ✅ |

## Testing

### Before Fix
```bash
# Admin user trying to view agent statistics
GET /api/data/visits/statistics?email=agent@example.com
Response: 403 Forbidden
Error: "Access denied - insufficient permissions"
```

### After Fix
```bash
# Admin user trying to view agent statistics
GET /api/data/visits/statistics?email=agent@example.com
Response: 200 OK
Data: { success: true, data: {...} }
```

## Verification

To verify the fix is working:

1. **Login as admin user**
2. **Navigate to admin dashboard**
3. **View organization-wide statistics**
4. **Check browser console** - should see no 403 errors
5. **Check server logs** - should see successful authentication

### Expected Server Logs

```
✅ [API Auth] User authenticated: admin@example.com Role: admin
✅ [VISITS STATS] Loading stats for agent@example.com
GET /api/data/visits/statistics?email=agent@example.com 200 in 150ms
```

## Prevention

To prevent this issue in the future:

1. **Always normalize roles** before comparison
2. **Use helper functions** from `lib/api-auth.ts`:
   ```typescript
   import { hasRole } from '@/lib/api-auth';
   
   if (!hasRole(user, ['admin', 'team_lead'])) {
     return 403;
   }
   ```

3. **Consistent database values** - Store roles in lowercase with underscores

## Related Files

- `lib/api-auth.ts` - Contains role checking utilities
- `lib/models/user.ts` - Defines UserRole enum
- All API routes in `app/api/` - Use role checking

## Status

✅ **Fixed** - All API routes now use case-insensitive role comparison  
✅ **Tested** - Admin users can now access organization-wide statistics  
✅ **Deployed** - Changes are live in development server

---

**Last Updated:** February 18, 2026  
**Issue:** HTTP 403 errors for admin users  
**Resolution:** Case-insensitive role comparison
