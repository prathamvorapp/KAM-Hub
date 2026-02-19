import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest, canAccessResource, unauthorizedResponse } from '@/lib/api-auth';
import { getSupabaseAdmin } from '@/lib/supabase-server';

export async function POST(request: NextRequest, { params }: { params: Promise<{ rid: string }> }) {
  try {
    const { rid } = await params;
    
    // Authenticate
    const { user, error } = await authenticateRequest(request);
    if (error) return error;
    if (!user) {
      return NextResponse.json({
        success: false,
        error: 'Authentication required'
      }, { status: 401 });
    }

    // Fetch the record to get its owner and team for authorization
    const { data: record, error: fetchError } = await getSupabaseAdmin()
      .from('churn_records')
      .select('kam, team_name') // Select owner and team fields
      .eq('rid', rid)
      .single();

    if (fetchError || !record) {
      return NextResponse.json({
        success: false,
        error: 'Churn record not found',
        detail: fetchError?.message || 'Record not found'
      }, { status: 404 });
    }

    // Authorization check
    // Assuming 'kam' field in churn_records stores the email of the KAM
    const authCheck = canAccessResource(user, record.kam, record.team_name); 
    if (!authCheck) {
      return unauthorizedResponse('You do not have permission to mark mail as sent for this churn record.');
    }

    console.log(`📧 Marking mail sent for RID: ${rid}`);

    const { error: updateError } = await getSupabaseAdmin()
      .from('churn_records')
      // @ts-expect-error - Supabase type inference issue with update
      .update({
        mail_sent: true,
        mail_sent_confirmation: true,
        updated_at: new Date().toISOString()
      })
      .eq('rid', rid);

    if (updateError) throw updateError;

    return NextResponse.json({
      success: true,
      message: 'Mail marked as sent'
    });

  } catch (error) {
    console.error('❌ [Mark Mail Sent] Error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to mark mail sent',
      detail: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}
