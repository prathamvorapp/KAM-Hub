import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/api-auth';
import { visitService } from '@/lib/services';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ visitId: string }> }
) {
  try {
    const { visitId } = await params;
    const { user, error } = await authenticateRequest(request);
    if (error) return error;
    if (!user) {
      return NextResponse.json({
        success: false,
        error: 'Authentication required'
      }, { status: 401 });
    }

    const body = await request.json();
    const { new_scheduled_date, reason, rescheduled_by } = body;

    if (!new_scheduled_date || !reason) { // rescheduled_by is now derived internally
      return NextResponse.json({
        error: 'new_scheduled_date and reason are required'
      }, { status: 400 });
    }

    await visitService.rescheduleVisit({
      visit_id: visitId,
      new_scheduled_date,
      reason,
      // rescheduled_by // Removed, now derived internally from userProfile
    }, user); // Pass the userProfile here

    return NextResponse.json({
      success: true,
      message: 'Visit rescheduled successfully'
    });

  } catch (error) {
    console.error('[Visit Reschedule] Error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}
