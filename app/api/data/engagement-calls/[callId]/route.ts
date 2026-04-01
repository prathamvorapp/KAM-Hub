import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/api-auth';
import { engagementCallService } from '@/lib/services';

export const dynamic = 'force-dynamic';

// PATCH /api/data/engagement-calls/[callId]
// Edit a logged call
export async function PATCH(
  request: NextRequest,
  { params }: { params: { callId: string } }
) {
  const { user, error } = await authenticateRequest(request);
  if (error) return error;

  const body = await request.json();
  const { description, next_step, next_step_description } = body;

  if (!description || !next_step) {
    return NextResponse.json(
      { success: false, error: 'description and next_step are required' },
      { status: 400 }
    );
  }

  try {
    const call = await engagementCallService.updateCall({
      callId: params.callId,
      kamEmail: user!.email,
      description,
      nextStep: next_step,
      nextStepDescription: next_step_description,
    });
    return NextResponse.json({ success: true, data: call });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
