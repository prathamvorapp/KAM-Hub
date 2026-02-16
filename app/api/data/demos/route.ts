import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser, getDataFilter } from '../../../../lib/auth-helpers';
import { demoService } from '@/lib/services';

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request);
    
    if (!user) {
      return NextResponse.json({
        success: false,
        error: 'Authentication required'
      }, { status: 401 });
    }

    console.log(`📊 Getting demos for user: ${user.email} (${user.role})`);

    const result = await demoService.getDemosForAgent({
      agentId: user.email,
      role: user.role,
      teamName: user.team_name
    });

    return NextResponse.json({
      success: true,
      data: result
    });

  } catch (error) {
    console.error('❌ Error getting demos:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to load demos',
      detail: String(error)
    }, { status: 500 });
  }
}
