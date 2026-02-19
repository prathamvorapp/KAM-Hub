import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/api-auth';
import { visitService } from '@/lib/services';

export async function POST(request: NextRequest) {
  try {
    const { user, error } = await authenticateRequest(request);
    if (error) return error;
    if (!user) {
      return NextResponse.json({
        success: false,
        error: 'Authentication required'
      }, { status: 401 });
    }

    // Only Team Leads and Admins can schedule backdated visits (case-insensitive)
    const normalizedRole = user.role.toLowerCase().replace(/\s+/g, '_');
    if (normalizedRole !== 'team_lead' && normalizedRole !== 'admin') {
      return NextResponse.json({
        success: false,
        error: 'Access denied - Team Lead or Admin only'
      }, { status: 403 });
    }

    const body = await request.json();

    await visitService.scheduleBackdatedVisit(body, user); // Pass the userProfile here

    return NextResponse.json({
      success: true,
      message: 'Backdated visit scheduled successfully'
    });

  } catch (error) {
    console.error('[Visit Backdated] Error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}
