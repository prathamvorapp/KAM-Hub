import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest, hasRole, unauthorizedResponse } from '@/lib/api-auth';
import { getSupabaseAdmin } from '@/lib/supabase-server';
import { UserRole } from '@/lib/models/user'; // Import UserRole

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

    // Only allow admins to view all notification targets
    if (!hasRole(user, [UserRole.ADMIN])) {
      return unauthorizedResponse('Access denied - Only Admins can view all notification targets');
    }

    console.log(`🎯 Getting notification targets for: ${user.email}`);

    // Get notification preferences from Supabase
    const { data: preferences, error: queryError } = await getSupabaseAdmin()
      .from('notification_preferences')
      .select('*')
      .eq('email_notifications', true);

    if (queryError) throw queryError;

    return NextResponse.json({
      success: true,
      data: preferences || [],
      total: preferences?.length || 0
    });

  } catch (error) {
    console.error('❌ [Notification Targets] Error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to get notification targets',
      detail: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
