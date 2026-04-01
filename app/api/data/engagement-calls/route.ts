import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/api-auth';
import { engagementCallService } from '@/lib/services';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const { user, error } = await authenticateRequest(request);
  if (error) return error;

  const { searchParams } = new URL(request.url);
  const month = searchParams.get('month') || new Date().toISOString().slice(0, 7);

  try {
    console.log(`📞 [Engagement Calls] user=${user!.email} role=${user!.role} month=${month}`);
    const data = await engagementCallService.getCallsData({ userProfile: user!, month });
    console.log(`📞 [Engagement Calls] result: pending=${data.pendingBrands.length} done=${data.done.length} total=${data.totalBrands}`);
    return NextResponse.json({ success: true, data, _debug: { email: user!.email, role: user!.role } });
  } catch (err: any) {
    console.error('Error fetching engagement calls:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
