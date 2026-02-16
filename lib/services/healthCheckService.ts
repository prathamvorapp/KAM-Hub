/**
 * Health Check Service - Supabase Implementation
 */

import { supabase, getSupabaseAdmin } from '../supabase-client';

export const healthCheckService = {
  // Get health checks with role-based filtering
  async getHealthChecks(params: {
    email?: string;
    month?: string;
    page?: number;
    limit?: number;
  }) {
    const { email, month, page = 1, limit = 100 } = params;
    
    let query = getSupabaseAdmin().from('health_checks').select('*', { count: 'exact' });
    
    if (email) {
      const { data: userProfile } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('email', email)
        .single();
      
      if (userProfile) {
        if (userProfile.role === 'Agent' || userProfile.role === 'agent') {
          query = query.eq('kam_email', email);
        } else if (userProfile.role === 'Team Lead' || userProfile.role === 'team_lead') {
          query = query.eq('team_name', userProfile.team_name);
        }
      }
    }
    
    if (month) {
      query = query.eq('assessment_month', month);
    }
    
    const { data: allRecords, count } = await query.order('assessment_date', { ascending: false });
    
    const total = allRecords?.length || 0;
    const startIndex = (page - 1) * limit;
    const paginatedRecords = allRecords?.slice(startIndex, startIndex + limit) || [];
    
    return {
      data: paginatedRecords,
      total,
      page,
      limit,
      total_pages: Math.ceil(total / limit),
    };
  },

  // Create health check
  async createHealthCheck(data: any) {
    const now = new Date().toISOString();
    
    const { error } = await getSupabaseAdmin().from('health_checks').insert({
      ...data,
      created_at: now,
      updated_at: now,
    });
    
    if (error) throw error;
    return { success: true };
  },

  // Update health check
  async updateHealthCheck(checkId: string, data: any) {
    const now = new Date().toISOString();
    
    const { error } = await getSupabaseAdmin()
      .from('health_checks')
      .update({
        ...data,
        updated_at: now,
      })
      .eq('check_id', checkId);
    
    if (error) throw error;
    return { success: true };
  },

  // Get health check statistics
  async getHealthCheckStatistics(params: {
    email?: string;
    month?: string;
  }) {
    const { email, month } = params;
    
    let query = getSupabaseAdmin().from('health_checks').select('*');
    
    if (email) {
      const { data: userProfile } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('email', email)
        .single();
      
      if (userProfile) {
        if (userProfile.role === 'Agent' || userProfile.role === 'agent') {
          query = query.eq('kam_email', email);
        } else if (userProfile.role === 'Team Lead' || userProfile.role === 'team_lead') {
          query = query.eq('team_name', userProfile.team_name);
        }
      }
    }
    
    if (month) {
      query = query.eq('assessment_month', month);
    }
    
    const { data: records } = await query;
    
    const stats = {
      total: records?.length || 0,
      byHealthStatus: {} as Record<string, number>,
      byBrandNature: {} as Record<string, number>,
      byZone: {} as Record<string, number>,
    };
    
    records?.forEach(record => {
      stats.byHealthStatus[record.health_status] = (stats.byHealthStatus[record.health_status] || 0) + 1;
      stats.byBrandNature[record.brand_nature] = (stats.byBrandNature[record.brand_nature] || 0) + 1;
      stats.byZone[record.zone] = (stats.byZone[record.zone] || 0) + 1;
    });
    
    return stats;
  },

  // Get brands for assessment (brands that haven't been assessed this month)
  async getBrandsForAssessment(params: {
    email: string;
    month: string;
  }) {
    const { email, month } = params;
    
    const { data: userProfile } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('email', email)
      .single();
    
    if (!userProfile) {
      throw new Error("User profile not found");
    }
    
    // Get all brands for this user
    let brandsQuery = getSupabaseAdmin().from('master_data').select('*');
    
    if (userProfile.role === 'Agent' || userProfile.role === 'agent') {
      brandsQuery = brandsQuery.eq('kam_email_id', email);
    } else if (userProfile.role === 'Team Lead' || userProfile.role === 'team_lead') {
      const { data: teamMembers } = await supabase
        .from('user_profiles')
        .select('email')
        .eq('team_name', userProfile.team_name)
        .in('role', ['agent', 'Agent']);
      
      const agentEmails = teamMembers?.map(m => m.email) || [];
      brandsQuery = brandsQuery.in('kam_email_id', agentEmails);
    }
    
    const { data: allBrands } = await brandsQuery;
    
    // Get already assessed brands for this month
    const { data: assessedChecks } = await getSupabaseAdmin()
      .from('health_checks')
      .select('brand_name')
      .eq('assessment_month', month);
    
    const assessedBrandNames = new Set(assessedChecks?.map(c => c.brand_name) || []);
    
    // Filter out already assessed brands
    const brandsForAssessment = allBrands?.filter(brand => 
      !assessedBrandNames.has(brand.brand_name)
    ) || [];
    
    return brandsForAssessment;
  },

  // Get assessment progress for current month
  async getAssessmentProgress(params: {
    email: string;
    month: string;
  }) {
    const { email, month } = params;
    
    const { data: userProfile } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('email', email)
      .single();
    
    if (!userProfile) {
      throw new Error("User profile not found");
    }
    
    // Get total brands
    let brandsQuery = getSupabaseAdmin().from('master_data').select('*', { count: 'exact' });
    
    if (userProfile.role === 'Agent' || userProfile.role === 'agent') {
      brandsQuery = brandsQuery.eq('kam_email_id', email);
    } else if (userProfile.role === 'Team Lead' || userProfile.role === 'team_lead') {
      const { data: teamMembers } = await supabase
        .from('user_profiles')
        .select('email')
        .eq('team_name', userProfile.team_name)
        .in('role', ['agent', 'Agent']);
      
      const agentEmails = teamMembers?.map(m => m.email) || [];
      brandsQuery = brandsQuery.in('kam_email_id', agentEmails);
    }
    
    const { count: totalBrands } = await brandsQuery;
    
    // Get assessed brands for this month
    let assessedQuery = getSupabaseAdmin()
      .from('health_checks')
      .select('*', { count: 'exact' })
      .eq('assessment_month', month);
    
    if (userProfile.role === 'Agent' || userProfile.role === 'agent') {
      assessedQuery = assessedQuery.eq('kam_email', email);
    } else if (userProfile.role === 'Team Lead' || userProfile.role === 'team_lead') {
      assessedQuery = assessedQuery.eq('team_name', userProfile.team_name);
    }
    
    const { count: assessedBrands } = await assessedQuery;
    
    const progress = totalBrands ? Math.round(((assessedBrands || 0) / totalBrands) * 100) : 0;
    
    return {
      total_brands: totalBrands || 0,
      assessed_brands: assessedBrands || 0,
      pending_brands: (totalBrands || 0) - (assessedBrands || 0),
      progress_percentage: progress,
    };
  },
};
