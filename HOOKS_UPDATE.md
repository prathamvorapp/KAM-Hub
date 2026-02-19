# Hooks Update - Remove localStorage Token Dependency

## Changes Made

Updated `hooks/useChurnData.ts` to remove dependency on localStorage tokens and use cookie-based authentication instead.

### Before:
```typescript
// ❌ Wrong - trying to get token from localStorage
const token = localStorage.getItem('auth_token')
if (!token) {
  setError('No access token available')
  return
}

const response = await fetch(`/api/churn?${params}`, {
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  }
})
```

### After:
```typescript
// ✅ Correct - cookies sent automatically
const response = await fetch(`/api/churn?${params}`, {
  headers: {
    'Content-Type': 'application/json'
  },
  credentials: 'include' // Ensure cookies are sent
})
```

## Why This Matters

With Supabase SSR authentication:
- Tokens are stored in HTTP-only cookies
- Cookies are sent automatically with every request
- No need to manually add Authorization headers
- More secure (cookies can't be accessed by JavaScript)

## Testing

After this change:
1. Refresh the browser
2. Dashboard should load data without "No access token available" error
3. API calls should work with cookie-based auth
