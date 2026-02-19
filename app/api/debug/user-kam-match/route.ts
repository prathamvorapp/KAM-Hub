import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin, supabase } from '@/lib/supabase-server';
import { requireDebugMode } from '@/lib/debug-protection';
import { authenticateRequest, hasRole, unauthorizedResponse } from '@/lib/api-auth'; // New import
import { UserService } from '../../../../lib/services/userService'; // New import
import { UserRole } from '@/lib/models/user'; // New import

const userService = new UserService(); // Instantiate userService

export async function GET(request: NextRequest) {
  // Protect in production
  const debugCheck = requireDebugMode();
  if (debugCheck) return debugCheck;
  
  try {
    // Authenticate the request
    const { user, error: authError } = await authenticateRequest(request);
    if (authError) return authError;
    if (!user) { // Should not happen if authError is handled
      return NextResponse.json({
        success: false,
        error: 'Authentication required'
      }, { status: 401 });
    }

    const requestedEmail = request.nextUrl.searchParams.get('email');
    let targetEmail: string;

    // Determine target user for whom to fetch data
    if (requestedEmail && requestedEmail !== user.email) {
      // Only Admin users can query for other users' data in this debug endpoint
      if (!hasRole(user, [UserRole.ADMIN])) {
        return unauthorizedResponse('Access denied - Only Admins can query other users\' debug data');
      }
      targetEmail = requestedEmail;
    } else if (requestedEmail && requestedEmail === user.email) {
      targetEmail = requestedEmail;
    } else {
      // If no email requested, default to authenticated user's email
      targetEmail = user.email;
    }
    
    // Get user profile for the target email
    const userProfile = await userService.getUserProfileByEmail(targetEmail);
    // Note: The previous code was using `supabase.from('user_profiles')` but `userService` is preferred.

    if (!userProfile) {
      return NextResponse.json({
        error: 'User profile not found for target email',
        target_email: targetEmail
      }, { status: 404 });
    }

    const profile = userProfile as any; // Use profile from userService

    // Get all unique KAM names from churn_records
    const { data: churnRecords } = await getSupabaseAdmin()
      .from('churn_records')
      .select('kam')
      .limit(1000);

    const records = churnRecords as any[];
    const uniqueKAMs = Array.from(new Set(records?.map((r: any) => r.kam) || [])).sort();

    // Check if user's full_name matches any KAM
    const matchingRecordsCount = records?.filter((r: any) => r.kam === profile.full_name).length || 0;

    // Get team members if Team Lead
    let teamMembers = null;
    if (profile.role === 'Team Lead' || profile.role === 'team_lead') {
      const { data: members } = await supabase
        .from('user_profiles')
        .select('full_name, email, role')
        .eq('team_name', profile.team_name)
        .eq('is_active', true);
      teamMembers = members;
    }

    return NextResponse.json({
      user_profile: {
        email: profile.email,
        full_name: profile.full_name,
        role: profile.role,
        team_name: profile.team_name
      },
      matching_records_count: matchingRecordsCount,
      all_kam_names: uniqueKAMs,
      team_members: teamMembers,
      diagnosis: {
        has_matching_records: matchingRecordsCount > 0,
        full_name_in_kam_list: uniqueKAMs.includes(profile.full_name),
        possible_matches: uniqueKAMs.filter((kam: any) => 
          kam.toLowerCase().includes(profile.full_name.toLowerCase()) ||
          profile.full_name.toLowerCase().includes(kam.toLowerCase())
        )
      }
    });

  } catch (error) {
    console.error('❌ Debug error:', error);
    return NextResponse.json({
      error: 'Failed to get debug info',
      detail: String(error)
    }, { status: 500 });
  }
}
