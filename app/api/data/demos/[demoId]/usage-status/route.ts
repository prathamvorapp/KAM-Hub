import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '../../../../../../lib/auth-helpers';
import { demoService } from '@/lib/services';

export async function POST(request: NextRequest, { params }: { params: Promise<{ demoId: string }> }) {
  try {
    const { demoId } = await params;
    const user = await getAuthenticatedUser(request);
    
    if (!user) {
      return NextResponse.json({
        success: false,
        error: 'Authentication required'
      }, { status: 401 });
    }

    const body = await request.json();
    const { usageStatus } = body;

    console.log(`📝 Setting usage status for demo: ${demoId}`);

    const result = await demoService.setUsageStatus({
      demoId,
      usageStatus
    });

    return NextResponse.json({
      success: true,
      data: result
    });

  } catch (error) {
    console.error('❌ Error setting usage status:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to set usage status',
      detail: String(error)
    }, { status: 500 });
  }
}
