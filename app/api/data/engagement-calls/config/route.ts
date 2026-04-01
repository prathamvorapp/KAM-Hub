import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/api-auth';
import { engagementCallService } from '@/lib/services';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const { user, error } = await authenticateRequest(request);
  if (error) return error;

  const { searchParams } = new URL(request.url);
  const month = searchParams.get('month') || new Date().toISOString().slice(0, 7);

  const config = await engagementCallService.getConfig(month);
  return NextResponse.json({ success: true, data: config });
}

export async function POST(request: NextRequest) {
  const { user, error } = await authenticateRequest(request);
  if (error) return error;

  const normalizedRole = user!.role.toLowerCase().replace(/\s+/g, '_');
  if (normalizedRole !== 'admin') {
    return NextResponse.json({ success: false, error: 'Admin only' }, { status: 403 });
  }

  const body = await request.json();
  const { month, topic, topic_description, purpose } = body;

  if (!month || !topic || !purpose) {
    return NextResponse.json({ success: false, error: 'month, topic and purpose are required' }, { status: 400 });
  }

  try {
    const config = await engagementCallService.upsertConfig({
      month,
      topic,
      topic_description,
      purpose,
      createdBy: user!.email,
    });
    return NextResponse.json({ success: true, data: config });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
