import { NextRequest, NextResponse } from 'next/server';
import { visitService } from '@/lib/services';

export async function PATCH(
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
    const { visit_status } = body;

    if (!visit_status) {
      return NextResponse.json({
        error: 'visit_status is required'
      }, { status: 400 });
    }

    await visitService.updateVisitStatus({
      visit_id: visitId,
      visit_status,
      visit_date: visit_status === 'Completed' ? new Date().toISOString() : undefined
    });

    return NextResponse.json({
      success: true,
      message: `Visit status updated to ${visit_status}`
    });

  } catch (error) {
    console.error('❌ Error updating visit status:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to update visit status',
      detail: String(error)
    }, { status: 500 });
  }
}
