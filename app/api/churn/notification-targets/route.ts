import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-client';

export async function GET(request: NextRequest) {
  try {
    // Get user info from middleware
    const userEmail = request.headers.get('x-user-email');
    
    if (!userEmail) {
      return NextResponse.json({
        error: 'Authentication required',
        detail: 'User not authenticated'
      }, { status: 401 });
    }

    console.log(`🎯 Getting notification targets for: ${userEmail}`);

    // Get notification preferences from Supabase
    const { data: preferences, error } = await getSupabaseAdmin()
      .from('notification_preferences')
      .select('*')
      .eq('email_notifications', true);

    if (error) throw error;

    return NextResponse.json({
      success: true,
      data: preferences || [],
      total: preferences?.length || 0
    });

  } catch (error) {
    console.error('❌ Error getting notification targets:', error);
    return NextResponse.json({
      error: 'Failed to get notification targets',
      detail: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
