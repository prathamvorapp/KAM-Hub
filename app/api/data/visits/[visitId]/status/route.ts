import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/api-auth';
import { visitService } from '@/lib/services';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ visitId: string }> }
) {
  try {
    const { visitId } = await params;
    const { user, error } = await authenticateRequest(request);
    if (error) return error;
    if (!user) {
      return NextResponse.json({
        success: false,
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
    }, user); // Pass the userProfile here

    return NextResponse.json({
      success: true,
      message: `Visit status updated to ${visit_status}`
    });

  } catch (error) {
    console.error('[Visit Status] Error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}
