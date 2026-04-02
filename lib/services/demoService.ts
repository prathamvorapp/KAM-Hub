/**
 * Demo Service - Supabase Implementation
 */

import { supabase, getSupabaseAdmin } from '../supabase-server';
import { normalizeUserProfile } from '../../utils/authUtils';

// Type definitions
interface BrandData {
  id: string;
  kam_email_id: string;
  brand_name?: string;
  kam_name?: string; // Added for consistency
  zone?: string; // Added for consistency
  [key: string]: any;
}

interface UserProfile {
  id?: string;
  dbId?: string;
  email: string;
  full_name: string;
  role: string;
  team_name?: string;
  teamName?: string;
  coordinator_id?: string;
  [key: string]: any;
}

interface Demo {
  demo_id: string;
  brand_name: string;
  brand_id: string;
  product_name: string;
  agent_id: string;
  agent_name: string;
  team_name?: string;
  zone?: string;
  current_status: string;
  workflow_completed: boolean;
  [key: string]: any;
}

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
  // Authorization Helper
  _authorizeDemoAccess: async (demo: Demo, rawProfile: UserProfile): Promise<boolean> => {
    const userProfile = normalizeUserProfile(rawProfile);
    const normalizedRole = userProfile.role.toLowerCase().replace(/\s+/g, '_');
    
    if (normalizedRole === 'admin') {
      return true;
    }
    if (normalizedRole === 'team_lead' || normalizedRole === 'teamlead') {
      // Team Lead can access demos in their team
      const teamName = userProfile.team_name || userProfile.teamName;
      return teamName === demo.team_name;
    }
    if (normalizedRole === 'agent') {
      // Agent can access their own demos (current agent_id)
      if (userProfile.email === demo.agent_id) {
        return true;
      }
      // Also allow access if the agent is the current KAM of the brand (transferred brand scenario)
      // This lets the new KAM fill in conversion decisions on completed demos that stayed with original KAM
      const { data: brandData } = await getSupabaseAdmin()
        .from('master_data')
        .select('kam_email_id')
        .eq('id', demo.brand_id)
        .single() as { data: { kam_email_id: string } | null; error: any };
      if (brandData && brandData.kam_email_id === userProfile.email) {
        return true;
      }
      return false;
    }
    if (normalizedRole === 'sub_agent' || normalizedRole === 'subagent') {
      // sub_agent can access any of their coordinators' demos
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
          return coordinatorEmails.includes(demo.agent_id);
        }
      }
    }
    return false;
  },

  // Authorization Helper for Brand initialization
  _authorizeBrandInitialization: async (brandId: string, rawProfile: UserProfile): Promise<boolean> => {
    const userProfile = normalizeUserProfile(rawProfile);
    const normalizedRole = userProfile.role.toLowerCase().replace(/\s+/g, '_');

    if (normalizedRole === 'admin') {
      return true; // Admin can initialize any brand
    }

    const { data: brandData } = await getSupabaseAdmin()
        .from('master_data')
        .select('kam_email_id')
        .eq('id', brandId)
        .single() as { data: BrandData | null; error: any };

    if (!brandData) {
        throw new Error("Brand not found for authorization check");
    }

    if (normalizedRole === 'team_lead' || normalizedRole === 'teamlead') {
      // Team Lead can initialize brands that belong to their team members
      const teamName = userProfile.team_name || userProfile.teamName;
      if (teamName) {
        const { data: teamMembers } = await getSupabaseAdmin()
          .from('user_profiles')
          .select('email')
          .eq('team_name', teamName)
          .in('role', ['agent', 'Agent']);
        const agentEmails = teamMembers?.map((m: any) => m.email) || [];
        return agentEmails.includes(brandData.kam_email_id);
      }
      return false;
    }

    if (normalizedRole === 'agent') {
      // Agent can only initialize their own assigned brands
      return userProfile.email === brandData.kam_email_id;
    }
    if (normalizedRole === 'sub_agent' || normalizedRole === 'subagent') {
      // sub_agent can initialize brands belonging to any of their coordinators
      const lookupId = userProfile.dbId || userProfile.id;
      if (lookupId) {
        const { data: sacRows } = await getSupabaseAdmin()
          .from('sub_agent_coordinators').select('coordinator_id')
          .eq('sub_agent_id', lookupId) as { data: Array<{ coordinator_id: string }> | null; error: any };
        if (sacRows && sacRows.length > 0) {
          const { data: coords } = await getSupabaseAdmin()
            .from('user_profiles').select('email').in('id', sacRows.map(r => r.coordinator_id));
          const coordinatorEmails = (coords as any[])?.map((c: any) => c.email) || [];
          return coordinatorEmails.includes(brandData.kam_email_id);
        }
      }
    }
    return false;
  },

  // Initialize demos for a brand from Master_Data
  async initializeBrandDemosFromMasterData(brandId: string, rawProfile: UserProfile) { // userProfile required
    const userProfile = normalizeUserProfile(rawProfile);
    // Authorization check
    const isAuthorized = await demoService._authorizeBrandInitialization(brandId, userProfile);
    if (!isAuthorized) {
        throw new Error(`Access denied: User ${userProfile.email} is not authorized to initialize demos for brand ${brandId}`);
    }

    const { data: brandData } = await getSupabaseAdmin()
      .from('master_data')
      .select('*')
      .eq('id', brandId)
      .single() as { data: BrandData | null; error: any };
    
    if (!brandData) {
      throw new Error("Brand not found in Master_Data");
    }
    
    // Fetch KAM's full profile to get team_name for demo records
    const { data: kamProfile } = await getSupabaseAdmin()
      .from('user_profiles')
      .select('full_name, team_name')
      .eq('email', brandData.kam_email_id)
      .single() as { data: UserProfile | null; error: any };
    
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
      
      const { error } = await (getSupabaseAdmin().from('demos') as any).insert({
        demo_id: demoId,
        brand_name: brandData.brand_name,
        brand_id: brandId,
        product_name: product,
        agent_id: brandData.kam_email_id,
        agent_name: kamProfile?.full_name || brandData.kam_name, // Use full_name from profile if available
        team_name: kamProfile?.team_name || brandData.team_name, // Use team_name from profile if available
        zone: brandData.zone,
        current_status: "Step 1 Pending",
        workflow_completed: false,
        actioned_by: userProfile.full_name || userProfile.fullName, // Track who initialized
        created_at: now,
        updated_at: now,
      });
      
      if (error) throw error;
      demoIds.push({ demoId, product });
    }
    
    return demoIds;
  },

  // Get demos for agent's brands (role-based access)
  async getDemosForAgent(rawProfile: UserProfile) { // userProfile required
    const userProfile = normalizeUserProfile(rawProfile);
    const normalizedRole = userProfile.role.toLowerCase().replace(/\s+/g, '_');
    
    console.log(`🔍 [getDemosForAgent] Called by: ${userProfile.email} with role:`, {
      role: userProfile.role,
      normalizedRole,
      teamName: userProfile.team_name || userProfile.teamName
    });
    
    // For agents, pre-fetch brand IDs where they are the current KAM (handles transferred brands)
    let agentKamBrandIds: string[] = [];
    if (normalizedRole === 'agent') {
      const { data: kamBrands } = await getSupabaseAdmin()
        .from('master_data')
        .select('id')
        .eq('kam_email_id', userProfile.email) as { data: Array<{ id: string }> | null; error: any };
      agentKamBrandIds = kamBrands?.map(b => b.id) || [];
    }

    // Fetch all demos in batches to avoid 1000 row limit
    let allDemos: Demo[] = [];
    let from = 0;
    const batchSize = 1000;
    let hasMore = true;
    
    while (hasMore) {
      let query = getSupabaseAdmin().from('demos').select('*', { count: 'exact' });
      
      if (normalizedRole === "admin") {
        // Admin can see all demos
      } else if (normalizedRole === "team_lead") {
        const teamName = userProfile.team_name || userProfile.teamName;
        if (teamName) {
          query = query.eq('team_name', teamName);
        } else {
          query = query.eq('agent_id', 'NON_EXISTENT_EMAIL');
        }
      } else if (normalizedRole === 'sub_agent' || normalizedRole === 'subagent') {
        // sub_agent sees coordinator agents' demos
        const lookupId = userProfile.dbId || userProfile.id;
        if (lookupId) {
          const { data: sacRows } = await getSupabaseAdmin()
            .from('sub_agent_coordinators').select('coordinator_id')
            .eq('sub_agent_id', lookupId) as { data: Array<{ coordinator_id: string }> | null; error: any };
          if (sacRows && sacRows.length > 0) {
            const { data: coords } = await getSupabaseAdmin()
              .from('user_profiles').select('email').in('id', sacRows.map(r => r.coordinator_id));
            const coordinatorEmails = (coords as any[])?.map((c: any) => c.email).filter(Boolean) || [];
            if (coordinatorEmails.length > 0) {
              query = query.in('agent_id', coordinatorEmails);
            } else {
              query = query.eq('agent_id', 'NON_EXISTENT_EMAIL');
            }
          } else {
            query = query.eq('agent_id', 'NON_EXISTENT_EMAIL');
          }
        } else {
          query = query.eq('agent_id', 'NON_EXISTENT_EMAIL');
        }
      } else {
        // Agent sees their own demos AND demos for brands where they are the current KAM
        // (covers transferred brand scenario where demo agent_id wasn't updated)
        if (agentKamBrandIds.length > 0) {
          query = query.or(`agent_id.eq.${userProfile.email},brand_id.in.(${agentKamBrandIds.join(',')})`);
        } else {
          query = query.eq('agent_id', userProfile.email);
        }
      }
      
      const { data: batch, error } = await query.range(from, from + batchSize - 1) as { data: Demo[] | null; error: any };
      
      if (error) {
        console.error(`❌ [getDemosForAgent] Error fetching demos batch:`, error);
        break;
      }
      
      if (batch && batch.length > 0) {
        allDemos = allDemos.concat(batch);
        from += batchSize;
        hasMore = batch.length === batchSize;
      } else {
        hasMore = false;
      }
    }
    
    const demos = allDemos;
    console.log(`📊 [getDemosForAgent] Found ${demos?.length || 0} demos (fetched in batches)`);
    
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
    
    const result = Object.values(brandGroups);
    console.log(`📦 [getDemosForAgent] Returning ${result.length} brand groups`);
    
    return result;
  },

  // Step 1: Set Product Applicability
  async setProductApplicability(params: {
    demoId: string;
    isApplicable: boolean;
    nonApplicableReason?: string;
  }, rawProfile: UserProfile) { // userProfile required
    const userProfile = normalizeUserProfile(rawProfile);
    const { data: demo } = await getSupabaseAdmin()
      .from('demos')
      .select('*')
      .eq('demo_id', params.demoId)
      .single() as { data: Demo | null; error: any };
    
    if (!demo) {
      throw new Error("Demo not found");
    }

    // Authorization check
    const isAuthorized = await demoService._authorizeDemoAccess(demo, userProfile);
    if (!isAuthorized) {
      throw new Error(`Access denied: User ${userProfile.email} is not authorized to modify demo ${params.demoId}`);
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
    
    await (getSupabaseAdmin()
      .from('demos') as any)
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
  }, rawProfile: UserProfile) { // userProfile required
    const userProfile = normalizeUserProfile(rawProfile);
    const { data: demo } = await getSupabaseAdmin()
      .from('demos')
      .select('*')
      .eq('demo_id', params.demoId)
      .single() as { data: Demo | null; error: any };
    
    if (!demo) {
      throw new Error("Demo not found");
    }

    // Authorization check
    const isAuthorized = await demoService._authorizeDemoAccess(demo, userProfile);
    if (!isAuthorized) {
      throw new Error(`Access denied: User ${userProfile.email} is not authorized to modify demo ${params.demoId}`);
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
    
    await (getSupabaseAdmin()
      .from('demos') as any)
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
  }, rawProfile: UserProfile) { // userProfile required
    const userProfile = normalizeUserProfile(rawProfile);
    const { data: demo } = await getSupabaseAdmin()
      .from('demos')
      .select('*')
      .eq('demo_id', params.demoId)
      .single() as { data: Demo | null; error: any };
    
    if (!demo) {
      throw new Error("Demo not found");
    }

    // Authorization check
    const isAuthorized = await demoService._authorizeDemoAccess(demo, userProfile);
    if (!isAuthorized) {
      throw new Error(`Access denied: User ${userProfile.email} is not authorized to modify demo ${params.demoId}`);
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
    
    await (getSupabaseAdmin()
      .from('demos') as any)
      .update({
        demo_scheduled_date: params.scheduledDate,
        demo_scheduled_time: params.scheduledTime,
        demo_rescheduled_count: (demo.demo_rescheduled_count || 0) + (isReschedule ? 1 : 0),
        demo_scheduling_history: history,
        ...(demo.workflow_completed ? {} : { current_status: "Demo Scheduled" }),
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
  }, rawProfile: UserProfile) { // userProfile required
    const userProfile = normalizeUserProfile(rawProfile);
    const { data: demo } = await getSupabaseAdmin()
      .from('demos')
      .select('*')
      .eq('demo_id', params.demoId)
      .single() as { data: Demo | null; error: any };
    
    if (!demo) {
      throw new Error("Demo not found");
    }

    // Authorization check
    const isAuthorized = await demoService._authorizeDemoAccess(demo, userProfile);
    if (!isAuthorized) {
      throw new Error(`Access denied: User ${userProfile.email} is not authorized to modify demo ${params.demoId}`);
    }
    
    if (demo.current_status !== "Demo Scheduled") {
      throw new Error("Demo must be scheduled before completion");
    }
    
    if (!DEMO_CONDUCTORS.includes(params.conductedBy as any)) {
      throw new Error("Invalid demo conductor");
    }
    
    const now = new Date().toISOString();
    
    await (getSupabaseAdmin()
      .from('demos') as any)
      .update({
        demo_completed: true,
        demo_completed_date: now,
        demo_conducted_by: params.conductedBy,
        demo_completion_notes: params.completionNotes,
        completed_by_agent_id: userProfile.email,
        completed_by_agent_name: userProfile.full_name || demo.agent_name,
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
  }, rawProfile: UserProfile) { // userProfile required
    const userProfile = normalizeUserProfile(rawProfile);
    const { data: demo } = await getSupabaseAdmin()
      .from('demos')
      .select('*')
      .eq('demo_id', params.demoId)
      .single() as { data: Demo | null; error: any };
    
    if (!demo) {
      throw new Error("Demo not found");
    }

    // Authorization check
    const isAuthorized = await demoService._authorizeDemoAccess(demo, userProfile);
    if (!isAuthorized) {
      throw new Error(`Access denied: User ${userProfile.email} is not authorized to modify demo ${params.demoId}`);
    }
    
    if (demo.current_status !== "Feedback Awaited") {
      throw new Error("Demo must be completed before conversion decision");
    }
    
    if (params.conversionStatus === "Not Converted" && !params.nonConversionReason) {
      throw new Error("Reason required when marking as not converted");
    }
    
    const now = new Date().toISOString();
    
    await (getSupabaseAdmin()
      .from('demos') as any)
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
    // rescheduleBy: string; // Removed, comes from userProfile
    // rescheduleByRole: string; // Removed, comes from userProfile
  }, rawProfile: UserProfile) { // userProfile required
    const userProfile = normalizeUserProfile(rawProfile);
    const normalizedRole = userProfile.role.toLowerCase().replace(/\s+/g, '_');
    if (normalizedRole !== "team_lead" && normalizedRole !== "admin") {
      throw new Error(`Access denied: User ${userProfile.email} (Role: ${userProfile.role}) is not authorized to reschedule demos`);
    }

    const { data: demo } = await getSupabaseAdmin()
      .from('demos')
      .select('*')
      .eq('demo_id', params.demoId)
      .single() as { data: Demo | null; error: any };
    
    if (!demo) {
      throw new Error("Demo not found");
    }
    
    if (normalizedRole === "team_lead") {
      // Team Lead can only reschedule demos from their team
      const teamName = userProfile.team_name || userProfile.teamName;
      if (teamName !== demo.team_name) {
        throw new Error(`Access denied: Team Lead ${userProfile.email} can only reschedule demos from their team`);
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
        reason: `${params.reason} (Rescheduled by ${userProfile.role}: ${userProfile.email})`, // Use userProfile
      });
    }
    
    await (getSupabaseAdmin()
      .from('demos') as any)
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
      rescheduledBy: userProfile.email, // Use userProfile
      rescheduledByRole: userProfile.role // Use userProfile
    };
  },

  // Get demo statistics
  async getDemoStatistics(rawProfile: UserProfile) { // userProfile required
    const userProfile = normalizeUserProfile(rawProfile);
    const normalizedRole = userProfile.role.toLowerCase().replace(/\s+/g, '_');
    
    // Fetch all demos in batches to avoid 1000 row limit
    let allDemos: Demo[] = [];
    let from = 0;
    const batchSize = 1000;
    let hasMore = true;
    
    while (hasMore) {
      let query = getSupabaseAdmin().from('demos').select('*', { count: 'exact' });
      
      if (normalizedRole === "admin") {
        // Admin sees all
      } else if (normalizedRole === "team_lead") {
        const teamName = userProfile.team_name || userProfile.teamName;
        if (teamName) {
          query = query.eq('team_name', teamName);
        } else {
          query = query.eq('agent_id', 'NON_EXISTENT_EMAIL');
        }
      } else if (normalizedRole === "agent") {
        query = query.eq('agent_id', userProfile.email);
      } else if (normalizedRole === 'sub_agent' || normalizedRole === 'subagent') {
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
      } else {
        console.warn(`⚠️ Unknown role: ${userProfile.role}, denying access to demo statistics`);
        query = query.eq('agent_id', 'NON_EXISTENT_EMAIL');
      }
      
      const { data: batch, error } = await query.range(from, from + batchSize - 1) as { data: Demo[] | null; error: any };
      
      if (error) {
        console.error('Error fetching demos batch:', error);
        break;
      }
      
      if (batch && batch.length > 0) {
        allDemos = allDemos.concat(batch);
        from += batchSize;
        hasMore = batch.length === batchSize;
      } else {
        hasMore = false;
      }
    }
    
    const demos = allDemos;
    console.log(`📊 [getDemoStatistics] Fetched ${demos.length} total demos`);
    
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
  // Reset/Revert Demo (Team Lead and Admin only)
  async resetDemo(params: {
    demoId: string;
    resetReason: string;
  }, rawProfile: UserProfile) {
    const userProfile = normalizeUserProfile(rawProfile);
    const normalizedRole = userProfile.role.toLowerCase().replace(/\s+/g, '_');

    if (normalizedRole !== "team_lead" && normalizedRole !== "admin") {
      throw new Error(`Access denied: User ${userProfile.email} (Role: ${userProfile.role}) is not authorized to reset demos`);
    }

    const { data: demo } = await getSupabaseAdmin()
      .from('demos')
      .select('*')
      .eq('demo_id', params.demoId)
      .single() as { data: Demo | null; error: any };

    if (!demo) {
      throw new Error("Demo not found");
    }

    if (normalizedRole === "team_lead") {
      const teamName = userProfile.team_name || userProfile.teamName;
      if (teamName !== demo.team_name) {
        throw new Error(`Access denied: Team Lead ${userProfile.email} can only reset demos from their team`);
      }
    }

    const now = new Date().toISOString();

    // Store reset history (if column exists)
    const resetHistory = demo.reset_history || [];
    resetHistory.push({
      reset_at: now,
      reset_by: userProfile.email,
      reset_by_role: userProfile.role,
      reason: params.resetReason,
      previous_state: {
        current_status: demo.current_status,
        workflow_completed: demo.workflow_completed,
        is_applicable: demo.is_applicable,
        usage_status: demo.usage_status,
        demo_scheduled_date: demo.demo_scheduled_date,
        demo_completed: demo.demo_completed,
        conversion_status: demo.conversion_status,
      }
    });

    // Check if the brand has been transferred to a new KAM — if so, reassign demo to current KAM
    let reassignFields: any = {};
    const { data: brandData } = await getSupabaseAdmin()
      .from('master_data')
      .select('kam_email_id, kam_name, team_name')
      .eq('id', demo.brand_id)
      .single() as { data: { kam_email_id: string; kam_name: string; team_name: string } | null; error: any };

    if (brandData && brandData.kam_email_id !== demo.agent_id) {
      // Brand has been transferred — reassign this demo to the current KAM
      const { data: newKamProfile } = await getSupabaseAdmin()
        .from('user_profiles')
        .select('email, full_name, team_name')
        .eq('email', brandData.kam_email_id)
        .single() as { data: { email: string; full_name: string; team_name: string } | null; error: any };

      if (newKamProfile) {
        const transferEntry = {
          from_agent_id: demo.agent_id,
          to_agent_id: newKamProfile.email,
          transferred_at: now,
          transferred_by: userProfile.email,
          reason: `Reset by ${userProfile.role} — reassigned to current KAM`,
          demo_status_at_transfer: demo.current_status,
        };
        const existingHistory = Array.isArray(demo.transfer_history) ? demo.transfer_history : [];
        reassignFields = {
          agent_id: newKamProfile.email,
          agent_name: newKamProfile.full_name,
          team_name: newKamProfile.team_name || demo.team_name,
          transfer_history: [...existingHistory, transferEntry],
        };
        console.log(`🔄 [resetDemo] Reassigning demo to current KAM: ${newKamProfile.email}`);
      }
    }

    // Prepare update object
    const updateData: any = {
      // Reset all workflow fields
      is_applicable: null,
      non_applicable_reason: null,
      step1_completed_at: null,
      usage_status: null,
      step2_completed_at: null,
      demo_scheduled_date: null,
      demo_scheduled_time: null,
      demo_rescheduled_count: 0,
      demo_scheduling_history: [],
      demo_completed: false,
      demo_completed_date: null,
      demo_conducted_by: null,
      demo_completion_notes: null,
      completed_by_agent_id: null,
      completed_by_agent_name: null,
      conversion_status: null,
      non_conversion_reason: null,
      conversion_decided_at: null,
      current_status: "Step 1 Pending",
      workflow_completed: false,
      updated_at: now,
      ...reassignFields,
    };

    // Only add reset_history if the column exists in the demo object
    if ('reset_history' in demo) {
      updateData.reset_history = resetHistory;
    }

    // Reset to initial state
    const { error: updateError } = await (getSupabaseAdmin()
      .from('demos') as any)
      .update(updateData)
      .eq('demo_id', params.demoId);

    if (updateError) {
      console.error('❌ [resetDemo] Update failed:', updateError);
      throw new Error(`Failed to reset demo: ${updateError.message}`);
    }

    console.log('✅ [resetDemo] Demo reset successfully:', {
      demoId: params.demoId,
      previousStatus: demo.current_status,
      newStatus: 'Step 1 Pending',
      resetBy: userProfile.email
    });

    return {
      success: true,
      resetBy: userProfile.email,
      resetByRole: userProfile.role,
      message: "Demo has been reset to initial state"
    };
  },

  // Bulk Complete Demo Workflow (All 5 steps at once)
  async bulkCompleteDemo(params: {
    demoId: string;
    // Step 1
    isApplicable: boolean;
    nonApplicableReason?: string;
    // Step 2
    usageStatus?: string;
    // Step 3
    scheduledDate?: string;
    scheduledTime?: string;
    // Step 4
    conductedBy?: string;
    completionNotes?: string;
    // Step 5
    conversionStatus?: string;
    nonConversionReason?: string;
  }, rawProfile: UserProfile) {
    const userProfile = normalizeUserProfile(rawProfile);

    const { data: demo } = await getSupabaseAdmin()
      .from('demos')
      .select('*')
      .eq('demo_id', params.demoId)
      .single() as { data: Demo | null; error: any };

    if (!demo) {
      throw new Error("Demo not found");
    }

    // Authorization check
    const isAuthorized = await demoService._authorizeDemoAccess(demo, userProfile);
    if (!isAuthorized) {
      throw new Error(`Access denied: User ${userProfile.email} is not authorized to modify demo ${params.demoId}`);
    }

    // Validate that demo is in initial state
    if (demo.step1_completed_at) {
      throw new Error("Demo workflow already started. Use individual step updates or reset the demo first.");
    }

    const now = new Date().toISOString();
    let finalStatus = "";
    let workflowCompleted = false;

    // Validate Step 1
    if (!params.isApplicable) {
      if (!params.nonApplicableReason) {
        throw new Error("Reason required when marking as not applicable");
      }
      finalStatus = "Not Applicable";
      workflowCompleted = true;

      // Update with Step 1 only
      await (getSupabaseAdmin()
        .from('demos') as any)
        .update({
          is_applicable: params.isApplicable,
          non_applicable_reason: params.nonApplicableReason,
          step1_completed_at: now,
          current_status: finalStatus,
          workflow_completed: workflowCompleted,
          updated_at: now,
        })
        .eq('demo_id', params.demoId);

      return { success: true, finalStatus, message: "Demo marked as Not Applicable" };
    }

    // Validate Step 2
    if (!params.usageStatus) {
      throw new Error("Usage status is required when product is applicable");
    }

    if (params.usageStatus === "Already Using") {
      finalStatus = "Already Using";
      workflowCompleted = true;

      // Update with Steps 1 & 2
      await (getSupabaseAdmin()
        .from('demos') as any)
        .update({
          is_applicable: params.isApplicable,
          step1_completed_at: now,
          usage_status: params.usageStatus,
          step2_completed_at: now,
          current_status: finalStatus,
          workflow_completed: workflowCompleted,
          updated_at: now,
        })
        .eq('demo_id', params.demoId);

      return { success: true, finalStatus, message: "Demo marked as Already Using" };
    }

    // Validate Steps 3, 4, 5 for Demo Pending flow
    if (!params.scheduledDate || !params.scheduledTime) {
      throw new Error("Demo date and time are required");
    }

    if (!params.conductedBy) {
      throw new Error("Demo conductor is required");
    }

    if (!DEMO_CONDUCTORS.includes(params.conductedBy as any)) {
      throw new Error("Invalid demo conductor");
    }

    if (!params.conversionStatus) {
      throw new Error("Conversion status is required");
    }

    if (params.conversionStatus === "Not Converted" && !params.nonConversionReason) {
      throw new Error("Reason required when marking as not converted");
    }

    finalStatus = params.conversionStatus;
    workflowCompleted = true;

    // Update with all 5 steps
    await (getSupabaseAdmin()
      .from('demos') as any)
      .update({
        // Step 1
        is_applicable: params.isApplicable,
        step1_completed_at: now,
        // Step 2
        usage_status: params.usageStatus,
        step2_completed_at: now,
        // Step 3
        demo_scheduled_date: params.scheduledDate,
        demo_scheduled_time: params.scheduledTime,
        // Step 4
        demo_completed: true,
        demo_completed_date: now,
        demo_conducted_by: params.conductedBy,
        demo_completion_notes: params.completionNotes,
        completed_by_agent_id: userProfile.email,
        completed_by_agent_name: userProfile.full_name || demo.agent_name,
        // Step 5
        conversion_status: params.conversionStatus,
        non_conversion_reason: params.nonConversionReason,
        conversion_decided_at: now,
        // Final state
        current_status: finalStatus,
        workflow_completed: workflowCompleted,
        updated_at: now,
      })
      .eq('demo_id', params.demoId);

    return {
      success: true,
      finalStatus,
      message: `Demo workflow completed with status: ${finalStatus}`
    };
  },

  // Transfer Brand Demos (Admin/Team Lead only)
  async transferBrandDemos(params: {
    brandId: string;
    fromAgentEmail: string;
    toAgentEmail: string;
    toAgentName: string;
    toTeamName?: string;
    transferReason: string;
    transferredBy: string;
  }, rawProfile: UserProfile) {
    const userProfile = normalizeUserProfile(rawProfile);
    const normalizedRole = userProfile.role.toLowerCase().replace(/\s+/g, '_');

    // All authenticated users can transfer brand demos
    console.log(`✅ [Demo Transfer] User ${userProfile.email} (${userProfile.role}) authorized to transfer demos`);

    const now = new Date().toISOString();

    // Get all demos for the brand
    const { data: demos, error: fetchError } = await getSupabaseAdmin()
      .from('demos')
      .select('*')
      .eq('brand_id', params.brandId);

    if (fetchError) {
      throw new Error(`Failed to fetch demos: ${fetchError.message}`);
    }

    if (!demos || demos.length === 0) {
      throw new Error(`No demos found for brand ${params.brandId}`);
    }

    // ONLY transfer PENDING demos (not completed ones)
    const pendingDemos = demos.filter((d: any) => !d.demo_completed && !d.workflow_completed);
    const completedDemos = demos.filter((d: any) => d.demo_completed || d.workflow_completed);

    console.log(`🔄 Transferring ${pendingDemos.length} pending demos (${completedDemos.length} completed demos will stay with original KAM)`);

    // Update each PENDING demo only
    let successCount = 0;
    let errorCount = 0;
    let skippedCount = completedDemos.length;

    for (const demo of pendingDemos) {
      const demoRecord = demo as any;
      const transferEntry = {
        from_agent_id: params.fromAgentEmail,
        to_agent_id: params.toAgentEmail,
        transferred_at: now,
        transferred_by: params.transferredBy,
        reason: params.transferReason,
        demo_status_at_transfer: demoRecord.current_status,
        was_completed: false
      };

      const updatedHistory = [...(demoRecord.transfer_history || []), transferEntry];

      const { error: updateError } = await (getSupabaseAdmin()
        .from('demos') as any)
        .update({
          agent_id: params.toAgentEmail,
          agent_name: params.toAgentName,
          team_name: params.toTeamName || demoRecord.team_name,
          transfer_history: updatedHistory,
          updated_at: now
        })
        .eq('demo_id', demoRecord.demo_id);

      if (updateError) {
        console.error(`❌ Failed to transfer demo ${demoRecord.demo_id}:`, updateError);
        errorCount++;
      } else {
        successCount++;
      }
    }

    console.log(`✅ Transfer complete: ${successCount} transferred, ${skippedCount} kept with original KAM, ${errorCount} errors`);

    return {
      success: errorCount === 0,
      totalDemos: demos.length,
      transferredCount: successCount,
      skippedCount: skippedCount,
      errorCount,
      message: `Transferred ${successCount} pending demos. ${skippedCount} completed demos remain with ${params.fromAgentEmail}`
    };
  },
};
