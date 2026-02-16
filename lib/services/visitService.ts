/**
 * Visit Service - Supabase Implementation
 * Replaces Convex visit functions
 */

import { supabase, getSupabaseAdmin } from '../supabase-client';

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
    if (userProfile.role === 'agent' || userProfile.role === 'Agent') {
      visitQuery = visitQuery.eq('agent_id', email);
      
      // Fetch brands directly with email filter
      const { data: agentBrands } = await getSupabaseAdmin()
        .from('master_data')
        .select('*')
        .eq('kam_email_id', email)
        .limit(10000);
      
      brandFilter = agentBrands?.map(brand => brand.brand_name) || [];
      
    } else if (userProfile.role === 'team_lead' || userProfile.role === 'Team Lead') {
      if (!userProfile.team_name) {
        throw new Error("Team lead must have a team assigned");
      }
      
      visitQuery = visitQuery.eq('team_name', userProfile.team_name);
      
      const { data: teamAgents } = await getSupabaseAdmin()
        .from('user_profiles')
        .select('email')
        .eq('team_name', userProfile.team_name)
        .in('role', ['agent', 'Agent']);
      
      const agentEmails = teamAgents?.map(agent => agent.email) || [];
      
      // Fetch brands directly with IN filter
      const { data: teamBrands } = await getSupabaseAdmin()
        .from('master_data')
        .select('*')
        .in('kam_email_id', agentEmails)
        .limit(10000);
      
      brandFilter = teamBrands?.map(brand => brand.brand_name) || [];
      
    } else if (userProfile.role === 'admin' || userProfile.role === 'Admin') {
      // Fetch ALL brands with explicit limit
      const { data: allBrands } = await getSupabaseAdmin()
        .from('master_data')
        .select('*')
        .limit(10000);  // High limit to ensure all records are fetched
      brandFilter = allBrands?.map(brand => brand.brand_name) || [];
    }

    const { data: allVisits } = await visitQuery;
    const visits = brandFilter.length > 0 
      ? allVisits?.filter(visit => brandFilter.includes(visit.brand_name)) || []
      : allVisits || [];

    const total_brands = brandFilter.length;
    const nonCancelledVisits = visits.filter(v => v.visit_status !== 'Cancelled');
    
    // Visit Done should only count brands with MOM approved visits
    const brandsWithApprovedMOM = new Set(
      nonCancelledVisits
        .filter(v => v.visit_status === 'Completed' && v.approval_status === 'Approved')
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

    let query = getSupabaseAdmin().from('visits').select('*', { count: 'exact' });

    if (userProfile.role === 'agent' || userProfile.role === 'Agent') {
      query = query.eq('agent_id', email);
    } else if ((userProfile.role === 'team_lead' || userProfile.role === 'Team Lead') && userProfile.team_name) {
      query = query.eq('team_name', userProfile.team_name);
    }

    const { data: visits, count } = await query;
    let filteredVisits = visits || [];

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

    await getSupabaseAdmin()
      .from('visits')
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

    await getSupabaseAdmin()
      .from('visits')
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
        
        await getSupabaseAdmin()
          .from('visits')
          .update(updateData)
          .eq('visit_id', params.visit_id);
        
        return { success: true };
      } else {
        throw new Error("No MOM data or status update provided");
      }
    }

    const brand_name = params.brand_name || visit.brand_name;
    const agent_name = params.agent_name || visit.agent_name;
    const created_by = params.created_by || visit.agent_id;

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
    
    await getSupabaseAdmin().from('mom').insert({
      ticket_id: ticketId,
      title: `Visit MOM - ${brand_name}${params.is_resubmission ? ' (Resubmitted)' : ''}`,
      description: `Minutes of Meeting for visit to ${brand_name}${params.is_resubmission ? ' - Resubmitted after feedback' : ''}`,
      status: 'Open',
      priority: 'Medium',
      category: 'Visit MOM',
      created_by: created_by,
      team: visit.team_name, // Add team field for Team Lead filtering
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
    
    await getSupabaseAdmin()
      .from('visits')
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

    await getSupabaseAdmin()
      .from('visits')
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

    if (visit.agent_id !== params.agent_email) {
      throw new Error("Unauthorized: Visit does not belong to this agent");
    }

    if (visit.approval_status !== "Rejected") {
      throw new Error("Visit is not in rejected status");
    }

    const now = new Date().toISOString();
    const resubmissionCount = (visit.resubmission_count || 0) + 1;

    await getSupabaseAdmin()
      .from('visits')
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

    const now = new Date().toISOString();
    const rescheduleCount = (visit.reschedule_count || 0) + 1;

    const rescheduleHistory = visit.reschedule_history || [];
    rescheduleHistory.push({
      old_date: visit.scheduled_date,
      new_date: params.new_scheduled_date,
      reason: params.reason,
      rescheduled_by: params.rescheduled_by,
      rescheduled_at: now,
    });

    await getSupabaseAdmin()
      .from('visits')
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

    return {
      visit_id: visit.visit_id,
      current_date: visit.scheduled_date,
      reschedule_count: visit.reschedule_count || 0,
      reschedule_history: visit.reschedule_history || [],
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

    const { error } = await getSupabaseAdmin()
      .from('visits')
      .insert(visitData);

    if (error) throw error;
    return { success: true };
  },
};
