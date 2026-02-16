/**
 * MOM (Minutes of Meeting) Service - Supabase Implementation
 */

import { supabase, getSupabaseAdmin } from '../supabase-client';
import { normalizeRole } from '../utils/roleUtils';

export const momService = {
  // Get MOMs with role-based filtering
  async getMOMs(params: {
    email?: string;
    visitId?: string;
    status?: string;
    page?: number;
    limit?: number;
  }) {
    const { email, visitId, status, page = 1, limit = 100 } = params;
    
    let query = getSupabaseAdmin().from('mom').select('*', { count: 'exact' });
    
    if (email) {
      const { data: userProfile } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('email', email)
        .single();
      
      if (userProfile) {
        const prof = userProfile as any;
        const normalizedRole = normalizeRole(prof.role);
        if (normalizedRole === 'agent') {
          query = query.eq('created_by', email);
        } else if (normalizedRole === 'team_lead') {
          query = query.eq('team', prof.team_name);
        }
      }
    }
    
    if (visitId) {
      query = query.eq('visit_id', visitId);
    }
    
    if (status) {
      query = query.eq('status', status);
    }
    
    const { data: allRecords, count } = await query.order('created_at', { ascending: false });
    
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

  // Get MOM by ticket ID
  async getMOMByTicketId(ticketId: string) {
    const { data: mom } = await getSupabaseAdmin()
      .from('mom')
      .select('*')
      .eq('ticket_id', ticketId)
      .single();
    
    return mom;
  },

  // Create MOM
  async createMOM(data: any) {
    const now = new Date().toISOString();
    
    const { error } = await (getSupabaseAdmin().from('mom') as any).insert({
      ...data,
      created_at: now,
      updated_at: now,
    });
    
    if (error) throw error;
    return { success: true };
  },

  // Update MOM
  async updateMOM(ticketId: string, data: any) {
    const now = new Date().toISOString();
    
    const { error } = await (getSupabaseAdmin()
      .from('mom') as any)
      .update({
        ...data,
        updated_at: now,
      })
      .eq('ticket_id', ticketId);
    
    if (error) throw error;
    return { success: true };
  },

  // Update open point status
  async updateOpenPointStatus(params: {
    ticketId: string;
    pointIndex: number;
    status: string;
  }) {
    const { ticketId, pointIndex, status } = params;
    
    const { data: mom } = await getSupabaseAdmin()
      .from('mom')
      .select('*')
      .eq('ticket_id', ticketId)
      .single();
    
    if (!mom) {
      throw new Error("MOM not found");
    }
    
    const m = mom as any;
    const openPoints = m.open_points || [];
    if (pointIndex < 0 || pointIndex >= openPoints.length) {
      throw new Error("Invalid point index");
    }
    
    openPoints[pointIndex].status = status;
    openPoints[pointIndex].updated_at = new Date().toISOString();
    
    const { error } = await (getSupabaseAdmin()
      .from('mom') as any)
      .update({
        open_points: openPoints,
        updated_at: new Date().toISOString(),
      })
      .eq('ticket_id', ticketId);
    
    if (error) throw error;
    return { success: true };
  },

  // Get MOM statistics
  async getMOMStatistics(email?: string) {
    let query = getSupabaseAdmin().from('mom').select('*');
    
    if (email) {
      const { data: userProfile } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('email', email)
        .single();
      
      if (userProfile) {
        const prof = userProfile as any;
        const normalizedRole = normalizeRole(prof.role);
        if (normalizedRole === 'agent') {
          query = query.eq('created_by', email);
        } else if (normalizedRole === 'team_lead') {
          query = query.eq('team', prof.team_name);
        }
      }
    }
    
    const { data: records } = await query;
    
    const stats = {
      total: records?.length || 0,
      byStatus: {} as Record<string, number>,
      byPriority: {} as Record<string, number>,
      byCategory: {} as Record<string, number>,
      totalOpenPoints: 0,
      openPointsClosed: 0,
      openPointsOpen: 0,
    };
    
    (records as any[] || []).forEach(record => {
      stats.byStatus[record.status] = (stats.byStatus[record.status] || 0) + 1;
      stats.byPriority[record.priority] = (stats.byPriority[record.priority] || 0) + 1;
      if (record.category) {
        stats.byCategory[record.category] = (stats.byCategory[record.category] || 0) + 1;
      }
      
      if (record.open_points) {
        stats.totalOpenPoints += (record.open_points as any[]).length;
        (record.open_points as any[]).forEach((point: any) => {
          if (point.status === 'Closed') {
            stats.openPointsClosed++;
          } else {
            stats.openPointsOpen++;
          }
        });
      }
    });
    
    return stats;
  },
};
