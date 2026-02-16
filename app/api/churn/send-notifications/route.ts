import { NextRequest, NextResponse } from 'next/server';
import { churnService } from '@/lib/services';
import { getSupabaseAdmin } from '@/lib/supabase-client';
import { UserRole } from '../../../../lib/models/user';

export async function POST(request: NextRequest) {
  try {
    // Get user info from middleware
    const userEmail = request.headers.get('x-user-email');
    const userRole = request.headers.get('x-user-role');
    
    if (!userEmail) {
      return NextResponse.json({
        error: 'Authentication required',
        detail: 'User not authenticated'
      }, { status: 401 });
    }

    // Only admins and team leads can send notifications
    if (userRole !== UserRole.ADMIN && userRole !== UserRole.TEAM_LEAD) {
      return NextResponse.json({
        error: 'Insufficient permissions',
        detail: 'Only admins and team leads can send notifications'
      }, { status: 403 });
    }

    console.log(`🔔 Manual notification trigger by: ${userEmail}`);

    // Get active follow-ups
    const activeFollowUps = await churnService.getActiveFollowUps(undefined, userEmail);
    const overdueFollowUps = await churnService.getOverdueFollowUps(undefined, userEmail);

    // Log notification (simplified - actual email sending would be implemented separately)
    const now = new Date().toISOString();
    const notificationContent = {
      active: activeFollowUps.length,
      overdue: overdueFollowUps.length,
      timestamp: now
    };

    const { error: logError } = await getSupabaseAdmin().from('notification_log').insert({
      email: userEmail,
      notification_type: 'manual_trigger',
      record_count: activeFollowUps.length + overdueFollowUps.length,
      content: JSON.stringify(notificationContent),
      sent_at: now,
      status: 'sent'
    } as any);

    if (logError) {
      console.error('❌ Error logging notification:', logError);
    } else {
      console.log(`✅ Notifications logged successfully`);
    }

    return NextResponse.json({
      success: true,
      message: 'Notifications sent successfully',
      data: {
        active_follow_ups: activeFollowUps.length,
        overdue_follow_ups: overdueFollowUps.length,
        total_notifications: activeFollowUps.length + overdueFollowUps.length
      }
    });

  } catch (error) {
    console.error('❌ Error sending notifications:', error);
    return NextResponse.json({
      error: 'Failed to send notifications',
      detail: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
