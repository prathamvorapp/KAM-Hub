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
    const { resetReason } = body;

    console.log(`🔄 [Reset API] Starting reset for demo: ${demoId}`);
    console.log(`📝 [Reset API] Reset reason: ${resetReason}`);
    console.log(`👤 [Reset API] Reset by: ${user.email} (${user.role})`);

    if (!resetReason || !resetReason.trim()) {
      console.error('❌ [Reset API] No reset reason provided');
      return NextResponse.json({
        success: false,
        error: 'Reset reason is required'
      }, { status: 400 });
    }

    console.log(`🔄 Resetting demo: ${demoId} by ${user.email}`);

    const result = await demoService.resetDemo({
      demoId,
      resetReason
    }, user);

    console.log(`✅ Reset completed successfully:`, {
      demoId,
      resetBy: result.resetBy,
      message: result.message
    });

    // Clear the demo statistics cache
    clearDemoStatsCache(user.email);
    console.log(`🗑️ Cache cleared for: ${user.email}`);

    return NextResponse.json({
      success: true,
      data: result
    });

  } catch (error) {
    console.error('[Demo Reset] Error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}
