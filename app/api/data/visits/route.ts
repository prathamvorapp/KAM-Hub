import { NextRequest, NextResponse } from 'next/server';
import { visitService } from '@/lib/services';
import { authenticateRequest } from '@/lib/api-auth';

export async function GET(request: NextRequest) {
  try {
    // Authenticate request
    const { user, error } = await authenticateRequest(request);
    if (error) return error;
    if (!user) {
      return NextResponse.json({
        success: false,
        error: 'Authentication required'
      }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || undefined;
    const limit = parseInt(searchParams.get('limit') || '999999');
    const page = parseInt(searchParams.get('page') || '1');

    const result = await visitService.getVisits({
      userProfile: user, // Pass the entire user object as userProfile
      search,
      page,
      limit
    });

    return NextResponse.json({
      success: true,
      ...result
    });

  } catch (error: any) {
    console.error('❌ [Visits API] Error:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Failed to get visits',
      detail: error?.message || String(error)
    }, { status: 500 });
  }
}
