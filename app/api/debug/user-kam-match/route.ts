import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin, supabase } from '@/lib/supabase-client';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get('email');
    
    if (!email) {
      return NextResponse.json({
        error: 'Email parameter required'
      }, { status: 400 });
    }

    // Get user profile
    const { data: userProfile } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('email', email)
      .single();

    if (!userProfile) {
      return NextResponse.json({
        error: 'User profile not found'
      }, { status: 404 });
    }

    // Get all unique KAM names from churn_records
    const { data: churnRecords } = await getSupabaseAdmin()
      .from('churn_records')
      .select('kam')
      .limit(1000);

    const uniqueKAMs = [...new Set(churnRecords?.map(r => r.kam) || [])].sort();

    // Check if user's full_name matches any KAM
    const matchingRecordsCount = churnRecords?.filter(r => r.kam === userProfile.full_name).length || 0;

    // Get team members if Team Lead
    let teamMembers = null;
    if (userProfile.role === 'Team Lead' || userProfile.role === 'team_lead') {
      const { data: members } = await supabase
        .from('user_profiles')
        .select('full_name, email, role')
        .eq('team_name', userProfile.team_name)
        .eq('is_active', true);
      teamMembers = members;
    }

    return NextResponse.json({
      user_profile: {
        email: userProfile.email,
        full_name: userProfile.full_name,
        role: userProfile.role,
        team_name: userProfile.team_name
      },
      matching_records_count: matchingRecordsCount,
      all_kam_names: uniqueKAMs,
      team_members: teamMembers,
      diagnosis: {
        has_matching_records: matchingRecordsCount > 0,
        full_name_in_kam_list: uniqueKAMs.includes(userProfile.full_name),
        possible_matches: uniqueKAMs.filter(kam => 
          kam.toLowerCase().includes(userProfile.full_name.toLowerCase()) ||
          userProfile.full_name.toLowerCase().includes(kam.toLowerCase())
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
