/**
 * Demo Service - Supabase Implementation
 * Replaces Convex demo functions
 */

import { supabase, getSupabaseAdmin } from '../supabase-client';

export const PRODUCTS = [
  "Task",
  "Purchase", 
  "Payroll",
  "TRM",
  "Reputation",
  "Franchise Module",
  "Petpooja Franchise",
  "Marketing Automation"
] as const;

export const DEMO_CONDUCTORS = [
  "Agent",
  "RM", 
  "MP Training",
  "Product Team"
] as const;

export const demoService = {
  // Initialize demos for a brand from Master_Data
  async initializeBrandDemosFromMasterData(brandId: string) {
    const { data: brandData } = await getSupabaseAdmin()
      .from('master_data')
      .select('*')
      .eq('id', brandId)
      .single();
    
    if (!brandData) {
      throw new Error("Brand not found in Master_Data");
    }
    
    const { data: agentProfile } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('email', brandData.kam_email_id)
      .single();
    
    const now = new Date().toISOString();
    
    const { data: existingDemos } = await getSupabaseAdmin()
      .from('demos')
      .select('*')
      .eq('brand_id', brandId);
    
    if (existingDemos && existingDemos.length > 0) {
      throw new Error("Demos already initialized for this brand");
    }
    
    const demoIds = [];
    
    for (const product of PRODUCTS) {
      const demoId = `${brandId}_${product.replace(/\s+/g, '_')}_${Date.now()}`;
      
      const { error } = await getSupabaseAdmin().from('demos').insert({
        demo_id: demoId,
        brand_name: brandData.brand_name,
        brand_id: brandId,
        product_name: product,
        agent_id: brandData.kam_email_id,
        agent_name: brandData.kam_name,
        team_name: agentProfile?.team_name,
        zone: brandData.zone,
        current_status: "Step 1 Pending",
        workflow_completed: false,
        created_at: now,
        updated_at: now,
      });
      
      if (error) throw error;
      demoIds.push({ demoId, product });
    }
    
    return demoIds;
  },

  // Get demos for agent's brands (role-based access)
  async getDemosForAgent(params: {
    agentId: string;
    role: string;
    teamName?: string;
  }) {
    const normalizedRole = params.role.toLowerCase().replace(/\s+/g, '_');
    
    let query = getSupabaseAdmin().from('demos').select('*');
    
    if (normalizedRole === "admin") {
      // Admin can see all demos
    } else if (normalizedRole === "team_lead" && params.teamName) {
      query = query.eq('team_name', params.teamName);
    } else {
      query = query.eq('agent_id', params.agentId);
    }
    
    const { data: demos } = await query;
    
    const brandGroups = (demos || []).reduce((acc, demo) => {
      if (!acc[demo.brand_name]) {
        acc[demo.brand_name] = {
          brandName: demo.brand_name,
          brandId: demo.brand_id,
          agentName: demo.agent_name,
          teamName: demo.team_name,
          zone: demo.zone,
          products: []
        };
      }
      acc[demo.brand_name].products.push(demo);
      return acc;
    }, {} as Record<string, any>);
    
    return Object.values(brandGroups);
  },

  // Step 1: Set Product Applicability
  async setProductApplicability(params: {
    demoId: string;
    isApplicable: boolean;
    nonApplicableReason?: string;
  }) {
    const { data: demo } = await getSupabaseAdmin()
      .from('demos')
      .select('*')
      .eq('demo_id', params.demoId)
      .single();
    
    if (!demo) {
      throw new Error("Demo not found");
    }
    
    if (demo.step1_completed_at) {
      throw new Error("Step 1 already completed - cannot modify");
    }
    
    if (!params.isApplicable && !params.nonApplicableReason) {
      throw new Error("Reason required when marking as not applicable");
    }
    
    const now = new Date().toISOString();
    let newStatus = "";
    let workflowCompleted = false;
    
    if (!params.isApplicable) {
      newStatus = "Not Applicable";
      workflowCompleted = true;
    } else {
      newStatus = "Step 2 Pending";
    }
    
    await getSupabaseAdmin()
      .from('demos')
      .update({
        is_applicable: params.isApplicable,
        non_applicable_reason: params.nonApplicableReason,
        step1_completed_at: now,
        current_status: newStatus,
        workflow_completed: workflowCompleted,
        updated_at: now,
      })
      .eq('demo_id', params.demoId);
    
    return { success: true, newStatus };
  },

  // Step 2: Set Usage Status
  async setUsageStatus(params: {
    demoId: string;
    usageStatus: string;
  }) {
    const { data: demo } = await getSupabaseAdmin()
      .from('demos')
      .select('*')
      .eq('demo_id', params.demoId)
      .single();
    
    if (!demo) {
      throw new Error("Demo not found");
    }
    
    if (!demo.step1_completed_at || !demo.is_applicable) {
      throw new Error("Step 1 must be completed first and product must be applicable");
    }
    
    if (demo.step2_completed_at) {
      throw new Error("Step 2 already completed - cannot modify");
    }
    
    const now = new Date().toISOString();
    let newStatus = "";
    let workflowCompleted = false;
    
    if (params.usageStatus === "Already Using") {
      newStatus = "Already Using";
      workflowCompleted = true;
    } else {
      newStatus = "Demo Pending";
    }
    
    await getSupabaseAdmin()
      .from('demos')
      .update({
        usage_status: params.usageStatus,
        step2_completed_at: now,
        current_status: newStatus,
        workflow_completed: workflowCompleted,
        updated_at: now,
      })
      .eq('demo_id', params.demoId);
    
    return { success: true, newStatus };
  },

  // Step 3: Schedule Demo
  async scheduleDemo(params: {
    demoId: string;
    scheduledDate: string;
    scheduledTime: string;
    reason?: string;
  }) {
    const { data: demo } = await getSupabaseAdmin()
      .from('demos')
      .select('*')
      .eq('demo_id', params.demoId)
      .single();
    
    if (!demo) {
      throw new Error("Demo not found");
    }
    
    if (demo.current_status !== "Demo Pending" && demo.current_status !== "Demo Scheduled") {
      throw new Error("Demo can only be scheduled when status is 'Demo Pending' or 'Demo Scheduled'");
    }
    
    const now = new Date().toISOString();
    const isReschedule = demo.demo_scheduled_date !== undefined && demo.demo_scheduled_date !== null;
    
    const history = demo.demo_scheduling_history || [];
    if (isReschedule) {
      history.push({
        scheduled_date: demo.demo_scheduled_date!,
        scheduled_time: demo.demo_scheduled_time!,
        rescheduled_at: now,
        reason: params.reason,
      });
    }
    
    await getSupabaseAdmin()
      .from('demos')
      .update({
        demo_scheduled_date: params.scheduledDate,
        demo_scheduled_time: params.scheduledTime,
        demo_rescheduled_count: (demo.demo_rescheduled_count || 0) + (isReschedule ? 1 : 0),
        demo_scheduling_history: history,
        current_status: "Demo Scheduled",
        updated_at: now,
      })
      .eq('demo_id', params.demoId);
    
    return { success: true, isReschedule };
  },

  // Step 4: Complete Demo
  async completeDemo(params: {
    demoId: string;
    conductedBy: string;
    completionNotes?: string;
  }) {
    const { data: demo } = await getSupabaseAdmin()
      .from('demos')
      .select('*')
      .eq('demo_id', params.demoId)
      .single();
    
    if (!demo) {
      throw new Error("Demo not found");
    }
    
    if (demo.current_status !== "Demo Scheduled") {
      throw new Error("Demo must be scheduled before completion");
    }
    
    if (!DEMO_CONDUCTORS.includes(params.conductedBy as any)) {
      throw new Error("Invalid demo conductor");
    }
    
    const now = new Date().toISOString();
    
    await getSupabaseAdmin()
      .from('demos')
      .update({
        demo_completed: true,
        demo_completed_date: now,
        demo_conducted_by: params.conductedBy,
        demo_completion_notes: params.completionNotes,
        current_status: "Feedback Awaited",
        updated_at: now,
      })
      .eq('demo_id', params.demoId);
    
    return { success: true };
  },

  // Step 5: Set Conversion Decision
  async setConversionDecision(params: {
    demoId: string;
    conversionStatus: string;
    nonConversionReason?: string;
  }) {
    const { data: demo } = await getSupabaseAdmin()
      .from('demos')
      .select('*')
      .eq('demo_id', params.demoId)
      .single();
    
    if (!demo) {
      throw new Error("Demo not found");
    }
    
    if (demo.current_status !== "Feedback Awaited") {
      throw new Error("Demo must be completed before conversion decision");
    }
    
    if (params.conversionStatus === "Not Converted" && !params.nonConversionReason) {
      throw new Error("Reason required when marking as not converted");
    }
    
    const now = new Date().toISOString();
    
    await getSupabaseAdmin()
      .from('demos')
      .update({
        conversion_status: params.conversionStatus,
        non_conversion_reason: params.nonConversionReason,
        conversion_decided_at: now,
        current_status: params.conversionStatus,
        workflow_completed: true,
        updated_at: now,
      })
      .eq('demo_id', params.demoId);
    
    return { success: true };
  },

  // Reschedule Demo (Team Lead and Admin only)
  async rescheduleDemo(params: {
    demoId: string;
    scheduledDate: string;
    scheduledTime: string;
    reason: string;
    rescheduleBy: string;
    rescheduleByRole: string;
  }) {
    const normalizedRole = params.rescheduleByRole.toLowerCase().replace(/\s+/g, '_');
    if (normalizedRole !== "team_lead" && normalizedRole !== "admin") {
      throw new Error("Only Team Lead and Admin can reschedule demos");
    }

    const { data: demo } = await getSupabaseAdmin()
      .from('demos')
      .select('*')
      .eq('demo_id', params.demoId)
      .single();
    
    if (!demo) {
      throw new Error("Demo not found");
    }
    
    if (normalizedRole === "team_lead") {
      const { data: rescheduleByProfile } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('email', params.rescheduleBy)
        .single();
      
      if (!rescheduleByProfile || rescheduleByProfile.team_name !== demo.team_name) {
        throw new Error("Team Lead can only reschedule demos from their team");
      }
    }
    
    if (!demo.step1_completed_at) {
      throw new Error("Demo must complete Step 1 (applicability decision) before it can be rescheduled");
    }
    
    const now = new Date().toISOString();
    const isReschedule = demo.demo_scheduled_date !== undefined && demo.demo_scheduled_date !== null;
    
    const history = demo.demo_scheduling_history || [];
    if (isReschedule) {
      history.push({
        scheduled_date: demo.demo_scheduled_date!,
        scheduled_time: demo.demo_scheduled_time!,
        rescheduled_at: now,
        reason: `${params.reason} (Rescheduled by ${params.rescheduleByRole}: ${params.rescheduleBy})`,
      });
    }
    
    await getSupabaseAdmin()
      .from('demos')
      .update({
        demo_scheduled_date: params.scheduledDate,
        demo_scheduled_time: params.scheduledTime,
        demo_rescheduled_count: (demo.demo_rescheduled_count || 0) + (isReschedule ? 1 : 0),
        demo_scheduling_history: history,
        ...(demo.workflow_completed ? {} : { current_status: "Demo Scheduled" }),
        updated_at: now,
      })
      .eq('demo_id', params.demoId);
    
    return { 
      success: true, 
      isReschedule,
      rescheduledBy: params.rescheduleBy,
      rescheduledByRole: params.rescheduleByRole 
    };
  },

  // Get demo statistics
  async getDemoStatistics(params: {
    agentId?: string;
    teamName?: string;
    role: string;
  }) {
    const normalizedRole = params.role.toLowerCase().replace(/\s+/g, '_');
    
    let query = getSupabaseAdmin().from('demos').select('*');
    
    if (normalizedRole === "admin") {
      // Admin sees all
    } else if (normalizedRole === "team_lead" && params.teamName) {
      query = query.eq('team_name', params.teamName);
    } else if (params.agentId) {
      query = query.eq('agent_id', params.agentId);
    }
    
    const { data: demos } = await query;
    
    const stats = {
      total: demos?.length || 0,
      byStatus: {} as Record<string, number>,
      byProduct: {} as Record<string, number>,
      converted: 0,
      notConverted: 0,
      pending: 0,
    };
    
    demos?.forEach(demo => {
      stats.byStatus[demo.current_status] = (stats.byStatus[demo.current_status] || 0) + 1;
      stats.byProduct[demo.product_name] = (stats.byProduct[demo.product_name] || 0) + 1;
      
      if (demo.conversion_status === "Converted") {
        stats.converted++;
      } else if (demo.conversion_status === "Not Converted") {
        stats.notConverted++;
      } else if (!demo.workflow_completed) {
        stats.pending++;
      }
    });
    
    return stats;
  },
};
