import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-server';
import { authenticateRequest, hasRole, unauthorizedResponse } from '@/lib/api-auth'; // Import auth helpers
import { visitService, masterDataService, userService } from '@/lib/services'; // Import services
import { UserRole } from '@/lib/models/user'; // Import UserRole
import { requireDebugMode } from '@/lib/debug-protection'; // Keep debug protection

export async function GET(request: NextRequest) {
  // Protect in production (or if debug mode is disabled)
  const debugCheck = requireDebugMode();
  if (debugCheck) return debugCheck; // Returns 404 if debug mode is off or in production
  
  try {
    // Authenticate the request first
    const { user, error: authError } = await authenticateRequest(request);
    if (authError) return authError;
    if (!user) { // Should not happen if authError is handled
      return NextResponse.json({
        success: false,
        error: 'Authentication required'
      }, { status: 401 });
    }

    const requestedEmail = request.nextUrl.searchParams.get('email');
    let targetUserProfile: UserProfile = user; // Default to authenticated user's profile

    // Determine the target user for whom to fetch data
    if (requestedEmail && requestedEmail !== user.email) {
      // Only Admin users can query for other users' data in this debug endpoint
      if (!hasRole(user, [UserRole.ADMIN])) {
        return unauthorizedResponse('Access denied - Only Admins can query other users\' debug data');
      }

      // Fetch the actual profile for the requested email
      const fetchedTargetProfile = await userService.getUserProfileByEmail(requestedEmail);
      if (!fetchedTargetProfile) {
        return NextResponse.json({
          success: false,
          error: `Target user profile for ${requestedEmail} not found`
        }, { status: 404 });
      }
      targetUserProfile = fetchedTargetProfile;
    } else if (requestedEmail && requestedEmail === user.email) {
      // If requestedEmail is same as authenticated user, use authenticated user's profile
      targetUserProfile = user;
    } else if (!requestedEmail && !hasRole(user, [UserRole.ADMIN])) {
      // If no email requested and not admin, default to own user
      targetUserProfile = user;
    } else if (!requestedEmail && hasRole(user, [UserRole.ADMIN])) {
        // Admin user and no email requested, means get stats for own profile
        targetUserProfile = user;
    }
    
    console.log('🔍 [USER DATA DEBUG] Fetching data for target:', targetUserProfile.email, 'by authenticated user:', user.email);
    
    // Leverage existing secure service calls instead of reimplementing logic
    const visitStats = await visitService.getVisitStatistics(targetUserProfile);
    const masterDataResult = await masterDataService.getMasterData({ userProfile: targetUserProfile, limit: 999999 });

    // Assuming masterDataService.getMasterData returns { data: brands[] }
    const userBrands = masterDataResult.data || [];

    // All logic related to visits and brands is handled by the services
    // The statistics from visitStats already include most of what's needed.
    // Re-construct the response based on the service results
    
    const result = {
      success: true,
      user: {
        email: targetUserProfile.email,
        name: targetUserProfile.fullName,
        role: targetUserProfile.role,
        team: targetUserProfile.team_name
      },
      brands: {
        total: masterDataResult.total, // Use total from masterDataService
        with_visits: visitStats.brands_with_visits,
        without_visits: masterDataResult.total - visitStats.brands_with_visits,
        list: userBrands.map((b: any) => ({ // Assuming MasterData has brand_name, kam_email_id, kam_name
          brand_name: b.brandName,
          kam_email: b.kam_email_id,
          kam_name: b.kam_name
        }))
      },
      visits: {
        total: visitStats.total_visits_done + visitStats.total_visits_pending + visitStats.total_scheduled_visits + visitStats.total_cancelled_visits,
        completed: visitStats.completed,
        pending: visitStats.pending,
        scheduled: visitStats.scheduled,
        cancelled: visitStats.cancelled,
        by_status: {
          Completed: visitStats.completed,
          Pending: visitStats.pending,
          Scheduled: visitStats.scheduled,
          Cancelled: visitStats.cancelled
        }
      },
      mom: {
        shared_yes: visitStats.mom_shared_yes,
        shared_no: visitStats.mom_shared_no,
        pending: visitStats.mom_pending
      },
      approval: {
        approved: visitStats.approved,
        rejected: visitStats.rejected,
        pending: visitStats.pending_approval
      },
      progress: {
        brands_coverage: visitStats.overall_progress, // Use overall_progress from visitStats
        visit_completion: visitStats.current_month_progress // Using monthly progress
      },
      // Optionally include some raw data from the services if needed for debug
      raw_service_data: {
        visit_statistics: visitStats,
        master_data_details: masterDataResult.data.slice(0, 5), // Sample
      }
    };
    
    console.log('📊 [USER DATA DEBUG - SUMMARY] Results for', targetUserProfile.email);
    
    return NextResponse.json(result);
    
  } catch (error: any) {
    console.error('❌ [USER DATA DEBUG] Fatal error:', error);
    return NextResponse.json({
      success: false,
      error: error.message || String(error),
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined // Only show stack in dev
    }, { status: 500 });
  }
}
