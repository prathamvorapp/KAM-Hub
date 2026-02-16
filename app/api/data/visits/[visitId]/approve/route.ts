import { NextRequest, NextResponse } from 'next/server';
import { visitService } from '@/lib/services';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ visitId: string }> }
) {
  try {
    const { visitId } = await params;
    const userEmail = request.headers.get('x-user-email');
    const userRole = request.headers.get('x-user-role');
    
    if (!userEmail) {
      return NextResponse.json({
        error: 'Authentication required'
      }, { status: 401 });
    }

    // Normalize role comparison to handle both formats
    const normalizedRole = userRole?.toLowerCase().replace(/[_\s]/g, '');
    if (normalizedRole !== 'teamlead' && normalizedRole !== 'admin') {
      return NextResponse.json({
        error: 'Access denied - Team Lead or Admin only'
      }, { status: 403 });
    }

    const body = await request.json();
    const { approver_email, approval_status, rejection_remarks } = body;

    if (!approval_status) {
      return NextResponse.json({
        error: 'approval_status is required'
      }, { status: 400 });
    }

    await visitService.approveVisit({
      visit_id: visitId,
      approver_email: approver_email || userEmail,
      approval_status,
      rejection_remarks
    });

    return NextResponse.json({
      success: true,
      message: `Visit ${approval_status.toLowerCase()} successfully`
    });

  } catch (error) {
    console.error('❌ Error approving visit:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to approve visit',
      detail: String(error)
    }, { status: 500 });
  }
}
