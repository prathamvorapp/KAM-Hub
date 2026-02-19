import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/api-auth';
import { BrandsQuerySchema } from '../../../../../lib/models/visits';
import { masterDataService } from '../../../../../lib/services';
import { UserRole } from '../../../../../lib/models/user';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ email: string }> }
) {
  try {
    const { email } = await params;
    
    const { user, error } = await authenticateRequest(request);
    if (error) return error;
    if (!user) {
      return NextResponse.json({
        success: false,
        error: 'Authentication required'
      }, { status: 401 });
    }
    
    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '1000'); // High limit for client-side pagination
    const search = searchParams.get('search') || undefined;

    const queryData = BrandsQuerySchema.parse({ page, limit, search });

    // Authorization is now handled within masterDataService.getBrandsByAgentEmail,
    // which ensures the authenticated user (userProfile: user) has permission
    // to view brands for the requested agentEmail.
    console.log('📦 Getting brands for:', email, 'page:', page, 'limit:', limit, 'search:', search);
        console.log('🔐 Current user:', user.email, 'role:', user.role, 'team:', user.team_name);
        
        const brands = await masterDataService.getBrandsByAgentEmail(user as any, email);
    // Enhanced response with proper structure
    const response = {
      success: true,
      data: brands,
      message: 'Brands loaded successfully',
      user_context: {
        email: user.email,
        role: user.role,
        team: user.team_name,
        requested_email: email
      }
    };

    return NextResponse.json(response);
    
  } catch (error) {
    console.error('[Brands GET] Error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}