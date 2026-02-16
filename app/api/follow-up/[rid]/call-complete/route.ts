import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '../../../../../lib/auth-helpers';
import { getSupabaseAdmin } from '@/lib/supabase-client';

export async function POST(request: NextRequest, { params }: { params: Promise<{ rid: string }> }) {
  try {
    const { rid } = await params;
    const user = await getAuthenticatedUser(request);
    
    if (!user) {
      return NextResponse.json({
        success: false,
        error: 'Authentication required'
      }, { status: 401 });
    }

    console.log(`✅ Marking call complete for RID: ${rid}`);

    const { error } = await getSupabaseAdmin()
      .from('churn_records')
      // @ts-expect-error - Supabase type inference issue with update
      .update({
        follow_up_status: 'COMPLETED',
        is_follow_up_active: false,
        follow_up_completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('rid', rid);

    if (error) throw error;

    return NextResponse.json({
      success: true,
      message: 'Call marked as complete'
    });

  } catch (error) {
    console.error('❌ Error marking call complete:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to mark call complete',
      detail: String(error)
    }, { status: 500 });
  }
}
