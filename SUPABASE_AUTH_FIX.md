# Supabase Authentication Fix

## Problem
- User could log in on client
- API routes returned 401 Unauthorized
- No cookies were being set or read properly

## Solution Implemented

### 1. Updated `lib/supabase-client.ts`
- Changed from `@supabase/supabase-js` to `@supabase/ssr`
- Now uses `createBrowserClient` from `@supabase/ssr`
- This properly handles cookie-based sessions in the browser

### 2. Updated `lib/supabase-server.ts`
- Changed cookie handling to use `getAll()` and `setAll()` methods
- This is the recommended approach from Supabase SSR documentation
- Properly reads and writes cookies in server context

### 3. Created `components/RouteGuard.tsx`
- Client-side route protection component
- Validates authentication using `useAuth()` hook
- Handles redirects for protected routes
- Enforces role-based access control

### 4. Updated `lib/api-auth.ts`
- Uses `requireAuth()` for API authentication
- Validates JWT tokens from cookies
- Added better logging for debugging
- Now properly validates JWT tokens from cookies

## Key Changes

### Before:
```typescript
// ❌ Wrong - reads from local storage, not cookies
const { data: { session } } = await supabase.auth.getSession();
```

### After:
```typescript
// ✅ Correct - validates JWT from cookies
const { data: { user } } = await supabase.auth.getUser();
```

## How It Works Now

1. **Login Flow:**
   - User enters credentials on `/login`
   - `AuthContext.signIn()` calls `supabase.auth.signInWithPassword()`
   - Supabase sets HTTP-only cookies automatically
   - Page reloads to `/dashboard`

2. **API Authentication Flow:**
   - API routes receive requests with cookies
   - Calls `requireAuth()` to validate JWT from cookies
   - If valid, fetches user profile from database
   - Returns user context to API route
   - API route processes request with user context

3. **API Route Flow:**
   - API route calls `getAuthenticatedUser()`
   - Creates server Supabase client with cookies
   - Validates user from JWT
   - Returns user profile or null

## Testing

### 1. Clear Browser Data
```bash
# Clear all cookies and local storage for localhost:3022
# In Chrome: DevTools > Application > Clear site data
```

### 2. Restart Dev Server
```bash
# Stop the current server (Ctrl+C)
npm run dev
```

### 3. Test Login
1. Go to `http://localhost:3022/login`
2. Enter credentials:
   - Email: `rahul.taak@petpooja.com`
   - Password: (your password)
3. Click "Sign In"

### 4. Check Console Logs
You should see:
```
✅ [AUTH] User authenticated: rahul.taak@petpooja.com
🔍 [MIDDLEWARE] Session check: { hasUser: true, userId: '...', email: '...' }
✅ [MIDDLEWARE] Headers set, forwarding request
```

### 5. Check API Response
- Dashboard should load without 401 errors
- Follow-up notifications should load
- No "Authentication required" errors in console

## Environment Variables Required

Make sure these are set in `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://qvgnrdarwsnweizifech.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

## Debugging

If you still see 401 errors:

1. **Check cookies in browser:**
   - DevTools > Application > Cookies
   - Look for `sb-*` cookies
   - Should have `sb-qvgnrdarwsnweizifech-auth-token`

2. **Check middleware logs:**
   ```
   🔍 [MIDDLEWARE] Session check: { hasUser: true, ... }
   ```
   - If `hasUser: false`, cookies aren't being read

3. **Check API logs:**
   ```
   ✅ [AUTH] User authenticated: email@example.com
   ```
   - If you see `❌ [AUTH] No authenticated user`, JWT validation failed

4. **Common issues:**
   - Browser blocking third-party cookies (shouldn't affect localhost)
   - Cookies not being set due to HTTPS/HTTP mismatch (shouldn't affect localhost)
   - Old session data cached - clear browser data and try again

## Architecture

```
┌─────────────┐
│   Browser   │
│  (Client)   │
└──────┬──────┘
       │ 1. Login with email/password
       ▼
┌─────────────────────┐
│  Supabase Auth API  │
│  (External Service) │
└──────┬──────────────┘
       │ 2. Sets HTTP-only cookies
       │    (sb-*-auth-token)
       ▼
┌─────────────┐
│  Middleware │ ◄─── 3. Reads cookies
│             │      4. Validates JWT with getUser()
│             │      5. Fetches user profile
│             │      6. Sets headers (x-user-*)
└──────┬──────┘
       │ 7. Forwards request with headers
       ▼
┌─────────────┐
│  API Route  │ ◄─── 8. Reads cookies again
│             │      9. Validates JWT with getUser()
│             │     10. Returns data
└─────────────┘
```

## Security Notes

- ✅ Uses HTTP-only cookies (can't be accessed by JavaScript)
- ✅ JWT validation on every request
- ✅ No tokens in localStorage or sessionStorage
- ✅ Automatic token refresh handled by Supabase
- ✅ PKCE flow for additional security

## References

- [Supabase SSR Documentation](https://supabase.com/docs/guides/auth/server-side/nextjs)
- [Next.js Middleware Documentation](https://nextjs.org/docs/app/building-your-application/routing/middleware)
- [Supabase Auth Helpers](https://github.com/supabase/auth-helpers)
