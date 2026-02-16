import { NextRequest, NextResponse } from 'next/server';
import { visitService } from '@/lib/services';

export async function POST(request: NextRequest) {
  try {
    const userEmail = request.headers.get('x-user-email');
    const userRole = request.headers.get('x-user-role');
    
    if (!userEmail) {
      return NextResponse.json({
        error: 'Authentication required'
      }, { status: 401 });
    }

    // Only Team Leads and Admins can schedule backdated visits
    // Normalize role comparison to handle both formats
    const normalizedRole = userRole?.toLowerCase().replace(/[_\s]/g, '');
    if (normalizedRole !== 'teamlead' && normalizedRole !== 'admin') {
      return NextResponse.json({
        error: 'Access denied - Team Lead or Admin only'
      }, { status: 403 });
    }

    const body = await request.json();

    await visitService.scheduleBackdatedVisit({
      ...body,
      created_by: userEmail
    });

    return NextResponse.json({
      success: true,
      message: 'Backdated visit scheduled successfully'
    });

  } catch (error) {
    console.error('❌ Error scheduling backdated visit:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to schedule backdated visit',
      detail: String(error)
    }, { status: 500 });
  }
}
