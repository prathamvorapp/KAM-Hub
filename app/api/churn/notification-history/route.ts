import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest, hasRole } from '@/lib/api-auth';
import { getSupabaseAdmin } from '@/lib/supabase-server';
import { UserRole } from '@/lib/models/user';

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

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');

    console.log(`📜 Getting notification history for: ${user.email}, role: ${user.role}`);

    // Get notification history from Supabase
    let query = getSupabaseAdmin()
      .from('notification_log')
      .select('*')
      .order('sent_at', { ascending: false })
      .limit(limit);

    // Filter by email if not admin
    if (!hasRole(user, [UserRole.ADMIN])) {
      query = query.eq('email', user.email);
    }

    const { data: notifications, error: queryError } = await query;

    if (queryError) throw queryError;

    return NextResponse.json({
      success: true,
      data: notifications || [],
      user_info: {
        role: user.role,
        email: user.email
      }
    });

  } catch (error) {
    console.error('❌ [Notification History] Error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to get notification history',
      detail: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
