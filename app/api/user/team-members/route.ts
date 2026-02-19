import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest, hasRole, unauthorizedResponse } from '@/lib/api-auth';
import { getSupabaseAdmin } from '@/lib/supabase-server';
import { UserRole } from '@/lib/models/user';

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
    const team = searchParams.get('team');

    if (!team) {
      return NextResponse.json({
        success: false,
        error: 'team parameter is required'
      }, { status: 400 });
    }

    // Authorization check
    // Normalize roles for comparison
    const normalizedUserRole = user.role.toLowerCase();

    if (normalizedUserRole === UserRole.ADMIN.toLowerCase()) {
      // Admin can view any team members
      console.log(`✅ [API Auth] Admin ${user.email} viewing team: ${team}`);
    } else if (normalizedUserRole === UserRole.TEAM_LEAD.toLowerCase()) {
      // Team Lead can only view members of their own team
      if (user.team_name?.toLowerCase() !== team.toLowerCase()) {
        console.log(`❌ [API Auth] Team Lead ${user.email} attempted to view unauthorized team: ${team}`);
        return unauthorizedResponse(`Access denied - Team Leads can only view their own team's members. Your team: ${user.team_name}`);
      }
      console.log(`✅ [API Auth] Team Lead ${user.email} viewing own team members: ${team}`);
    } else {
      // Agents and other roles cannot view team members (or perhaps only their own, which this route doesn't support directly)
      console.log(`❌ [API Auth] User ${user.email} (Role: ${user.role}) attempted to view team: ${team}`);
      return unauthorizedResponse('Access denied - Only Team Leads and Admins can view team members.');
    }

    const supabase = getSupabaseAdmin();

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

