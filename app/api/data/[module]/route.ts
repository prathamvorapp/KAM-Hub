import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/api-auth';
import { ModuleQuerySchema, MODULE_SCHEMAS, ModuleName } from '../../../../lib/models/visits';
import { visitService, demoService, healthCheckService, momService, userService } from '../../../../lib/services';
import { UserRole } from '../../../../lib/models/user';
import { v4 as uuidv4 } from 'uuid'; // Import uuid for visit_id generation

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ module: string }> }
) {
  try {
    const { module: moduleName } = await params;
    const module = moduleName as ModuleName;
    
    if (!MODULE_SCHEMAS[module]) {
      return NextResponse.json({
        success: false,
        error: `Module '${module}' not found`
      }, { status: 404 });
    }

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
    const team = searchParams.get('team') || undefined;
    const date_from = searchParams.get('date_from') || undefined;
    const date_to = searchParams.get('date_to') || undefined;
    const limit = parseInt(searchParams.get('limit') || '100');
    const offset = parseInt(searchParams.get('offset') || '0');
    const search = searchParams.get('search') || undefined;

    const queryParams = ModuleQuerySchema.parse({
      team,
      date_from,
      date_to,
      limit,
      offset,
      search
    });

    // Get role-based filters
    const baseFilters = userService.getDataFiltersForUser(user as any); // Pass full user object
    
    // Merge with request filters (if user has permission)
    let filters = { ...baseFilters };
    
    // Admin can override filters, team leads can filter within their team
    if (user.role === 'Admin') {
      if (queryParams.team) {
        filters.team = queryParams.team;
      }
    } else if (user.role === 'Team Lead' && queryParams.team) {
      // Team leads can only filter within their own team
      if (queryParams.team === user.team_name) {
        filters.team = queryParams.team;
      }
    }

    let moduleData: any[] = [];
    let total = 0;
    
    try {
      switch (module) {
        case 'visits':
          const visitsResult = await visitService.getVisits({
            userProfile: user as any, // Pass the entire user object
            page: Math.floor(queryParams.offset / queryParams.limit) + 1,
            limit: queryParams.limit,
            search: queryParams.search
          });
          moduleData = visitsResult.page;
          total = visitsResult.total;
          
          return NextResponse.json({
            success: true,
            data: moduleData,
            total: total,
            page: Math.floor(queryParams.offset / queryParams.limit) + 1,
            limit: queryParams.limit
          });
          break;
          
        case 'demos':
          const demosResult = await demoService.getDemosForAgent(user as any); // Pass the entire user object
          moduleData = demosResult;
          total = demosResult.length;
          break;
          
        case 'health-checks':
          const healthChecksResult = await healthCheckService.getHealthChecks({
            userProfile: user as any, // Pass the entire user object
            page: Math.floor(queryParams.offset / queryParams.limit) + 1,
            limit: queryParams.limit
          });
          moduleData = healthChecksResult.data;
          total = healthChecksResult.total;
          break;
          
        case 'MOM':
          const momResult = await momService.getMOMs({
            userProfile: user as any, // Pass the entire user object
            page: Math.floor(queryParams.offset / queryParams.limit) + 1,
            limit: queryParams.limit
          });
          moduleData = momResult.data;
          total = momResult.total;
          break;
          
        default:
          moduleData = [];
          total = 0;
      }
    } catch (serviceError) {
      console.error(`❌ Service error for ${module}:`, serviceError);
      
      // Fallback to demo data if service fails - remove demo data for security reasons
      // The service should throw an error if authorization fails, not return fake data.
      // Re-throw the error to be caught by the outer catch block.
      throw serviceError; 
    }

    // This part should be unreachable if case statements above return responses
    return NextResponse.json({
      data: moduleData,
      total: total,
      message: total > 0 ? `${module} data loaded from Supabase` : `${module} module - no data available`,
      filters_applied: filters
    });
  } catch (error) {
    console.error('[Module GET] Error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}

// Create new record
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ module: string }> }
) {
  try {
    const { module: moduleName } = await params;
    const module = moduleName as ModuleName;
    
    if (!MODULE_SCHEMAS[module]) {
      return NextResponse.json({
        success: false,
        error: `Module '${module}' not found`
      }, { status: 404 });
    }

    const { user, error } = await authenticateRequest(request);
    if (error) return error;
    if (!user) {
      return NextResponse.json({
        success: false,
        error: 'Authentication required'
      }, { status: 401 });
    }

    const body = await request.json();
    
    // Handle visit creation
    if (module === 'visits') {
      const visitData = {
        visit_id: uuidv4(), // Generate UUID
        brand_id: body.brand_id,
        brand_name: body.brand_name,
        agent_id: user.email, // Use authenticated user's email
        agent_name: user.full_name, // Use authenticated user's full_name
        team_name: user.team_name, // Use authenticated user's team_name
        scheduled_date: body.scheduled_date,
        visit_status: body.visit_status || 'Scheduled',
        visit_year: body.visit_year || new Date(body.scheduled_date).getFullYear().toString(),
        purpose: body.purpose,
        zone: body.zone,
      };
      
      await visitService.createVisit(visitData, user); // Pass userProfile
      
      return NextResponse.json({
        success: true,
        data: visitData
      });
    }

    return NextResponse.json({
      success: false,
      error: `Create ${module} not yet implemented`
    }, { status: 501 });
  } catch (error) {
    console.error('[Module POST] Error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}

// Update existing record
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ module: string }> }
) {
  try {
    const { module: moduleName } = await params;
    const module = moduleName as ModuleName;
    
    if (!MODULE_SCHEMAS[module]) {
      return NextResponse.json({
        success: false,
        error: `Module '${module}' not found`
      }, { status: 404 });
    }

    const { user, error } = await authenticateRequest(request);
    if (error) return error;
    if (!user) {
      return NextResponse.json({
        success: false,
        error: 'Authentication required'
      }, { status: 401 });
    }

    return NextResponse.json({
      success: false,
      error: `Update ${module} not yet implemented`
    }, { status: 501 });
  } catch (error) {
    console.error('[Module PUT] Error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}

// Delete record
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ module: string }> }
) {
  try {
    const { module: moduleName } = await params;
    const module = moduleName as ModuleName;
    
    if (!MODULE_SCHEMAS[module]) {
      return NextResponse.json({
        success: false,
        error: `Module '${module}' not found`
      }, { status: 404 });
    }

    const { user, error } = await authenticateRequest(request);
    if (error) return error;
    if (!user) {
      return NextResponse.json({
        success: false,
        error: 'Authentication required'
      }, { status: 401 });
    }

    // Only admins can delete records
    if (user.role !== UserRole.ADMIN) {
      return NextResponse.json({
        success: false,
        error: 'Admin access required for delete operations'
      }, { status: 403 });
    }

    return NextResponse.json({
      success: false,
      error: `Delete ${module} not yet implemented`
    }, { status: 501 });
  } catch (error) {
    console.error('[Module DELETE] Error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}
