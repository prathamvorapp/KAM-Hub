# 🛠️ IMPLEMENTATION GUIDE - Critical Fixes
## Step-by-Step Instructions for Development Team

---

## 🎯 PHASE 1: CRITICAL SECURITY FIXES (WEEK 1)

### Fix 1: API Authentication Middleware (Days 1-2)

#### Step 1.1: Create Authentication Middleware

Create `lib/api-auth.ts`:

```typescript
import { createServerSupabaseClient } from './supabase-server';
import { NextRequest, NextResponse } from 'next/server';

export interface AuthenticatedUser {
  id: string;
  email: string;
  full_name: string;
  role: string;
  team_name?: string;
  permissions: string[];
}

export interface AuthResult {
  user: AuthenticatedUser;
  session: any;
}

/**
 * Require authentication for API routes
 * Returns user profile or error response
 */
export async function requireAuth(request: NextRequest): Promise<AuthResult | NextResponse> {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError || !session) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized - Please login' },
        { status: 401 }
      );
    }
    
    // Fetch user profile
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('auth_id', session.user.id)
      .eq('is_active', true)
      .single();
      
    if (profileError || !profile) {
      return NextResponse.json(
        { success: false, error: 'User profile not found or inactive' },
        { status: 401 }
      );
    }
    
    // Get permissions based on role
    const permissions = getPermissionsForRole(profile.role);
    
    const user: AuthenticatedUser = {
      id: session.user.id,
      email: profile.email,
      full_name: profile.full_name,
      role: profile.role,
      team_name: profile.team_name,
      permissions
    };
    
    return { user, session };
  } catch (error) {
    console.error('Auth error:', error);
    return NextResponse.json(
      { success: false, error: 'Authentication failed' },
      { status: 500 }
    );
  }
}

/**
 * Require specific role for API routes
 */
export async function requireRole(
  request: NextRequest,
  allowedRoles: string[]
): Promise<AuthResult | NextResponse> {
  const authResult = await requireAuth(request);
  
  // If error response, return it
  if (authResult instanceof NextResponse) {
    return authResult;
  }
  
  // Check if user has required role
  if (!allowedRoles.includes(authResult.user.role)) {
    return NextResponse.json(
      { 
        success: false, 
        error: `Forbidden - Requires one of: ${allowedRoles.join(', ')}` 
      },
      { status: 403 }
    );
  }
  
  return authResult;
}

/**
 * Get permissions based on role
 */
function getPermissionsForRole(role: string): string[] {
  switch (role.toLowerCase()) {
    case 'admin':
      return ['read_all', 'write_all', 'delete_all', 'manage_users'];
    case 'team_lead':
    case 'team lead':
      return ['read_team', 'write_team', 'read_own', 'write_own', 'approve_mom'];
    case 'agent':
      return ['read_own', 'write_own'];
    default:
      return ['read_own'];
  }
}

/**
 * Filter data based on user role
 */
export function applyRoleFilter(user: AuthenticatedUser, query: any) {
  switch (user.role.toLowerCase()) {
    case 'admin':
      // Admin sees everything - no filter
      return query;
      
    case 'team_lead':
    case 'team lead':
      // Team Lead sees their team
      if (user.team_name) {
        return query.eq('team_name', user.team_name);
      }
      return query.eq('agent_email', user.email);
      
    case 'agent':
      // Agent sees only their own data
      return query.eq('agent_email', user.email);
      
    default:
      // Default: only own data
      return query.eq('agent_email', user.email);
  }
}
```

#### Step 1.2: Update API Routes

