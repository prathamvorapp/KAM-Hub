/**
 * Visit Service - Supabase Implementation
 */

import { supabase, getSupabaseAdmin } from '../supabase-server';
import { normalizeUserProfile } from '../../utils/authUtils';

// Type definitions
interface UserProfile {
  id?: string;
  dbId?: string;
  email: string;
  fullName: string;
  role: string;
  team_name?: string;
  teamName?: string;
  coordinator_id?: string;
  [key: string]: any;
}

interface Visit {
  visit_id: string;
  agent_id: string;
  team_name?: string;
  [key: string]: any;
}

export const visitService = {
  // Authorization Helper for Visit access
  _authorizeVisitAccess: async (visit: Visit, rawProfile: UserProfile): Promise<boolean> => {
    const userProfile = normalizeUserProfile(rawProfile);
    const normalizedRole = userProfile.role.toLowerCase().replace(/\s+/g, '_');
    
    if (normalizedRole === 'admin') {
      return true;
    }
    if (normalizedRole === 'team_lead' || normalizedRole === 'teamlead') {
      // Team Lead can access visits in their team
      return (userProfile.team_name || userProfile.teamName) === visit.team_name;
    }
    if (normalizedRole === 'agent') {
      // Agent can access their own visits
      return userProfile.email === visit.agent_id;
    }
    if (normalizedRole === 'sub_agent' || normalizedRole === 'subagent') {
      // sub_agent can access any of their coordinators' visits
      const lookupId = userProfile.dbId || userProfile.id;
      if (lookupId) {
        const { data: sacRows } = await getSupabaseAdmin()
          .from('sub_agent_coordinators')
          .select('coordinator_id')
          .eq('sub_agent_id', lookupId) as { data: Array<{ coordinator_id: string }> | null; error: any };
        if (sacRows && sacRows.length > 0) {
          const { data: coords } = await getSupabaseAdmin()
            .from('user_profiles').select('email').in('id', sacRows.map(r => r.coordinator_id));
          const coordinatorEmails = (coords as any[])?.map((c: any) => c.email) || [];
          return coordinatorEmails.includes(visit.agent_id);
        }
      }
    }
    return false;
  },

  // Authorization Helper for Admin/Team Lead actions
  _authorizeVisitAdminAction: (rawProfile: UserProfile): boolean => {
    const userProfile = normalizeUserProfile(rawProfile);
    const normalizedRole = userProfile.role.toLowerCase().replace(/\s+/g, '_');
    return normalizedRole === 'admin' || normalizedRole === 'team_lead' || normalizedRole === 'teamlead';
  },

  _getIndividualAgentStatistics: async (agentProfile: UserProfile) => {
    if (!agentProfile || !agentProfile.email) {
      throw new Error("Agent profile with email is required for individual statistics");
    }

    const normalizedRole = agentProfile.role?.toLowerCase().replace(/[_\s]/g, '');
    const isSubAgent = normalizedRole === 'subagent' || normalizedRole === 'sub_agent';

    // For sub_agent: resolve coordinator emails; for agent: use own email
    let agentEmails: string[] = [agentProfile.email];
    if (isSubAgent) {
      const lookupId = agentProfile.dbId || agentProfile.id;
      if (lookupId) {
        const { data: sacRows } = await getSupabaseAdmin()
          .from('sub_agent_coordinators').select('coordinator_id')
          .eq('sub_agent_id', lookupId) as { data: Array<{ coordinator_id: string }> | null; error: any };
        if (sacRows && sacRows.length > 0) {
          const { data: coords } = await getSupabaseAdmin()
            .from('user_profiles').select('email').in('id', sacRows.map(r => r.coordinator_id));
          agentEmails = (coords as any[])?.map((c: any) => c.email).filter(Boolean) || [];
        }
      }
    }

    let visitQuery = getSupabaseAdmin().from('visits').select('*');
    const currentYearStr = new Date().getFullYear().toString();
    visitQuery = visitQuery.eq('visit_year', currentYearStr);

    if (agentEmails.length === 1) {
      visitQuery = visitQuery.eq('agent_id', agentEmails[0]);
    } else if (agentEmails.length > 1) {
      visitQuery = visitQuery.in('agent_id', agentEmails);
    }

    // Fetch brands for all relevant agent emails
    let agentBrands: any[] = [];
    let page = 0;
    const pageSize = 1000;
    let hasMore = true;

    while (hasMore) {
      let brandsQuery = getSupabaseAdmin().from('master_data').select('*');
      if (agentEmails.length === 1) {
        brandsQuery = brandsQuery.eq('kam_email_id', agentEmails[0]);
      } else {
        brandsQuery = brandsQuery.in('kam_email_id', agentEmails);
      }
      const { data: pageData, error: brandsError } = await brandsQuery
        .range(page * pageSize, (page + 1) * pageSize - 1);

      if (brandsError) {
        console.error(`❌ Error fetching brands for ${agentEmails}:`, brandsError);
        throw new Error(`Failed to fetch brands: ${brandsError.message}`);
      }

      if (pageData && pageData.length > 0) {
        agentBrands = [...agentBrands, ...pageData];
        hasMore = pageData.length === pageSize;
        page++;
      } else {
        hasMore = false;
      }
    }
    
    // Use brand_id (UUID) for counting to survive brand name changes
    const brandIdSet = new Set(agentBrands.map((brand: any) => brand.id).filter(Boolean));
    const brandFilter = agentBrands.map((brand: any) => brand.brand_name) || [];
    
    // Fetch all visits using pagination
    let allVisits: any[] = [];
    page = 0;
    hasMore = true;
    
    while (hasMore) {
      const { data: pageData, error: visitsError } = await visitQuery
        .range(page * pageSize, (page + 1) * pageSize - 1);
      
      if (visitsError) {
        console.error(`❌ Error fetching visits for ${agentProfile.email}:`, visitsError);
        throw new Error(`Failed to fetch visits: ${visitsError.message}`);
      }
      
      if (pageData && pageData.length > 0) {
        allVisits = [...allVisits, ...pageData];
        hasMore = pageData.length === pageSize;
        page++;
      } else {
        hasMore = false;
      }
    }
    
    const visits = allVisits;
    const total_brands = brandIdSet.size;
    const nonCancelledVisits = visits.filter((v: any) => v.visit_status !== 'Cancelled'); 
    
    const approvedVisits = nonCancelledVisits.filter((v: any) => 
      v.visit_status === 'Completed' && v.approval_status === 'Approved'
    );
    
    // Count by brand_id (falls back to brand_name for legacy visits without brand_id)
    const brandsWithApprovedMOM = new Set(
      approvedVisits.map((visit: any) => visit.brand_id || visit.brand_name)
    );
    const visit_done = brandsWithApprovedMOM.size;
    const pending_visits = total_brands - visit_done;
    
    const brandsWithVisits = new Set(nonCancelledVisits.map((visit: any) => visit.brand_id || visit.brand_name));
    const brands_with_visits = brandsWithVisits.size;

    const completed = nonCancelledVisits.filter((v: any) => v.visit_status === 'Completed').length;
    const cancelled = visits.filter((v: any) => v.visit_status === 'Cancelled').length;
    const scheduled = nonCancelledVisits.filter((v: any) => v.visit_status === 'Scheduled').length;

    const mom_pending = nonCancelledVisits.filter((v: any) => 
      (v.visit_status === 'Completed' && (!v.mom_shared || v.mom_shared === 'No' || v.mom_shared === 'Pending')) ||
      (v.approval_status === 'Rejected')
    ).length;

    const approved = nonCancelledVisits.filter((v: any) => v.approval_status === 'Approved').length;
    const rejected = nonCancelledVisits.filter((v: any) => v.approval_status === 'Rejected').length;
    const pending_approval = nonCancelledVisits.filter((v: any) => v.approval_status === 'Pending' || !v.approval_status).length;

    const currentDate = new Date();
    const currentMonth = currentDate.getMonth();
    const currentYearNum = currentDate.getFullYear();
    
    const currentMonthVisits = nonCancelledVisits.filter((visit: any) => {
      const visitDate = new Date(visit.scheduled_date);
      return visitDate.getMonth() === currentMonth && visitDate.getFullYear() === currentYearNum;
    });
    
    const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1;
    const lastMonthYear = currentMonth === 0 ? currentYearNum - 1 : currentYearNum;
    const lastMonthVisits = nonCancelledVisits.filter((visit: any) => {
      const visitDate = new Date(visit.scheduled_date);
      return visitDate.getMonth() === lastMonth && visitDate.getFullYear() === lastMonthYear;
    });

    const monthly_target = 10; // Assuming a default monthly target
    const current_month_scheduled = currentMonthVisits.filter((v: any) => v.visit_status === 'Scheduled').length;
    const current_month_completed = currentMonthVisits.filter((v: any) => v.visit_status === 'Completed').length;
    const current_month_total_visits = current_month_scheduled + current_month_completed; // Completed + Scheduled
    const current_month_progress = monthly_target > 0 ? Math.round((current_month_total_visits / monthly_target) * 100) : 0;
    const overall_progress = total_brands > 0 ? Math.round((brands_with_visits / total_brands) * 100) : 0;

    return {
      agent_name: agentProfile.fullName,
      agent_email: agentProfile.email,
      team_name: agentProfile.team_name || agentProfile.teamName,
      total_brands,
      total_visits_done: visit_done, // Brands with approved MOMs
      total_visits_pending: pending_visits, // Brands assigned but no approved MOM
      total_scheduled_visits: scheduled,
      total_cancelled_visits: cancelled,
      last_month_visits: lastMonthVisits.length,
      current_month_scheduled,
      current_month_completed,
      current_month_total: currentMonthVisits.length,
      current_month_total_visits,
      mom_pending,
      monthly_target,
      current_month_progress,
      overall_progress,
      approved_moms: approved,
      rejected_moms: rejected,
      pending_approval_moms: pending_approval,
      error: false // Indicate no error for this agent
    };
  },

  // Get visit statistics for a user
  async getComprehensiveTeamVisitStatistics(rawProfile: UserProfile) { // New name
    const userProfile = normalizeUserProfile(rawProfile);
    if (!userProfile) {
      throw new Error("User profile is required");
    }

    const normalizedRole = userProfile.role.toLowerCase().replace(/\s+/g, '_');
    let agentprofiles: UserProfile[] = [];

    if (normalizedRole === 'agent') {
      agentprofiles.push(userProfile);
    } else if (normalizedRole === 'team_lead' || normalizedRole === 'teamlead') {
      const teamName = userProfile.team_name || userProfile.teamName;
      if (!teamName) {
        throw new Error("Team lead must have a team assigned");
      }
      // Include the team lead themselves if they also act as an agent or have assigned brands
      agentprofiles.push(userProfile);
      
      const { data: teamMembers, error } = await getSupabaseAdmin()
        .from('user_profiles')
        .select('email, full_name, role, team_name')
        .eq('team_name', teamName)
        .in('role', ['agent', 'Agent']); // Only get agents
      
      if (error) throw error;

      teamMembers?.forEach((member: any) => {
        const memberProfile = normalizeUserProfile(member);
        if (memberProfile.email !== userProfile.email) { // Avoid adding TL twice if also an agent
          agentprofiles.push(memberProfile);
        }
      });
    } else if (normalizedRole === 'sub_agent' || normalizedRole === 'subagent') {
      // sub_agent: get stats for all coordinator agents
      const lookupId = userProfile.dbId || userProfile.id;
      if (lookupId) {
        const { data: sacRows } = await getSupabaseAdmin()
          .from('sub_agent_coordinators')
          .select('coordinator_id')
          .eq('sub_agent_id', lookupId) as { data: Array<{ coordinator_id: string }> | null; error: any };
        if (sacRows && sacRows.length > 0) {
          const { data: coords } = await getSupabaseAdmin()
            .from('user_profiles')
            .select('email, full_name, role, team_name')
            .in('id', sacRows.map(r => r.coordinator_id));
          coords?.forEach((c: any) => agentprofiles.push(normalizeUserProfile(c)));
        }
      }
    } else if (normalizedRole === 'admin') {
      const { data: allAgents, error } = await getSupabaseAdmin()
        .from('user_profiles')
        .select('email, full_name, role, team_name')
        .in('role', ['agent', 'Agent', 'team_lead', 'Team Lead', 'teamlead']); // Include TLs if they have stats

      if (error) throw error;

      allAgents?.forEach((agent: any) => agentprofiles.push(normalizeUserProfile(agent)));
    } else {
      throw new Error(`Access denied: Unknown role ${userProfile.role}`);
    }

    // Filter out duplicates in case TL is also listed as agent, etc.
    const uniqueAgentProfilesMap = new Map<string, UserProfile>();
    agentprofiles.forEach(profile => uniqueAgentProfilesMap.set(profile.email, profile));
    const uniqueAgentProfiles = Array.from(uniqueAgentProfilesMap.values());

    const teamStatistics = await Promise.all(
      uniqueAgentProfiles.map(async (agentProfile) => {
        try {
          // Use the new helper to get individual stats
          const stats = await visitService._getIndividualAgentStatistics(agentProfile);
          return {
            ...stats,
            agent_email: agentProfile.email,
            agent_name: agentProfile.fullName,
            team_name: agentProfile.team_name || agentProfile.teamName,
          };
        } catch (err: any) {
          console.error(`Error getting individual stats for ${agentProfile.email}:`, err);
          return {
            agent_email: agentProfile.email,
            agent_name: agentProfile.fullName,
            team_name: agentProfile.team_name || agentProfile.teamName,
            error: true,
            // Provide default/zero values for other stats
            total_brands: 0,
            total_visits_done: 0,
            total_visits_pending: 0,
            total_scheduled_visits: 0,
            total_cancelled_visits: 0,
            last_month_visits: 0,
            current_month_scheduled: 0,
            current_month_completed: 0,
            current_month_total: 0,
            current_month_total_visits: 0,
            mom_pending: 0,
            monthly_target: 0,
            current_month_progress: 0,
            overall_progress: 0,
            approved_moms: 0,
            rejected_moms: 0,
            pending_approval_moms: 0,
          };
        }
      })
    );

    // Calculate team summary from individual agent statistics
    const teamSummary = teamStatistics.reduce((summary: any, agentStats: any) => {
      if (!agentStats.error) {
        summary.total_brands += agentStats.total_brands;
        summary.total_visits_done += agentStats.total_visits_done;
        summary.total_visits_pending += agentStats.total_visits_pending;
        summary.total_scheduled_visits += agentStats.total_scheduled_visits;
        summary.total_cancelled_visits += agentStats.total_cancelled_visits;
        summary.mom_pending += agentStats.mom_pending;
        summary.current_month_completed += agentStats.current_month_completed;
        summary.current_month_scheduled += agentStats.current_month_scheduled;
        summary.current_month_total_visits += agentStats.current_month_total_visits;
        summary.approved_moms += agentStats.approved_moms;
        summary.rejected_moms += agentStats.rejected_moms;
        summary.pending_approval_moms += agentStats.pending_approval_moms;
        // Sum up targets to get a team target
        summary.monthly_target += agentStats.monthly_target;
      }
      return summary;
    }, {
      total_brands: 0,
      total_visits_done: 0,
      total_visits_pending: 0,
      total_scheduled_visits: 0,
      total_cancelled_visits: 0,
      mom_pending: 0,
      current_month_completed: 0,
      current_month_scheduled: 0,
      current_month_total_visits: 0,
      approved_moms: 0,
      rejected_moms: 0,
      pending_approval_moms: 0,
      monthly_target: 0,
    });

    // Calculate team progress based on aggregated values
    teamSummary.current_month_progress = teamSummary.monthly_target > 0 
      ? Math.round((teamSummary.current_month_total_visits / teamSummary.monthly_target) * 100) 
      : 0;
    
    // Determine the team's overall progress based on brands done vs total brands
    teamSummary.overall_progress = teamSummary.total_brands > 0 
      ? Math.round((teamSummary.total_visits_done / teamSummary.total_brands) * 100) 
      : 0;

    return {
      team_summary: teamSummary,
      team_statistics: teamStatistics, // Individual agent stats
      team_wise_breakdown: teamStatistics, // Can be the same for now, or refined later
      team_name: userProfile.team_name || userProfile.teamName || 'Organization',
      team_lead: userProfile.fullName, // Or actual team lead if different from current user
    };
  },

  // Get visits for a user with pagination
  async getVisits(params: {
    userProfile: UserProfile; // email removed, userProfile required
    search?: string;
    page?: number;
    limit?: number;
  }) {
    try {
      const { userProfile: rawProfile, search, page = 1, limit = 999999 } = params;
      const userProfile = normalizeUserProfile(rawProfile);
      
      let query = getSupabaseAdmin().from('visits').select('*', { count: 'exact' });

      const normalizedRole = userProfile.role.toLowerCase().replace(/\s+/g, '_');

      if (normalizedRole === 'agent') {
        query = query.eq('agent_id', userProfile.email);
      } else if (normalizedRole === 'sub_agent' || normalizedRole === 'subagent') {
        // sub_agent sees coordinator agents' visits
        const lookupId = userProfile.dbId || userProfile.id;
        if (lookupId) {
          const { data: sacRows } = await getSupabaseAdmin()
            .from('sub_agent_coordinators').select('coordinator_id')
            .eq('sub_agent_id', lookupId) as { data: Array<{ coordinator_id: string }> | null; error: any };
          if (sacRows && sacRows.length > 0) {
            const { data: coords } = await getSupabaseAdmin()
              .from('user_profiles').select('email').in('id', sacRows.map(r => r.coordinator_id));
            const coordinatorEmails = (coords as any[])?.map((c: any) => c.email).filter(Boolean) || [];
            query = coordinatorEmails.length > 0
              ? query.in('agent_id', coordinatorEmails)
              : query.eq('agent_id', 'NON_EXISTENT_EMAIL');
          } else {
            query = query.eq('agent_id', 'NON_EXISTENT_EMAIL');
          }
        } else {
          query = query.eq('agent_id', 'NON_EXISTENT_EMAIL');
        }
      } else if (normalizedRole === 'team_lead' || normalizedRole === 'teamlead') {
        const teamName = userProfile.team_name || userProfile.teamName;
        if (teamName) {
          query = query.eq('team_name', teamName); // Removed approval_status filter
        } else {
          // Deny if no team name for team lead
          query = query.eq('agent_id', 'NON_EXISTENT_EMAIL');
        }
      } else if (normalizedRole === 'admin') {
        // Admin sees all
      } else {
        // Unknown role, deny access
        query = query.eq('agent_id', 'NON_EXISTENT_EMAIL');
      }

      const { data: visits, count, error: visitsError } = await query;
      
      if (visitsError) {
        throw new Error(`Failed to fetch visits: ${visitsError.message}`);
      }

      // Enrich visits with correct agent names
      const agentIds = [...new Set(visits?.map((v: any) => v.agent_id).filter(Boolean) || [])];
      let agentNameMap = new Map<string, string>();

      if (agentIds.length > 0) {
        const { data: profiles } = await getSupabaseAdmin()
          .from('user_profiles')
          .select('email, full_name')
          .in('email', agentIds);
        
        agentNameMap = new Map(profiles?.map((p: any) => [p.email, p.full_name]) || []);
      }

      // Backfill brand_id for legacy visits that were created without it
      const missingBrandIdNames = [
        ...new Set(
          visits?.filter((v: any) => !v.brand_id && v.brand_name).map((v: any) => v.brand_name) || []
        )
      ];
      let brandNameToIdMap = new Map<string, string>();
      if (missingBrandIdNames.length > 0) {
        const { data: brandRows } = await getSupabaseAdmin()
          .from('master_data')
          .select('id, brand_name')
          .in('brand_name', missingBrandIdNames);
        brandNameToIdMap = new Map(brandRows?.map((b: any) => [b.brand_name, b.id]) || []);
      }

      const enrichedVisits = visits?.map((visit: any) => ({
        ...visit,
        agent_name: agentNameMap.get(visit.agent_id) || visit.agent_name || 'Unknown Agent',
        // Use stored brand_id or resolve from master_data by brand_name
        brand_id: visit.brand_id || brandNameToIdMap.get(visit.brand_name) || null,
      })) || [];
      
      let filteredVisits = enrichedVisits;

      if (search && search.trim()) {
        const searchLower = search.toLowerCase().trim();
        
        filteredVisits = filteredVisits.filter((visit: any) => 
          visit.brand_name?.toLowerCase().includes(searchLower) ||
          visit.agent_name?.toLowerCase().includes(searchLower) ||
          visit.visit_status?.toLowerCase().includes(searchLower) ||
          visit.purpose?.toLowerCase().includes(searchLower) ||
          visit.notes?.toLowerCase().includes(searchLower)
        );
      }

      const total = filteredVisits.length;
      const startIndex = (page - 1) * limit;
      const paginatedVisits = filteredVisits.slice(startIndex, startIndex + limit);

      return {
        page: paginatedVisits,
        isDone: startIndex + limit >= total,
        continueCursor: null,
        total,
        totalPages: Math.ceil(total / limit)
      };
    } catch (error: any) {
      throw error;
    }
  },

  // Create a new visit
  async createVisit(data: any, rawProfile: UserProfile) {
    const userProfile = normalizeUserProfile(rawProfile);
    const now = new Date().toISOString();
    const normalizedRole = userProfile.role.toLowerCase().replace(/\s+/g, '_');

    // For sub_agent: resolve the brand's actual KAM email FIRST before any other logic
    if ((normalizedRole === 'sub_agent' || normalizedRole === 'subagent') && data.brand_id) {
      const { data: brand, error: brandError } = await getSupabaseAdmin()
        .from('master_data')
        .select('kam_email_id, kam_name')
        .eq('id', data.brand_id)
        .single();
      if (brandError) console.error(`❌ [Sub-agent createVisit] Brand lookup error:`, brandError);
      if (brand) {
        data.agent_id = (brand as any).kam_email_id;
        data.agent_name = (brand as any).kam_name;
        data.actioned_by = userProfile.fullName || userProfile.full_name;
        console.log(`🔄 [Sub-agent createVisit] agent_id set to: ${data.agent_id}`);
      } else {
        // Fallback by brand_name
        const { data: brandByName } = await getSupabaseAdmin()
          .from('master_data').select('kam_email_id, kam_name').eq('brand_name', data.brand_name).single();
        if (brandByName) {
          data.agent_id = (brandByName as any).kam_email_id;
          data.agent_name = (brandByName as any).kam_name;
          data.actioned_by = userProfile.fullName || userProfile.full_name;
          console.log(`🔄 [Sub-agent createVisit] agent_id set via brand_name: ${data.agent_id}`);
        }
      }
    }

    // Fetch agent's team_name from user_profiles (now uses correct agent_id after sub_agent override)
    const { data: agentProfile, error: agentProfileError } = await getSupabaseAdmin()
      .from('user_profiles')
      .select('team_name')
      .eq('email', data.agent_id)
      .single();
    if (agentProfileError) {
      console.error(`Error fetching agent profile for ${data.agent_id}:`, agentProfileError);
    }
    
    // Authorization
    if (normalizedRole === 'agent') {
      if (data.agent_id !== userProfile.email) {
        throw new Error(`Access denied: Agent ${userProfile.email} cannot create visit for another agent ${data.agent_id}`);
      }
    } else if (normalizedRole === 'sub_agent' || normalizedRole === 'subagent') {
      // Brand lookup already done above — just validate agent_id is a coordinator
      const lookupId = userProfile.dbId || userProfile.id;
      if (lookupId) {
        const { data: sacRows } = await getSupabaseAdmin()
          .from('sub_agent_coordinators').select('coordinator_id').eq('sub_agent_id', lookupId) as { data: Array<{ coordinator_id: string }> | null; error: any };
        if (sacRows && sacRows.length > 0) {
          const { data: coords } = await getSupabaseAdmin()
            .from('user_profiles').select('email').in('id', sacRows.map(r => r.coordinator_id));
          const coordinatorEmails = (coords as any[])?.map((c: any) => c.email) || [];
          if (!coordinatorEmails.includes(data.agent_id)) {
            throw new Error(`Access denied: Sub-agent ${userProfile.email} cannot create visit for ${data.agent_id}`);
          }
        }
      }
    } else if (normalizedRole === 'team_lead' || normalizedRole === 'teamlead') {
      // Team Lead can create visits for themselves or their team members
      const teamName = userProfile.team_name || userProfile.teamName;
      if (data.agent_id !== userProfile.email && teamName) {
        const { data: teamMembers } = await getSupabaseAdmin()
          .from('user_profiles')
          .select('email')
          .eq('team_name', teamName)
          .in('role', ['agent', 'Agent']);
        const teamMemberEmails = teamMembers?.map((m: any) => m.email) || [];
        if (!teamMemberEmails.includes(data.agent_id)) {
          throw new Error(`Access denied: Team Lead ${userProfile.email} cannot create visit for agent ${data.agent_id} outside their team`);
        }
      }
    } else if (normalizedRole === 'admin') {
      // Admin can create visits for anyone
    } else {
      throw new Error(`Access denied: Role ${userProfile.role} is not authorized to create visits`);
    }

    const visitData = {
      ...data,
      team_name: (agentProfile as any)?.team_name || null, // Populate team_name
      visit_status: data.visit_status || "Scheduled",
      actioned_by: userProfile.fullName, // Track who created this visit
      created_at: now,
      updated_at: now,
    };

    const { error } = await getSupabaseAdmin()
      .from('visits')
      .insert(visitData);

    if (error) throw error;
    return { success: true };
  },

  // Update visit status
  async updateVisitStatus(params: {
    visit_id: string;
    visit_status: string;
    visit_date?: string;
    outcome?: string;
    next_steps?: string;
    notes?: string;
  }, rawProfile: UserProfile) { // userProfile required
    const userProfile = normalizeUserProfile(rawProfile);
    const { visit_id, ...updateData } = params;
    
    const { data: visit } = await getSupabaseAdmin()
      .from('visits')
      .select('agent_id, team_name') // Select for authorization
      .eq('visit_id', visit_id)
      .single() as { data: Visit | null; error: any };

    if (!visit) {
      throw new Error("Visit not found");
    }

    // Authorization check
    const isAuthorized = await visitService._authorizeVisitAccess(visit, userProfile);
    if (!isAuthorized) {
        throw new Error(`Access denied: User ${userProfile.email} is not authorized to update visit ${visit_id}`);
    }

    await (getSupabaseAdmin()
      .from('visits') as any)
      .update({
        ...updateData,
        updated_at: new Date().toISOString(),
      })
      .eq('visit_id', visit_id);

    return { success: true };
  },

  // Update MOM sharing status
  async updateMOMStatus(params: {
    visit_id: string;
    mom_shared: string;
    mom_shared_date?: string;
  }, rawProfile: UserProfile) { // userProfile required
    const userProfile = normalizeUserProfile(rawProfile);
    const { visit_id, ...updateData } = params;
    
    const { data: visit } = await getSupabaseAdmin()
      .from('visits')
      .select('agent_id, team_name') // Select for authorization
      .eq('visit_id', visit_id)
      .single() as { data: Visit | null; error: any };

    if (!visit) {
      throw new Error("Visit not found");
    }

    // Authorization check
    const isAuthorized = await visitService._authorizeVisitAccess(visit, userProfile);
    if (!isAuthorized) {
        throw new Error(`Access denied: User ${userProfile.email} is not authorized to update MOM status for visit ${visit_id}`);
    }

    await (getSupabaseAdmin()
      .from('visits') as any)
      .update({
        ...updateData,
        updated_at: new Date().toISOString(),
      })
      .eq('visit_id', visit_id);

    return { success: true };
  },

  // Submit MOM
  async submitMoM(params: any, rawProfile: UserProfile) { // userProfile required
    const userProfile = normalizeUserProfile(rawProfile);
    const now = new Date().toISOString();
    
    const { data: visit } = await getSupabaseAdmin()
      .from('visits')
      .select('agent_id, team_name, brand_name, agent_name') // Select for authorization and MOM data
      .eq('visit_id', params.visit_id)
      .single() as { data: Visit | null; error: any };

    if (!visit) {
      throw new Error("Visit not found");
    }

    // Authorization check
    const isAuthorized = await visitService._authorizeVisitAccess(visit, userProfile);
    if (!isAuthorized) {
        throw new Error(`Access denied: User ${userProfile.email} is not authorized to submit MOM for visit ${params.visit_id}`);
    }

    if (!params.open_points || params.open_points.length === 0) {
      if (params.mom_shared) {
        const updateData: any = {
          mom_shared: params.mom_shared,
          mom_shared_date: now,
          updated_at: now,
        };
        
        if (params.mom_shared === "Yes") {
          updateData.approval_status = "Pending";
          updateData.visit_status = "Completed"; // Visit is completed when MOM is submitted
        }
        
        await (getSupabaseAdmin()
          .from('visits') as any)
          .update(updateData)
          .eq('visit_id', params.visit_id);
        return { success: true };
      } else {
        throw new Error("No MOM data or status update provided");
      }
    }

    const brand_name = params.brand_name || (visit as any).brand_name;
    const agent_name = params.agent_name || (visit as any).agent_name;
    const created_by = userProfile.email; // Use authenticated user's email

    if (!brand_name || !agent_name || !created_by) {
      throw new Error("Missing required information: brand_name, agent_name, or created_by");
    }

    const ticketId = `MOM-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const processedOpenPoints = params.open_points.map((point: any) => ({
      topic: point.topic,
      description: point.description,
      next_steps: point.next_steps || 'To be determined',
      ownership: point.ownership,
      owner_name: point.owner_name,
      status: point.status,
      timeline: point.timeline,
      created_at: point.created_at || now,
      updated_at: point.updated_at || now,
    }));
    
    const momData = {
      ticket_id: ticketId,
      title: `Visit MOM - ${brand_name}${params.is_resubmission ? ' (Resubmitted)' : ''}`,
      description: `Minutes of Meeting for visit to ${brand_name}${params.is_resubmission ? ' - Resubmitted after feedback' : ''}`,
      status: 'Open',
      priority: 'Medium',
      category: 'Visit MOM', // Proper category for visit MOMs
      created_by: created_by,
      team: userProfile.team_name || userProfile.teamName || (visit as any).team_name,
      brand_name: brand_name,
      customer_name: brand_name,
      visit_id: params.visit_id,
      open_points: processedOpenPoints,
      is_resubmission: params.is_resubmission || false,
      resubmission_notes: params.resubmission_notes,
      created_at: now,
      updated_at: now,
    };
    
    try {
      const { error: insertError } = await (getSupabaseAdmin().from('mom') as any).insert(momData);
      
      if (insertError) {
        throw insertError;
      }
    } catch (error) {
      throw error;
    }
    
    const updateData: any = { updated_at: now };
    
    if (params.mom_shared) {
      updateData.mom_shared = params.mom_shared;
      updateData.mom_shared_date = now;
      
      if (params.mom_shared === "Yes") {
        updateData.approval_status = "Pending";
        updateData.visit_status = "Completed"; // Visit is completed when MOM is submitted
      }
    }
    
    try {
      const { error: updateError } = await (getSupabaseAdmin()
        .from('visits') as any)
        .update(updateData)
        .eq('visit_id', params.visit_id);
      
      if (updateError) {
        throw updateError;
      }
    } catch (error) {
      throw error;
    }
    return { success: true };
  },

  // Approve or reject a visit
  async approveVisit(params: {
    visit_id: string;
    // approver_email: string; // Removed, now derived from userProfile
    approval_status: string;
    rejection_remarks?: string;
  }, rawProfile: UserProfile) { // userProfile required
    const userProfile = normalizeUserProfile(rawProfile);

    // Authorization: Only Admin and Team Lead can approve/reject
    const isAuthorized = await visitService._authorizeVisitAdminAction(userProfile);
    if (!isAuthorized) {
      throw new Error(`Access denied: User ${userProfile.email} is not authorized to approve/reject visits`);
    }

    const { data: visit, error: fetchError } = await getSupabaseAdmin()
      .from('visits')
      .select('*')
      .eq('visit_id', params.visit_id)
      .single() as { data: Visit | null; error: any };

    if (fetchError) {
      throw new Error(`Failed to fetch visit: ${fetchError.message}`);
    }

    if (!visit) {
      throw new Error("Visit not found");
    }

    // Team Lead specific authorization
    const normalizedRole = userProfile.role.toLowerCase().replace(/\s+/g, '_');
    if (normalizedRole === 'team_lead' || normalizedRole === 'teamlead') {
      const teamName = userProfile.team_name || userProfile.teamName;
      if (teamName !== visit.team_name) {
        throw new Error(`Access denied: Team Lead ${userProfile.email} can only approve/reject visits from their team`);
      }
    }

    const now = new Date().toISOString();
    const updateData: any = {
      approval_status: params.approval_status,
      approved_by: userProfile.email, // Use authenticated user's email
      approved_at: now,
      updated_at: now,
    };

    // When MOM is approved, ensure visit is marked as Completed
    if (params.approval_status === "Approved") {
      updateData.visit_status = "Completed";
    } else if (params.approval_status === "Rejected") {
      // When rejected, keep the visit status but add rejection details
      if (params.rejection_remarks) {
        updateData.rejection_remarks = params.rejection_remarks;
        updateData.rejected_by = userProfile.email; // Use authenticated user's email
        updateData.rejected_at = now;
      }
    }

    const { data, error } = await (getSupabaseAdmin()
      .from('visits') as any)
      .update(updateData)
      .eq('visit_id', params.visit_id)
      .select();

    if (error) {
      throw new Error(`Failed to update visit: ${error.message}`);
    }

    if (!data || data.length === 0) {
      throw new Error('Visit not found or update failed');
    }

    return { success: true };
  },

  // Resubmit MOM after rejection
  async resubmitMoM(params: {
    visit_id: string;
    // agent_email: string; // Removed, comes from userProfile
  }, rawProfile: UserProfile) { // userProfile required
    const userProfile = normalizeUserProfile(rawProfile);
    const { data: visit } = await getSupabaseAdmin()
      .from('visits')
      .select('agent_id, team_name, approval_status, resubmission_count') // Select for authorization
      .eq('visit_id', params.visit_id)
      .single() as { data: Visit | null; error: any };

    if (!visit) {
      throw new Error("Visit not found");
    }

    // Authorization check: Only owner, Team Lead, or Admin
    const isAuthorized = await visitService._authorizeVisitAccess(visit, userProfile);
    if (!isAuthorized) {
      throw new Error(`Access denied: User ${userProfile.email} is not authorized to resubmit MOM for visit ${params.visit_id}`);
    }

    if (visit.approval_status !== "Rejected") {
      throw new Error("Visit is not in rejected status");
    }

    const now = new Date().toISOString();
    const resubmissionCount = (visit.resubmission_count || 0) + 1;

    await (getSupabaseAdmin()
      .from('visits') as any)
      .update({
        approval_status: "Pending",
        visit_status: "Pending",
        resubmission_count: resubmissionCount,
        resubmitted_at: now,
        updated_at: now,
      })
      .eq('visit_id', params.visit_id);

    return { success: true };
  },

  // Reschedule a visit
  async rescheduleVisit(params: {
    visit_id: string;
    new_scheduled_date: string;
    reason: string;
    // rescheduled_by: string; // Removed, comes from userProfile
  }, rawProfile: UserProfile) { // userProfile required
    const userProfile = normalizeUserProfile(rawProfile);
    const { data: visit } = await getSupabaseAdmin()
      .from('visits')
      .select('agent_id, team_name, scheduled_date, reschedule_count, reschedule_history') // Select for authorization
      .eq('visit_id', params.visit_id)
      .single() as { data: Visit | null; error: any };

    if (!visit) {
      throw new Error("Visit not found");
    }

    // Authorization check: Only owner, Team Lead, or Admin
    const isAuthorized = await visitService._authorizeVisitAccess(visit, userProfile);
    if (!isAuthorized) {
      throw new Error(`Access denied: User ${userProfile.email} is not authorized to reschedule visit ${params.visit_id}`);
    }

    const now = new Date().toISOString();
    const rescheduleCount = (visit.reschedule_count || 0) + 1;

    const rescheduleHistory = visit.reschedule_history || [];
    rescheduleHistory.push({
      old_date: visit.scheduled_date,
      new_date: params.new_scheduled_date,
      reason: params.reason,
      rescheduled_by: userProfile.email, // Use authenticated user's email
      rescheduled_at: now,
    });

    await (getSupabaseAdmin()
      .from('visits') as any)
      .update({
        scheduled_date: params.new_scheduled_date,
        reschedule_count: rescheduleCount,
        reschedule_history: rescheduleHistory,
        last_rescheduled_by: userProfile.email, // Use authenticated user's email
        last_rescheduled_at: now,
        updated_at: now,
      })
      .eq('visit_id', params.visit_id);

    return { success: true };
  },

  // Get visit reschedule history
  async getVisitRescheduleHistory(visit_id: string, rawProfile: UserProfile) { // userProfile required
    const userProfile = normalizeUserProfile(rawProfile);
    const { data: visit } = await getSupabaseAdmin()
      .from('visits')
      .select('agent_id, team_name, scheduled_date, reschedule_count, reschedule_history') // Select for authorization
      .eq('visit_id', visit_id)
      .single() as { data: Visit | null; error: any };

    if (!visit) {
      throw new Error("Visit not found");
    }

    // Authorization check: Only owner, Team Lead, or Admin
    const isAuthorized = await visitService._authorizeVisitAccess(visit, userProfile);
    if (!isAuthorized) {
      throw new Error(`Access denied: User ${userProfile.email} is not authorized to view reschedule history for visit ${visit_id}`);
    }

    return {
      visit_id: visit.visit_id,
      current_date: visit.scheduled_date,
      reschedule_count: visit.reschedule_count || 0,
      reschedule_history: visit.reschedule_history || [],
    };
  },

  // Schedule a backdated visit
  async scheduleBackdatedVisit(data: any, rawProfile: UserProfile) { // userProfile required
    const userProfile = normalizeUserProfile(rawProfile);
    const now = new Date().toISOString();
    
    // Authorization: Admin and Team Lead can schedule for others; Agents can only schedule for themselves
    const normalizedRole = userProfile.role.toLowerCase().replace(/\s+/g, '_');
    const isAdminOrTeamLead = normalizedRole === 'admin' || normalizedRole === 'team_lead' || normalizedRole === 'teamlead';
    const isAgent = normalizedRole === 'agent';
    const isSubAgent = normalizedRole === 'sub_agent' || normalizedRole === 'subagent';

    if (!isAdminOrTeamLead && !isAgent && !isSubAgent) {
      throw new Error(`Access denied: User ${userProfile.email} (Role: ${userProfile.role}) is not authorized to schedule backdated visits`);
    }

    // Agents can only backdate for themselves
    if (isAgent && data.agent_id !== userProfile.email) {
      throw new Error(`Access denied: Agents can only schedule backdated visits for themselves`);
    }

    // sub_agent can only backdate for their coordinators
    if (isSubAgent) {
      const lookupId = userProfile.dbId || userProfile.id;
      if (lookupId) {
        const { data: sacRows } = await getSupabaseAdmin()
          .from('sub_agent_coordinators').select('coordinator_id')
          .eq('sub_agent_id', lookupId) as { data: Array<{ coordinator_id: string }> | null; error: any };
        if (sacRows && sacRows.length > 0) {
          const { data: coords } = await getSupabaseAdmin()
            .from('user_profiles').select('email').in('id', sacRows.map(r => r.coordinator_id));
          const coordinatorEmails = (coords as any[])?.map((c: any) => c.email) || [];
          if (!coordinatorEmails.includes(data.agent_id)) {
            throw new Error(`Access denied: Sub-agent ${userProfile.email} cannot schedule backdated visit for ${data.agent_id}`);
          }
        }
      }
    }

    // If Team Lead, ensure it's for their team members
    if (normalizedRole === 'team_lead' || normalizedRole === 'teamlead') {
      const teamName = userProfile.team_name || userProfile.teamName;
      if (data.agent_id !== userProfile.email && teamName) {
        const { data: teamMembers } = await getSupabaseAdmin()
          .from('user_profiles')
          .select('email')
          .eq('team_name', teamName)
          .in('role', ['agent', 'Agent']);
        const teamMemberEmails = teamMembers?.map((m: any) => m.email) || [];
        if (!teamMemberEmails.includes(data.agent_id)) {
          throw new Error(`Access denied: Team Lead ${userProfile.email} cannot schedule backdated visit for agent ${data.agent_id} outside their team`);
        }
      }
    }
    
    const visitData = {
      ...data,
      visit_date: data.visit_date || data.scheduled_date,
      is_backdated: true,
      backdated_by: userProfile.email,
      backdated_at: now,
      created_at: now,
      updated_at: now,
    };

    // If MOM was already submitted and approved, populate all approval columns
    if (data.mom_approved === true) {
      const visitDate = data.visit_date || data.scheduled_date;
      visitData.mom_shared = 'Yes';
      visitData.mom_shared_date = visitDate;
      visitData.approval_status = 'Approved';
      visitData.approved_by = userProfile.email; // backdated by this user (Team Lead / Admin / Agent)
      visitData.approved_at = visitDate;
    }

    // Strip the helper flag before inserting
    delete visitData.mom_approved;

    const { error } = await getSupabaseAdmin()
      .from('visits')
      .insert(visitData);

    if (error) throw error;
    return { success: true };
  },

  // Transfer Brand Visits (Admin/Team Lead only)
  async transferBrandVisits(params: {
    brandId: string;
    fromAgentEmail: string;
    toAgentEmail: string;
    toAgentName: string;
    toTeamName?: string;
    transferYear: string;
    transferReason: string;
    transferredBy: string;
  }, rawProfile: UserProfile) {
    const userProfile = normalizeUserProfile(rawProfile);
    const normalizedRole = userProfile.role.toLowerCase().replace(/\s+/g, '_');

    // All authenticated users can transfer brand visits
    console.log(`✅ [Visit Transfer] User ${userProfile.email} (${userProfile.role}) authorized to transfer visits`);

    const now = new Date().toISOString();

    // Get all visits for the brand in the specified year
    const { data: visits, error: fetchError } = await getSupabaseAdmin()
      .from('visits')
      .select('*')
      .eq('brand_id', params.brandId)
      .eq('visit_year', params.transferYear);

    if (fetchError) {
      throw new Error(`Failed to fetch visits: ${fetchError.message}`);
    }

    if (!visits || visits.length === 0) {
      console.log(`⚠️ No visits found for brand ${params.brandId} in year ${params.transferYear}`);
      return {
        success: true,
        totalVisits: 0,
        transferredCount: 0,
        skippedCount: 0,
        errorCount: 0,
        message: `No visits to transfer for year ${params.transferYear}`
      };
    }

    // ONLY transfer PENDING visits (not completed ones)
    const pendingVisits = visits.filter((v: any) => v.visit_status !== 'Completed');
    const completedVisits = visits.filter((v: any) => v.visit_status === 'Completed');

    console.log(`🔄 Transferring ${pendingVisits.length} pending visits (${completedVisits.length} completed visits will stay with original KAM)`);

    // Update each PENDING visit only
    let successCount = 0;
    let errorCount = 0;
    let skippedCount = completedVisits.length;

    for (const visit of pendingVisits) {
      const visitRecord = visit as any;
      const transferEntry = {
        from_agent_id: params.fromAgentEmail,
        to_agent_id: params.toAgentEmail,
        transferred_at: now,
        transferred_by: params.transferredBy,
        reason: params.transferReason,
        visit_status_at_transfer: visitRecord.visit_status,
        was_completed: false
      };

      const updatedHistory = [...(visitRecord.transfer_history || []), transferEntry];

      const { error: updateError } = await (getSupabaseAdmin()
        .from('visits') as any)
        .update({
          agent_id: params.toAgentEmail,
          agent_name: params.toAgentName,
          team_name: params.toTeamName || visitRecord.team_name,
          transfer_history: updatedHistory,
          updated_at: now
        })
        .eq('visit_id', visitRecord.visit_id);

      if (updateError) {
        console.error(`❌ Failed to transfer visit ${visitRecord.visit_id}:`, updateError);
        errorCount++;
      } else {
        successCount++;
      }
    }

    console.log(`✅ Transfer complete: ${successCount} transferred, ${skippedCount} kept with original KAM, ${errorCount} errors`);

    return {
      success: errorCount === 0,
      totalVisits: visits.length,
      transferredCount: successCount,
      skippedCount: skippedCount,
      errorCount,
      message: `Transferred ${successCount} pending visits. ${skippedCount} completed visits remain with ${params.fromAgentEmail}`
    };
  },
};
