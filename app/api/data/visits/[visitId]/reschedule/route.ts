import { NextRequest, NextResponse } from 'next/server';
import { visitService } from '@/lib/services';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ visitId: string }> }
) {
  try {
    const { visitId } = await params;
    const userEmail = request.headers.get('x-user-email');
    
    if (!userEmail) {
      return NextResponse.json({
        error: 'Authentication required'
      }, { status: 401 });
    }

    const body = await request.json();
    const { new_scheduled_date, reason, rescheduled_by } = body;

    if (!new_scheduled_date || !reason || !rescheduled_by) {
      return NextResponse.json({
        error: 'new_scheduled_date, reason, and rescheduled_by are required'
      }, { status: 400 });
    }

    await visitService.rescheduleVisit({
      visit_id: visitId,
      new_scheduled_date,
      reason,
      rescheduled_by
    });

    return NextResponse.json({
      success: true,
      message: 'Visit rescheduled successfully'
    });

  } catch (error) {
    console.error('❌ Error rescheduling visit:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to reschedule visit',
      detail: String(error)
    }, { status: 500 });
  }
}
