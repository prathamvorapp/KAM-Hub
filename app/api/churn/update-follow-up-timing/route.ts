import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest, canAccessResource, unauthorizedResponse } from '@/lib/api-auth';
import { UpdateFollowUpTimingSchema } from '../../../../lib/models/churn';
import { getSupabaseAdmin } from '@/lib/supabase-server';
import NodeCache from 'node-cache';

// Cache instances for invalidation
const churnDataCache = new NodeCache({ stdTTL: 60 });
const statisticsCache = new NodeCache({ stdTTL: 180 });

export async function PATCH(request: NextRequest) {
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

    const body = await request.json();
    const { rid, next_reminder_time, follow_up_status } = UpdateFollowUpTimingSchema.parse(body);

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
    const authCheck = canAccessResource(user, (record as any).kam, (record as any).team_name); 
    if (!authCheck) {
      return unauthorizedResponse('You do not have permission to update this churn record.');
    }

    console.log(`⏰ Updating follow-up timing for RID: ${rid}`);

    // Update follow-up timing in Supabase
    const { error: updateError } = await getSupabaseAdmin()
      .from('churn_records')
      // @ts-expect-error - Supabase type inference issue with update
      .update({
        next_reminder_time,
        follow_up_status,
        updated_at: new Date().toISOString()
      })
      .eq('rid', rid);

    if (updateError) throw updateError;

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
        updated_by: user.email,
        updated_at: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error(`❌ [Update Follow-up Timing] Error:`, error);
    return NextResponse.json({
      success: false,
      error: 'Failed to update follow-up timing',
      detail: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}
