import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-client';
import { UserRole } from '../../../../lib/models/user';

export async function GET(request: NextRequest) {
  try {
    // Get user info from middleware
    const userEmail = request.headers.get('x-user-email');
    const userRole = request.headers.get('x-user-role');
    
    if (!userEmail) {
      return NextResponse.json({
        error: 'Authentication required',
        detail: 'User not authenticated'
      }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');

    console.log(`📜 Getting notification history for: ${userEmail}, role: ${userRole}`);

    // Get notification history from Supabase
    let query = getSupabaseAdmin()
      .from('notification_log')
      .select('*')
      .order('sent_at', { ascending: false })
      .limit(limit);

    // Filter by email if not admin
    if (userRole !== UserRole.ADMIN) {
      query = query.eq('email', userEmail);
    }

    const { data: notifications, error } = await query;

    if (error) throw error;

    return NextResponse.json({
      success: true,
      data: notifications || [],
      user_info: {
        role: userRole,
        email: userEmail
      }
    });

  } catch (error) {
    console.error('❌ Error getting notification history:', error);
    return NextResponse.json({
      error: 'Failed to get notification history',
      detail: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
