import { NextRequest, NextResponse } from 'next/server';
import { UpdateFollowUpTimingSchema } from '../../../../lib/models/churn';
import { getSupabaseAdmin } from '@/lib/supabase-client';
import NodeCache from 'node-cache';

// Cache instances for invalidation
const churnDataCache = new NodeCache({ stdTTL: 60 });
const statisticsCache = new NodeCache({ stdTTL: 180 });

export async function PATCH(request: NextRequest) {
  try {
    // Get user info from middleware
    const userEmail = request.headers.get('x-user-email');
    
    if (!userEmail) {
      return NextResponse.json({
        error: 'Authentication required'
      }, { status: 401 });
    }

    const body = await request.json();
    const { rid, next_reminder_time, follow_up_status } = UpdateFollowUpTimingSchema.parse(body);

    console.log(`⏰ Updating follow-up timing for RID: ${rid}`);

    // Update follow-up timing in Supabase
    const { error } = await getSupabaseAdmin()
      .from('churn_records')
      // @ts-expect-error - Supabase type inference issue with update
      .update({
        next_reminder_time,
        follow_up_status,
        updated_at: new Date().toISOString()
      })
      .eq('rid', rid);

    if (error) throw error;

    // Clear relevant caches after update
    churnDataCache.flushAll();
    statisticsCache.flushAll();
    
    console.log(`🗑️ Cleared caches after follow-up timing update for RID: ${rid}`);

    return NextResponse.json({
      success: true,
      message: 'Follow-up timing updated successfully',
      data: {
        rid,
        next_reminder_time,
        follow_up_status,
        updated_by: userEmail,
        updated_at: new Date().toISOString()
      }
    });

  } catch (error) {
    console.log(`❌ Error updating follow-up timing: ${error}`);
    return NextResponse.json({
      success: false,
      error: 'Failed to update follow-up timing',
      detail: String(error)
    }, { status: 500 });
  }
}
