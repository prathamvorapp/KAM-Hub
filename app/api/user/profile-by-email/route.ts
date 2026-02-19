import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { authenticateRequest, hasRole, unauthorizedResponse } from '@/lib/api-auth';
import { UserService } from '../../../../lib/services/userService';
import { UserRole } from '@/lib/models/user';

const userService = new UserService();

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
        success: false,
        error: 'Email parameter required',
        detail: 'Please provide email query parameter'
      }, { status: 400 });
    }

    const { email } = ProfileByEmailSchema.parse({ email: targetEmail });

    // Authenticate
    const { user, error } = await authenticateRequest(request);
    if (error) return error;
    if (!user) {
      return NextResponse.json({
        success: false,
        error: 'Authentication required'
      }, { status: 401 });
    }

    // Check permissions
    // Allow if:
    // 1. User is requesting their own profile
    // 2. User is an admin
    if (user.email !== email && !hasRole(user, [UserRole.ADMIN])) {
      return unauthorizedResponse('Only admins can view other users profiles');
    }

    console.log(`🔍 Getting profile for email: ${email}`);

    // Get user profile from Supabase
    const userProfile = await userService.getUserProfileByEmail(email);

    if (!userProfile) {
      return NextResponse.json({
        success: false,
        error: 'User profile not found',
        detail: 'User profile not found in system'
      }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      user: userProfile
    });
  } catch (error) {
    console.error(`❌ [User Profile By Email] Error:`, error);
    return NextResponse.json({
      success: false,
      error: 'Failed to get user profile',
      detail: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}
