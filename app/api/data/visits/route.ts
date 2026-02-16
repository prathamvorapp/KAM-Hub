import { NextRequest, NextResponse } from 'next/server';
import { visitService } from '@/lib/services';

export async function GET(request: NextRequest) {
  try {
    const userEmail = request.headers.get('x-user-email');
    
    if (!userEmail) {
      return NextResponse.json({
        error: 'Authentication required'
      }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || undefined;
    const limit = parseInt(searchParams.get('limit') || '100');
    const page = parseInt(searchParams.get('page') || '1');

    const result = await visitService.getVisits({
      email: userEmail,
      search,
      page,
      limit
    });

    return NextResponse.json({
      success: true,
      ...result
    });

  } catch (error) {
    console.error('❌ Error getting visits:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to get visits',
      detail: String(error)
    }, { status: 500 });
  }
}
