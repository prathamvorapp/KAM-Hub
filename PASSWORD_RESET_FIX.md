# Password Reset Fix Guide

## Problem
Your password reset link was malformed: `https://qvgnrdarwsnweizifech.supabase.co/kam-hub.vercel.app#error=...`

This happened because:
1. Missing `NEXT_PUBLIC_APP_URL` environment variable
2. Supabase using default redirect URL
3. Reset password page not handling Supabase's token-based flow

## Solution Applied

### 1. Environment Variables Updated
Added `NEXT_PUBLIC_APP_URL` to both `.env.example` and `.env.local.example`

### 2. Reset Password Page Enhanced
- Now checks for valid Supabase session token from the reset link
- Handles expired/invalid token errors from URL parameters
- Uses Supabase client to update password directly
- Auto-fills email from the session
- Shows appropriate error messages for expired links

## Setup Instructions

### Step 1: Update Your Environment Files

Add this to your `.env.local` file:
```env
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

For production (`.env` or Vercel environment variables):
```env
NEXT_PUBLIC_APP_URL=https://kam-hub.vercel.app
```

### Step 2: Configure Supabase Dashboard

1. Go to your Supabase Dashboard: https://supabase.com/dashboard
2. Select your project
3. Navigate to **Authentication** → **URL Configuration**
4. Set **Site URL** to: `https://kam-hub.vercel.app`
5. Add to **Redirect URLs**:
   - `https://kam-hub.vercel.app/reset-password`
   - `http://localhost:3000/reset-password` (for local dev)

### Step 3: Deploy Changes

1. Commit the updated code
2. Push to your repository
3. Ensure Vercel has the `NEXT_PUBLIC_APP_URL` environment variable set
4. Redeploy your application

## How It Works Now

1. User requests password reset from `/forgot-password`
2. Supabase sends email with magic link to: `https://kam-hub.vercel.app/reset-password#access_token=...`
3. Reset password page:
   - Extracts the token from URL
   - Validates the session
   - Shows password form if valid
   - Shows error + "Request New Link" button if expired
4. User enters new password
5. Password updated via Supabase Auth
6. User redirected to login

## Testing

### Local Testing
```bash
# Make sure you have NEXT_PUBLIC_APP_URL in .env.local
npm run dev

# Test the flow:
# 1. Go to /forgot-password
# 2. Enter email
# 3. Check email for reset link
# 4. Click link (should redirect to /reset-password with token)
# 5. Enter new password
```

### Production Testing
Same flow but using your production URL: `https://kam-hub.vercel.app`

## Common Issues

### Issue: Still getting Supabase URL in email
**Solution**: Make sure you've updated the Site URL in Supabase Dashboard and redeployed

### Issue: "Invalid or expired reset link"
**Solution**: 
- Reset links expire after 1 hour by default
- Request a new reset link from `/forgot-password`
- Check that redirect URLs are configured in Supabase

### Issue: Password resets but can't login
**Solution**: The code now updates both Supabase Auth and your backend. If issues persist, check the API logs.

## Security Notes

- Reset links expire after 1 hour (Supabase default)
- Tokens are single-use
- Password requirements enforced (8+ chars, uppercase, lowercase, number)
- User is signed out after password reset for security
