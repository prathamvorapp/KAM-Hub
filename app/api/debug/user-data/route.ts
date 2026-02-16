import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-client';

export async function GET(request: NextRequest) {
  try {
    const email = request.nextUrl.searchParams.get('email') || 'rahul.taak@petpooja.com';
    console.log('🔍 [USER DATA] Fetching data for:', email);
    
    const supabase = getSupabaseAdmin();
    
    // Step 1: Get user profile
    console.log('📊 [STEP 1] Fetching user profile...');
    const { data: userProfile, error: userError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('email', email)
      .single();
    
    if (userError) {
      console.error('❌ [STEP 1] Error:', userError);
      return NextResponse.json({
        success: false,
        error: 'User profile not found',
        details: userError.message,
        step: 'user_profile'
      }, { status: 404 });
    }
    
    console.log('✅ [STEP 1] User profile found:', {
      email: userProfile.email,
      role: userProfile.role,
      team: userProfile.team_name,
      name: userProfile.full_name
    });
    
    // Step 2: Get brands assigned to this user
    console.log('📊 [STEP 2] Fetching brands from master_data...');
    const { data: allBrands, error: brandsError } = await supabase
      .from('master_data')
      .select('*');
    
    if (brandsError) {
      console.error('❌ [STEP 2] Error:', brandsError);
      return NextResponse.json({
        success: false,
        error: 'Failed to fetch brands',
        details: brandsError.message,
        step: 'master_data'
      }, { status: 500 });
    }
    
    console.log('✅ [STEP 2] Total brands in master_data:', allBrands?.length || 0);
    
    // Filter brands based on user role
    let userBrands: any[] = [];
    
    if (userProfile.role === 'agent' || userProfile.role === 'Agent') {
      userBrands = allBrands?.filter(brand => 
        brand.kam_email_id === email || brand.kam_name === userProfile.full_name
      ) || [];
      console.log('✅ [STEP 2] Agent brands (filtered by kam_email_id or kam_name):', userBrands.length);
    } else if (userProfile.role === 'team_lead' || userProfile.role === 'Team Lead') {
      // Get all agents in the team
      const { data: teamAgents } = await supabase
        .from('user_profiles')
        .select('email, full_name')
        .eq('team_name', userProfile.team_name)
        .in('role', ['agent', 'Agent']);
      
      const agentEmails = teamAgents?.map(agent => agent.email) || [];
      userBrands = allBrands?.filter(brand => 
        agentEmails.includes(brand.kam_email_id)
      ) || [];
      console.log('✅ [STEP 2] Team lead brands (team:', userProfile.team_name, '):', userBrands.length);
    } else if (userProfile.role === 'admin' || userProfile.role === 'Admin') {
      userBrands = allBrands || [];
      console.log('✅ [STEP 2] Admin - all brands:', userBrands.length);
    }
    
    // Step 3: Get visits for current year
    console.log('📊 [STEP 3] Fetching visits...');
    const currentYear = new Date().getFullYear().toString();
    
    let visitQuery = supabase
      .from('visits')
      .select('*')
      .eq('visit_year', currentYear);
    
    // Apply role-based filtering
    if (userProfile.role === 'agent' || userProfile.role === 'Agent') {
      visitQuery = visitQuery.eq('agent_id', email);
    } else if (userProfile.role === 'team_lead' || userProfile.role === 'Team Lead') {
      visitQuery = visitQuery.eq('team_name', userProfile.team_name);
    }
    
    const { data: allVisits, error: visitsError } = await visitQuery;
    
    if (visitsError) {
      console.error('❌ [STEP 3] Error:', visitsError);
      return NextResponse.json({
        success: false,
        error: 'Failed to fetch visits',
        details: visitsError.message,
        step: 'visits'
      }, { status: 500 });
    }
    
    console.log('✅ [STEP 3] Total visits found:', allVisits?.length || 0);
    
    // Filter visits by user's brands
    const brandNames = userBrands.map(b => b.brand_name);
    const userVisits = allVisits?.filter(visit => 
      brandNames.includes(visit.brand_name)
    ) || [];
    
    console.log('✅ [STEP 3] Visits for user brands:', userVisits.length);
    
    // Calculate statistics
    const nonCancelledVisits = userVisits.filter(v => v.visit_status !== 'Cancelled');
    const completedVisits = nonCancelledVisits.filter(v => v.visit_status === 'Completed');
    const pendingVisits = nonCancelledVisits.filter(v => 
      v.visit_status === 'Pending' || 
      v.visit_status === 'Scheduled' || 
      !v.visit_status
    );
    const scheduledVisits = nonCancelledVisits.filter(v => v.visit_status === 'Scheduled');
    const cancelledVisits = userVisits.filter(v => v.visit_status === 'Cancelled');
    
    // Brands with visits
    const brandsWithVisits = new Set(nonCancelledVisits.map(v => v.brand_name));
    
    // MOM statistics
    const momSharedYes = nonCancelledVisits.filter(v => v.mom_shared === 'Yes').length;
    const momSharedNo = nonCancelledVisits.filter(v => v.mom_shared === 'No').length;
    const momPending = nonCancelledVisits.filter(v => v.mom_shared === 'Pending' || !v.mom_shared).length;
    
    // Approval statistics
    const approved = nonCancelledVisits.filter(v => v.approval_status === 'Approved').length;
    const rejected = nonCancelledVisits.filter(v => v.approval_status === 'Rejected').length;
    const pendingApproval = nonCancelledVisits.filter(v => v.approval_status === 'Pending' || !v.approval_status).length;
    
    const result = {
      success: true,
      user: {
        email: userProfile.email,
        name: userProfile.full_name,
        role: userProfile.role,
        team: userProfile.team_name
      },
      brands: {
        total: userBrands.length,
        with_visits: brandsWithVisits.size,
        without_visits: userBrands.length - brandsWithVisits.size,
        list: userBrands.map(b => ({
          brand_name: b.brand_name,
          kam_email: b.kam_email_id,
          kam_name: b.kam_name
        }))
      },
      visits: {
        total: userVisits.length,
        completed: completedVisits.length,
        pending: pendingVisits.length,
        scheduled: scheduledVisits.length,
        cancelled: cancelledVisits.length,
        by_status: {
          Completed: completedVisits.length,
          Pending: pendingVisits.length,
          Scheduled: scheduledVisits.length,
          Cancelled: cancelledVisits.length
        }
      },
      mom: {
        shared_yes: momSharedYes,
        shared_no: momSharedNo,
        pending: momPending
      },
      approval: {
        approved: approved,
        rejected: rejected,
        pending: pendingApproval
      },
      progress: {
        brands_coverage: userBrands.length > 0 
          ? Math.round((brandsWithVisits.size / userBrands.length) * 100) 
          : 0,
        visit_completion: nonCancelledVisits.length > 0
          ? Math.round((completedVisits.length / nonCancelledVisits.length) * 100)
          : 0
      },
      raw_data: {
        sample_brands: userBrands.slice(0, 5),
        sample_visits: userVisits.slice(0, 5)
      }
    };
    
    console.log('📊 [SUMMARY] Results:', {
      total_brands: result.brands.total,
      brands_with_visits: result.brands.with_visits,
      total_visits: result.visits.total,
      completed_visits: result.visits.completed
    });
    
    return NextResponse.json(result);
    
  } catch (error: any) {
    console.error('❌ [USER DATA] Fatal error:', error);
    return NextResponse.json({
      success: false,
      error: error.message,
      stack: error.stack
    }, { status: 500 });
  }
}
