import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/api-auth';
import { escalationService } from '@/lib/services';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const { user, error } = await authenticateRequest(request);
  if (error) return error;
  const unreadOnly = new URL(request.url).searchParams.get('unread') === 'true';
  try {
    const data = await escalationService.getNotifications(user!.email, unreadOnly);
    return NextResponse.json({ success: true, data });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  const { user, error } = await authenticateRequest(request);
  if (error) return error;
  try {
    const body = await request.json().catch(() => ({}));
    await escalationService.markNotificationsRead(user!.email, body.ids);
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
