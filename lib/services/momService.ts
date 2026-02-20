/**
 * MOM (Minutes of Meeting) Service - Supabase Implementation
 */

import { supabase, getSupabaseAdmin } from '../supabase-server';
import { normalizeUserProfile } from '../../utils/authUtils';

// Type definitions
interface UserProfile {
  email: string;
  full_name: string;
  role: string;
  team_name?: string;
  teamName?: string; // Add camelCase for compatibility
  [key: string]: any;
}

interface MOMRecord {
  ticket_id: string;
  created_by: string;
  team?: string;
  [key: string]: any;
}

export const momService = {
  // Authorization Helper for MOM access
  _authorizeMOMAccess: async (mom: MOMRecord, rawProfile: UserProfile): Promise<boolean> => {
    const userProfile = normalizeUserProfile(rawProfile);
    const normalizedRole = userProfile.role.toLowerCase().replace(/\s+/g, '_');
    
    if (normalizedRole === 'admin') {
      return true;
    }
    if (normalizedRole === 'team_lead' || normalizedRole === 'teamlead') {
      // Team Lead can access MOMs in their team
      const teamName = userProfile.team_name || userProfile.teamName;
      return teamName === mom.team;
    }
    if (normalizedRole === 'agent') {
      // Agent can access their own MOMs
      return userProfile.email === mom.created_by;
    }
    return false;
  },

  // Get MOMs with role-based filtering
  async getMOMs(params: {
    userProfile: UserProfile; // email removed, userProfile required
    visitId?: string;
    status?: string;
    page?: number;
    limit?: number;
  }) {
    const { userProfile: rawProfile, visitId, status, page = 1, limit = 100 } = params;
    const userProfile = normalizeUserProfile(rawProfile);
    
    let query = getSupabaseAdmin().from('mom').select('*', { count: 'exact' });
    
    if (!userProfile) { // Deny if no userProfile
      console.error(`❌ No user profile provided to getMOMs. Denying access.`);
      return { data: [], total: 0, page: 0, limit: 0, total_pages: 0 };
    }

    // console.log(`🔍 MOM Service - User Profile for ${userProfile.email}:`, userProfile);
    
    const normalizedRole = userProfile.role?.toLowerCase().replace(/[_\s]/g, '');
    
    if (normalizedRole === 'agent') {
      query = query.eq('created_by', userProfile.email);
      // console.log(`👤 Agent filter - showing MOMs created by: ${userProfile.email}`);
    } else if (normalizedRole === 'team_lead' || normalizedRole === 'teamlead') {
      const teamName = userProfile.team_name || userProfile.teamName;
      if (teamName) {
        query = query.eq('team', teamName);
        // console.log(`👥 Team Lead filter - showing MOMs for team: ${teamName}`);
      } else {
        // console.log(`⚠️ Team Lead ${userProfile.email} has no team_name assigned`);
        query = query.eq('created_by', 'NON_EXISTENT_EMAIL'); // Deny if no team
      }
    } else if (normalizedRole === 'admin') {
      // console.log(`👑 Admin - showing all MOMs`);
    } else {
      console.warn(`⚠️ Unknown role: ${userProfile.role}, denying access to MOMs`);
      query = query.eq('created_by', 'NON_EXISTENT_EMAIL'); // Deny for unknown roles
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
  async getMOMByTicketId(ticketId: string, rawProfile: UserProfile) { // userProfile required
    const userProfile = normalizeUserProfile(rawProfile);
    const { data: mom } = await getSupabaseAdmin()
      .from('mom')
      .select('*, team') // Select team for authorization
      .eq('ticket_id', ticketId)
      .single() as { data: MOMRecord | null; error: any };
    
    if (!mom) {
      return null; // MOM not found
    }

    // Authorization check
    const isAuthorized = await momService._authorizeMOMAccess(mom, userProfile);
    if (!isAuthorized) {
        throw new Error(`Access denied: User ${userProfile.email} is not authorized to view MOM ${ticketId}`);
    }
    
    return mom;
  },

  // Create MOM
  async createMOM(data: any) {
    const now = new Date().toISOString();
    
    const { error } = await getSupabaseAdmin().from('mom').insert({
      ...data,
      created_at: now,
      updated_at: now,
    });
    
    if (error) throw error;
    return { success: true };
  },

  // Update MOM
  async updateMOM(ticketId: string, data: any, rawProfile: UserProfile) { // userProfile required
    const userProfile = normalizeUserProfile(rawProfile);
    const { data: mom } = await getSupabaseAdmin()
      .from('mom')
      .select('created_by, team') // Select owner and team for authorization
      .eq('ticket_id', ticketId)
      .single() as { data: MOMRecord | null; error: any };
    
    if (!mom) {
      throw new Error("MOM not found");
    }

    // Authorization check
    const isAuthorized = await momService._authorizeMOMAccess(mom, userProfile);
    if (!isAuthorized) {
        throw new Error(`Access denied: User ${userProfile.email} is not authorized to update MOM ${ticketId}`);
    }

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
  }, rawProfile: UserProfile) { // userProfile required
    const userProfile = normalizeUserProfile(rawProfile);
    const { ticketId, pointIndex, status } = params;
    
    const { data: mom } = await getSupabaseAdmin()
      .from('mom')
      .select('created_by, team, open_points') // Select owner and team for authorization
      .eq('ticket_id', ticketId)
      .single() as { data: MOMRecord & { open_points?: any[] } | null; error: any }; // Extend MOMRecord for open_points
    
    if (!mom) {
      throw new Error("MOM not found");
    }

    // Authorization check
    const isAuthorized = await momService._authorizeMOMAccess(mom, userProfile);
    if (!isAuthorized) {
        throw new Error(`Access denied: User ${userProfile.email} is not authorized to update MOM ${ticketId}`);
    }
    
    const openPoints = mom.open_points || [];
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
  async getMOMStatistics(rawProfile: UserProfile) { // email removed, userProfile required
    const userProfile = normalizeUserProfile(rawProfile);
    let query = getSupabaseAdmin().from('mom').select('*');
    
    if (!userProfile) { // Deny if no userProfile
      console.error(`❌ No user profile provided to getMOMStatistics. Denying access.`);
      return {
        total: 0, byStatus: {}, byPriority: {}, byCategory: {}, totalOpenPoints: 0,
        openPointsClosed: 0, openPointsOpen: 0,
      };
    }

    const normalizedRole = userProfile.role?.toLowerCase().replace(/[_\s]/g, '');
    const teamName = userProfile.team_name || userProfile.teamName;
    
    if (normalizedRole === 'agent') {
      query = query.eq('created_by', userProfile.email);
    } else if (normalizedRole === 'team_lead' || normalizedRole === 'teamlead') {
      if (teamName) {
        query = query.eq('team', teamName);
      } else {
        query = query.eq('created_by', 'NON_EXISTENT_EMAIL');
      }
    } else if (normalizedRole === 'admin') {
      // Admin sees all
    } else {
      console.warn(`⚠️ Unknown role: ${userProfile.role}, denying access to MOM statistics`);
      query = query.eq('created_by', 'NON_EXISTENT_EMAIL'); // Deny for unknown roles
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
    
    records?.forEach((record: any) => {
      stats.byStatus[record.status] = (stats.byStatus[record.status] || 0) + 1;
      stats.byPriority[record.priority] = (stats.byPriority[record.priority] || 0) + 1;
      if (record.category) {
        stats.byCategory[record.category] = (stats.byCategory[record.category] || 0) + 1;
      }
      
      if (record.open_points) {
        stats.totalOpenPoints += record.open_points.length;
        record.open_points.forEach((point: any) => {
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
