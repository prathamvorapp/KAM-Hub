import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-server';
import { isCompletedReason } from '@/lib/constants/churnReasons';
import { authenticateRequest, hasRole, unauthorizedResponse } from '@/lib/api-auth';
import { UserRole } from '@/lib/models/user'; // Assuming UserRole enum is needed

export async function POST(request: NextRequest) {
  try {
    // Authenticate
    const { user, error: authError } = await authenticateRequest(request);
    if (authError) return authError;
    if (!user) {
      return NextResponse.json({
        success: false,
        error: 'Authentication required'
      }, { status: 401 });
    }

    // Only allow admins to run this
    if (!hasRole(user, [UserRole.ADMIN])) { // Use UserRole.ADMIN for clarity
      return unauthorizedResponse('Admin access required');
    }
    
    const body = await request.json();
    const { rid } = body;

    if (!rid) {
      return NextResponse.json({ error: 'RID required' }, { status: 400 });
    }

    console.log(`👤 Admin ${user.email} initiating single record fix for RID: ${rid}`);
    console.log(`🔧 Fixing record: ${rid}`);

    // Get the record
    const { data: record, error: fetchError } = await getSupabaseAdmin()
      .from('churn_records')
      .select('*')
      .eq('rid', rid)
      .single();

    if (fetchError || !record) {
      return NextResponse.json({ error: 'Record not found' }, { status: 404 });
    }

    const churnReason = (record as any).churn_reason?.trim() || "";
    const callAttempts = (record as any).call_attempts || [];
    
    console.log(`   Current Status: ${(record as any).follow_up_status}`);
    console.log(`   Churn Reason: "${churnReason}"`);
    console.log(`   Call Attempts: ${callAttempts.length}`);

    // Determine correct status
    const shouldBeCompleted = isCompletedReason(churnReason) || callAttempts.length >= 3;
    
    console.log(`   Should Be Completed: ${shouldBeCompleted}`);

    if (shouldBeCompleted && (record as any).follow_up_status !== "COMPLETED") {
      // Fix the record
      const supabase = getSupabaseAdmin() as any;
      const { error: updateError } = await supabase
        .from('churn_records')
        .update({
          follow_up_status: "COMPLETED",
          is_follow_up_active: false,
          next_reminder_time: null,
          follow_up_completed_at: (record as any).follow_up_completed_at || new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('rid', rid);

      if (updateError) {
        return NextResponse.json({ error: 'Update failed', detail: updateError.message }, { status: 500 });
      }

      console.log(`   ✅ Fixed: ${(record as any).follow_up_status} → COMPLETED`);

      return NextResponse.json({
        success: true,
        message: 'Record fixed',
        rid,
        old_status: (record as any).follow_up_status,
        new_status: 'COMPLETED',
        churn_reason: churnReason
      });
    } else {
      console.log(`   ℹ️ No fix needed`);
      return NextResponse.json({
        success: true,
        message: 'Record already correct',
        rid,
        status: (record as any).follow_up_status
      });
    }

  } catch (error) {
    console.error('❌ Error:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
