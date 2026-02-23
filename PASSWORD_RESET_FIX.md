# Password Reset Fix Guide

## Problems Fixed

### 1. Malformed Password Reset URL
Your password reset link was showing: `https://qvgnrdarwsnweizifech.supabase.co/kam-hub.vercel.app#error=...`

### 2. Vercel Build Failures
All API routes were failing with: `Dynamic server usage: Route couldn't be rendered statically because it used cookies`

## Solutions Applied

### 1. Environment Variables
Added `NEXT_PUBLIC_APP_URL` to environment configuration files

### 2. Fixed Static Generation Issues
Added `export const dynamic = 'force-dynamic'` to:
- `lib/supabase-server.ts` - Forces all routes using Supabase to be dynamic
- `lib/api-auth.ts` - Forces all authenticated routes to be dynamic  
- `app/api/user/profile-by-email/route.ts` - Fixes request.url usage

### 3. Enhanced Reset Password Flow
Updated `app/reset-password/page.tsx` to:
- Extract access token from URL hash
- Set Supabase session from the token
- Handle expired/invalid tokens gracefully
- Auto-fill email from session

## Setup Instructions

### Step 1: Update Environment Variables

**Local Development** - Add to `.env.local`:
```env
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

**Production** - Add to Vercel environment variables:
```env
NEXT_PUBLIC_APP_URL=https://kam-hub.vercel.app
```

### Step 2: Configure Supabase Dashboard

1. Go to https://supabase.com/dashboard
2. Select your project: `qvgnrdarwsnweizifech`
3. Navigate to **Authentication** → **URL Configuration**
4. Set **Site URL**: `https://kam-hub.vercel.app`
5. Add **Redirect URLs**:
   - `https://kam-hub.vercel.app/reset-password`
   - `https://kam-hub.vercel.app/*` (wildcard for all routes)
   - `http://localhost:3000/reset-password` (for local dev)
   - `http://localhost:3000/*` (for local dev)

### Step 3: Deploy

1. Commit all changes
2. Push to your repository
3. Vercel will auto-deploy
4. Verify the `NEXT_PUBLIC_APP_URL` environment variable is set in Vercel

## How It Works Now

### Password Reset Flow:

1. User goes to `/forgot-password` and enters email
2. Backend calls `supabase.auth.resetPasswordForEmail(email, { redirectTo: 'https://kam-hub.vercel.app/reset-password' })`
3. Supabase sends email with link: `https://qvgnrdarwsnweizifech.supabase.co/auth/v1/verify?token=...&redirect_to=https://kam-hub.vercel.app/reset-password`
4. User clicks link → Supabase verifies token → Redirects to: `https://kam-hub.vercel.app/reset-password#access_token=...&type=recovery`
5. Reset password page:
   - Extracts `access_token` from URL hash
   - Sets Supabase session
   - Shows password form if valid
   - Shows error + "Request New Link" button if expired
6. User enters new password
7. Password updated via `supabase.auth.updateUser({ password })`
8. User signed out and redirected to login

### Build Process:

- All API routes now marked as dynamic (not statically generated)
- Routes using `cookies()` or `request.url` work correctly
- No more build-time errors

## Testing

### Local Testing:
```bash
# Ensure .env.local has NEXT_PUBLIC_APP_URL
npm run dev

# Test flow:
# 1. Go to http://localhost:3000/forgot-password
# 2. Enter email
# 3. Check email for reset link
# 4. Click link
# 5. Should redirect to localhost with token in URL
# 6. Enter new password
```

### Production Testing:
1. Go to https://kam-hub.vercel.app/forgot-password
2. Enter email
3. Check email for reset link
4. Click link (should redirect to your app, not Supabase URL)
5. Enter new password

## Common Issues & Solutions

### Issue: Still getting Supabase URL in email
**Solution**: 
- Verify `NEXT_PUBLIC_APP_URL` is set in Vercel
- Redeploy after setting the variable
- Check Supabase Dashboard Site URL is correct

### Issue: "Invalid or expired reset link"
**Solution**: 
- Reset links expire after 1 hour (Supabase default)
- Request a new link from `/forgot-password`
- Verify redirect URLs are configured in Supabase Dashboard

### Issue: Build still failing
**Solution**:
- Clear Vercel build cache
- Redeploy from scratch
- Check all files were committed and pushed

### Issue: Password resets but can't login
**Solution**: 
- The code updates both Supabase Auth and your backend
- Check API logs for errors
- Verify user exists in `user_profiles` table

## Security Notes

- Reset links expire after 1 hour (Supabase default)
- Tokens are single-use only
- Password requirements: 8+ chars, uppercase, lowercase, number
- User is signed out after password reset for security
- All API routes require authentication
- Dynamic rendering prevents token leakage in static builds
