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

    console.log(`📧 Marking mail sent for RID: ${rid}`);

    const { error } = await getSupabaseAdmin()
      .from('churn_records')
      // @ts-expect-error - Supabase type inference issue with update
      .update({
        mail_sent: true,
        mail_sent_confirmation: true,
        updated_at: new Date().toISOString()
      })
      .eq('rid', rid);

    if (error) throw error;

    return NextResponse.json({
      success: true,
      message: 'Mail marked as sent'
    });

  } catch (error) {
    console.error('❌ Error marking mail sent:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to mark mail sent',
      detail: String(error)
    }, { status: 500 });
  }
}
