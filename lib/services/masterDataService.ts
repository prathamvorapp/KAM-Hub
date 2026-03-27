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
  id?: string;
  dbId?: string;
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
    userProfile: UserProfile | null; // Allow null for viewAll mode
    search?: string;
    page?: number;
    limit?: number;
  }) {
    const { userProfile, search, page = 1, limit = 1000 } = params; // Changed default limit to 1000
    
    let query = getSupabaseAdmin().from('master_data').select('*', { count: 'exact' });
    
    // If userProfile is null, it means viewAll mode (for CRM page)
    if (userProfile === null) {
      console.log(`📊 ViewAll mode - showing all master data`);
      // No filter - show all data
    } else if (!userProfile) { // Ensure user profile is provided for non-viewAll mode
      console.error(`❌ No user profile provided to getMasterData. Denying access.`);
      return { data: [], total: 0, page: 0, limit: 0, total_pages: 0 };
    } else {
      // Apply role-based filtering
      const normalizedRole = userProfile.role?.toLowerCase().replace(/\s+/g, '');
      
      if (normalizedRole === 'agent') {
        query = query.eq('kam_email_id', userProfile.email);
      } else if (normalizedRole === 'subagent' || normalizedRole === 'sub_agent') {
        // sub_agent sees coordinator agents' brands
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
              ? query.in('kam_email_id', coordinatorEmails)
              : query.eq('kam_email_id', 'NON_EXISTENT_EMAIL');
          } else {
            query = query.eq('kam_email_id', 'NON_EXISTENT_EMAIL');
          }
        } else {
          query = query.eq('kam_email_id', 'NON_EXISTENT_EMAIL');
        }
      } else if (normalizedRole === 'team_lead' || normalizedRole === 'teamlead') {
        if (userProfile.team_name) {
          const { data: teamMembers } = await getSupabaseAdmin()
            .from('user_profiles')
            .select('email')
            .eq('team_name', userProfile.team_name)
            .in('role', ['agent', 'Agent']) as { data: Array<{ email: string }> | null; error: any };
          
          const agentEmails = teamMembers?.map(m => m.email) || [];
          // Include Team Lead's own email to show brands directly assigned to them
          const allEmails = [...agentEmails, userProfile.email];
          // console.log(`👥 Team Lead filter - showing brands for team ${userProfile.team_name} + Team Lead:`, allEmails);
          query = query.in('kam_email_id', allEmails);
        } else {
          // Team Lead with no team_name, show only their own brands
          query = query.eq('kam_email_id', userProfile.email);
        }
      } else if (normalizedRole === 'admin') {
        // console.log(`👑 Admin - showing all brands`);
        // No filter for admin
      } else {
        // console.log(`⚠️ Unknown role: ${userProfile.role}, denying access to master data`);
        query = query.eq('kam_email_id', 'NON_EXISTENT_EMAIL'); // Deny for unknown roles
      }
    }
    
    // Apply search filter at DATABASE level (not in-memory)
    if (search) {
      const searchTerm = search.toLowerCase();
      query = query.or(`brand_name.ilike.%${searchTerm}%,kam_name.ilike.%${searchTerm}%,kam_email_id.ilike.%${searchTerm}%,zone.ilike.%${searchTerm}%,brand_email_id.ilike.%${searchTerm}%`);
      console.log(`🔍 Applying database search filter: "${search}"`);
    }
    
    // Apply pagination at DATABASE level BEFORE executing
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit - 1;
    
    // Execute query with pagination and count
    const { data: records, error, count: totalCount } = await query.range(startIndex, endIndex);
    
    if (error) {
      console.error('❌ Error fetching master data:', error);
      return { data: [], total: 0, page, limit, total_pages: 0 };
    }
    
    const total = totalCount || 0;
    const paginatedRecords = records || [];
    const totalPages = Math.ceil(total / limit);
    
    console.log(`📊 Master Data Service - Total records matching criteria: ${total}`);
    console.log(`📄 Pagination: page=${page}, limit=${limit}, range=[${startIndex}, ${endIndex}], total_pages=${totalPages}, returning ${paginatedRecords.length} records`);
    
    if (paginatedRecords.length > 0) {
      console.log(`📄 Sample record:`, paginatedRecords[0]);
    }
    
    return {
      data: paginatedRecords,
      total,
      page,
      limit,
      total_pages: totalPages,
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
      // console.log(`👑 Admin ${userProfile.email} - fetching brands for agent: ${agentEmail}`);
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
          // console.log(`👥 Team Lead ${userProfile.email} - fetching brands for team member: ${agentEmail}`);
          query = query.eq('kam_email_id', agentEmail);
        } else {
          // console.log(`❌ Team Lead ${userProfile.email} attempted to fetch brands for unauthorized agent: ${agentEmail}`);
        }
      }
    } else if (normalizedRole === 'agent') {
      // Agent can only fetch their own brands
      if (userProfile.email === agentEmail) {
        canAccess = true;
        // console.log(`👤 Agent ${userProfile.email} - fetching their own brands`);
        query = query.eq('kam_email_id', agentEmail);
      } else {
        // console.log(`❌ Agent ${userProfile.email} attempted to fetch brands for another agent: ${agentEmail}`);
      }
    }
    
    if (!canAccess) {
      console.warn(`⚠️ Access denied for ${userProfile.email} to get brands for ${agentEmail}`);
      return [];
    }

    // FIX: Add explicit limit to avoid Supabase default 1000 row limit
    const { data: brands, error } = await query.limit(10000);
    
    if (error) {
      console.error(`❌ Error fetching brands for ${agentEmail}:`, error);
      return [];
    }
    
    // console.log(`✅ Found ${brands?.length || 0} brands for ${agentEmail}`);
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
        // Include Team Lead's own email to show brands directly assigned to them
        const allEmails = [...agentEmails, userProfile.email];
        query = query.in('kam_email_id', allEmails);
      } else {
        // Team Lead with no team_name, show only their own brands
        query = query.eq('kam_email_id', userProfile.email);
      }
    } else if (normalizedRole === 'admin') {
      // Admin sees all
    } else {
      console.warn(`⚠️ Unknown role: ${userProfile.role}, denying access to master data statistics`);
      query = query.eq('kam_email_id', 'NON_EXISTENT_EMAIL');
    }
    
    // FIX: Add explicit limit to avoid Supabase default 1000 row limit
    const { data: records } = await query.limit(10000) as { data: MasterData[] | null; error: any };
    
    const stats = {
      total_brands: records?.length || 0,
      byZone: {} as Record<string, number>,
      byState: {} as Record<string, number>,
      byKAM: {} as Record<string, number>,
      totalOutlets: 0,
    };
    
    records?.forEach(record => {
      if (record.zone) stats.byZone[record.zone] = (stats.byZone[record.zone] || 0) + 1;
      if (record.brand_state) stats.byState[record.brand_state] = (stats.byState[record.brand_state] || 0) + 1;
      if (record.kam_name) stats.byKAM[record.kam_name] = (stats.byKAM[record.kam_name] || 0) + 1;
      stats.totalOutlets += record.outlet_counts || 0;
    });
    
    return stats;
  },
};
