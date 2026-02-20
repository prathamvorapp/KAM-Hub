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
  email: string;
  full_name: string;
  role: string;
  team_name?: string;
  teamName?: string; // Add camelCase for compatibility
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
      // Agent can access their own demos
      return userProfile.email === demo.agent_id;
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
    
    let query = getSupabaseAdmin().from('demos').select('*');
    
    if (normalizedRole === "admin") {
      console.log(`👑 [getDemosForAgent] Admin - fetching all demos`);
      // Admin can see all demos
    } else if (normalizedRole === "team_lead") {
      const teamName = userProfile.team_name || userProfile.teamName;
      if (teamName) {
        console.log(`👥 [getDemosForAgent] Team Lead - fetching demos for team: ${teamName}`);
        query = query.eq('team_name', teamName);
      } else {
        console.log(`⚠️ [getDemosForAgent] Team Lead has no team assigned`);
        query = query.eq('agent_id', 'NON_EXISTENT_EMAIL');
      }
    } else {
      console.log(`👤 [getDemosForAgent] Agent - fetching demos for: ${userProfile.email}`);
      query = query.eq('agent_id', userProfile.email);
    }
    
    const { data: demos, error } = await query as { data: Demo[] | null; error: any };
    
    if (error) {
      console.error(`❌ [getDemosForAgent] Error fetching demos:`, error);
    }
    
    console.log(`📊 [getDemosForAgent] Found ${demos?.length || 0} demos`);
    
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
    
    let query = getSupabaseAdmin().from('demos').select('*');
    
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
    } else {
      console.warn(`⚠️ Unknown role: ${userProfile.role}, denying access to demo statistics`);
      query = query.eq('agent_id', 'NON_EXISTENT_EMAIL'); // Deny for unknown roles
    }
    
    const { data: demos } = await query as { data: Demo[] | null; error: any };
    
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
