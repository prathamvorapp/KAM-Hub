import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '../../../../../lib/auth-helpers';
import { churnService } from '@/lib/services';
import NodeCache from 'node-cache';

// Cache instances for invalidation
const churnDataCache = new NodeCache({ stdTTL: 60 });
const statisticsCache = new NodeCache({ stdTTL: 180 });

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

    const body = await request.json();
    const { call_response, notes, churn_reason } = body;

    console.log(`📞 Recording call attempt for RID: ${rid}`);
    console.log(`   Call Response: ${call_response}`);
    console.log(`   Churn Reason: ${churn_reason}`);

    const result = await churnService.recordCallAttempt({
      rid,
      call_response,
      notes,
      churn_reason,
      email: user.email
    });

    console.log(`✅ Call attempt recorded successfully`);
    console.log(`   Follow-up Status: ${result.follow_up_status}`);
    console.log(`   Is Active: ${result.is_active}`);
    console.log(`   Next Reminder: ${result.next_reminder_time}`);

    // Clear relevant caches after recording call attempt
    churnDataCache.flushAll();
    statisticsCache.flushAll();
    
    console.log(`🗑️ Cleared caches after call attempt for RID: ${rid}`);

    return NextResponse.json({
      success: true,
      data: result
    });

  } catch (error) {
    console.error('❌ Error recording call attempt:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to record call attempt',
      detail: String(error)
    }, { status: 500 });
  }
}
