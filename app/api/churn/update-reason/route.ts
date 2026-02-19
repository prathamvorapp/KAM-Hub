import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/api-auth';
import { UpdateChurnReasonSchema } from '../../../../lib/models/churn';
import { churnService } from '@/lib/services';
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
    const { rid, churn_reason, remarks } = UpdateChurnReasonSchema.parse(body);

    console.log(`📝 Updating churn reason for RID: ${rid} by user: ${user.email}`);

    // Update churn reason in Supabase
    const result = await churnService.updateChurnReason({
      rid,
      churn_reason,
      remarks,
      userProfile: user // Pass the entire user object as userProfile
    });

    if (result.success) {
      // Clear relevant caches after update
      churnDataCache.flushAll();
      statisticsCache.flushAll();
      
      console.log(`🗑️ Cleared caches after churn reason update for RID: ${rid}`);

      return NextResponse.json({
        success: true,
        message: 'Churn reason updated successfully',
        data: {
          rid,
          churn_reason,
          remarks,
          updated_by: user.email,
          updated_at: new Date().toISOString()
        }
      });
    } else {
      return NextResponse.json({
        success: false,
        error: 'Failed to update churn reason'
      }, { status: 400 });
    }
  } catch (error) {
    console.error(`❌ [Update Churn Reason] Error:`, error);
    return NextResponse.json({
      success: false,
      error: 'Failed to update churn reason',
      detail: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}
