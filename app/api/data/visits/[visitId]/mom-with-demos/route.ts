import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/api-auth';
import { visitServiceEnhanced } from '@/lib/services';

/**
 * Enhanced MOM submission endpoint that also handles demo creation
 * POST /api/data/visits/[visitId]/mom-with-demos
 */
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

    const body = await request.json();
    
    console.log(`📝 Submitting MOM with demos for visit: ${visitId}`);
    console.log(`👤 User: ${user.email}`);
    console.log(`📦 Demos included: ${body.demos?.length || 0}`);
    
    if (body.demos && body.demos.length > 0) {
      console.log(`📋 Demo products:`, body.demos.map((d: any) => d.product_name).join(', '));
    }

    const result = await visitServiceEnhanced.submitMoMWithDemos({
      visit_id: visitId,
      ...body
    }, user);

    console.log(`✅ MOM submission result:`, result);

    return NextResponse.json({
      success: true,
      message: 'MOM submitted successfully',
      data: result
    });

  } catch (error) {
    console.error('[Visit MOM with Demos Submit] Error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}
