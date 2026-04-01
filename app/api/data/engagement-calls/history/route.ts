import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/api-auth';
import { engagementCallService } from '@/lib/services';

export const dynamic = 'force-dynamic';

// GET /api/data/engagement-calls/history?brand_name=...
export async function GET(request: NextRequest) {
  const { user, error } = await authenticateRequest(request);
  if (error) return error;

  const { searchParams } = new URL(request.url);
  const brandName = searchParams.get('brand_name');
  if (!brandName) {
    return NextResponse.json({ success: false, error: 'brand_name is required' }, { status: 400 });
  }

  try {
    const history = await engagementCallService.getCallHistory({
      brandName,
      kamEmail: user!.email,
    });
    return NextResponse.json({ success: true, data: history });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