Example for `/api/churn/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, applyRoleFilter } from '@/lib/api-auth';
import { createServerSupabaseClient } from '@/lib/supabase-server';

export async function GET(request: NextRequest) {
  // 1. Require authentication
  const authResult = await requireAuth(request);
  if (authResult instanceof NextResponse) return authResult;
  
  const { user } = authResult;
  
  try {
    // 2. Get query parameters
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const search = searchParams.get('search') || '';
    const filter = searchParams.get('filter') || 'all';
    
    // 3. Create Supabase client
    const supabase = await createServerSupabaseClient();
    
    // 4. Build query with role-based filtering
    let query = supabase
      .from('churn_data')
      .select('*', { count: 'exact' });
    
    // Apply role-based filter
    query = applyRoleFilter(user, query);
    
    // Apply search if provided
    if (search) {
      query = query.or(`restaurant_name.ilike.%${search}%,rid.ilike.%${search}%,kam.ilike.%${search}%`);
    }
    
    // Apply pagination
    const from = (page - 1) * limit;
    const to = from + limit - 1;
    query = query.range(from, to);
    
    // Execute query
    const { data, error, count } = await query;
    
    if (error) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }
    
    // 5. Return standardized response
    return NextResponse.json({
      success: true,
      data: data || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
        hasNext: to < (count || 0) - 1,
        hasPrev: page > 1
      }
    });
    
  } catch (error: any) {
    console.error('Error fetching churn data:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch churn data' },
      { status: 500 }
    );
  }
}
```

#### Step 1.3: Update ALL API Routes

Apply the same pattern to:
- ✅ `/api/churn/**/*.ts`
- ✅ `/api/data/**/*.ts`
- ✅ `/api/admin/**/*.ts` (use `requireRole`)
- ✅ `/api/churn-upload/**/*.ts`

For admin routes, use:
```typescript
const authResult = await requireRole(request, ['admin']);
if (authResult instanceof NextResponse) return authResult;
```

For team lead routes (approvals):
```typescript
const authResult = await requireRole(request, ['admin', 'team_lead', 'Team Lead']);
if (authResult instanceof NextResponse) return authResult;
```

---

### Fix 2: Fix Authentication State Management (Day 3)

#### Step 2.1: Update `app/page.tsx`

Replace entire file with:

```typescript
'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function HomePage() {
  const router = useRouter()

  useEffect(() => {
    // Simply redirect to dashboard
    // Middleware will handle authentication check
    router.push('/dashboard')
  }, [router])

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto"></div>
        <p className="mt-4 text-white">Redirecting...</p>
      </div>
    </div>
  )
}
```

#### Step 2.2: Verify Middleware

Ensure `middleware.ts` is correct:

```typescript
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          response = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Refresh session if expired
  const { data: { session } } = await supabase.auth.getSession()

  const isAuthPage = request.nextUrl.pathname.startsWith('/login') || 
                     request.nextUrl.pathname.startsWith('/forgot-password') ||
                     request.nextUrl.pathname.startsWith('/reset-password')
  
  const isProtectedPage = request.nextUrl.pathname.startsWith('/dashboard') ||
                          request.nextUrl.pathname.startsWith('/admin')

  // Redirect to login if accessing protected route without session
  if (isProtectedPage && !session) {
    const redirectUrl = new URL('/login', request.url)
    redirectUrl.searchParams.set('redirect', request.nextUrl.pathname)
    return NextResponse.redirect(redirectUrl)
  }

  // Redirect to dashboard if accessing auth page with valid session
  if (isAuthPage && session) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
```

---

### Fix 3: Fix Logout Flow (Day 4)

#### Step 3.1: Update `contexts/AuthContext.tsx`

Replace the `signOut` function:

```typescript
const signOut = useCallback(async () => {
  try {
    console.log('👋 Signing out...')
    
    // 1. Sign out from Supabase FIRST (this clears cookies)
    await supabase.auth.signOut()
    
    // 2. Clear all local state
    setUser(null)
    setUserProfile(null)
    setSession(null)
    
    // 3. Clear any browser storage
    if (typeof window !== 'undefined') {
      try {
        localStorage.clear()
        sessionStorage.clear()
      } catch (e) {
        console.warn('Could not clear storage:', e)
      }
    }
    
    // 4. Force hard redirect to login (clears all React state)
    window.location.href = '/login'
    
  } catch (error) {
    console.error('❌ Sign out error:', error)
    
    // Force clear and redirect even on error
    setUser(null)
    setUserProfile(null)
    setSession(null)
    
    if (typeof window !== 'undefined') {
      window.location.href = '/login'
    }
  }
}, [supabase])
```

#### Step 3.2: Update Navbar Logout Button

In `components/Layout/Navbar.tsx`:

```typescript
const handleLogout = async () => {
  try {
    setLoading(true)
    await signOut()
    // No need for router.push - signOut handles redirect
  } catch (error) {
    console.error('Logout failed:', error)
    // Force redirect anyway
    window.location.href = '/login'
  }
}
```

