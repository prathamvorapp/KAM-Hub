/**
 * Visit Service - Supabase Implementation
 * Replaces Convex visit functions
 */

import { supabase, getSupabaseAdmin } from '../supabase-client';
import { normalizeRole } from '../utils/roleUtils';

export const visitService = {
  // Get visit statistics for a user
  async getVisitStatistics(email: string) {
    if (!email) {
      throw new Error("Email is required");
    }

    const { data: userProfile, error: profileError } = await getSupabaseAdmin()
      .from('user_profiles')
      .select('*')
      .eq('email', email)
      .single();

    if (profileError || !userProfile) {
      console.error('❌ Error fetching user profile:', profileError);
      throw new Error("User profile not found");
    }

    let brandFilter: string[] = [];
    let visitQuery = getSupabaseAdmin().from('visits').select('*');

    const currentYearStr = new Date().getFullYear().toString();
    visitQuery = visitQuery.eq('visit_year', currentYearStr);

    // Role-based filtering
    const prof = userProfile as any;
    const normalizedRole = normalizeRole(prof.role);
    if (normalizedRole === 'agent') {
      visitQuery = visitQuery.eq('agent_id', email);
      
      // Fetch brands directly with email filter
      const { data: agentBrands } = await getSupabaseAdmin()
        .from('master_data')
        .select('*')
        .eq('kam_email_id', email)
        .limit(10000);
      
      brandFilter = (agentBrands as any[])?.map(brand => brand.brand_name) || [];
      
    } else if (normalizedRole === 'team_lead') {
      if (!prof.team_name) {
        throw new Error("Team lead must have a team assigned");
      }
      
      visitQuery = visitQuery.eq('team_name', prof.team_name);
      
      const { data: teamMembers } = await getSupabaseAdmin()
        .from('user_profiles')
        .select('email')
        .eq('team_name', prof.team_name)
        .eq('is_active', true);
      
      const agentEmails = (teamMembers as any[])?.map(member => member.email) || [];
      
      // Fetch brands directly with IN filter
      const { data: teamBrands } = await getSupabaseAdmin()
        .from('master_data')
        .select('*')
        .in('kam_email_id', agentEmails)
        .limit(10000);
      
      brandFilter = (teamBrands as any[])?.map(brand => brand.brand_name) || [];
      
    } else if (normalizedRole === 'admin') {
      // Fetch ALL brands with explicit limit
      const { data: allBrands } = await getSupabaseAdmin()
        .from('master_data')
        .select('*')
        .limit(10000);  // High limit to ensure all records are fetched
      brandFilter = (allBrands as any[])?.map(brand => brand.brand_name) || [];
    }

    const { data: allVisits } = await visitQuery;

    // If user is an agent and has no assigned brands, they should see zero statistics
    if ((normalizedRole === 'agent') && brandFilter.length === 0) {
      return {
        total_brands: 0,
        visit_done: 0,
        pending: 0,
        completed: 0,
        cancelled: 0,
        scheduled: 0,
        brands_with_visits: 0,
        brands_pending: 0,
        total_visits_done: 0,
        total_visits_pending: 0,
        total_scheduled_visits: 0,
        total_cancelled_visits: 0,
        last_month_visits: 0,
        current_month_scheduled: 0,
        current_month_completed: 0,
        current_month_total: 0,
        current_month_total_visits: 0,
        mom_shared_yes: 0,
        mom_shared_no: 0,
        mom_shared_pending: 0,
        mom_pending: 0,
        approved: 0,
        rejected: 0,
        pending_approval: 0,
        monthly_target: 10,
        current_month_progress: 0,
        overall_progress: 0
      };
    }

    const visits = brandFilter.length > 0 
      ? (allVisits as any[])?.filter(visit => brandFilter.includes(visit.brand_name)) || []
      : (allVisits as any[]) || [];

    const total_brands = brandFilter.length;
    const nonCancelledVisits = visits.filter(v => v.visit_status !== 'Cancelled');
    
    // Visit Done should only count brands with MOM approved visits
    const brandsWithApprovedMOM = new Set(
      nonCancelledVisits
        .filter(v => (v.visit_status === 'Completed' || v.visit_status === 'Approved' || v.visit_status === 'Visit Done') && v.approval_status === 'Approved')
        .map(visit => visit.brand_name)
    );
    const visit_done = brandsWithApprovedMOM.size;
    const pending_visits = total_brands - visit_done;
    
    const brandsWithVisits = new Set(nonCancelledVisits.map(visit => visit.brand_name));
    const brands_with_visits = brandsWithVisits.size;
    const brands_pending = total_brands - visit_done;

    const completed = nonCancelledVisits.filter(v => v.visit_status === 'Completed').length;
    const cancelled = visits.filter(v => v.visit_status === 'Cancelled').length;
    const scheduled = nonCancelledVisits.filter(v => v.visit_status === 'Scheduled').length;

    const mom_shared_yes = nonCancelledVisits.filter(v => v.mom_shared === 'Yes').length;
    const mom_shared_no = nonCancelledVisits.filter(v => v.mom_shared === 'No').length;
    const mom_shared_pending = nonCancelledVisits.filter(v => v.mom_shared === 'Pending' || !v.mom_shared).length;

    const approved = nonCancelledVisits.filter(v => v.approval_status === 'Approved').length;
    const rejected = nonCancelledVisits.filter(v => v.approval_status === 'Rejected').length;
    const pending_approval = nonCancelledVisits.filter(v => v.approval_status === 'Pending' || !v.approval_status).length;

    const currentDate = new Date();
    const currentMonth = currentDate.getMonth();
    const currentYearNum = currentDate.getFullYear();
    
    const currentMonthVisits = nonCancelledVisits.filter(visit => {
      const visitDate = new Date(visit.scheduled_date);
      return visitDate.getMonth() === currentMonth && visitDate.getFullYear() === currentYearNum;
    });
    
    const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1;
    const lastMonthYear = currentMonth === 0 ? currentYearNum - 1 : currentYearNum;
    const lastMonthVisits = nonCancelledVisits.filter(visit => {
      const visitDate = new Date(visit.scheduled_date);
      return visitDate.getMonth() === lastMonth && visitDate.getFullYear() === lastMonthYear;
    });

    const monthly_target = 10;
    const current_month_scheduled = currentMonthVisits.filter(v => v.visit_status === 'Scheduled').length;
    const current_month_completed = currentMonthVisits.filter(v => v.visit_status === 'Completed').length;
    const current_month_total_visits = current_month_scheduled + current_month_completed;
    const current_month_progress = monthly_target > 0 ? Math.round((current_month_total_visits / monthly_target) * 100) : 0;
    const overall_progress = total_brands > 0 ? Math.round((brands_with_visits / total_brands) * 100) : 0;

    return {
      total_brands,
      visit_done,
      pending: pending_visits,
      completed,
      cancelled,
      scheduled,
      brands_with_visits,
      brands_pending,
      total_visits_done: visit_done,
      total_visits_pending: pending_visits,
      total_scheduled_visits: scheduled,
      total_cancelled_visits: cancelled,
      last_month_visits: lastMonthVisits.length,
      current_month_scheduled,
      current_month_completed,
      current_month_total: currentMonthVisits.length,
      current_month_total_visits,
      mom_shared_yes,
      mom_shared_no,
      mom_shared_pending,
      mom_pending: mom_shared_pending,
      approved,
      rejected,
      pending_approval,
      monthly_target,
      current_month_progress,
      overall_progress
    };
  },

  // Helper to calculate statistics from raw data
  async _calculateAggregatedStats(agents: any[], brands: any[], visits: any[]) {
    const currentYearNum = new Date().getFullYear();
    const currentMonth = new Date().getMonth();
    const monthlyTarget = 10;

    const stats = agents.map(agent => {
      const agentBrands = brands.filter(b => b.kam_email_id === agent.email);
      const agentBrandNames = agentBrands.map(b => b.brand_name);
      const agentVisits = visits.filter(v => v.agent_id === agent.email || agentBrandNames.includes(v.brand_name));

      const totalBrands = agentBrands.length;

      const nonCancelledVisits = agentVisits.filter(v => v.visit_status !== 'Cancelled');

      const brandsWithApprovedMOM = new Set(
        nonCancelledVisits
          .filter(v => (v.visit_status === 'Completed' || v.visit_status === 'Approved' || v.visit_status === 'Visit Done') && v.approval_status === 'Approved')
          .map(visit => visit.brand_name)
      );
      const visitsDone = brandsWithApprovedMOM.size;
      const visitsPending = totalBrands - visitsDone;

      const currentMonthVisits = nonCancelledVisits.filter(visit => {
        const visitDate = new Date(visit.scheduled_date);
        return visitDate.getMonth() === currentMonth && visitDate.getFullYear() === currentYearNum;
      });

      const currentMonthCompleted = currentMonthVisits.filter(v => v.visit_status === 'Completed').length;
      const currentMonthScheduled = currentMonthVisits.filter(v => v.visit_status === 'Scheduled').length;
      const currentMonthTotal = currentMonthCompleted + currentMonthScheduled;
      const progress = monthlyTarget > 0 ? Math.round((currentMonthTotal / monthlyTarget) * 100) : 0;
      const momPending = nonCancelledVisits.filter(v => v.mom_shared === 'Pending' || !v.mom_shared).length;

      return {
        totalBrands,
        visitsDone,
        visitsPending,
        currentMonthCompleted: currentMonthTotal,
        progress,
        momPending
      };
    });

    const totalAgents = agents.length;
    const totalBrands = stats.reduce((acc, s) => acc + s.totalBrands, 0);
    const totalVisitsDone = stats.reduce((acc, s) => acc + s.visitsDone, 0);
    const totalVisitsPending = stats.reduce((acc, s) => acc + s.visitsPending, 0);
    const totalCurrentMonthCompleted = stats.reduce((acc, s) => acc + s.currentMonthCompleted, 0);
    const totalMonthlyTarget = totalAgents * monthlyTarget;
    const totalMomPending = stats.reduce((acc, s) => acc + s.momPending, 0);

    const agentsAtTarget = stats.filter(s => s.progress >= 100).length;
    const agentsAbove80 = stats.filter(s => s.progress >= 80 && s.progress < 100).length;
    const agentsNeedingAttention = stats.filter(s => s.progress < 40).length;

    const progress = totalMonthlyTarget > 0
      ? Math.round((totalCurrentMonthCompleted / totalMonthlyTarget) * 100)
      : 0;

    return {
      totalAgents,
      totalBrands,
      totalVisitsDone,
      totalVisitsPending,
      totalCurrentMonthCompleted,
      totalMonthlyTarget,
      totalMomPending,
      agentsAtTarget,
      agentsAbove80,
      agentsNeedingAttention,
      progress
    };
  },

  // Get organization-wide summary for admin
  async getOrganizationSummary() {
    const { data: allAgents } = await getSupabaseAdmin()
      .from('user_profiles')
      .select('*')
      .eq('is_active', true)
      .in('role', ['Agent', 'agent', 'AGENT']);

    const { data: allBrands } = await getSupabaseAdmin()
      .from('master_data')
      .select('*')
      .limit(10000);

    const currentYearStr = new Date().getFullYear().toString();
    const { data: allVisits } = await getSupabaseAdmin()
      .from('visits')
      .select('*')
      .eq('visit_year', currentYearStr);

    const aggregated = await this._calculateAggregatedStats(allAgents || [], allBrands || [], allVisits || []);

    return {
      ...aggregated,
      organizationProgress: aggregated.progress
    };
  },

  // Get team-wide summary for team lead
  async getTeamSummary(teamName: string) {
    if (!teamName) throw new Error("Team name is required");

    const { data: teamAgents } = await getSupabaseAdmin()
      .from('user_profiles')
      .select('*')
      .eq('team_name', teamName)
      .eq('is_active', true)
      .in('role', ['Agent', 'agent', 'AGENT']);

    const agentEmails = (teamAgents as any[])?.map(a => a.email) || [];

    const { data: teamBrands } = await getSupabaseAdmin()
      .from('master_data')
      .select('*')
      .in('kam_email_id', agentEmails)
      .limit(10000);

    const currentYearStr = new Date().getFullYear().toString();
    const { data: teamVisits } = await getSupabaseAdmin()
      .from('visits')
      .select('*')
      .eq('visit_year', currentYearStr)
      .in('team_name', [teamName]);

    const aggregated = await this._calculateAggregatedStats(teamAgents || [], teamBrands || [], teamVisits || []);

    return {
      ...aggregated,
      teamProgress: aggregated.progress,
      teamName
    };
  },

  // Get visits for a user with pagination
  async getVisits(params: {
    email: string;
    search?: string;
    page?: number;
    limit?: number;
  }) {
    const { email, search, page = 1, limit = 100 } = params;
    
    const { data: userProfile } = await getSupabaseAdmin()
      .from('user_profiles')
      .select('*')
      .eq('email', email)
      .single();

    if (!userProfile) {
      throw new Error("User profile not found");
    }

    const prof = userProfile as any;
    const normalizedRole = normalizeRole(prof.role);
    let query = getSupabaseAdmin().from('visits').select('*', { count: 'exact' });

    if (normalizedRole === 'agent') {
      query = query.eq('agent_id', email);
    } else if (normalizedRole === 'team_lead' && prof.team_name) {
      query = query.eq('team_name', prof.team_name);
    }

    const { data: allVisitsData, count } = await query;
    let filteredVisits = (allVisitsData || []) as any[];

    if (search && search.trim()) {
      const searchLower = search.toLowerCase().trim();
      filteredVisits = filteredVisits.filter(visit => 
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
  },

  // Create a new visit
  async createVisit(data: any) {
    const now = new Date().toISOString();
    
    const visitData = {
      ...data,
      visit_status: data.visit_status || "Scheduled",
      created_at: now,
      updated_at: now,
    };

    const { error } = await (getSupabaseAdmin()
      .from('visits') as any)
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
  }) {
    const { visit_id, ...updateData } = params;
    
    const { data: visit } = await getSupabaseAdmin()
      .from('visits')
      .select('*')
      .eq('visit_id', visit_id)
      .single();

    if (!visit) {
      throw new Error("Visit not found");
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
  }) {
    const { visit_id, ...updateData } = params;
    
    const { data: visit } = await getSupabaseAdmin()
      .from('visits')
      .select('*')
      .eq('visit_id', visit_id)
      .single();

    if (!visit) {
      throw new Error("Visit not found");
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
  async submitMoM(params: any) {
    const now = new Date().toISOString();
    
    const { data: visit } = await getSupabaseAdmin()
      .from('visits')
      .select('*')
      .eq('visit_id', params.visit_id)
      .single();

    if (!visit) {
      throw new Error("Visit not found");
    }
    const v = visit as any;

    if (!params.open_points || params.open_points.length === 0) {
      if (params.mom_shared) {
        const updateData: any = {
          mom_shared: params.mom_shared,
          mom_shared_date: now,
          updated_at: now,
        };
        
        if (params.mom_shared === "Yes") {
          updateData.approval_status = "Pending";
          updateData.visit_status = "Pending";
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

    const brand_name = params.brand_name || v.brand_name;
    const agent_name = params.agent_name || v.agent_name;
    const created_by = params.created_by || v.agent_id;

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
    
    await (getSupabaseAdmin().from('mom') as any).insert({
      ticket_id: ticketId,
      title: `Visit MOM - ${brand_name}${params.is_resubmission ? ' (Resubmitted)' : ''}`,
      description: `Minutes of Meeting for visit to ${brand_name}${params.is_resubmission ? ' - Resubmitted after feedback' : ''}`,
      status: 'Open',
      priority: 'Medium',
      category: 'Visit MOM',
      created_by: created_by,
      team: v.team_name, // Add team field for Team Lead filtering
      brand_name: brand_name,
      customer_name: brand_name,
      visit_id: params.visit_id,
      open_points: processedOpenPoints,
      is_resubmission: params.is_resubmission || false,
      resubmission_notes: params.resubmission_notes,
      created_at: now,
      updated_at: now,
    });
    
    const updateData: any = { updated_at: now };
    
    if (params.mom_shared) {
      updateData.mom_shared = params.mom_shared;
      updateData.mom_shared_date = now;
      
      if (params.mom_shared === "Yes") {
        updateData.approval_status = "Pending";
        updateData.visit_status = "Pending";
      }
    }
    
    await (getSupabaseAdmin()
      .from('visits') as any)
      .update(updateData)
      .eq('visit_id', params.visit_id);
    
    return { success: true };
  },

  // Approve or reject a visit
  async approveVisit(params: {
    visit_id: string;
    approver_email: string;
    approval_status: string;
    rejection_remarks?: string;
  }) {
    const { data: visit } = await getSupabaseAdmin()
      .from('visits')
      .select('*')
      .eq('visit_id', params.visit_id)
      .single();

    if (!visit) {
      throw new Error("Visit not found");
    }

    const now = new Date().toISOString();
    const updateData: any = {
      approval_status: params.approval_status,
      approved_by: params.approver_email,
      approved_at: now,
      updated_at: now,
    };

    if (params.approval_status === "Approved") {
      updateData.visit_status = "Approved";
    } else if (params.approval_status === "Rejected") {
      updateData.visit_status = "Rejected";
      if (params.rejection_remarks) {
        updateData.rejection_remarks = params.rejection_remarks;
        updateData.rejected_by = params.approver_email;
        updateData.rejected_at = now;
      }
    }

    await (getSupabaseAdmin()
      .from('visits') as any)
      .update(updateData)
      .eq('visit_id', params.visit_id);

    return { success: true };
  },

  // Resubmit MOM after rejection
  async resubmitMoM(params: {
    visit_id: string;
    agent_email: string;
  }) {
    const { data: visit } = await getSupabaseAdmin()
      .from('visits')
      .select('*')
      .eq('visit_id', params.visit_id)
      .single();

    if (!visit) {
      throw new Error("Visit not found");
    }
    const v = visit as any;

    if (v.agent_id !== params.agent_email) {
      throw new Error("Unauthorized: Visit does not belong to this agent");
    }

    if (v.approval_status !== "Rejected") {
      throw new Error("Visit is not in rejected status");
    }

    const now = new Date().toISOString();
    const resubmissionCount = (v.resubmission_count || 0) + 1;

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
    rescheduled_by: string;
  }) {
    const { data: visit } = await getSupabaseAdmin()
      .from('visits')
      .select('*')
      .eq('visit_id', params.visit_id)
      .single();

    if (!visit) {
      throw new Error("Visit not found");
    }
    const v = visit as any;

    const now = new Date().toISOString();
    const rescheduleCount = (v.reschedule_count || 0) + 1;

    const rescheduleHistory = v.reschedule_history || [];
    rescheduleHistory.push({
      old_date: v.scheduled_date,
      new_date: params.new_scheduled_date,
      reason: params.reason,
      rescheduled_by: params.rescheduled_by,
      rescheduled_at: now,
    });

    await (getSupabaseAdmin()
      .from('visits') as any)
      .update({
        scheduled_date: params.new_scheduled_date,
        reschedule_count: rescheduleCount,
        reschedule_history: rescheduleHistory,
        last_rescheduled_by: params.rescheduled_by,
        last_rescheduled_at: now,
        updated_at: now,
      })
      .eq('visit_id', params.visit_id);

    return { success: true };
  },

  // Get visit reschedule history
  async getVisitRescheduleHistory(visit_id: string) {
    const { data: visit } = await getSupabaseAdmin()
      .from('visits')
      .select('*')
      .eq('visit_id', visit_id)
      .single();

    if (!visit) {
      throw new Error("Visit not found");
    }
    const v = visit as any;

    return {
      visit_id: v.visit_id,
      current_date: v.scheduled_date,
      reschedule_count: v.reschedule_count || 0,
      reschedule_history: v.reschedule_history || [],
    };
  },

  // Schedule a backdated visit
  async scheduleBackdatedVisit(data: any) {
    const now = new Date().toISOString();
    const { created_by, ...visitArgs } = data;
    
    const visitData = {
      ...visitArgs,
      visit_date: visitArgs.visit_date || visitArgs.scheduled_date,
      is_backdated: true,
      backdated_by: created_by,
      backdated_at: now,
      created_at: now,
      updated_at: now,
    };

    const { error } = await (getSupabaseAdmin()
      .from('visits') as any)
      .insert(visitData);

    if (error) throw error;
    return { success: true };
  },
};
