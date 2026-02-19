# Authentication Flow Diagram

## Complete Authentication Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│                         AUTHENTICATION FLOW                          │
└─────────────────────────────────────────────────────────────────────┘

1. LOGIN PHASE
═══════════════

   ┌──────────┐
   │ Browser  │
   │ /login   │
   └────┬─────┘
        │
        │ User enters email + password
        │ AuthContext.signIn() called
        │
        ▼
   ┌─────────────────────┐
   │ Supabase Auth API   │
   │ (External Service)  │
   └────┬────────────────┘
        │
        │ ✅ Validates credentials
        │ ✅ Creates JWT token
        │ ✅ Sets HTTP-only cookies:
        │    - sb-qvgnrdarwsnweizifech-auth-token
        │    - sb-qvgnrdarwsnweizifech-auth-token-code-verifier
        │
        ▼
   ┌──────────┐
   │ Browser  │
   │ Cookies  │ ◄─── Cookies stored automatically
   └──────────┘


2. PAGE REQUEST PHASE
══════════════════════

   ┌──────────┐
   │ Browser  │
   │ Request  │ ───────► GET /dashboard
   └──────────┘          │
                         │ Cookies sent automatically
                         │ in request headers
                         ▼
                    ┌────────────┐
                    │ Middleware │
                    └────┬───────┘
                         │
                         │ 1. Read cookies from request
                         │ 2. Create Supabase client with cookies
                         │ 3. Call supabase.auth.getUser()
                         │    (validates JWT from cookies)
                         │
                         ▼
                    ┌─────────────────┐
                    │ Supabase Auth   │
                    │ JWT Validation  │
                    └────┬────────────┘
                         │
                         │ ✅ JWT valid
                         │ ✅ Returns user object
                         │
                         ▼
                    ┌────────────┐
                    │ Middleware │
                    └────┬───────┘
                         │
                         │ 4. Fetch user profile from DB
                         │ 5. Set request headers:
                         │    - x-user-id
                         │    - x-user-email
                         │    - x-user-role
                         │    - x-user-team
                         │
                         ▼
                    ┌──────────┐
                    │ Next.js  │
                    │ Page     │ ───────► Renders /dashboard
                    └──────────┘


3. API REQUEST PHASE
═════════════════════

   ┌──────────┐
   │ Browser  │
   │ Request  │ ───────► GET /api/follow-up/reminders/overdue
   └──────────┘          │
                         │ Cookies sent automatically
                         │
                         ▼
                    ┌────────────┐
                    │ Middleware │
                    └────┬───────┘
                         │
                         │ Same validation as above
                         │ (steps 1-5)
                         │
                         ▼
                    ┌────────────┐
                    │ API Route  │
                    └────┬───────┘
                         │
                         │ 1. Call getAuthenticatedUser()
                         │ 2. Create Supabase client with cookies
                         │ 3. Call supabase.auth.getUser()
                         │    (validates JWT again)
                         │
                         ▼
                    ┌─────────────────┐
                    │ Supabase Auth   │
                    │ JWT Validation  │
                    └────┬────────────┘
                         │
                         │ ✅ JWT valid
                         │ ✅ Returns user object
                         │
                         ▼
                    ┌────────────┐
                    │ API Route  │
                    └────┬───────┘
                         │
                         │ 4. Fetch user profile from DB
                         │ 5. Process request
                         │ 6. Return data
                         │
                         ▼
                    ┌──────────┐
                    │ Browser  │
                    │ Response │ ◄─── 200 OK with data
                    └──────────┘


4. LOGOUT PHASE
═══════════════

   ┌──────────┐
   │ Browser  │
   │ Logout   │
   └────┬─────┘
        │
        │ AuthContext.signOut() called
        │
        ▼
   ┌─────────────────────┐
   │ Supabase Auth API   │
   │ (External Service)  │
   └────┬────────────────┘
        │
        │ ✅ Invalidates JWT
        │ ✅ Clears cookies
        │
        ▼
   ┌──────────┐
   │ Browser  │
   │ Redirect │ ───────► /login
   └──────────┘
```

## Key Components

### 1. Supabase Client (Browser)
```typescript
// lib/supabase-client.ts
import { createBrowserClient } from '@supabase/ssr';

export function createBrowserClient() {
  return createBrowserClient(
    SUPABASE_URL,
    SUPABASE_ANON_KEY
  );
}
```
- Used in React components
- Handles cookie-based sessions automatically
- Manages token refresh

### 2. Supabase Client (Server)
```typescript
// lib/supabase-server.ts
import { createServerClient } from '@supabase/ssr';

export async function createServerSupabaseClient() {
  const cookieStore = await cookies();
  
  return createServerClient(
    SUPABASE_URL,
    SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll(cookies) { /* set cookies */ }
      }
    }
  );
}
```
- Used in API routes and middleware
- Reads cookies from request
- Validates JWT tokens

### 3. Middleware
```typescript
// middleware.ts
const supabase = createServerClient(/* ... */);
const { data: { user } } = await supabase.auth.getUser();

if (!user) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}
```
- Intercepts all requests
- Validates authentication
- Sets user headers

### 4. API Routes
```typescript
// app/api/*/route.ts
const user = await getAuthenticatedUser(request);

if (!user) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}
```
- Double-checks authentication
- Fetches user profile
- Processes request

## Security Features

1. **HTTP-Only Cookies**
   - Cannot be accessed by JavaScript
   - Protected from XSS attacks

2. **JWT Validation**
   - Every request validates the token
   - Expired tokens are rejected

3. **Automatic Refresh**
   - Supabase handles token refresh
   - No manual intervention needed

4. **PKCE Flow**
   - Additional security layer
   - Prevents authorization code interception

## Cookie Details

### Cookie Name
```
sb-qvgnrdarwsnweizifech-auth-token
```

### Cookie Properties
- **HttpOnly**: Yes (cannot be accessed by JS)
- **Secure**: Yes (HTTPS only in production)
- **SameSite**: Lax (CSRF protection)
- **Path**: / (available to all routes)
- **Max-Age**: 3600 (1 hour, auto-refreshed)

### Cookie Contents
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refresh_token": "...",
  "expires_at": 1234567890,
  "user": {
    "id": "...",
    "email": "...",
    ...
  }
}
```

## Error Handling

### No Cookie
```
🔍 [MIDDLEWARE] Session check: { hasUser: false }
❌ [MIDDLEWARE] No authenticated user
→ Returns 401 Unauthorized
```

### Invalid JWT
```
🔍 [MIDDLEWARE] Session check: { hasUser: false }
❌ [AUTH] No authenticated user: JWT expired
→ Returns 401 Unauthorized
```

### User Not Found
```
✅ [AUTH] User authenticated: user@example.com
❌ [MIDDLEWARE] User profile not found or inactive
→ Returns 401 Unauthorized
```

### Success
```
✅ [AUTH] User authenticated: user@example.com
🔵 [MIDDLEWARE] User data: { email: '...', role: 'agent' }
✅ [MIDDLEWARE] Headers set, forwarding request
→ Request proceeds to API route
```