---

### Fix 4: Service Role Key Security (Day 5)

#### Step 4.1: Rotate Service Role Key

1. Go to Supabase Dashboard
2. Navigate to Settings → API
3. Click "Reset" on Service Role Key
4. Copy new key
5. Update `.env.local` (NOT `.env.local.example`)

#### Step 4.2: Update `.env.local.example`

```env
# Local Development Environment Variables
# Copy this file to .env.local and fill in your actual values

# JWT Configuration
JWT_SECRET=your-dev-jwt-secret-change-this
SUPABASE_JWT_SECRET=your-supabase-jwt-secret

# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# ⚠️ NEVER COMMIT SERVICE ROLE KEY
# Service role key should ONLY be in .env.local (gitignored)
# SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here

# Google Sheets Configuration (Optional)
GOOGLE_SHEETS_CREDENTIALS_FILE=./Google_Sheet.json
ROLE_MAPPING_SHEET_ID=your-sheet-id
DATA_SHEET_ID=your-sheet-id

# Cache Configuration
CACHE_DURATION_SECONDS=300
USER_PROFILE_CACHE_SECONDS=300
SHEETS_CACHE_SECONDS=60

# Application Configuration
NODE_ENV=development
```

#### Step 4.3: Verify `.gitignore`

Ensure these are in `.gitignore`:

```
.env.local
.env*.local
.env.production
```

#### Step 4.4: Audit Git History

```bash
# Check if service key was ever committed
git log -p --all -S "SUPABASE_SERVICE_ROLE_KEY"

# If found, consider using git-filter-repo to remove
# Or rotate the key immediately
```

---

## 🎯 PHASE 2: MAJOR ISSUES (WEEK 2)

### Fix 5: Standardize API Responses (Days 1-2)

#### Step 5.1: Create Response Types

Create `lib/api-types.ts`:

```typescript
export interface APIResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  pagination?: PaginationInfo;
}

export interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface ErrorResponse {
  success: false;
  error: string;
  code?: string;
  details?: any;
}

export interface SuccessResponse<T> {
  success: true;
  data: T;
  message?: string;
}

// Helper functions
export function successResponse<T>(data: T, message?: string): SuccessResponse<T> {
  return {
    success: true,
    data,
    ...(message && { message })
  };
}

export function errorResponse(error: string, code?: string, details?: any): ErrorResponse {
  return {
    success: false,
    error,
    ...(code && { code }),
    ...(details && { details })
  };
}

export function paginatedResponse<T>(
  data: T[],
  page: number,
  limit: number,
  total: number
): APIResponse<T[]> {
  return {
    success: true,
    data,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      hasNext: page * limit < total,
      hasPrev: page > 1
    }
  };
}
```

#### Step 5.2: Update All API Routes

Example:

```typescript
// Before
return NextResponse.json({ data: result });

// After
import { successResponse, paginatedResponse } from '@/lib/api-types';

return NextResponse.json(
  paginatedResponse(result, page, limit, total)
);
```

---

### Fix 6: Add Request Timeouts (Day 3)

#### Step 6.1: Create Fetch Wrapper

Create `lib/fetch-with-timeout.ts`:

```typescript
export class TimeoutError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TimeoutError';
  }
}

export async function fetchWithTimeout(
  url: string,
  options: RequestInit = {},
  timeout = 10000
): Promise<Response> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    });
    clearTimeout(id);
    return response;
  } catch (error: any) {
    clearTimeout(id);
    if (error.name === 'AbortError') {
      throw new TimeoutError(`Request timeout after ${timeout}ms`);
    }
    throw error;
  }
}

// Usage in components
try {
  const response = await fetchWithTimeout('/api/churn', {
    method: 'GET',
    credentials: 'include'
  }, 10000);
  
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }
  
  const data = await response.json();
  // Handle data
} catch (error) {
  if (error instanceof TimeoutError) {
    alert('Request timed out. Please try again.');
  } else {
    alert('An error occurred. Please try again.');
  }
}
```

---

### Fix 7: Optimize Churn Page API Calls (Days 4-5)

#### Step 7.1: Update Backend to Return All Stats

In `/api/churn/route.ts`:

