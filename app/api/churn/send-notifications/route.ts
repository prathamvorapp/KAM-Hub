import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest, hasRole, unauthorizedResponse } from '@/lib/api-auth';
import { churnService } from '@/lib/services';
import { getSupabaseAdmin } from '@/lib/supabase-server';
import { UserRole } from '@/lib/models/user';

export async function POST(request: NextRequest) {
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

    // Only admins and team leads can send notifications
    if (!hasRole(user, [UserRole.ADMIN, UserRole.TEAM_LEAD])) {
      return unauthorizedResponse('Only admins and team leads can send notifications');
    }

    console.log(`🔔 Manual notification trigger by: ${user.email}`);

    // Get active follow-ups
    const activeFollowUps = await churnService.getActiveFollowUps(undefined, user);
    const overdueFollowUps = await churnService.getOverdueFollowUps(undefined, user);

    // Log notification (simplified - actual email sending would be implemented separately)
    const now = new Date().toISOString();
    const notificationContent = {
      active: activeFollowUps.length,
      overdue: overdueFollowUps.length,
      timestamp: now
    };

    const { error: logError } = await getSupabaseAdmin().from('notification_log').insert({
      email: user.email,
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
    console.error('❌ [Send Notifications] Error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to send notifications',
      detail: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
