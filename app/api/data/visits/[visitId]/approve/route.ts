import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/api-auth';
import { visitService } from '@/lib/services';

export async function POST(
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

    // Check if user is Team Lead or Admin (case-insensitive)
    const normalizedRole = user.role.toLowerCase().replace(/\s+/g, '_');
    if (normalizedRole !== 'team_lead' && normalizedRole !== 'admin') {
      return NextResponse.json({
        success: false,
        error: 'Access denied - Team Lead or Admin only'
      }, { status: 403 });
    }

    const body = await request.json();
    const { approver_email, approval_status, rejection_remarks } = body;

    if (!approval_status) {
      return NextResponse.json({
        success: false,
        error: 'approval_status is required'
      }, { status: 400 });
    }

    await visitService.approveVisit({
      visit_id: visitId,
      // approver_email: approver_email || user.email, // Removed, now derived from userProfile
      approval_status,
      rejection_remarks
    }, user); // Pass the userProfile here

    return NextResponse.json({
      success: true,
      message: `Visit ${approval_status.toLowerCase()} successfully`
    });

  } catch (error) {
    console.error('[Visit Approve] Error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}
