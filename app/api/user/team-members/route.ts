import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest, hasRole, unauthorizedResponse } from '@/lib/api-auth';
import { getSupabaseAdmin } from '@/lib/supabase-server';
import { UserRole } from '@/lib/models/user';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    // Authenticate
    const { user, error } = await authenticateRequest(request);
    if (error) return error;
    if (!user) {
      return NextResponse.json({
        success: false,
        error: 'Authentication required'
      }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    let team = searchParams.get('team');

    // Authorization check
    const normalizedUserRole = user.role.toLowerCase().replace(/\s+/g, '_');

    const supabase = getSupabaseAdmin();

    const isAdmin = normalizedUserRole === 'admin';
    const isTeamLead = normalizedUserRole === 'team_lead' || normalizedUserRole === 'teamlead';

    if (isAdmin) {
      // Admin can view any team members; team param required
      if (!team) {
        return NextResponse.json({ success: false, error: 'team parameter is required' }, { status: 400 });
      }
      console.log(`✅ [API Auth] Admin ${user.email} viewing team: ${team}`);
    } else if (isTeamLead) {
      // If team param is missing or empty, fall back to the authenticated user's own team from DB
      if (!team) {
        const { data: freshProfile } = await supabase
          .from('user_profiles')
          .select('team_name')
          .eq('email', user.email)
          .single();
        team = (freshProfile as { team_name: string | null } | null)?.team_name || null;
        console.log(`ℹ️ [API Auth] Team Lead ${user.email} - resolved team from DB: ${team}`);
      }

      if (!team) {
        return NextResponse.json({ success: false, error: 'Team Lead has no team assigned' }, { status: 400 });
      }

      // Team Lead can only view members of their own team
      const userTeam = user.team_name || (await supabase
        .from('user_profiles')
        .select('team_name')
        .eq('email', user.email)
        .single()
        .then((r: any) => (r.data as { team_name: string | null } | null)?.team_name));

      if (userTeam?.toLowerCase() !== team.toLowerCase()) {
        console.log(`❌ [API Auth] Team Lead ${user.email} attempted to view unauthorized team: ${team}`);
        return unauthorizedResponse(`Access denied - Team Leads can only view their own team's members. Your team: ${userTeam}`);
      }
      console.log(`✅ [API Auth] Team Lead ${user.email} viewing own team members: ${team}`);
    } else {
      console.log(`❌ [API Auth] User ${user.email} (Role: ${user.role}) attempted to view team: ${team}`);
      return unauthorizedResponse('Access denied - Only Team Leads and Admins can view team members.');
    }

    const { data: teamMembers, error: dbError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('team_name', team)
      .eq('is_active', true)
      .order('full_name');

    if (dbError) {
      throw dbError;
    }

    return NextResponse.json({
      success: true,
      data: teamMembers || []
    });

  } catch (error) {
    console.error('❌ Error getting team members:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to get team members',
      detail: String(error)
    }, { status: 500 });
  }
}

