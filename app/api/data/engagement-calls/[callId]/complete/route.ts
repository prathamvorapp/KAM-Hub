import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/api-auth';
import { engagementCallService } from '@/lib/services';

export const dynamic = 'force-dynamic';

// POST /api/data/engagement-calls/complete
// Body: { brand_name, brand_id?, zone?, description, next_step, next_step_description?, month }
export async function POST(
  request: NextRequest,
  { params }: { params: { callId: string } }
) {
  const { user, error } = await authenticateRequest(request);
  if (error) return error;

  const body = await request.json();
  const { brand_name, brand_id, zone, description, next_step, next_step_description, month } = body;

  if (!brand_name || !description || !next_step || !month) {
    return NextResponse.json(
      { success: false, error: 'brand_name, description, next_step and month are required' },
      { status: 400 }
    );
  }

  try {
    // Always use the brand's actual KAM info (not the acting user)
    const brandKam = await engagementCallService.getBrandKamInfo(brand_name);
    const kamEmail = brandKam?.kamEmail ?? user!.email;
    const kamName = brandKam?.kamName ?? (user!.fullName || user!.full_name || user!.email);
    const resolvedTeamName = brandKam?.teamName ?? (user!.teamName || user!.team_name);
    const resolvedZone = zone ?? brandKam?.zone;

    const call = await engagementCallService.markCallDone({
      month,
      brandName: brand_name,
      brandId: brand_id,
      kamEmail,
      kamName,
      teamName: resolvedTeamName,
      zone: resolvedZone,
      description,
      nextStep: next_step,
      nextStepDescription: next_step_description,
      actionedBy: user!.email,
    });
    return NextResponse.json({ success: true, data: call });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
