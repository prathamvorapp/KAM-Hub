import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/api-auth';
import { engagementCallService } from '@/lib/services';

export const dynamic = 'force-dynamic';

// GET /api/data/engagement-calls/export?month=YYYY-MM
// Returns CSV of done calls for the month
export async function GET(request: NextRequest) {
  const { user, error } = await authenticateRequest(request);
  if (error) return error;

  const { searchParams } = new URL(request.url);
  const month = searchParams.get('month') || new Date().toISOString().slice(0, 7);

  try {
    const data = await engagementCallService.getCallsData({ userProfile: user!, month });
    const rows = data.done;

    const header = ['Brand Name', 'Zone', 'KAM Name', 'KAM Email', 'Description', 'Next Step', 'Next Step Description', 'Called At'];
    const csvRows = rows.map(r => [
      `"${(r.brand_name || '').replace(/"/g, '""')}"`,
      `"${(r.zone || '').replace(/"/g, '""')}"`,
      `"${(r.kam_name || '').replace(/"/g, '""')}"`,
      `"${(r.kam_email || '').replace(/"/g, '""')}"`,
      `"${(r.description || '').replace(/"/g, '""')}"`,
      `"${r.next_step || ''}"`,
      `"${(r.next_step_description || '').replace(/"/g, '""')}"`,
      `"${r.called_at ? new Date(r.called_at).toLocaleString() : ''}"`,
    ].join(','));

    const csv = [header.join(','), ...csvRows].join('\n');

    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="engagement-calls-${month}.csv"`,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
