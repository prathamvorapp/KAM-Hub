import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-client';

export async function GET(request: NextRequest) {
  try {
    const userEmail = request.headers.get('x-user-email');
    const userRole = request.headers.get('x-user-role');
    
    if (!userEmail) {
      return NextResponse.json({
        error: 'Authentication required'
      }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const team = searchParams.get('team');

    if (!team) {
      return NextResponse.json({
        error: 'team parameter is required'
      }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();

    const { data: teamMembers, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('team_name', team)
      .eq('is_active', true)
      .order('full_name');

    if (error) {
      throw error;
    }

    return NextResponse.json({
      success: true,
      data: teamMembers || []
    });

  } catch (error) {
    console.error('❌ Error getting team members:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to get team members',
      detail: String(error)
    }, { status: 500 });
  }
}
