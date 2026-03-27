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

    const body = await request.json();
    console.log(`📅 Creating visit for brand: ${body.brand_name}`);

    // sub_agent agent_id override is handled inside visitService.createVisit
    const result = await visitService.createVisit(body, user);

    console.log(`✅ Visit created successfully`);
    return NextResponse.json({ success: true, data: result });

  } catch (error: any) {
    console.error('[Visit Create] Error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}
