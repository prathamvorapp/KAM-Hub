import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/api-auth';
import { demoService } from '@/lib/services';
import { clearDemoStatsCache } from '@/lib/cache/demoCache';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ demoId: string }> }
) {
  try {
    const { user, error } = await authenticateRequest(request);
    if (error) return error;
    if (!user) {
      return NextResponse.json({
        success: false,
        error: 'Authentication required'
      }, { status: 401 });
    }

    const { demoId } = await params;
    const body = await request.json();

    console.log(`⚡ Bulk completing demo: ${demoId} by ${user.email}`);

    const result = await demoService.bulkCompleteDemo({
      demoId,
      ...body
    }, user);

    // Clear the demo statistics cache
    clearDemoStatsCache(user.email);

    return NextResponse.json({
      success: true,
      data: result
    });

  } catch (error) {
    console.error('[Demo Bulk Complete] Error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}
