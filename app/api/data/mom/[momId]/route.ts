import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/api-auth';
import { momService } from '@/lib/services';

export async function GET(request: NextRequest, { params }: { params: Promise<{ momId: string }> }) {
  try {
    const { momId } = await params;
    const { user, error } = await authenticateRequest(request);
    if (error) return error;
    if (!user) {
      return NextResponse.json({
        success: false,
        error: 'Authentication required'
      }, { status: 401 });
    }

    console.log(`📊 Getting MOM: ${momId}`);

    const mom = await momService.getMOMByTicketId(momId, user);

    if (!mom) {
      return NextResponse.json({
        success: false,
        error: 'MOM not found'
      }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: mom
    });

  } catch (error) {
    console.error('[MOM GET] Error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ momId: string }> }) {
  try {
    const { momId } = await params;
    const { user, error } = await authenticateRequest(request);
    if (error) return error;
    if (!user) {
      return NextResponse.json({
        success: false,
        error: 'Authentication required'
      }, { status: 401 });
    }

    const body = await request.json();
    
    console.log(`📝 Updating MOM: ${momId}`);

    const result = await momService.updateMOM(momId, body, user);

    return NextResponse.json({
      success: true,
      data: result
    });

  } catch (error) {
    console.error('[MOM PUT] Error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}
