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
    console.log('📊 [STATS DEBUG] Current year filter:', currentYearStr);
    visitQuery = visitQuery.eq('visit_year', currentYearStr);

    // Role-based filtering
    if ((userProfile as any).role === 'agent' || (userProfile as any).role === 'Agent') {
      visitQuery = visitQuery.eq('agent_id', email);
      
      // Fetch brands directly with email filter
      const { data: agentBrands } = await getSupabaseAdmin()
        .from('master_data')
        .select('*')
        .eq('kam_email_id', email)
        .limit(10000);
      
      brandFilter = agentBrands?.map((brand: any) => brand.brand_name) || [];
      console.log('📊 [STATS DEBUG] Agent brands count:', brandFilter.length);
      console.log('📊 [STATS DEBUG] First 10 brands:', brandFilter.slice(0, 10));
      console.log('📊 [STATS DEBUG] All brands:', brandFilter);
      console.log('📊 [STATS DEBUG] Brand filter includes "Kritunga"?', brandFilter.includes('Kritunga'));
      console.log('📊 [STATS DEBUG] Brands containing "Krit":', brandFilter.filter((b: string) => b.toLowerCase().includes('krit')));
      
    } else if ((userProfile as any).role === 'team_lead' || (userProfile as any).role === 'Team Lead') {
      if (!(userProfile as any).team_name) {
        throw new Error("Team lead must have a team assigned");
      }
      
      visitQuery = visitQuery.eq('team_name', (userProfile as any).team_name);
      
      const { data: teamAgents } = await getSupabaseAdmin()
        .from('user_profiles')
        .select('email')
        .eq('team_name', (userProfile as any).team_name)
        .in('role', ['agent', 'Agent']);
      
      const agentEmails = teamAgents?.map((agent: any) => agent.email) || [];
      
      // Fetch brands directly with IN filter
      const { data: teamBrands } = await getSupabaseAdmin()
        .from('master_data')
        .select('*')
        .in('kam_email_id', agentEmails)
        .limit(10000);
      
      brandFilter = teamBrands?.map((brand: any) => brand.brand_name) || [];
      
    } else if ((userProfile as any).role === 'admin' || (userProfile as any).role === 'Admin') {
      // Fetch ALL brands with explicit limit
      const { data: allBrands } = await getSupabaseAdmin()
        .from('master_data')
        .select('*')
        .limit(10000);  // High limit to ensure all records are fetched
      brandFilter = allBrands?.map((brand: any) => brand.brand_name) || [];
    }

    const { data: allVisits } = await visitQuery;
    console.log('📊 [STATS DEBUG] All visits from query:', allVisits?.length || 0);
    console.log('📊 [STATS DEBUG] Sample visits:', allVisits?.slice(0, 3).map((v: any) => ({ 
      brand: v.brand_name, 
      status: v.visit_status, 
      year: v.visit_year,
      date: v.scheduled_date 
    })));
    
    // Don't filter visits by brand assignment - count all visits for the agent
    // This is because visits can be created for brands not in master_data
    const visits = allVisits || [];
      
    console.log('📊 [STATS DEBUG] Total visits (no brand filter):', visits.length);
    console.log('📊 [STATS DEBUG] All visits:', visits.map((v: any) => ({ brand: v.brand_name, status: v.visit_status })));

    const total_brands = brandFilter.length;
    const nonCancelledVisits = visits.filter((v: any) => v.visit_status !== 'Cancelled');
    
    console.log('📊 [STATS DEBUG] Total visits:', visits.length);
    console.log('📊 [STATS DEBUG] Non-cancelled visits:', nonCancelledVisits.length);
    console.log('📊 [STATS DEBUG] Visit statuses:', nonCancelledVisits.map((v: any) => ({ 
      brand: v.brand_name, 
      status: v.visit_status, 
      approval: v.approval_status,
      date: v.scheduled_date 
    })));
    
    // Visit Done should count visits that are Completed AND have Approved MOM
    // A visit is considered "done" when:
    // 1. visit_status = 'Completed' (the visit happened)
    // 2. approval_status = 'Approved' (the MOM was approved by team lead)
    const approvedVisits = nonCancelledVisits.filter((v: any) => 
      v.visit_status === 'Completed' && v.approval_status === 'Approved'
    );
    
    console.log('📊 [STATS DEBUG] Approved visits:', approvedVisits.map((v: any) => ({
      brand: v.brand_name,
      visit_id: v.visit_id,
      status: v.visit_status,
      approval: v.approval_status
    })));
    
    // Count unique brands with at least one approved visit
    const brandsWithApprovedMOM = new Set(
      approvedVisits.map((visit: any) => visit.brand_name)
    );
    const visit_done = brandsWithApprovedMOM.size;
    const pending_visits = total_brands - visit_done;
    
    console.log('📊 [STATS DEBUG] Brands with approved MOMs:', Array.from(brandsWithApprovedMOM));
    console.log('📊 [STATS DEBUG] Visit done count:', visit_done);
    
    const brandsWithVisits = new Set(nonCancelledVisits.map((visit: any) => visit.brand_name));
    const brands_with_visits = brandsWithVisits.size;
    const brands_pending = total_brands - visit_done;

    const completed = nonCancelledVisits.filter((v: any) => v.visit_status === 'Completed').length;
    const cancelled = visits.filter((v: any) => v.visit_status === 'Cancelled').length;
    const scheduled = nonCancelledVisits.filter((v: any) => v.visit_status === 'Scheduled').length;
    
    console.log('📊 [STATS DEBUG] Completed:', completed, 'Cancelled:', cancelled, 'Scheduled:', scheduled);
    console.log('📊 [STATS DEBUG] Scheduled visits:', nonCancelledVisits.filter((v: any) => v.visit_status === 'Scheduled'));

    const mom_shared_yes = nonCancelledVisits.filter((v: any) => v.mom_shared === 'Yes').length;
    const mom_shared_no = nonCancelledVisits.filter((v: any) => v.mom_shared === 'No').length;
    const mom_shared_pending = nonCancelledVisits.filter((v: any) => v.mom_shared === 'Pending' || !v.mom_shared).length;
    
    // MOM Pending should count:
    // 1. Visits that are completed but MOM not yet submitted
    // 2. Visits where MOM was rejected (agent needs to resubmit)
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

    const monthly_target = 10;
    const current_month_scheduled = currentMonthVisits.filter((v: any) => v.visit_status === 'Scheduled').length;
    const current_month_completed = currentMonthVisits.filter((v: any) => v.visit_status === 'Completed').length;
    const current_month_pending = currentMonthVisits.filter((v: any) => v.visit_status === 'Pending').length;
    const current_month_total_visits = current_month_scheduled + current_month_completed + current_month_pending;
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
      mom_pending,
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
    
    console.log('🔍 [GET VISITS] Called with:', { email, search, page, limit });
    
    const { data: userProfile } = await getSupabaseAdmin()
      .from('user_profiles')
      .select('*')
      .eq('email', email)
      .single();

    if (!userProfile) {
      throw new Error("User profile not found");
    }

    console.log('👤 [GET VISITS] User profile:', {
      email: (userProfile as any).email,
      role: (userProfile as any).role,
      team_name: (userProfile as any).team_name
    });

    let query = getSupabaseAdmin().from('visits').select('*', { count: 'exact' });

    if ((userProfile as any).role === 'agent' || (userProfile as any).role === 'Agent') {
      query = query.eq('agent_id', email);
      console.log('👤 [GET VISITS] Agent filter applied');
    } else if (((userProfile as any).role === 'team_lead' || (userProfile as any).role === 'Team Lead') && (userProfile as any).team_name) {
      query = query.eq('team_name', (userProfile as any).team_name);
      console.log('👥 [GET VISITS] Team Lead filter applied for team:', (userProfile as any).team_name);
    }

    const { data: visits, count } = await query;
    let filteredVisits = visits || [];

    console.log('📊 [GET VISITS] Total visits from DB:', filteredVisits.length);
    console.log('📊 [GET VISITS] Sample visits:', filteredVisits.slice(0, 3).map((v: any) => ({
      brand: v.brand_name,
      status: v.visit_status,
      approval: v.approval_status,
      team: v.team_name,
      agent: v.agent_name
    })));

    if (search && search.trim()) {
      const searchLower = search.toLowerCase().trim();
      console.log('🔍 [GET VISITS] Applying search filter:', searchLower);
      
      filteredVisits = filteredVisits.filter((visit: any) => 
        visit.brand_name?.toLowerCase().includes(searchLower) ||
        visit.agent_name?.toLowerCase().includes(searchLower) ||
        visit.visit_status?.toLowerCase().includes(searchLower) ||
        visit.purpose?.toLowerCase().includes(searchLower) ||
        visit.notes?.toLowerCase().includes(searchLower)
      );
      
      console.log('📊 [GET VISITS] After search filter:', filteredVisits.length);
    }

    const total = filteredVisits.length;
    const startIndex = (page - 1) * limit;
    const paginatedVisits = filteredVisits.slice(startIndex, startIndex + limit);

    console.log('📄 [GET VISITS] Returning page', page, ':', paginatedVisits.length, 'visits');

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
    
    console.log('🔵 [SUBMIT MOM] Starting MOM submission with params:', {
      visit_id: params.visit_id,
      has_open_points: !!params.open_points,
      open_points_count: params.open_points?.length || 0,
      mom_shared: params.mom_shared,
      created_by: params.created_by,
      brand_name: params.brand_name,
      agent_name: params.agent_name
    });
    
    const { data: visit } = await getSupabaseAdmin()
      .from('visits')
      .select('*')
      .eq('visit_id', params.visit_id)
      .single();

    if (!visit) {
      console.error('❌ [SUBMIT MOM] Visit not found:', params.visit_id);
      throw new Error("Visit not found");
    }
    
    console.log('✅ [SUBMIT MOM] Visit found:', {
      visit_id: (visit as any).visit_id,
      brand_name: (visit as any).brand_name,
      agent_name: (visit as any).agent_name,
      team_name: (visit as any).team_name,
      agent_id: (visit as any).agent_id
    });

    if (!params.open_points || params.open_points.length === 0) {
      console.log('⚠️ [SUBMIT MOM] No open points provided, updating visit status only');
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
        
        console.log('✅ [SUBMIT MOM] Visit updated (no MOM record created)');
        return { success: true };
      } else {
        console.error('❌ [SUBMIT MOM] No MOM data or status update provided');
        throw new Error("No MOM data or status update provided");
      }
    }

    const brand_name = params.brand_name || (visit as any).brand_name;
    const agent_name = params.agent_name || (visit as any).agent_name;
    const created_by = params.created_by || (visit as any).agent_id;

    console.log('🔍 [SUBMIT MOM] Resolved values:', {
      brand_name,
      agent_name,
      created_by,
      team_name: (visit as any).team_name
    });

    if (!brand_name || !agent_name || !created_by) {
      console.error('❌ [SUBMIT MOM] Missing required information:', {
        brand_name,
        agent_name,
        created_by
      });
      throw new Error("Missing required information: brand_name, agent_name, or created_by");
    }

    const ticketId = `MOM-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    console.log('🎫 [SUBMIT MOM] Generated ticket ID:', ticketId);
    
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
    
    console.log('📋 [SUBMIT MOM] Processed open points:', processedOpenPoints.length);
    
    const momData = {
      ticket_id: ticketId,
      title: `Visit MOM - ${brand_name}${params.is_resubmission ? ' (Resubmitted)' : ''}`,
      description: `Minutes of Meeting for visit to ${brand_name}${params.is_resubmission ? ' - Resubmitted after feedback' : ''}`,
      status: 'Open',
      priority: 'Medium',
      category: 'Visit MOM', // Proper category for visit MOMs
      created_by: created_by,
      team: (visit as any).team_name,
      brand_name: brand_name,
      customer_name: brand_name,
      visit_id: params.visit_id,
      open_points: processedOpenPoints,
      is_resubmission: params.is_resubmission || false,
      resubmission_notes: params.resubmission_notes,
      created_at: now,
      updated_at: now,
    };
    
    console.log('💾 [SUBMIT MOM] Inserting MOM record into database:', {
      ticket_id: momData.ticket_id,
      created_by: momData.created_by,
      team: momData.team,
      brand_name: momData.brand_name,
      visit_id: momData.visit_id,
      open_points_count: momData.open_points.length
    });
    
    try {
      const { error: insertError } = await (getSupabaseAdmin().from('mom') as any).insert(momData);
      
      if (insertError) {
        console.error('❌ [SUBMIT MOM] Database insert error:', insertError);
        throw insertError;
      }
      
      console.log('✅ [SUBMIT MOM] MOM record inserted successfully');
    } catch (error) {
      console.error('❌ [SUBMIT MOM] Failed to insert MOM:', error);
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
    
    console.log('🔄 [SUBMIT MOM] Updating visit record:', {
      visit_id: params.visit_id,
      updateData
    });
    
    try {
      const { error: updateError } = await (getSupabaseAdmin()
        .from('visits') as any)
        .update(updateData)
        .eq('visit_id', params.visit_id);
      
      if (updateError) {
        console.error('❌ [SUBMIT MOM] Visit update error:', updateError);
        throw updateError;
      }
      
      console.log('✅ [SUBMIT MOM] Visit updated successfully');
    } catch (error) {
      console.error('❌ [SUBMIT MOM] Failed to update visit:', error);
      throw error;
    }
    
    console.log('🎉 [SUBMIT MOM] MOM submission completed successfully');
    return { success: true };
  },

  // Approve or reject a visit
  async approveVisit(params: {
    visit_id: string;
    approver_email: string;
    approval_status: string;
    rejection_remarks?: string;
  }) {
    console.log('🔍 [APPROVE VISIT] Starting approval process:', {
      visit_id: params.visit_id,
      approval_status: params.approval_status,
      approver_email: params.approver_email
    });

    const { data: visit, error: fetchError } = await getSupabaseAdmin()
      .from('visits')
      .select('*')
      .eq('visit_id', params.visit_id)
      .single();

    if (fetchError) {
      console.error('❌ [APPROVE VISIT] Error fetching visit:', fetchError);
      throw new Error(`Failed to fetch visit: ${fetchError.message}`);
    }

    if (!visit) {
      console.error('❌ [APPROVE VISIT] Visit not found:', params.visit_id);
      throw new Error("Visit not found");
    }

    console.log('📋 [APPROVE VISIT] Current visit state:', {
      visit_id: (visit as any).visit_id,
      visit_status: (visit as any).visit_status,
      approval_status: (visit as any).approval_status
    });

    const now = new Date().toISOString();
    const updateData: any = {
      approval_status: params.approval_status,
      approved_by: params.approver_email,
      approved_at: now,
      updated_at: now,
    };

    // When MOM is approved, ensure visit is marked as Completed
    if (params.approval_status === "Approved") {
      updateData.visit_status = "Completed";
      console.log('✅ [APPROVE VISIT] Marking visit as Completed since MOM is approved');
    } else if (params.approval_status === "Rejected") {
      // When rejected, keep the visit status but add rejection details
      if (params.rejection_remarks) {
        updateData.rejection_remarks = params.rejection_remarks;
        updateData.rejected_by = params.approver_email;
        updateData.rejected_at = now;
      }
      console.log('❌ [APPROVE VISIT] MOM rejected, visit remains in current status');
    }

    console.log('📝 [APPROVE VISIT] Update data:', updateData);

    const { data, error } = await (getSupabaseAdmin()
      .from('visits') as any)
      .update(updateData)
      .eq('visit_id', params.visit_id)
      .select();

    if (error) {
      console.error('❌ [APPROVE VISIT] Error updating visit approval:', error);
      throw new Error(`Failed to update visit: ${error.message}`);
    }

    if (!data || data.length === 0) {
      console.error('❌ [APPROVE VISIT] No data returned from update');
      throw new Error('Visit not found or update failed');
    }

    console.log('✅ [APPROVE VISIT] Visit approval updated successfully:', {
      visit_id: params.visit_id,
      approval_status: params.approval_status,
      visit_status: updateData.visit_status,
      updated_record: data[0]
    });

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

    if ((visit as any).agent_id !== params.agent_email) {
      throw new Error("Unauthorized: Visit does not belong to this agent");
    }

    if ((visit as any).approval_status !== "Rejected") {
      throw new Error("Visit is not in rejected status");
    }

    const now = new Date().toISOString();
    const resubmissionCount = ((visit as any).resubmission_count || 0) + 1;

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

    const now = new Date().toISOString();
    const rescheduleCount = ((visit as any).reschedule_count || 0) + 1;

    const rescheduleHistory = (visit as any).reschedule_history || [];
    rescheduleHistory.push({
      old_date: (visit as any).scheduled_date,
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

    return {
      visit_id: (visit as any).visit_id,
      current_date: (visit as any).scheduled_date,
      reschedule_count: (visit as any).reschedule_count || 0,
      reschedule_history: (visit as any).reschedule_history || [],
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
