/**
 * Brand Transfer Service
 * Handles transferring brands from one KAM to another
 * Preserves historical data and tracks who completed work
 */

import { getSupabaseAdmin } from '../supabase-server';
import { normalizeUserProfile } from '../../utils/authUtils';
import { demoService } from './demoService';
import { visitService } from './visitService';

interface UserProfile {
  email: string;
  full_name: string;
  role: string;
  team_name?: string;
  [key: string]: any;
}

interface TransferBrandParams {
  brandId: string;
  fromAgentEmail: string;
  toAgentEmail: string;
  transferReason: string;
  transferYear?: string; // For visits, defaults to current year
}

export const brandTransferService = {
  /**
   * Transfer a brand from one KAM to another
   * Updates master_data, demos, and visits
   * Preserves completed_by fields for historical accuracy
   */
  async transferBrand(params: TransferBrandParams, rawProfile: UserProfile) {
    const userProfile = normalizeUserProfile(rawProfile);
    const normalizedRole = userProfile.role.toLowerCase().replace(/\s+/g, '_');

    // All authenticated users can transfer brands
    console.log(`✅ [Brand Transfer] User ${userProfile.email} (${userProfile.role}) authorized to transfer brands`);

    console.log(`🔄 Starting brand transfer:`, {
      brandId: params.brandId,
      from: params.fromAgentEmail,
      to: params.toAgentEmail,
      initiatedBy: userProfile.email
    });

    const now = new Date().toISOString();
    const transferYear = params.transferYear || new Date().getFullYear().toString();

    try {
      // Step 1: Get brand data
      const { data: brandData, error: brandError } = await getSupabaseAdmin()
        .from('master_data')
        .select('*')
        .eq('id', params.brandId)
        .single();

      if (brandError || !brandData) {
        throw new Error(`Brand not found: ${brandError?.message || 'Unknown error'}`);
      }

      const brand = brandData as any; // Type assertion for Supabase data

      // Verify current KAM matches fromAgentEmail
      if (brand.kam_email_id !== params.fromAgentEmail) {
        throw new Error(
          `Brand KAM mismatch: Expected ${params.fromAgentEmail}, found ${brand.kam_email_id}`
        );
      }

      // Step 2: Get new KAM profile
      const { data: newKamProfile, error: kamError } = await getSupabaseAdmin()
        .from('user_profiles')
        .select('email, full_name, team_name')
        .eq('email', params.toAgentEmail)
        .single();

      if (kamError || !newKamProfile) {
        throw new Error(`New KAM not found: ${params.toAgentEmail}`);
      }

      const newKam = newKamProfile as any; // Type assertion

      // Step 3: Update master_data
      const kamHistoryEntry = {
        kam_email_id: params.fromAgentEmail,
        kam_name: brand.kam_name,
        assigned_date: brand.current_kam_assigned_date || brand.created_at,
        removed_date: now,
        removed_by: userProfile.email,
        reason: params.transferReason
      };

      const updatedKamHistory = [...(brand.kam_history || []), kamHistoryEntry];

      const { error: masterDataError } = await (getSupabaseAdmin()
        .from('master_data') as any)
        .update({
          kam_email_id: params.toAgentEmail,
          kam_name: newKam.full_name,
          kam_history: updatedKamHistory,
          current_kam_assigned_date: now,
          updated_at: now
        })
        .eq('id', params.brandId);

      if (masterDataError) {
        throw new Error(`Failed to update master_data: ${masterDataError.message}`);
      }

      console.log('✅ Master data updated');

      // Step 4: Transfer demos
      let demosResult;
      try {
        demosResult = await demoService.transferBrandDemos({
          brandId: params.brandId,
          fromAgentEmail: params.fromAgentEmail,
          toAgentEmail: params.toAgentEmail,
          toAgentName: newKam.full_name,
          toTeamName: newKam.team_name,
          transferReason: params.transferReason,
          transferredBy: userProfile.email
        }, userProfile as any);
        console.log('✅ Demos transferred:', demosResult);
      } catch (demoError) {
        console.error('❌ Demo transfer failed:', demoError);
        demosResult = {
          success: false,
          error: demoError instanceof Error ? demoError.message : String(demoError)
        };
      }

      // Step 5: Transfer visits
      let visitsResult;
      try {
        visitsResult = await visitService.transferBrandVisits({
          brandId: params.brandId,
          fromAgentEmail: params.fromAgentEmail,
          toAgentEmail: params.toAgentEmail,
          toAgentName: newKam.full_name,
          toTeamName: newKam.team_name,
          transferYear: transferYear,
          transferReason: params.transferReason,
          transferredBy: userProfile.email
        }, userProfile as any);
        console.log('✅ Visits transferred:', visitsResult);
      } catch (visitError) {
        console.error('❌ Visit transfer failed:', visitError);
        visitsResult = {
          success: false,
          error: visitError instanceof Error ? visitError.message : String(visitError)
        };
      }

      // Step 6: Return summary
      return {
        success: true,
        brandId: params.brandId,
        brandName: brand.brand_name,
        fromAgent: params.fromAgentEmail,
        toAgent: params.toAgentEmail,
        toAgentName: newKam.full_name,
        transferredBy: userProfile.email,
        transferredAt: now,
        demos: demosResult,
        visits: visitsResult,
        message: `Brand "${brand.brand_name}" successfully transferred from ${params.fromAgentEmail} to ${params.toAgentEmail}`
      };

    } catch (error) {
      console.error('❌ Brand transfer failed:', error);
      throw error;
    }
  },

  /**
   * Get transfer history for a brand
   */
  async getBrandTransferHistory(brandId: string, rawProfile: UserProfile) {
    const userProfile = normalizeUserProfile(rawProfile);

    const { data: brandData, error } = await getSupabaseAdmin()
      .from('master_data')
      .select('brand_name, kam_email_id, kam_name, kam_history, current_kam_assigned_date')
      .eq('id', brandId)
      .single();

    if (error || !brandData) {
      throw new Error(`Brand not found: ${error?.message || 'Unknown error'}`);
    }

    const brand = brandData as any; // Type assertion

    return {
      brandId,
      brandName: brand.brand_name,
      currentKam: {
        email: brand.kam_email_id,
        name: brand.kam_name,
        assignedDate: brand.current_kam_assigned_date
      },
      history: brand.kam_history || []
    };
  },

  /**
   * Get all brands that can be transferred by the current user
   */
  async getTransferableBrands(rawProfile: UserProfile) {
    const userProfile = normalizeUserProfile(rawProfile);
    const normalizedRole = userProfile.role.toLowerCase().replace(/\s+/g, '_');

    // Fetch all brands with pagination to avoid 1000 record limit
    const allBrands: any[] = [];
    let from = 0;
    const pageSize = 1000;
    let hasMore = true;

    while (hasMore) {
      const { data: brands, error } = await getSupabaseAdmin()
        .from('master_data')
        .select('id, brand_name, brand_email_id, kam_email_id, kam_name, current_kam_assigned_date, outlet_counts')
        .order('brand_name')
        .range(from, from + pageSize - 1);

      if (error) {
        throw new Error(`Failed to fetch brands: ${error.message}`);
      }

      if (brands && brands.length > 0) {
        allBrands.push(...brands);
        from += pageSize;
        hasMore = brands.length === pageSize;
      } else {
        hasMore = false;
      }
    }

    return allBrands;
  }
};
