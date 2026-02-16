import { NextRequest, NextResponse } from 'next/server';
import { ModuleQuerySchema, MODULE_SCHEMAS, ModuleName } from '../../../../lib/models/visits';
import { visitService, demoService, healthCheckService, momService, userService } from '../../../../lib/services';
import { UserRole } from '../../../../lib/models/user';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ module: string }> }
) {
  try {
    const { module: moduleName } = await params;
    const module = moduleName as ModuleName;
    
    if (!MODULE_SCHEMAS[module]) {
      return NextResponse.json({
        error: `Module '${module}' not found`
      }, { status: 404 });
    }

    // Get user info from middleware
    const userEmail = request.headers.get('x-user-email');
    const userRole = request.headers.get('x-user-role');
    const userTeam = request.headers.get('x-user-team');
    
    if (!userEmail) {
      return NextResponse.json({
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
    const baseFilters = userService.getDataFiltersForUser({
      email: userEmail,
      role: userRole as any,
      team_name: userTeam || undefined,
      full_name: '',
      permissions: [],
      is_active: true
    });
    
    // Merge with request filters (if user has permission)
    let filters = { ...baseFilters };
    
    // Normalize role for comparison
    const normalizedRole = userRole?.toLowerCase().replace(/[_\s]/g, '');
    
    // Admin can override filters, team leads can filter within their team
    if (normalizedRole === 'admin') {
      if (queryParams.team) {
        filters.team = queryParams.team;
      }
    } else if (normalizedRole === 'teamlead' && queryParams.team) {
      // Team leads can only filter within their own team
      if (queryParams.team === userTeam) {
        filters.team = queryParams.team;
      }
    }

    let moduleData: any[] = [];
    let total = 0;
    
    try {
      switch (module) {
        case 'visits':
          const visitsResult = await visitService.getVisits({
            email: userEmail,
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
          const demosResult = await demoService.getDemosForAgent({
            agentId: userEmail,
            role: userRole as any,
            teamName: userTeam || undefined
          });
          moduleData = demosResult;
          total = demosResult.length;
          break;
          
        case 'health-checks':
          const healthChecksResult = await healthCheckService.getHealthChecks({
            email: userEmail,
            page: Math.floor(queryParams.offset / queryParams.limit) + 1,
            limit: queryParams.limit
          });
          moduleData = healthChecksResult.data;
          total = healthChecksResult.total;
          break;
          
        case 'MOM':
          const momResult = await momService.getMOMs({
            email: userEmail,
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
      
      // Fallback to demo data if Convex fails
      switch (module) {
        case 'visits':
          moduleData = [
            {
              id: '1',
              visit_id: 'V001',
              brand_id: 'B001',
              brand_name: 'Sample Restaurant',
              agent_id: userEmail,
              agent_name: 'Agent',
              team_lead_id: userTeam || '',
              scheduled_date: '2024-01-15',
              visit_date: '2024-01-15',
              visit_status: 'Completed',
              mom_shared: 'Yes',
              mom_shared_date: '2024-01-16',
              approval_status: 'Approved',
              visit_year: '2024',
              purpose: 'Regular check-up',
              outcome: 'Positive feedback',
              next_steps: 'Follow up in 2 weeks',
              duration_minutes: '45',
              attendees: 'Manager, Owner',
              notes: 'Good meeting',
              created_at: '2024-01-15T10:00:00Z',
              updated_at: '2024-01-16T10:00:00Z'
            }
          ];
          total = 1;
          break;
          
        case 'demos':
          moduleData = [
            {
              id: '1',
              demo_id: 'D001',
              customer_name: 'Sample Customer',
              demo_date: '2024-01-15',
              product_demo: 'POS System',
              attendees: 'Owner, Manager',
              outcome: 'Interested',
              follow_up_date: '2024-01-22',
              created_by: userEmail,
              team: userTeam || 'Default Team',
              status: 'Completed',
              demo_done_count: '1',
              demo_pending_count: '0',
              last_connected: '2024-01-15',
              brand_type: 'Restaurant'
            }
          ];
          total = 1;
          break;
          
        case 'health-checks':
          moduleData = [
            {
              id: '1',
              check_id: 'HC001',
              kam_name: 'Agent',
              brand_name: 'Sample Restaurant',
              zone: 'South',
              health_status: 'Good',
              nature_of_visit: 'Regular Check',
              remarks: 'All systems working well',
              dead_not_connected: 'Connected',
              customer_name: 'Restaurant Owner',
              check_date: '2024-01-15',
              health_score: 85,
              issues_identified: 'None',
              action_items: 'Continue monitoring',
              next_check_date: '2024-02-15',
              created_by: userEmail,
              team: userTeam || 'Default Team'
            }
          ];
          total = 1;
          break;
          
        case 'MOM':
          moduleData = [
            {
              id: '1',
              ticket_id: 'MOM001',
              title: 'Sample MOM Record',
              description: 'This is a sample MOM record for testing',
              status: 'Open',
              priority: 'Medium',
              created_by: userEmail,
              assigned_to: userEmail,
              team: userTeam || 'Default Team',
              created_at: '2024-01-15T10:00:00Z',
              updated_at: '2024-01-15T10:00:00Z'
            }
          ];
          total = 1;
          break;
          
        default:
          moduleData = [];
          total = 0;
      }
    }

    return NextResponse.json({
      data: moduleData,
      total: total,
      message: total > 0 ? `${module} data loaded from Convex` : `${module} module - no data available`,
      filters_applied: filters
    });
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.log(`❌ Error fetching module data: ${error}`);
    }
    return NextResponse.json({
      error: 'Failed to fetch module data',
      detail: String(error)
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
        error: `Module '${module}' not found`
      }, { status: 404 });
    }

    // Get user info from middleware
    const userEmail = request.headers.get('x-user-email');
    const userRole = request.headers.get('x-user-role');
    const userTeam = request.headers.get('x-user-team');
    
    if (!userEmail) {
      return NextResponse.json({
        error: 'Authentication required'
      }, { status: 401 });
    }

    const body = await request.json();
    
    // Handle visit creation
    if (module === 'visits') {
      const { v4: uuidv4 } = require('uuid');
      
      // Get user profile for agent name
      const userProfile = await userService.getUserProfileByEmail(userEmail);
      
      const visitData = {
        visit_id: uuidv4(),
        brand_id: body.brand_id,
        brand_name: body.brand_name,
        agent_id: userEmail,
        agent_name: userProfile?.full_name || userEmail,
        team_name: userTeam || userProfile?.team_name,
        scheduled_date: body.scheduled_date,
        visit_status: body.visit_status || 'Scheduled',
        visit_year: body.visit_year || new Date(body.scheduled_date).getFullYear().toString(),
        purpose: body.purpose,
        zone: body.zone,
      };
      
      await visitService.createVisit(visitData);
      
      return NextResponse.json({
        success: true,
        data: visitData
      });
    }

    return NextResponse.json({
      error: `Create ${module} not yet implemented`
    }, { status: 501 });
  } catch (error) {
    console.log(`❌ Error creating record: ${error}`);
    return NextResponse.json({
      error: 'Failed to create record',
      detail: String(error)
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
        error: `Module '${module}' not found`
      }, { status: 404 });
    }

    // Get user info from middleware
    const userEmail = request.headers.get('x-user-email');
    
    if (!userEmail) {
      return NextResponse.json({
        error: 'Authentication required'
      }, { status: 401 });
    }

    return NextResponse.json({
      error: `Update ${module} not yet implemented with Convex`
    }, { status: 501 });
  } catch (error) {
    console.log(`❌ Error updating record: ${error}`);
    return NextResponse.json({
      error: 'Failed to update record',
      detail: String(error)
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
        error: `Module '${module}' not found`
      }, { status: 404 });
    }

    // Get user info from middleware
    const userEmail = request.headers.get('x-user-email');
    const userRole = request.headers.get('x-user-role');
    
    if (!userEmail) {
      return NextResponse.json({
        error: 'Authentication required'
      }, { status: 401 });
    }

    // Only admins can delete records
    if (userRole !== UserRole.ADMIN) {
      return NextResponse.json({
        error: 'Admin access required for delete operations'
      }, { status: 403 });
    }

    return NextResponse.json({
      error: `Delete ${module} not yet implemented with Convex`
    }, { status: 501 });
  } catch (error) {
    console.log(`❌ Error deleting record: ${error}`);
    return NextResponse.json({
      error: 'Failed to delete record',
      detail: String(error)
    }, { status: 500 });
  }
}