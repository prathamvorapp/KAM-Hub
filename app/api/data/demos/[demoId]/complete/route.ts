import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '../../../../../../lib/auth-helpers';
import { demoService, DEMO_CONDUCTORS } from '@/lib/services';

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
    const { conductedBy, completionNotes } = body;

    if (!DEMO_CONDUCTORS.includes(conductedBy as any)) {
      return NextResponse.json({
        success: false,
        error: 'Invalid demo conductor'
      }, { status: 400 });
    }

    console.log(`✅ Completing demo: ${demoId}`);

    const result = await demoService.completeDemo({
      demoId,
      conductedBy,
      completionNotes
    });

    return NextResponse.json({
      success: true,
      data: result
    });

  } catch (error) {
    console.error('❌ Error completing demo:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to complete demo',
      detail: String(error)
    }, { status: 500 });
  }
}
