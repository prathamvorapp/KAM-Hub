import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { userService } from '../../../../lib/services/userService';
import { normalizeRole } from '../../../../lib/utils/roleUtils';

// Validation schema
const ProfileByEmailSchema = z.object({
  email: z.string().email()
});

export async function GET(request: NextRequest) {
  try {
    // Get target email from query params
    const { searchParams } = new URL(request.url);
    const targetEmail = searchParams.get('email');

    if (!targetEmail) {
      return NextResponse.json({
        error: 'Email parameter required',
        detail: 'Please provide email query parameter'
      }, { status: 400 });
    }

    const { email } = ProfileByEmailSchema.parse({ email: targetEmail });

    // Get current user info from middleware (if available)
    const currentUserEmail = request.headers.get('x-user-email');
    const currentUserRole = request.headers.get('x-user-role');
    
    // If no middleware headers, try to get from session cookie
    let authenticatedEmail = currentUserEmail;
    let authenticatedRole = currentUserRole;
    
    if (!authenticatedEmail) {
      const userSession = request.cookies.get('user-session');
      if (userSession) {
        try {
          const userData = JSON.parse(userSession.value);
          authenticatedEmail = userData.email;
          authenticatedRole = userData.role;
        } catch (e) {
          // Session parsing failed
        }
      }
    }

    // Check permissions
    // Allow if:
    // 1. User is requesting their own profile
    // 2. User is an admin
    // 3. No authentication (for initial auth flow)
    if (authenticatedEmail && authenticatedEmail !== email && normalizeRole(authenticatedRole) !== 'admin') {
      return NextResponse.json({
        error: 'Insufficient permissions',
        detail: 'Only admins can view other users profiles'
      }, { status: 403 });
    }

    console.log(`🔍 Getting profile for email: ${email}`);

    // Get user profile from Convex
    const userProfile = await userService.getUserProfileByEmail(email);

    if (!userProfile) {
      return NextResponse.json({
        error: 'User profile not found',
        detail: 'User profile not found in system'
      }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      user: userProfile
    });
  } catch (error) {
    console.log(`❌ Error getting user profile by email: ${error}`);
    return NextResponse.json({
      error: 'Failed to get user profile',
      detail: String(error)
    }, { status: 500 });
  }
}