```typescript
export async function GET(request: NextRequest) {
  const authResult = await requireAuth(request);
  if (authResult instanceof NextResponse) return authResult;
  
  const { user } = authResult;
  const { searchParams } = new URL(request.url);
  const search = searchParams.get('search') || '';
  
  // Get all data with role filter
  const supabase = await createServerSupabaseClient();
  let query = supabase.from('churn_data').select('*', { count: 'exact' });
  query = applyRoleFilter(user, query);
  
  if (search) {
    query = query.or(`restaurant_name.ilike.%${search}%,rid.ilike.%${search}%`);
  }
  
  const { data, error, count } = await query;
  
  if (error) {
    return NextResponse.json(errorResponse(error.message), { status: 500 });
  }
  
  // Calculate categorization on backend
  const now = new Date();
  const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
  
  const categorization = {
    newCount: 0,
    overdue: 0,
    followUps: 0,
    completed: 0
  };
  
  data?.forEach(record => {
    const churnReason = record.churn_reason || '';
    const recordDate = new Date(record.date);
    
    if (isCompletedReason(churnReason)) {
      categorization.completed++;
    } else if (recordDate >= threeDaysAgo && isNoAgentResponse(churnReason)) {
      categorization.newCount++;
    } else if (recordDate < threeDaysAgo && isNoAgentResponse(churnReason)) {
      categorization.overdue++;
    } else if (!isNoAgentResponse(churnReason)) {
      categorization.followUps++;
    }
  });
  
  return NextResponse.json({
    success: true,
    data: data || [],
    categorization,
    total: count || 0
  });
}
```

#### Step 7.2: Update Frontend

In `app/dashboard/churn/page.tsx`:

```typescript
// Remove the 4 separate API calls
// Use single call that returns categorization

const loadData = async () => {
  const response = await fetchWithTimeout(
    `/api/churn?search=${searchTerm}`,
    { credentials: 'include' },
    10000
  );
  
  const result = await response.json();
  
  setRecords(result.data);
  setPagination({
    ...pagination,
    categorization: result.categorization,
    total: result.total
  });
};
```

---

## 🧪 TESTING CHECKLIST

### After Each Fix

- [ ] Test with Agent account
- [ ] Test with Team Lead account
- [ ] Test with Admin account
- [ ] Test logout flow
- [ ] Test API directly with curl/Postman
- [ ] Check browser console for errors
- [ ] Verify no console.log in production

### Security Testing

```bash
# Test API without authentication
curl http://localhost:3022/api/churn

# Should return 401 Unauthorized

# Test with wrong role
# Login as Agent, then try:
curl http://localhost:3022/api/admin/fix-churn-statuses \
  -H "Cookie: sb-access-token=..." \
  -X POST

# Should return 403 Forbidden
```

---

## 📝 DEPLOYMENT CHECKLIST

### Before Deploying to Production

- [ ] All Phase 1 fixes completed
- [ ] Service role key rotated
- [ ] All API routes have authentication
- [ ] Role-based access verified
- [ ] Logout flow tested
- [ ] Error boundaries added
- [ ] Request timeouts implemented
- [ ] API responses standardized
- [ ] Performance optimizations done
- [ ] Security audit passed
- [ ] Load testing completed
- [ ] Monitoring set up
- [ ] Error tracking configured (Sentry)
- [ ] Backup strategy in place
- [ ] Rollback plan documented

---

## 🆘 TROUBLESHOOTING

### Issue: "Unauthorized" errors after implementing auth

**Solution:** Check that cookies are being sent:
```typescript
fetch('/api/churn', {
  credentials: 'include' // ← Must include this
})
```

### Issue: Infinite redirects

**Solution:** Check middleware matcher config and ensure auth pages are excluded

### Issue: Session not persisting

**Solution:** Verify Supabase cookie configuration in middleware

### Issue: Role check failing

**Solution:** Verify role values match exactly (case-sensitive)

---

## 📞 SUPPORT

If you encounter issues during implementation:

1. Check the error logs
2. Verify environment variables
3. Test with Postman/curl
4. Review Supabase dashboard logs
5. Check browser network tab
6. Consult this guide

---

**Last Updated:** February 18, 2026  
**Version:** 1.0  
**Status:** Ready for Implementation
