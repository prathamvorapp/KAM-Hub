import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/api-auth';
import { escalationService } from '@/lib/services';

export const dynamic = 'force-dynamic';

export async function GET(_request: NextRequest, { params }: { params: { id: string } }) {
  const { user, error } = await authenticateRequest(_request);
  if (error) return error;
  try {
    const data = await escalationService.getEscalationById(params.id);
    return NextResponse.json({ success: true, data });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 404 });
  }
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const { user, error } = await authenticateRequest(request);
  if (error) return error;

  try {
    const body = await request.json();
    const data = await escalationService.updateEscalation({ id: params.id, ...body, userProfile: user! });
    return NextResponse.json({ success: true, data });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 400 });
  }
}
