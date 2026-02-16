import { NextRequest, NextResponse } from 'next/server';
import { BrandsQuerySchema } from '../../../../../lib/models/visits';
import { masterDataService } from '../../../../../lib/services';
import { UserRole } from '../../../../../lib/models/user';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ email: string }> }
) {
  try {
    const { email } = await params;
    
    // Get user info from middleware
    const currentUserEmail = request.headers.get('x-user-email');
    const currentUserRole = request.headers.get('x-user-role');
    const currentUserTeam = request.headers.get('x-user-team');
    
    if (!currentUserEmail) {
      return NextResponse.json({
        success: false,
        error: 'Authentication required',
        detail: 'User not authenticated'
      }, { status: 401 });
    }
    
    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '1000'); // High limit for client-side pagination
    const search = searchParams.get('search') || undefined;

    const queryData = BrandsQuerySchema.parse({ page, limit, search });

    // Check if user can access this email's data
    // Normalize role comparison to handle both formats
    const normalizedRole = currentUserRole?.toLowerCase().replace(/[_\s]/g, '');
    if (currentUserEmail !== email && 
        normalizedRole !== 'admin' && 
        normalizedRole !== 'teamlead') {
      return NextResponse.json({
        success: false,
        error: 'Access denied',
        detail: 'Insufficient permissions to access this data'
      }, { status: 403 });
    }

    console.log('📦 Getting brands for:', email, 'page:', page, 'limit:', limit, 'search:', search);
    console.log('🔐 Current user:', currentUserEmail, 'role:', currentUserRole, 'team:', currentUserTeam);

    const brands = await masterDataService.getBrandsByAgentEmail(email);

    // Enhanced response with proper structure
    const response = {
      success: true,
      data: brands,
      message: 'Brands loaded successfully',
      user_context: {
        email: currentUserEmail,
        role: currentUserRole,
        team: currentUserTeam,
        requested_email: email
      }
    };

    return NextResponse.json(response);
    
  } catch (error) {
    console.error('❌ Error getting brands:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to load brands',
      detail: String(error)
    }, { status: 500 });
  }
}