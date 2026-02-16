import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser, hasAnyRole } from '../../../../../../lib/auth-helpers';
import { demoService } from '@/lib/services';

export async function POST(request: NextRequest, { params }: { params: Promise<{ demoId: string }> }) {
  try {
    const { demoId } = await params;
    const user = await getAuthenticatedUser(request);
    
    if (!user) {
      return NextResponse.json({
        success: false,
        error: 'Authentication required'
      }, { status: 401 });
    }

    const body = await request.json();
    const { scheduledDate, scheduledTime, reason, isReschedule } = body;

    console.log(`📅 ${isReschedule ? 'Rescheduling' : 'Scheduling'} demo: ${demoId}`);

    let result;
    
    if (isReschedule && hasAnyRole(user, ['Team Lead', 'Admin'])) {
      // Team Lead or Admin rescheduling
      result = await demoService.rescheduleDemo({
        demoId,
        scheduledDate,
        scheduledTime,
        reason,
        rescheduleBy: user.email,
        rescheduleByRole: user.role
      });
    } else {
      // Regular scheduling
      result = await demoService.scheduleDemo({
        demoId,
        scheduledDate,
        scheduledTime,
        reason
      });
    }

    return NextResponse.json({
      success: true,
      data: result
    });

  } catch (error) {
    console.error('❌ Error scheduling demo:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to schedule demo',
      detail: String(error)
    }, { status: 500 });
  }
}
