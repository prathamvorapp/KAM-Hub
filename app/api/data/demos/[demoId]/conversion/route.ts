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
    const { conversionStatus, nonConversionReason } = body;

    console.log(`📊 Setting conversion decision for demo: ${demoId}`);

    const result = await demoService.setConversionDecision({
      demoId,
      conversionStatus,
      nonConversionReason
    });

    return NextResponse.json({
      success: true,
      data: result
    });

  } catch (error) {
    console.error('❌ Error setting conversion decision:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to set conversion decision',
      detail: String(error)
    }, { status: 500 });
  }
}
