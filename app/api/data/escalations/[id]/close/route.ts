import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/api-auth';
import { escalationService } from '@/lib/services';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const { user, error } = await authenticateRequest(request);
  if (error) return error;

  try {
    const body = await request.json().catch(() => ({}));
    const data = await escalationService.closeEscalation({ id: params.id, close_reason: body.close_reason || '', userProfile: user! });
    return NextResponse.json({ success: true, data });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 400 });
  }
}
