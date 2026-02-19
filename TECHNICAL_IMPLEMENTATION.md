# Technical Implementation Details

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                        Browser                               │
│  ┌──────────────────────────────────────────────────────┐  │
│  │              AuthProvider (Context)                   │  │
│  │  - Manages global auth state                         │  │
│  │  - Single Supabase client instance                   │  │
│  │  - Memoized user/session objects                     │  │
│  │  - Prevents concurrent operations                    │  │
│  └──────────────────────────────────────────────────────┘  │
│                           │                                  │
│                           ▼                                  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │           Custom Hooks (useChurnData, etc)           │  │
│  │  - Consume auth context                              │  │
│  │  - Stable dependencies                               │  │
│  │  - Request deduplication                             │  │
│  │  - Proper cleanup                                    │  │
│  └──────────────────────────────────────────────────────┘  │
│                           │                                  │
│                           ▼                                  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │              Page Components                          │  │
│  │  - Conditional rendering                             │  │
│  │  - Loading gates                                     │  │
│  │  - Error boundaries                                  │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                Client-Side Route Guards                      │
│  - RouteGuard component                                      │
│  - Authentication checks                                     │
│  - Auto redirects                                            │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                   API Routes (Server)                        │
│  - Server-side Supabase client                              │
│  - Authentication via requireAuth()                         │
│  - RLS policy enforcement                                   │
│  - Data validation                                          │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                  Supabase (Backend)                          │
│  - Authentication                                            │
│  - Database (PostgreSQL)                                    │
│  - Row Level Security                                       │
└─────────────────────────────────────────────────────────────┘
```

## Key Patterns Implemented

### 1. Singleton Pattern (Supabase Client)

```typescript
// Single instance shared across all components
let supabaseInstance: ReturnType<typeof createBrowserClient> | null = null;

function getSupabaseClient() {
  if (!supabaseInstance) {
    supabaseInstance = createBrowserClient();
  }
  return supabaseInstance;
}
```

**Why**: Prevents multiple WebSocket connections and auth listeners

### 2. Request Deduplication Pattern

```typescript
const executingRef = useRef(false);

const executeApiCall = useCallback(async () => {
  if (executingRef.current) {
    console.log('⏳ Request already in progress, skipping...')
    return
  }
  
  executingRef.current = true
  try {
    // Make API call
  } finally {
    executingRef.current = false
  }
}, [])
```

**Why**: Prevents duplicate concurrent requests to same endpoint

### 3. Stable Dependencies Pattern

```typescript
// ❌ BAD - Creates new object on every render
const { user, userProfile } = useAuth()
useEffect(() => {
  fetchData()
}, [user, userProfile]) // Infinite loop!

// ✅ GOOD - Stable primitive value
const userId = useMemo(() => user?.id, [user?.id])
useEffect(() => {
  fetchData()
}, [userId]) // Only changes when ID actually changes
```

**Why**: Prevents infinite loops in useEffect

### 4. Mounted Ref Pattern

```typescript
const mountedRef = useRef(true)

useEffect(() => {
  const fetchData = async () => {
    const data = await api.fetch()
    if (mountedRef.current) {
      setState(data) // Only update if still mounted
    }
  }
  
  fetchData()
  
  return () => {
    mountedRef.current = false
  }
}, [])
```

**Why**: Prevents "Can't perform a React state update on an unmounted component" warnings

### 5. Memoization Pattern

```typescript
// Memoize expensive computations
const value = useMemo(() => ({
  user,
  userProfile,
  session,
  loading,
  signIn,
  signOut,
  refreshProfile
}), [user, userProfile, session, loading, signIn, signOut, refreshProfile])

// Memoize callbacks
const signIn = useCallback(async (email, password) => {
  // Implementation
}, [supabase, loadUserProfile])
```

**Why**: Prevents unnecessary re-renders of child components

## State Management Flow

### Login Flow

```
User enters credentials
        │
        ▼
signIn() called
        │
        ▼
Supabase.auth.signInWithPassword()
        │
        ▼
Session created
        │
        ▼
loadUserProfile() called
        │
        ▼
Fetch from user_profiles table
        │
        ▼
Update context state:
  - user
  - userProfile
  - session
        │
        ▼
onAuthStateChange fires (SIGNED_IN)
        │
        ▼
Components re-render with auth data
        │
        ▼
Redirect to dashboard
        │
        ▼
Dashboard fetches data (ONCE)
```

### Logout Flow

```
User clicks logout
        │
        ▼
signOut() called
        │
        ▼
Clear local state IMMEDIATELY
  - user = null
  - userProfile = null
  - session = null
        │
        ▼
All API calls stop (no user/session)
        │
        ▼
Supabase.auth.signOut()
        │
        ▼
onAuthStateChange fires (SIGNED_OUT)
        │
        ▼
Redirect to login
```

### Data Fetching Flow

```
Component mounts
        │
        ▼
useChurnData() hook initializes
        │
        ▼
Check: user && session?
        │
    ┌───┴───┐
    NO      YES
    │       │
    ▼       ▼
  Return  Check: already fetching?
          │
      ┌───┴───┐
      YES     NO
      │       │
      ▼       ▼
    Skip   Set fetchingRef = true
            │
            ▼
          Fetch data
            │
            ▼
          Update state
            │
            ▼
          Set fetchingRef = false
