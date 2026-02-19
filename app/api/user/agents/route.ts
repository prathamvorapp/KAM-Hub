import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest, hasRole, unauthorizedResponse } from '@/lib/api-auth';
import { getSupabaseAdmin } from '@/lib/supabase-server';

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

    // Check admin role
    if (!hasRole(user, ['admin'])) {
      return unauthorizedResponse('Access denied - Admin only');
    }

    const supabase = getSupabaseAdmin();

    const { data: agents, error: dbError } = await supabase
      .from('user_profiles')
      .select('*')
      .in('role', ['agent', 'Agent'])
      .eq('is_active', true)
      .order('full_name');

    if (dbError) {
      throw dbError;
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
