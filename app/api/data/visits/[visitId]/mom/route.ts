import { NextRequest, NextResponse } from 'next/server';
import { visitService } from '@/lib/services';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ visitId: string }> }
) {
  try {
    const { visitId } = await params;
    const userEmail = request.headers.get('x-user-email');
    
    if (!userEmail) {
      return NextResponse.json({
        error: 'Authentication required'
      }, { status: 401 });
    }

    const body = await request.json();

    await visitService.submitMoM({
      visit_id: visitId,
      ...body
    });

    return NextResponse.json({
      success: true,
      message: 'MOM submitted successfully'
    });

  } catch (error) {
    console.error('❌ Error submitting MOM:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to submit MOM',
      detail: String(error)
    }, { status: 500 });
  }
}
