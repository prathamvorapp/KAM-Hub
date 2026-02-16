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
    const { isApplicable, nonApplicableReason } = body;

    console.log(`📝 Setting product applicability for demo: ${demoId}`);

    const result = await demoService.setProductApplicability({
      demoId,
      isApplicable,
      nonApplicableReason
    });

    return NextResponse.json({
      success: true,
      data: result
    });

  } catch (error) {
    console.error('❌ Error setting product applicability:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to set product applicability',
      detail: String(error)
    }, { status: 500 });
  }
}
