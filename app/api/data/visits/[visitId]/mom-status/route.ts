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
    const { mom_shared } = body;

    if (!mom_shared) {
      return NextResponse.json({
        error: 'mom_shared is required'
      }, { status: 400 });
    }

    await visitService.updateMOMStatus({
      visit_id: visitId,
      mom_shared,
      mom_shared_date: new Date().toISOString()
    });

    return NextResponse.json({
      success: true,
      message: 'MOM status updated successfully'
    });

  } catch (error) {
    console.error('❌ Error updating MOM status:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to update MOM status',
      detail: String(error)
    }, { status: 500 });
  }
}
