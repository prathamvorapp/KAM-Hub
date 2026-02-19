import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/api-auth';
import { UserService } from '../../../../lib/services/userService';

const userService = new UserService();

export async function GET(request: NextRequest) {
  try {
    // Authenticate
    const { user, error } = await authenticateRequest(request);
    if (error) return error;
    if (!user) {
      return NextResponse.json({
        success: false,
        error: 'Authentication required'
      }, { status: 401 });
    }

    console.log(`🔍 Getting profile for authenticated user: ${user.email}`);

    // Get user profile from Supabase
    const userProfile = await userService.getUserProfileByEmail(user.email);

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
    console.error(`❌ [User Profile] Error:`, error);
    return NextResponse.json({
      success: false,
      error: 'Failed to get user profile',
      detail: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}
