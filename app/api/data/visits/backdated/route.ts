import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/api-auth';
import { visitService } from '@/lib/services';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

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

    // Only Team Leads, Admins, Agents and Sub-agents can schedule backdated visits
    const normalizedRole = user.role.toLowerCase().replace(/\s+/g, '_');
    if (normalizedRole !== 'team_lead' && normalizedRole !== 'admin' && normalizedRole !== 'agent' && normalizedRole !== 'sub_agent') {
      return NextResponse.json({
        success: false,
        error: 'Access denied - insufficient permissions'
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
