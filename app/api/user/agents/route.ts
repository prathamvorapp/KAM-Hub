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

    // Only admins can get all agents
    if (userRole !== 'Admin') {
      return NextResponse.json({
        error: 'Access denied - Admin only'
      }, { status: 403 });
    }

    const supabase = getSupabaseAdmin();

    const { data: agents, error } = await supabase
      .from('user_profiles')
      .select('*')
      .in('role', ['agent', 'Agent'])
      .eq('is_active', true)
      .order('full_name');

    if (error) {
      throw error;
    }

    return NextResponse.json({
      success: true,
      data: agents || []
    });

  } catch (error) {
    console.error('❌ Error getting agents:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to get agents',
      detail: String(error)
    }, { status: 500 });
  }
}
