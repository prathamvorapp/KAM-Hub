/**
 * Master Data Service - Supabase Implementation
 */

import { supabase, getSupabaseAdmin } from '../supabase-server';

// Type definitions
interface UserProfile {
  email: string;
  full_name: string;
  role: string;
  team_name?: string;
  [key: string]: any;
}

interface MasterData {
  _id: string; // Added _id for consistency
  brandName: string;
  kam_name: string;
  zone: string;
  brand_email_id?: string;
  kam_email_id: string;
  brand_state?: string; // Added for statistics
  outlet_counts?: number; // Added for statistics
  [key: string]: any;
}

export const masterDataService = {
  // Get all master data with role-based filtering
  async getMasterData(params: {
    userProfile: UserProfile; // Changed from email?: string
    search?: string;
    page?: number;
    limit?: number;
  }) {
    const { userProfile, search, page = 1, limit = 999999 } = params;
    
    let query = getSupabaseAdmin().from('master_data').select('*', { count: 'exact' });
    
    if (!userProfile) { // Ensure user profile is provided
      console.error(`❌ No user profile provided to getMasterData. Denying access.`);
      return { data: [], total: 0, page: 0, limit: 0, total_pages: 0 };
    }

    console.log(`🔍 Master Data - User Profile for ${userProfile.email}:`, userProfile);
    
    const normalizedRole = userProfile.role?.toLowerCase().replace(/\s+/g, '');
    
    if (normalizedRole === 'agent') {
      query = query.eq('kam_email_id', userProfile.email); // Filter by agent's email
      console.log(`👤 Agent filter - showing brands for email: ${userProfile.email}`);
    } else if (normalizedRole === 'team_lead' || normalizedRole === 'teamlead') {
      if (userProfile.team_name) {
        const { data: teamMembers } = await getSupabaseAdmin()
          .from('user_profiles')
          .select('email')
          .eq('team_name', userProfile.team_name)
          .in('role', ['agent', 'Agent']) as { data: Array<{ email: string }> | null; error: any };
        
        const agentEmails = teamMembers?.map(m => m.email) || [];
        console.log(`👥 Team Lead filter - showing brands for team ${userProfile.team_name}:`, agentEmails);
        if (agentEmails.length > 0) {
          query = query.in('kam_email_id', agentEmails);
        } else {
          // If no agents in team, return no records
          query = query.eq('kam_email_id', 'NON_EXISTENT_EMAIL');
        }
      } else {
        // Team Lead with no team_name, return no records
        query = query.eq('kam_email_id', 'NON_EXISTENT_EMAIL');
      }
    } else if (normalizedRole === 'admin') {
      console.log(`👑 Admin - showing all brands`);
      // No filter for admin
    } else {
      console.log(`⚠️ Unknown role: ${userProfile.role}, denying access to master data`);
      query = query.eq('kam_email_id', 'NON_EXISTENT_EMAIL'); // Deny for unknown roles
    }
    
    const { data: allRecords, count } = await query as { data: MasterData[] | null; count: number | null };
    console.log(`📊 Master Data query returned ${allRecords?.length || 0} records`);
    let records = allRecords || [];
    
    // Apply search filter
    if (search) {
      const searchTerm = search.toLowerCase();
      records = records.filter(record => 
        record.brand_name.toLowerCase().includes(searchTerm) ||
        record.kam_name.toLowerCase().includes(searchTerm) ||
        record.kam_email_id.toLowerCase().includes(searchTerm) ||
        record.zone.toLowerCase().includes(searchTerm) ||
        (record.brand_email_id && record.brand_email_id.toLowerCase().includes(searchTerm))
      );
    }
    
    const total = records.length;
    const startIndex = (page - 1) * limit;
    const paginatedRecords = records.slice(startIndex, startIndex + limit);
    
    return {
      data: paginatedRecords,
      total,
      page,
      limit,
      total_pages: Math.ceil(total / limit),
    };
  },

  // Get brands by agent email (with role-based filtering)
  async getBrandsByAgentEmail(userProfile: UserProfile, agentEmail: string) { // userProfile required, agentEmail is target
    if (!userProfile) {
      console.error(`❌ No user profile provided to getBrandsByAgentEmail. Denying access.`);
      return [];
    }

    const normalizedRole = userProfile.role.toLowerCase().replace(/\s+/g, '_');
    
    // Authorization logic
    let canAccess = false;
    let query = getSupabaseAdmin().from('master_data').select('*');

    if (normalizedRole === 'admin') {
      canAccess = true;
      console.log(`👑 Admin ${userProfile.email} - fetching brands for agent: ${agentEmail}`);
      query = query.eq('kam_email_id', agentEmail); // Admin can specify any agentEmail
    } else if (normalizedRole === 'team_lead' || normalizedRole === 'teamlead') {
      // Team Lead can only fetch brands for agents within their team
      if (userProfile.team_name) {
        const { data: teamMembers } = await getSupabaseAdmin()
          .from('user_profiles')
          .select('email')
          .eq('team_name', userProfile.team_name)
          .in('role', ['agent', 'Agent']) as { data: Array<{ email: string }> | null; error: any };
        
        const agentEmails = teamMembers?.map(m => m.email) || [];
        if (agentEmails.includes(agentEmail)) {
          canAccess = true;
          console.log(`👥 Team Lead ${userProfile.email} - fetching brands for team member: ${agentEmail}`);
          query = query.eq('kam_email_id', agentEmail);
        } else {
          console.log(`❌ Team Lead ${userProfile.email} attempted to fetch brands for unauthorized agent: ${agentEmail}`);
        }
      }
    } else if (normalizedRole === 'agent') {
      // Agent can only fetch their own brands
      if (userProfile.email === agentEmail) {
        canAccess = true;
        console.log(`👤 Agent ${userProfile.email} - fetching their own brands`);
        query = query.eq('kam_email_id', agentEmail);
      } else {
        console.log(`❌ Agent ${userProfile.email} attempted to fetch brands for another agent: ${agentEmail}`);
      }
    }
    
    if (!canAccess) {
      console.warn(`⚠️ Access denied for ${userProfile.email} to get brands for ${agentEmail}`);
      return [];
    }

    const { data: brands, error } = await query;
    
    if (error) {
      console.error(`❌ Error fetching brands for ${agentEmail}:`, error);
      return [];
    }
    
    console.log(`✅ Found ${brands?.length || 0} brands for ${agentEmail}`);
    return brands || [];
  },

  // Get brand by email
  async getBrandByEmail(brandEmail: string) {
    const { data: brand } = await getSupabaseAdmin()
      .from('master_data')
      .select('*')
      .eq('brand_email_id', brandEmail)
      .single();
    
    return brand;
  },

  // Create master data entry
  async createMasterData(data: any) {
    const now = new Date().toISOString();
    
    const { error } = await getSupabaseAdmin().from('master_data').insert({
      ...data,
      created_at: now,
      updated_at: now,
    });
    
    if (error) throw error;
    return { success: true };
  },

  // Update master data entry
  async updateMasterData(id: string, data: any) {
    const now = new Date().toISOString();
    
    const { error } = await (getSupabaseAdmin()
      .from('master_data') as any)
      .update({
        ...data,
        updated_at: now,
      })
      .eq('id', id);
    
    if (error) throw error;
    return { success: true };
  },

  // Get master data statistics
  async getMasterDataStatistics(userProfile: UserProfile) { // Changed from email?: string
    let query = getSupabaseAdmin().from('master_data').select('*');
    
    if (!userProfile) { // Deny if no userProfile
      console.error(`❌ No user profile provided to getMasterDataStatistics. Denying access.`);
      return {
        total_brands: 0, byZone: {}, byState: {}, byKAM: {}, totalOutlets: 0,
      };
    }

    const normalizedRole = userProfile.role?.toLowerCase().replace(/\s+/g, '');
    
    if (normalizedRole === 'agent') {
      query = query.eq('kam_email_id', userProfile.email);
    } else if (normalizedRole === 'team_lead' || normalizedRole === 'teamlead') {
      if (userProfile.team_name) {
        const { data: teamMembers } = await getSupabaseAdmin()
          .from('user_profiles')
          .select('email')
          .eq('team_name', userProfile.team_name)
          .in('role', ['agent', 'Agent']) as { data: Array<{ email: string }> | null; error: any };
        
        const agentEmails = teamMembers?.map(m => m.email) || [];
        if (agentEmails.length > 0) {
          query = query.in('kam_email_id', agentEmails);
        } else {
          query = query.eq('kam_email_id', 'NON_EXISTENT_EMAIL');
        }
      } else {
        query = query.eq('kam_email_id', 'NON_EXISTENT_EMAIL');
      }
    } else if (normalizedRole === 'admin') {
      // Admin sees all
    } else {
      console.warn(`⚠️ Unknown role: ${userProfile.role}, denying access to master data statistics`);
      query = query.eq('kam_email_id', 'NON_EXISTENT_EMAIL');
    }
    
    const { data: records } = await query as { data: MasterData[] | null; error: any };
    
    const stats = {
      total_brands: records?.length || 0,
      byZone: {} as Record<string, number>,
      byState: {} as Record<string, number>,
      byKAM: {} as Record<string, number>,
      totalOutlets: 0,
    };
    
    records?.forEach(record => {
      stats.byZone[record.zone] = (stats.byZone[record.zone] || 0) + 1;
      stats.byState[record.brand_state] = (stats.byState[record.brand_state] || 0) + 1;
      stats.byKAM[record.kam_name] = (stats.byKAM[record.kam_name] || 0) + 1;
      stats.totalOutlets += record.outlet_counts || 0;
    });
    
    return stats;
  },
};
