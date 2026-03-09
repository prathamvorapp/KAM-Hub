/**
 * Enhanced Visit Service - Adds demo integration to MOM submission
 * This extends the existing visitService with demo creation capabilities
 */

import { getSupabaseAdmin } from '../supabase-server';
import { visitService } from './visitService';
import { demoService } from './demoService';
import { normalizeUserProfile } from '../../utils/authUtils';

interface UserProfile {
  email: string;
  fullName: string;
  role: string;
  team_name?: string;
  teamName?: string;
  [key: string]: any;
}

interface DemoData {
  product_name: string;
  is_applicable: boolean;
  non_applicable_reason?: string;
  demo_scheduled_date?: string;
  demo_scheduled_time?: string;
  demo_conducted_by?: string;
  demo_completed?: boolean;
  demo_completion_notes?: string;
  conversion_status?: string;
  non_conversion_reason?: string;
}

export const visitServiceEnhanced = {
  // All existing methods from visitService are available
  ...visitService,

  /**
   * Enhanced MOM submission that also handles demo creation/updates
   */
  async submitMoMWithDemos(params: {
    visit_id: string;
    open_points: any[];
    csv_topics?: any[];
    meeting_summary?: string;
    demos?: DemoData[];
    brand_name?: string;
    agent_name?: string;
    mom_shared?: string;
    is_resubmission?: boolean;
    resubmission_notes?: string;
  }, rawProfile: UserProfile) {
    const userProfile = normalizeUserProfile(rawProfile);
    const now = new Date().toISOString();

    // First, submit the MOM using the existing service
    await visitService.submitMoM(params, userProfile);

    // If demos are provided, process them
    if (params.demos && params.demos.length > 0) {
      try {
        // Get visit details to extract brand information
        const { data: visitData } = await getSupabaseAdmin()
          .from('visits')
          .select('brand_id, brand_name, agent_id, agent_name, team_name')
          .eq('visit_id', params.visit_id)
          .single();

        if (!visitData) {
          console.error('Visit not found for demo creation');
          return { success: true, demos_created: false };
        }

        const visit = visitData as {
          brand_id: string | null;
          brand_name: string | null;
          agent_id: string | null;
          agent_name: string | null;
          team_name: string | null;
        };

        // Get brand_id from master_data if not in visit
        let brandId = visit.brand_id;
        
        if (!brandId && visit.brand_name) {
          console.log(`🔍 Looking up brand_id for brand: ${visit.brand_name}`);
          const { data: brandDataRaw } = await getSupabaseAdmin()
            .from('master_data')
            .select('id, brand_name')
            .eq('brand_name', visit.brand_name)
            .single();
          
          const brandData = brandDataRaw as { id: string; brand_name: string } | null;
          
          if (brandData) {
            brandId = brandData.id;
            console.log(`✅ Found brand_id: ${brandId} for brand: ${visit.brand_name}`);
          } else {
            console.error(`❌ Brand not found in master_data: ${visit.brand_name}`);
            return { success: true, demos_created: false, error: 'Brand not found in master_data' };
          }
        }

        if (!brandId) {
          console.error('❌ Could not determine brand_id for demo creation');
          return { success: true, demos_created: false, error: 'Brand ID not found' };
        }

        // Check if demos already exist for this brand
        let { data: existingDemos } = await getSupabaseAdmin()
          .from('demos')
          .select('demo_id, product_name, current_status')
          .eq('brand_id', brandId);

        type ExistingDemo = {
          demo_id: string;
          product_name: string;
          current_status: string;
        };

        let existingDemosList = (existingDemos || []) as ExistingDemo[];

        // If no demos exist yet, initialize all 8 products first
        if (!existingDemosList || existingDemosList.length === 0) {
          console.log(`🎯 No demos exist for brand ${visit.brand_name}, initializing all 8 products...`);
          
          const PRODUCTS = [
            "Task",
            "Purchase", 
            "Payroll",
            "TRM",
            "Reputation",
            "Franchise Module",
            "Petpooja Franchise",
            "Marketing Automation"
          ];

          const now = new Date().toISOString();
          const demosToCreate = [];

          for (const product of PRODUCTS) {
            const demoId = `${brandId}_${product.replace(/\s+/g, '_')}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            
            demosToCreate.push({
              demo_id: demoId,
              brand_name: visit.brand_name,
              brand_id: brandId,
              product_name: product,
              agent_id: visit.agent_id,
              agent_name: visit.agent_name,
              team_name: visit.team_name,
              current_status: "Step 1 Pending",
              workflow_completed: false,
              created_at: now,
              updated_at: now,
            });
          }

          // Bulk insert all products
          const { error: bulkInsertError } = await getSupabaseAdmin()
            .from('demos')
            .insert(demosToCreate as any);

          if (bulkInsertError) {
            console.error('❌ Error initializing all products:', bulkInsertError);
          } else {
            console.log(`✅ Initialized all 8 products for brand ${visit.brand_name}`);
          }

          // Refresh existing demos list
          const { data: refreshedDemos } = await getSupabaseAdmin()
            .from('demos')
            .select('demo_id, product_name, current_status')
            .eq('brand_id', brandId);
          
          existingDemosList = (refreshedDemos || []) as ExistingDemo[];
        }

        // Process each demo from the MOM submission
        for (const demoData of params.demos) {
          console.log(`📦 Processing demo for product: ${demoData.product_name}`);
          
          const existingDemo = existingDemosList?.find(
            (d) => d.product_name === demoData.product_name
          );

          if (existingDemo) {
            console.log(`🔄 Updating existing demo: ${existingDemo.demo_id}`);
            // Update existing demo
            await visitServiceEnhanced._updateExistingDemo(
              existingDemo.demo_id,
              demoData,
              userProfile
            );
          } else {
            console.log(`✨ Creating new demo for: ${demoData.product_name}`);
            // Create new demo
            await visitServiceEnhanced._createNewDemo(
              brandId,
              visit.brand_name || '',
              visit.agent_id || '',
              visit.agent_name || '',
              visit.team_name || '',
              demoData,
              userProfile
            );
          }
        }

        console.log(`✅ Successfully processed ${params.demos.length} demos`);
        return { success: true, demos_created: true, demos_count: params.demos.length };
      } catch (demoError) {
        console.error('Error processing demos:', demoError);
        // MOM was submitted successfully, but demos failed
        // Don't fail the entire operation
        return { success: true, demos_created: false, demo_error: demoError };
      }
    }

    return { success: true, demos_created: false };
  },

  /**
   * Create a new demo record
   */
  async _createNewDemo(
    brandId: string,
    brandName: string,
    agentId: string,
    agentName: string,
    teamName: string,
    demoData: DemoData,
    userProfile: UserProfile
  ) {
    const now = new Date().toISOString();
    const demoId = `${brandId}_${demoData.product_name.replace(/\s+/g, '_')}_${Date.now()}`;

    // Determine current status based on demo data
    let currentStatus = 'Step 1 Pending';
    let workflowCompleted = false;

    if (!demoData.is_applicable) {
      currentStatus = 'Not Applicable';
      workflowCompleted = true;
    } else if (demoData.conversion_status) {
      currentStatus = 'Workflow Completed';
      workflowCompleted = true;
    } else if (demoData.demo_completed) {
      currentStatus = 'Step 5 Pending';
    } else if (demoData.demo_scheduled_date) {
      currentStatus = 'Step 4 Pending';
    } else {
      currentStatus = 'Step 2 Pending';
    }

    const demoRecord: any = {
      demo_id: demoId,
      brand_name: brandName,
      brand_id: brandId,
      product_name: demoData.product_name,
      agent_id: agentId,
      agent_name: agentName,
      team_name: teamName,
      current_status: currentStatus,
      workflow_completed: workflowCompleted,
      created_at: now,
      updated_at: now,
    };

    // Step 1: Applicability
    demoRecord.is_applicable = demoData.is_applicable;
    if (!demoData.is_applicable && demoData.non_applicable_reason) {
      demoRecord.non_applicable_reason = demoData.non_applicable_reason;
    }
    demoRecord.step1_completed_at = now;

    // Step 2: Usage Status (if applicable)
    if (demoData.is_applicable) {
      demoRecord.usage_status = 'Demo Pending';
      demoRecord.step2_completed_at = now;
    }

    // Step 3: Schedule (if provided)
    if (demoData.demo_scheduled_date) {
      demoRecord.demo_scheduled_date = demoData.demo_scheduled_date;
      demoRecord.demo_scheduled_time = demoData.demo_scheduled_time || '';
      demoRecord.demo_rescheduled_count = 0;
    }

    // Step 4: Completion (if provided)
    if (demoData.demo_completed) {
      demoRecord.demo_completed = true;
      demoRecord.demo_completed_date = now;
      demoRecord.demo_conducted_by = demoData.demo_conducted_by || 'Agent';
      demoRecord.demo_completion_notes = demoData.demo_completion_notes || '';
      demoRecord.completed_by_agent_id = agentId;
      demoRecord.completed_by_agent_name = agentName;
    }

    // Step 5: Conversion (if provided)
    if (demoData.conversion_status) {
      demoRecord.conversion_status = demoData.conversion_status;
      demoRecord.conversion_decided_at = now;
      if (demoData.conversion_status === 'Not Converted' && demoData.non_conversion_reason) {
        demoRecord.non_conversion_reason = demoData.non_conversion_reason;
      }
    }

    const { error } = await getSupabaseAdmin()
      .from('demos')
      .insert(demoRecord);

    if (error) {
      console.error('Error creating demo:', error);
      throw error;
    }

    return demoRecord;
  },

  /**
   * Update an existing demo record
   */
  async _updateExistingDemo(
    demoId: string,
    demoData: DemoData,
    userProfile: UserProfile
  ) {
    const now = new Date().toISOString();

    // Get existing demo to check current state
    const { data: existingDemoData } = await getSupabaseAdmin()
      .from('demos')
      .select('*')
      .eq('demo_id', demoId)
      .single();

    if (!existingDemoData) {
      throw new Error('Demo not found');
    }

    const existingDemo = existingDemoData as any;

    // Build update object based on what's provided
    const updateData: any = {
      updated_at: now,
    };

    // Update applicability if changed
    if (demoData.is_applicable !== undefined) {
      updateData.is_applicable = demoData.is_applicable;
      if (!demoData.is_applicable && demoData.non_applicable_reason) {
        updateData.non_applicable_reason = demoData.non_applicable_reason;
        updateData.current_status = 'Not Applicable';
        updateData.workflow_completed = true;
      }
      if (!existingDemo.step1_completed_at) {
        updateData.step1_completed_at = now;
      }
    }

    // Update schedule if provided
    if (demoData.demo_scheduled_date) {
      updateData.demo_scheduled_date = demoData.demo_scheduled_date;
      updateData.demo_scheduled_time = demoData.demo_scheduled_time || '';
      
      // Check if this is a reschedule
      if (existingDemo.demo_scheduled_date && 
          existingDemo.demo_scheduled_date !== demoData.demo_scheduled_date) {
        updateData.demo_rescheduled_count = (existingDemo.demo_rescheduled_count || 0) + 1;
      }
    }

    // Update completion if provided
    if (demoData.demo_completed !== undefined) {
      updateData.demo_completed = demoData.demo_completed;
      if (demoData.demo_completed) {
        updateData.demo_completed_date = now;
        updateData.demo_conducted_by = demoData.demo_conducted_by || 'Agent';
        updateData.demo_completion_notes = demoData.demo_completion_notes || '';
        updateData.completed_by_agent_id = existingDemo.agent_id;
        updateData.completed_by_agent_name = existingDemo.agent_name;
        updateData.current_status = 'Step 5 Pending';
      }
    }

    // Update conversion if provided
    if (demoData.conversion_status) {
      updateData.conversion_status = demoData.conversion_status;
      updateData.conversion_decided_at = now;
      if (demoData.conversion_status === 'Not Converted' && demoData.non_conversion_reason) {
        updateData.non_conversion_reason = demoData.non_conversion_reason;
      }
      updateData.current_status = 'Workflow Completed';
      updateData.workflow_completed = true;
    }

    const supabase: any = getSupabaseAdmin();
    const result = await supabase
      .from('demos')
      .update(updateData)
      .eq('demo_id', demoId);
    
    const { error } = result;

    if (error) {
      console.error('Error updating demo:', error);
      throw error;
    }

    return updateData;
  },
};
