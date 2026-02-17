/**
 * Master Data Service - Supabase Implementation
 */

import { supabase, getSupabaseAdmin } from '../supabase-client';

// Type definitions
interface UserProfile {
  email: string;
  full_name: string;
  role: string;
  team_name?: string;
  [key: string]: any;
}

interface MasterData {
  brand_name: string;
  kam_name: string;
  zone: string;
  brand_email_id?: string;
  kam_email_id: string;
  [key: string]: any;
}

export const masterDataService = {
  // Get all master data with role-based filtering
  async getMasterData(params: {
    email?: string;
    search?: string;
    page?: number;
    limit?: number;
  }) {
    const { email, search, page = 1, limit = 100 } = params;
    
    let query = getSupabaseAdmin().from('master_data').select('*', { count: 'exact' });
    
    if (email) {
      const { data: userProfile } = await getSupabaseAdmin()
        .from('user_profiles')
        .select('*')
        .eq('email', email)
        .single() as { data: UserProfile | null; error: any };
      
      console.log(`🔍 Master Data - User Profile for ${email}:`, userProfile);
      
      if (userProfile) {
        if (userProfile.role === 'Agent' || userProfile.role === 'agent') {
          query = query.eq('kam_email_id', email);
          console.log(`👤 Agent filter - showing brands for email: ${email}`);
        } else if (userProfile.role === 'Team Lead' || userProfile.role === 'team_lead') {
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
            }
          }
        } else if (userProfile.role === 'Admin' || userProfile.role === 'admin') {
          console.log(`👑 Admin - showing all brands`);
        }
      }
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

  // Get brands by agent email
  async getBrandsByAgentEmail(email: string) {
    const { data: brands } = await getSupabaseAdmin()
      .from('master_data')
      .select('*')
      .eq('kam_email_id', email);
    
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
  async getMasterDataStatistics(email?: string) {
    let query = getSupabaseAdmin().from('master_data').select('*');
    
    if (email) {
      const { data: userProfile } = await getSupabaseAdmin()
        .from('user_profiles')
        .select('*')
        .eq('email', email)
        .single() as { data: UserProfile | null; error: any };
      
      if (userProfile) {
        if (userProfile.role === 'Agent' || userProfile.role === 'agent') {
          query = query.eq('kam_email_id', email);
        } else if (userProfile.role === 'Team Lead' || userProfile.role === 'team_lead') {
          if (userProfile.team_name) {
            const { data: teamMembers } = await getSupabaseAdmin()
              .from('user_profiles')
              .select('email')
              .eq('team_name', userProfile.team_name)
              .in('role', ['agent', 'Agent']) as { data: Array<{ email: string }> | null; error: any };
            
            const agentEmails = teamMembers?.map(m => m.email) || [];
            if (agentEmails.length > 0) {
              query = query.in('kam_email_id', agentEmails);
            }
          }
        }
      }
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
