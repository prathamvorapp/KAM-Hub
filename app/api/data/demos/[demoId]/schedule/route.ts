import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/api-auth';
import { demoService } from '@/lib/services';
import { clearDemoStatsCache } from '@/lib/cache/demoCache';

export async function POST(request: NextRequest, { params }: { params: Promise<{ demoId: string }> }) {
  try {
    const { demoId } = await params;
    const { user, error } = await authenticateRequest(request);
    if (error) return error;
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
    
    const isTeamLeadOrAdmin = user.role === 'Team Lead' || user.role === 'Admin';
    
    if (isReschedule && isTeamLeadOrAdmin) {
      // Team Lead or Admin rescheduling
      result = await demoService.rescheduleDemo({
        demoId,
        scheduledDate,
        scheduledTime,
        reason,
        // rescheduleBy: user.email, // Removed, now derived from userProfile
        // rescheduleByRole: user.role // Removed, now derived from userProfile
      }, user); // Pass the userProfile here
    } else {
      // Regular scheduling
      result = await demoService.scheduleDemo({
        demoId,
        scheduledDate,
        scheduledTime,
        reason
      }, user); // Pass the userProfile here
    }

    // Clear the demo statistics cache
    clearDemoStatsCache(user.email);

    return NextResponse.json({
      success: true,
      data: result
    });

  } catch (error) {
    console.error('[Demo Schedule] Error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}
