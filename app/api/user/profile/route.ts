import { NextRequest, NextResponse } from 'next/server';
import { UserService } from '../../../../lib/services/userService';

const userService = new UserService();

export async function GET(request: NextRequest) {
  try {
    // Get user email from middleware-set header
    const userEmail = request.headers.get('x-user-email');
    
    if (!userEmail) {
      return NextResponse.json({
        error: 'User email not found in request',
        detail: 'Authentication middleware should set x-user-email header'
      }, { status: 401 });
    }

    console.log(`🔍 Getting profile for authenticated user: ${userEmail}`);

    // Get user profile from Convex
    const userProfile = await userService.getUserProfileByEmail(userEmail);

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
    console.log(`❌ Error getting user profile: ${error}`);
    return NextResponse.json({
      error: 'Failed to get user profile',
      detail: String(error)
    }, { status: 500 });
  }
}