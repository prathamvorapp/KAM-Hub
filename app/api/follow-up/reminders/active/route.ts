import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/api-auth';
import { churnService } from '@/lib/services';

// Force dynamic rendering
export const dynamic = 'force-dynamic';
export const revalidate = 0; // Disable caching

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

    console.log(`📊 Getting active follow-ups for user: ${user.email}, fullName: ${user.fullName}, role: ${user.role}`);

    const result = await churnService.getActiveFollowUps(undefined, user);

    const response = {
      success: true,
      data: result
    };

    return NextResponse.json(response, {
      headers: {
        // CRITICAL: Use 'private' for user-specific data to prevent CDN/shared caching
        // This prevents one user's data from being served to another user
        'Cache-Control': 'private, no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      }
    });

  } catch (error) {
    console.error('❌ [Active Follow-ups] Error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to get active follow-ups',
      detail: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}