```

## Performance Optimizations

### 1. Lazy Loading
- Auth context only loads profile when needed
- Components don't render until auth is ready

### 2. Request Caching
- Supabase client caches session
- No repeated session fetches

### 3. Debouncing
- Search inputs debounced (500ms)
- Prevents excessive API calls

### 4. Memoization
- User objects memoized
- Callbacks memoized
- Context value memoized

### 5. Concurrent Request Prevention
- Only one request per endpoint at a time
- Duplicate requests skipped

## Security Considerations

### 1. Route Protection
```typescript
// Client-side route guard
<RouteGuard requireAuth={true}>
  {/* Protected content */}
</RouteGuard>
```

### 2. API Authentication
```typescript
// API route authentication
const authResult = await requireAuth(request);
if (authResult instanceof NextResponse) return authResult;
const { user } = authResult;
```

### 3. Row Level Security (RLS)
- Database enforces access control
- Users can only see their own data (or team data)

### 3. Session Validation
- Session checked on every request
- Automatic token refresh
- Expired sessions redirected to login

### 4. CSRF Protection
- Supabase handles CSRF tokens
- Cookies are httpOnly and secure

## Error Handling Strategy

### 1. Network Errors
```typescript
try {
  const response = await fetch(url)
  if (!response.ok) throw new Error(`HTTP ${response.status}`)
} catch (error) {
  setError(error.message)
  // Show user-friendly error message
}
```

### 2. Auth Errors
```typescript
if (error || !data.user) {
  return { 
    error: error?.message || 'Authentication failed',
    success: false 
  }
}
```

### 3. Timeout Handling
```typescript
const controller = new AbortController()
const timeoutId = setTimeout(() => controller.abort(), 30000)

try {
  const response = await fetch(url, { signal: controller.signal })
} catch (error) {
  if (error.name === 'AbortError') {
    throw new Error('Request timeout')
  }
}
```

## Testing Strategy

### Unit Tests (Recommended)
```typescript
describe('AuthContext', () => {
  it('should prevent concurrent profile loads', async () => {
    // Test loadingProfileRef prevents duplicates
  })
  
  it('should cleanup on unmount', () => {
    // Test mountedRef prevents state updates
  })
})
```

### Integration Tests (Recommended)
```typescript
describe('Login Flow', () => {
  it('should login and redirect to dashboard', async () => {
    // Test full login flow
  })
  
  it('should fetch data only once after login', async () => {
    // Test API call deduplication
  })
})
```

### E2E Tests (Recommended)
```typescript
describe('User Journey', () => {
  it('should complete full auth cycle', async () => {
    // Login -> Dashboard -> Logout
  })
})
```

## Monitoring & Debugging

### Console Logs
All operations logged with emojis for easy filtering:
```typescript
console.log('🔐 [Login] Starting...')  // Auth operations
console.log('🔄 [useChurnData] Fetching...')  // Data fetching
console.log('✅ [Visits] Success')  // Success states
console.log('❌ [Dashboard] Error:', error)  // Errors
```

### Network Tab
Monitor for:
- Duplicate requests (should be none)
- Failed requests (check error handling)
- Slow requests (optimize if needed)

### React DevTools
Check for:
- Unnecessary re-renders
- Component mount/unmount cycles
- State updates

## Migration Guide (If Needed)

### From Old Auth to New Auth

1. **Update imports**
```typescript
// Old
import { useAuth } from '@/contexts/AuthContext'
const { user } = useAuth()

// New (same, but now includes session)
import { useAuth } from '@/contexts/AuthContext'
const { user, session } = useAuth()
```

2. **Update API calls**
```typescript
// Old
if (!user) return

// New (more robust)
if (!user || !session) return
```

3. **Update dependencies**
```typescript
// Old
useEffect(() => {
  fetchData()
}, [user, userProfile])

// New
const userId = useMemo(() => user?.id, [user?.id])
useEffect(() => {
  fetchData()
}, [userId])
```

## Best Practices Going Forward

1. ✅ Always use `useAuth()` for auth state
2. ✅ Use stable dependencies in useEffect
3. ✅ Add request deduplication for API calls
4. ✅ Use mounted refs for async operations
5. ✅ Memoize expensive computations
6. ✅ Add proper error handling
7. ✅ Log important operations
8. ✅ Test auth flows thoroughly

## Common Pitfalls to Avoid

1. ❌ Don't create multiple Supabase clients
2. ❌ Don't use user object directly in dependencies
3. ❌ Don't forget cleanup in useEffect
4. ❌ Don't make API calls without auth guards
5. ❌ Don't ignore TypeScript errors
6. ❌ Don't skip error handling
7. ❌ Don't forget to test logout flow

## Resources

- [Supabase Auth Docs](https://supabase.com/docs/guides/auth)
- [Next.js App Router](https://nextjs.org/docs/app/building-your-application/routing)
- [React Hooks Best Practices](https://react.dev/reference/react)
- [TypeScript Best Practices](https://www.typescriptlang.org/docs/handbook/declaration-files/do-s-and-don-ts.html)
