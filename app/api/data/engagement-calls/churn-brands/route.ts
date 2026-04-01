import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/api-auth';
import { engagementCallService } from '@/lib/services';

export const dynamic = 'force-dynamic';

// GET /api/data/engagement-calls/churn-brands?brand_name=...
// With brand_name: returns churn records for that specific brand only
// Without brand_name: returns all churn records for the agent's brands
export async function GET(request: NextRequest) {
  const { user, error } = await authenticateRequest(request);
  if (error) return error;

  const { searchParams } = new URL(request.url);
  const brandName = searchParams.get('brand_name');

  try {
    const records = await engagementCallService.getChurnBrandsForAgent({ userProfile: user!, brandName: brandName || undefined });
    return NextResponse.json({ success: true, data: records });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
