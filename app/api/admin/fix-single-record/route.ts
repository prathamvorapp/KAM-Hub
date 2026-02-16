import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-client';
import { isCompletedReason } from '@/lib/constants/churnReasons';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { rid } = body;

    if (!rid) {
      return NextResponse.json({ error: 'RID required' }, { status: 400 });
    }

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

    const rec = record as any;
    const churnReason = rec.churn_reason?.trim() || "";
    const callAttempts = rec.call_attempts || [];
    
    console.log(`   Current Status: ${rec.follow_up_status}`);
    console.log(`   Churn Reason: "${churnReason}"`);
    console.log(`   Call Attempts: ${callAttempts.length}`);

    // Determine correct status
    const shouldBeCompleted = isCompletedReason(churnReason) || callAttempts.length >= 3;
    
    console.log(`   Should Be Completed: ${shouldBeCompleted}`);

    if (shouldBeCompleted && rec.follow_up_status !== "COMPLETED") {
      // Fix the record
      const { error: updateError } = await (getSupabaseAdmin()
        .from('churn_records') as any)
        .update({
          follow_up_status: "COMPLETED",
          is_follow_up_active: false,
          next_reminder_time: null,
          follow_up_completed_at: rec.follow_up_completed_at || new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('rid', rid);

      if (updateError) {
        return NextResponse.json({ error: 'Update failed', detail: updateError.message }, { status: 500 });
      }

      console.log(`   ✅ Fixed: ${rec.follow_up_status} → COMPLETED`);

      return NextResponse.json({
        success: true,
        message: 'Record fixed',
        rid,
        old_status: rec.follow_up_status,
        new_status: 'COMPLETED',
        churn_reason: churnReason
      });
    } else {
      console.log(`   ℹ️ No fix needed`);
      return NextResponse.json({
        success: true,
        message: 'Record already correct',
        rid,
        status: rec.follow_up_status
      });
    }

  } catch (error) {
    console.error('❌ Error:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
