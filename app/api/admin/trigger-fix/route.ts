/**
 * Admin API: Trigger Churn Fix
 *
 * Manually trigger the auto-fix logic for churn records.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-client';
import { isCompletedReason, isNoAgentResponse } from '@/lib/constants/churnReasons';
import { normalizeRole } from '@/lib/utils/roleUtils';

export async function POST(request: NextRequest) {
  try {
    // Get user info from headers (set by middleware)
    const userEmail = request.headers.get('x-user-email');
    const userRole = request.headers.get('x-user-role');

    // Normalize role for comparison
    const normalizedRole = normalizeRole(userRole);

    // Only allow admins to run this
    if (normalizedRole !== 'admin') {
      return NextResponse.json({
        error: 'Unauthorized - Admin access required'
      }, { status: 403 });
    }

    console.log(`🔧 Triggering churn fix - initiated by: ${userEmail}`);

    // Get ALL churn records
    const { data: allRecords, error } = await getSupabaseAdmin()
      .from('churn_records')
      .select('*');

    if (error) {
      console.error('❌ Error fetching records:', error);
      return NextResponse.json({
        success: false,
        error: 'Failed to fetch records',
        detail: error.message
      }, { status: 500 });
    }

    let fixedCount = 0;
    const fixedRecords: string[] = [];

    const records = (allRecords || []) as any[];
    for (const record of records) {
      const churnReason = record.churn_reason?.trim() || "";
      const callAttempts = record.call_attempts || [];
      const shouldBeCompleted = isCompletedReason(churnReason) || callAttempts.length >= 3;

      if (shouldBeCompleted && record.follow_up_status !== "COMPLETED") {
        const { error: updateError } = await (getSupabaseAdmin()
          .from('churn_records') as any)
          .update({
            follow_up_status: "COMPLETED",
            is_follow_up_active: false,
            next_reminder_time: null,
            follow_up_completed_at: record.follow_up_completed_at || new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('rid', record.rid);

        if (!updateError) {
          fixedCount++;
          fixedRecords.push(record.rid);
        }
      }
    }

    return NextResponse.json({
      success: true,
      fixed_count: fixedCount,
      fixed_records: fixedRecords,
      message: `Successfully fixed ${fixedCount} churn records.`
    });

  } catch (error) {
    console.error('❌ Churn fix failed:', error);
    return NextResponse.json({
      success: false,
      error: 'Churn fix failed',
      detail: String(error)
    }, { status: 500 });
  }
}
