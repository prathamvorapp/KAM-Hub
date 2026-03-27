/**
 * Health Check Service - Supabase Implementation
 */

import { supabase, getSupabaseAdmin } from '../supabase-server';
import { normalizeUserProfile } from '../../utils/authUtils';

// Type definitions
interface UserProfile {
  id?: string;
  dbId?: string; // user_profiles.id (DB row UUID) — used for junction table lookups
  email: string;
  fullName: string;
  role: string;
  team_name?: string;
  teamName?: string;
  coordinator_id?: string;
  [key: string]: any;
}

interface HealthCheck {
  check_id: string;
  health_status: string;
  brand_nature: string;
  zone: string;
  [key: string]: any;
}

interface Brand {
  brand_name: string;
  kam_email_id: string;
  [key: string]: any;
}

export const healthCheckService = {
  // Get health checks with role-based filtering
  async getHealthChecks(params: {
    userProfile: UserProfile | null; // Can be null for viewAll mode
    month?: string;
    page?: number;
    limit?: number;
  }) {
    const { userProfile: rawProfile, month, page = 1, limit = 100 } = params;
    const userProfile = rawProfile ? normalizeUserProfile(rawProfile) : null;
    
    let query = getSupabaseAdmin().from('health_checks').select('*', { count: 'exact' });
    
    // If userProfile is null, show all data (CRM viewAll mode)
    if (!userProfile) {
      console.log(`📊 [getHealthChecks] ViewAll mode - showing all records`);
    } else {
      const normalizedRole = userProfile.role?.toLowerCase().replace(/[_\s]/g, '');
      
      if (normalizedRole === 'agent') {
        query = query.eq('kam_email', userProfile.email);
      } else if (normalizedRole === 'subagent' || normalizedRole === 'sub_agent' || normalizedRole === 'boperson' || normalizedRole === 'bo_person') {
        // sub_agent: look up all coordinators via junction table
        // bo_person: single coordinator via coordinator_id
        let coordinatorEmails: string[] = [];
        if (normalizedRole === 'subagent' || normalizedRole === 'sub_agent') {
          const lookupId = userProfile.dbId || userProfile.id;
          const { data: sacRows } = await getSupabaseAdmin()
            .from('sub_agent_coordinators')
            .select('coordinator_id')
            .eq('sub_agent_id', lookupId!) as { data: Array<{ coordinator_id: string }> | null; error: any };
          if (sacRows && sacRows.length > 0) {
            const { data: coords } = await getSupabaseAdmin()
              .from('user_profiles').select('email').in('id', sacRows.map(r => r.coordinator_id));
            coordinatorEmails = (coords as any[])?.map((c: any) => c.email) || [];
          }
        } else if (userProfile.coordinator_id) {
          const { data: coord } = await getSupabaseAdmin()
            .from('user_profiles').select('email').eq('id', userProfile.coordinator_id).single();
          if (coord) coordinatorEmails = [(coord as any).email];
        }
        if (coordinatorEmails.length > 0) {
          query = query.in('kam_email', coordinatorEmails);
        } else {
          query = query.eq('kam_email', 'NON_EXISTENT_EMAIL');
        }
      } else if (normalizedRole === 'team_lead' || normalizedRole === 'teamlead') {
        const teamName = userProfile.team_name || userProfile.teamName;
        if (teamName) {
          query = query.eq('team_name', teamName);
        }
      } else if (normalizedRole === 'admin') {
        // Admin sees all
      } else {
        console.warn(`⚠️ Unknown role: ${userProfile.role}, denying access to health checks`);
        query = query.eq('kam_email', 'NON_EXISTENT_EMAIL'); // Deny for unknown roles
      }
    }
    
    if (month) {
      query = query.eq('assessment_month', month);
    }
    
    // Fetch ALL records in chunks to bypass Supabase's 1000-row default limit
    let allRecords: any[] = [];
    let chunkPage = 0;
    const chunkSize = 1000;
    let hasMore = true;

    while (hasMore) {
      const start = chunkPage * chunkSize;
      const end = start + chunkSize - 1;

      const { data: chunk, error: chunkError } = await query
        .order('assessment_date', { ascending: false })
        .range(start, end);

      if (chunkError) {
        console.error(`❌ [getHealthChecks] Error fetching chunk ${chunkPage}:`, chunkError);
        throw chunkError;
      }

      if (chunk && chunk.length > 0) {
        allRecords = [...allRecords, ...chunk];
        hasMore = chunk.length === chunkSize;
        chunkPage++;
      } else {
        hasMore = false;
      }

      if (chunkPage > 100) {
        console.warn('⚠️ [getHealthChecks] Reached maximum chunk limit (100)');
        break;
      }
    }

    console.log(`📊 [getHealthChecks] Total records fetched: ${allRecords.length} (in ${chunkPage} chunks)`);

    const total = allRecords.length;
    const startIndex = (page - 1) * limit;
    const paginatedRecords = allRecords.slice(startIndex, startIndex + limit);

    return {
      data: paginatedRecords,
      total,
      page,
      limit,
      total_pages: Math.ceil(total / limit),
    };
  },

  // Create health check
  async createHealthCheck(data: any, rawProfile: UserProfile) { // userProfile required
    const userProfile = normalizeUserProfile(rawProfile);
    const now = new Date().toISOString();
    
    // Generate unique check_id
    const checkId = `HC-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    // Authorization: Ensure the user is allowed to create this health check
    const normalizedRole = userProfile.role?.toLowerCase().replace(/[_\s]/g, '');
    const isOwner = data.kam_email === userProfile.email;
    const isAdmin = normalizedRole === 'admin';
    const isTeamLead = normalizedRole === 'teamlead' || normalizedRole === 'team_lead';
    const isSubAgent = normalizedRole === 'subagent' || normalizedRole === 'sub_agent';

    // For sub_agent: check if kam_email belongs to one of their coordinators
    let isSubAgentAuthorized = false;
    if (isSubAgent) {
      const lookupId = userProfile.dbId || userProfile.id;
      if (lookupId) {
        const { data: sacRows } = await getSupabaseAdmin()
          .from('sub_agent_coordinators').select('coordinator_id')
          .eq('sub_agent_id', lookupId) as { data: Array<{ coordinator_id: string }> | null; error: any };
        if (sacRows && sacRows.length > 0) {
          const { data: coords } = await getSupabaseAdmin()
            .from('user_profiles').select('email').in('id', sacRows.map(r => r.coordinator_id));
          const coordinatorEmails = (coords as any[])?.map((c: any) => c.email) || [];
          isSubAgentAuthorized = coordinatorEmails.includes(data.kam_email);
        }
      }
    }

    if (!isAdmin && !isTeamLead && !isOwner && !isSubAgentAuthorized) {
      throw new Error(`Access denied: User ${userProfile.email} cannot create health check for ${data.kam_email}`);
    }

    // If Team Lead, ensure it's for their team members
    const teamName = userProfile.team_name || userProfile.teamName;
    if (isTeamLead && !isAdmin && teamName) { // Admins bypass this check
        // Fetch team members of the Team Lead
        const { data: teamMembers } = await getSupabaseAdmin()
            .from('user_profiles')
            .select('email')
            .eq('team_name', teamName)
            .in('role', ['agent', 'Agent']);
        const teamMemberEmails = teamMembers?.map((m: any) => m.email) || [];

        if (!teamMemberEmails.includes(data.kam_email) && data.kam_email !== userProfile.email) {
            throw new Error(`Access denied: Team Lead ${userProfile.email} can only create health checks for their team members.`);
        }
    }
    
    // Use userProfile for kam_name, kam_email, team_name if it matches the creator
    const finalKamEmail = data.kam_email || userProfile.email; // Default to creator's email
    let finalKamName = data.kam_name;
    let finalTeamName = data.team_name;

    // If the creator is the KAM, use their profile data
    if (finalKamEmail === userProfile.email) {
      finalKamName = userProfile.fullName;
      finalTeamName = teamName;
    } else if (isAdmin || isTeamLead) {
      // If admin/team lead creating for someone else, try to fetch their profile
      const { data: targetUserProfile } = await getSupabaseAdmin()
        .from('user_profiles')
        .select('full_name, team_name')
        .eq('email', finalKamEmail)
        .single();
      
      if (targetUserProfile) {
        finalKamName = (targetUserProfile as any).full_name;
        finalTeamName = (targetUserProfile as any).team_name;
      }
    }
    
    const insertData = {
      check_id: checkId,
      brand_name: data.brand_name,
      brand_id: data.brand_id || null,
      kam_name: finalKamName || 'Unknown',
      kam_email: finalKamEmail,
      zone: data.zone || 'Unknown',
      team_name: finalTeamName || null,
      health_status: data.health_status,
      brand_nature: data.brand_nature,
      remarks: data.remarks || null,
      assessment_month: data.assessment_month,
      assessment_date: data.assessment_date,
      created_by: userProfile.email, // Explicitly set created_by to the authenticated user's email
      actioned_by: userProfile.fullName, // Track who actually created this record
      created_at: now,
      updated_at: now,
    };
    
    // console.log('📝 Inserting health check:', insertData);
    
    const { error: insertError } = await getSupabaseAdmin()
      .from('health_checks')
      .insert(insertData as any);
    
    if (insertError) {
      console.error('❌ Database error:', insertError);
      throw insertError;
    }
    return { success: true, check_id: checkId };
  },

  // Update health check
  async updateHealthCheck(checkId: string, data: any) {
    const now = new Date().toISOString();
    
    const { error } = await (getSupabaseAdmin()
      .from('health_checks') as any)
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
    userProfile: UserProfile; // email removed, userProfile required
    month?: string;
  }) {
    const { userProfile: rawProfile, month } = params;
    const userProfile = normalizeUserProfile(rawProfile);
    
    let query = getSupabaseAdmin().from('health_checks').select('*');
    
    if (!userProfile) { // Deny if no userProfile
      console.error(`❌ No user profile provided to getHealthCheckStatistics. Denying access.`);
      return {
        total: 0, byHealthStatus: {}, byBrandNature: {}, byZone: {}, byAgent: [],
      };
    }

    const normalizedRole = userProfile.role?.toLowerCase().replace(/[_\s]/g, '');
    const teamName = userProfile.team_name || userProfile.teamName;
    
    if (normalizedRole === 'agent') {
      query = query.eq('kam_email', userProfile.email);
    } else if (normalizedRole === 'subagent' || normalizedRole === 'sub_agent') {
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
            ? query.in('kam_email', coordinatorEmails)
            : query.eq('kam_email', 'NON_EXISTENT_EMAIL');
        } else {
          query = query.eq('kam_email', 'NON_EXISTENT_EMAIL');
        }
      } else {
        query = query.eq('kam_email', 'NON_EXISTENT_EMAIL');
      }
    } else if (normalizedRole === 'team_lead' || normalizedRole === 'teamlead') {
      if (teamName) {
        query = query.eq('team_name', teamName);
      }
    } else if (normalizedRole === 'admin') {
      // Admin sees all
    } else {
      console.warn(`⚠️ Unknown role: ${userProfile.role}, denying access to health check statistics`);
      query = query.eq('kam_email', 'NON_EXISTENT_EMAIL');
    }
    
    if (month) {
      query = query.eq('assessment_month', month);
    }
    
    const { data: records } = await query as { data: HealthCheck[] | null; error: any };
    
    const stats = {
      total: records?.length || 0,
      byHealthStatus: {} as Record<string, number>,
      byBrandNature: {} as Record<string, number>,
      byZone: {} as Record<string, number>,
      byAgent: [] as Array<{
        kam_email: string;
        kam_name: string;
        team_name?: string;
        total: number;
        totalBrands: number;
        pendingAssessments: number;
        byHealthStatus: Record<string, number>;
        byBrandNature: Record<string, number>;
        criticalBrands: number;
        healthyBrands: number;
        notConnected: number;
        connectivityRate: number;
      }>,
    };
    
    records?.forEach(record => {
      stats.byHealthStatus[record.health_status] = (stats.byHealthStatus[record.health_status] || 0) + 1;
      stats.byBrandNature[record.brand_nature] = (stats.byBrandNature[record.brand_nature] || 0) + 1;
      stats.byZone[record.zone] = (stats.byZone[record.zone] || 0) + 1;
    });
    
    // Calculate agent-wise statistics for Team Leads and Admins
    if (normalizedRole === 'teamlead' || normalizedRole === 'team_lead' || normalizedRole === 'admin') {
      const agentMap = new Map<string, any>();
      
      // First, get all agents and their total brand counts
      let agentEmailsQuery = getSupabaseAdmin()
        .from('user_profiles')
        .select('email, full_name, team_name')
        .in('role', ['agent', 'Agent']);
      
      // Team Leads see only their team, Admins see all agents
      if (normalizedRole === 'teamlead' || normalizedRole === 'team_lead') {
        if (teamName) {
          agentEmailsQuery = agentEmailsQuery.eq('team_name', teamName);
        }
      }
      // Admin sees all agents (no filter needed)
      
      const { data: agentProfiles } = await agentEmailsQuery as { data: Array<{ email: string; full_name: string; team_name?: string }> | null; error: any };
      
      // Get total brands per agent in a single query (FIX: N+1 query pattern)
      const agentBrandCounts = new Map<string, number>();
      if (agentProfiles && agentProfiles.length > 0) {
        const agentEmails = agentProfiles.map(a => a.email);
        
        console.log(`📊 [getHealthCheckStatistics] Fetching brands for ${agentEmails.length} agents`);
        console.log(`📊 [getHealthCheckStatistics] Agent emails:`, agentEmails);
        
        // Fetch brand counts for each agent individually to avoid limit issues
        for (const agentEmail of agentEmails) {
          const { count, error: countError } = await getSupabaseAdmin()
            .from('master_data')
            .select('*', { count: 'exact', head: true })
            .eq('kam_email_id', agentEmail);
          
          if (countError) {
            console.error(`❌ [getHealthCheckStatistics] Error fetching brand count for ${agentEmail}:`, countError);
          } else {
            agentBrandCounts.set(agentEmail, count || 0);
          }
        }
        
        console.log(`📊 [getHealthCheckStatistics] Agent brand counts:`, Array.from(agentBrandCounts.entries()));
        
        // Initialize agent map
        agentProfiles.forEach(agent => {
          const totalBrands = agentBrandCounts.get(agent.email) || 0;
          console.log(`📊 [getHealthCheckStatistics] Agent ${agent.email}: ${totalBrands} brands`);
          agentMap.set(agent.email, {
            kam_email: agent.email,
            kam_name: agent.full_name || (agent as any).fullName,
            team_name: agent.team_name || 'No Team',
            total: 0,
            totalBrands,
            pendingAssessments: totalBrands,
            byHealthStatus: {},
            byBrandNature: {},
            criticalBrands: 0,
            healthyBrands: 0,
            notConnected: 0,
          });
        });
      }
      
      // Fetch health checks per agent by kam_email (not team_name) to avoid missing records
      // where team_name on the health_check record is null/mismatched
      let agentRecords: HealthCheck[] = [];
      if (agentProfiles && agentProfiles.length > 0) {
        const agentEmails = agentProfiles.map(a => a.email);
        let hcPage = 0;
        const hcPageSize = 1000;
        let hcHasMore = true;

        while (hcHasMore) {
          const start = hcPage * hcPageSize;
          const end = start + hcPageSize - 1;
          const { data: hcChunk } = await getSupabaseAdmin()
            .from('health_checks')
            .select('*')
            .in('kam_email', agentEmails)
            .eq('assessment_month', month || new Date().toISOString().slice(0, 7))
            .range(start, end) as { data: HealthCheck[] | null; error: any };

          if (hcChunk && hcChunk.length > 0) {
            agentRecords = [...agentRecords, ...hcChunk];
            hcHasMore = hcChunk.length === hcPageSize;
            hcPage++;
          } else {
            hcHasMore = false;
          }
        }
      }

      // Now process the health check records using kam_email-based fetch
      agentRecords.forEach(record => {
        const kamEmail = record.kam_email || 'Unknown';
        
        if (!agentMap.has(kamEmail)) {
          agentMap.set(kamEmail, {
            kam_email: kamEmail,
            kam_name: (record as any).kam_name || kamEmail,
            total: 0,
            totalBrands: 0,
            pendingAssessments: 0,
            byHealthStatus: {},
            byBrandNature: {},
            criticalBrands: 0,
            healthyBrands: 0,
            notConnected: 0,
          });
        }
        
        const agentStats = agentMap.get(kamEmail);
        agentStats.total += 1;
        agentStats.byHealthStatus[record.health_status] = (agentStats.byHealthStatus[record.health_status] || 0) + 1;
        agentStats.byBrandNature[record.brand_nature] = (agentStats.byBrandNature[record.brand_nature] || 0) + 1;
        
        // Count critical brands (Orange + Red)
        if (record.health_status === 'Orange' || record.health_status === 'Red') {
          agentStats.criticalBrands += 1;
        }
        
        // Count healthy brands (Green + Amber)
        if (record.health_status === 'Green' || record.health_status === 'Amber') {
          agentStats.healthyBrands += 1;
        }
        
        // Count not connected
        if (record.health_status === 'Not Connected') {
          agentStats.notConnected += 1;
        }
      });
      
      // Calculate connectivity rate and pending assessments for each agent
      agentMap.forEach(agentStats => {
        const connected = agentStats.total - agentStats.notConnected;
        agentStats.connectivityRate = agentStats.total > 0 
          ? Math.round((connected / agentStats.total) * 100) 
          : 0;
        
        // Calculate pending assessments
        agentStats.pendingAssessments = agentStats.totalBrands - agentStats.total;
      });
      
      stats.byAgent = Array.from(agentMap.values()).sort((a, b) => b.total - a.total);
      
      console.log(`📊 [getHealthCheckStatistics] Final stats:`, {
        totalAgents: stats.byAgent.length,
        sampleAgent: stats.byAgent[0] ? {
          email: stats.byAgent[0].kam_email,
          totalBrands: stats.byAgent[0].totalBrands,
          total: stats.byAgent[0].total,
          pending: stats.byAgent[0].pendingAssessments
        } : null
      });
    }
    
    return stats;
  },

  // Get brands for assessment (brands that haven't been assessed this month)
  async getBrandsForAssessment(params: {
    userProfile: UserProfile; // email removed, userProfile required
    month: string;
  }) {
    const { userProfile: rawProfile, month } = params;
    const userProfile = normalizeUserProfile(rawProfile);
    
    if (!userProfile) {
      throw new Error("User profile not found");
    }
    
    const normalizedRole = userProfile.role.toLowerCase().replace(/[_\s]/g, '');
    const teamName = userProfile.team_name || userProfile.teamName;

    // console.log(`📊 [getBrandsForAssessment] User: ${userProfile.email}, Role: ${normalizedRole}, Month: ${month}`);

    // Get all brands for this user/team
    let brandsQuery = getSupabaseAdmin()
      .from('master_data')
      .select('*');

    if (normalizedRole === 'agent') {
      brandsQuery = brandsQuery.eq('kam_email_id', userProfile.email);
    } else if (normalizedRole === 'subagent' || normalizedRole === 'sub_agent') {
      const lookupId = userProfile.dbId || userProfile.id;
      if (lookupId) {
        const { data: sacRows } = await getSupabaseAdmin()
          .from('sub_agent_coordinators').select('coordinator_id')
          .eq('sub_agent_id', lookupId) as { data: Array<{ coordinator_id: string }> | null; error: any };
        if (sacRows && sacRows.length > 0) {
          const { data: coords } = await getSupabaseAdmin()
            .from('user_profiles').select('email').in('id', sacRows.map(r => r.coordinator_id));
          const coordinatorEmails = (coords as any[])?.map((c: any) => c.email).filter(Boolean) || [];
          brandsQuery = coordinatorEmails.length > 0
            ? brandsQuery.in('kam_email_id', coordinatorEmails)
            : brandsQuery.eq('kam_email_id', 'NON_EXISTENT_EMAIL');
        } else {
          brandsQuery = brandsQuery.eq('kam_email_id', 'NON_EXISTENT_EMAIL');
        }
      } else {
        brandsQuery = brandsQuery.eq('kam_email_id', 'NON_EXISTENT_EMAIL');
      }
    } else if (normalizedRole === 'team_lead' || normalizedRole === 'teamlead') {
      if (teamName) {
        const { data: teamMembers } = await getSupabaseAdmin()
          .from('user_profiles')
          .select('email')
          .eq('team_name', teamName)
          .in('role', ['agent', 'Agent']) as { data: Array<{ email: string }> | null; error: any };
        
        const agentEmails = teamMembers?.map(m => m.email) || [];
        if (agentEmails.length > 0) {
          brandsQuery = brandsQuery.in('kam_email_id', agentEmails);
        } else {
          brandsQuery = brandsQuery.eq('kam_email_id', 'NON_EXISTENT_EMAIL');
        }
      } else {
        brandsQuery = brandsQuery.eq('kam_email_id', 'NON_EXISTENT_EMAIL');
      }
    } else if (normalizedRole === 'admin') {
      // Admin sees all
    } else {
      console.warn(`⚠️ Unknown role: ${userProfile.role}, denying access to brands for assessment`);
      brandsQuery = brandsQuery.eq('kam_email_id', 'NON_EXISTENT_EMAIL');
    }
    
    // Fetch ALL brands using proper pagination (no Supabase limit)
    let allBrands: any[] = [];
    let page = 0;
    const pageSize = 1000;
    let hasMore = true;
    
    while (hasMore) {
      const start = page * pageSize;
      const end = start + pageSize - 1;
      
      const { data: pageBrands, error: brandsError } = await brandsQuery
        .range(start, end);
      
      if (brandsError) {
        console.error(`❌ [getBrandsForAssessment] Error fetching brands page ${page}:`, brandsError);
        throw brandsError;
      }
      
      if (pageBrands && pageBrands.length > 0) {
        allBrands = [...allBrands, ...pageBrands];
        hasMore = pageBrands.length === pageSize;
        page++;
      } else {
        hasMore = false;
      }
      
      // Safety limit
      if (page > 100) {
        console.warn('⚠️ [getBrandsForAssessment] Reached maximum page limit (100)');
        break;
      }
    }
    
    console.log(`📊 [getBrandsForAssessment] Total brands fetched: ${allBrands.length} (in ${page} pages)`);
    
    if (!allBrands || allBrands.length === 0) {
      // console.log(`⚠️ [getBrandsForAssessment] No brands found for user`);
      return [];
    }
    
    if (allBrands.length > 0) {
      // console.log(`📊 [getBrandsForAssessment] Sample brand:`, {
      //   brand_name: allBrands[0].brand_name,
      //   kam_email_id: allBrands[0].kam_email_id,
      //   zone: allBrands[0].zone
      // });
    }
    
    // Get assessed brand names for this month - CRITICAL: Filter by KAM email for agents
    let assessedQuery = getSupabaseAdmin()
      .from('health_checks')
      .select('brand_name, kam_email')
      .eq('assessment_month', month);
    
    // CRITICAL FIX: For agents, only get their own assessments
    // For sub_agent, get coordinator agents' assessments
    // For team leads, get all team assessments
    if (normalizedRole === 'agent') {
      assessedQuery = assessedQuery.eq('kam_email', userProfile.email);
    } else if (normalizedRole === 'subagent' || normalizedRole === 'sub_agent') {
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
            assessedQuery = assessedQuery.in('kam_email', coordinatorEmails);
          } else {
            assessedQuery = assessedQuery.eq('kam_email', 'NON_EXISTENT_EMAIL');
          }
        } else {
          assessedQuery = assessedQuery.eq('kam_email', 'NON_EXISTENT_EMAIL');
        }
      } else {
        assessedQuery = assessedQuery.eq('kam_email', 'NON_EXISTENT_EMAIL');
      }
    } else if (normalizedRole === 'team_lead' || normalizedRole === 'teamlead') {
      if (teamName) {
        assessedQuery = assessedQuery.eq('team_name', teamName);
      }
    }
    
    const { data: assessedChecks, error: assessedError } = await assessedQuery as { data: Array<{ brand_name: string; kam_email: string }> | null; error: any };
    
    if (assessedError) {
      console.error(`❌ [getBrandsForAssessment] Error fetching assessed brands:`, assessedError);
      throw assessedError;
    }
    
    // console.log(`📊 [getBrandsForAssessment] Assessed checks this month: ${assessedChecks?.length || 0}`);
    
    if (assessedChecks && assessedChecks.length > 0) {
      // console.log(`📊 [getBrandsForAssessment] Sample assessed check:`, assessedChecks[0]);
    }
    
    // Create a map of assessed brands by KAM email for precise matching
    // Key: kam_email + normalized_brand_name
    const assessedBrandsMap = new Map<string, boolean>();
    assessedChecks?.forEach(check => {
      const normalizedBrandName = check.brand_name?.trim().toLowerCase();
      const key = `${check.kam_email}:${normalizedBrandName}`;
      assessedBrandsMap.set(key, true);
    });
    
    // console.log(`📊 [getBrandsForAssessment] Assessed brands map size: ${assessedBrandsMap.size}`);
    
    // Filter out already assessed brands
    const brandsForAssessment = allBrands.filter(brand => {
      const normalizedBrandName = brand.brand_name?.trim().toLowerCase();
      const kamEmail = brand.kam_email_id;
      const key = `${kamEmail}:${normalizedBrandName}`;
      const isAssessed = assessedBrandsMap.has(key);
      
      if (isAssessed) {
        // console.log(`🔍 [getBrandsForAssessment] Brand already assessed: ${brand.brand_name} by ${kamEmail}`);
      }
      
      return !isAssessed;
    });
    
    // console.log(`📊 [getBrandsForAssessment] Brands pending assessment: ${brandsForAssessment.length}`);
    
    if (brandsForAssessment.length > 0) {
      // console.log(`📊 [getBrandsForAssessment] Sample pending brand:`, {
      //   brand_name: brandsForAssessment[0].brand_name,
      //   kam_email_id: brandsForAssessment[0].kam_email_id
      // });
    } else if (allBrands.length > 0) {
      // console.log(`⚠️ [getBrandsForAssessment] All brands filtered out. Debugging...`);
      // console.log(`📊 [getBrandsForAssessment] First brand from master_data:`, {
      //   brand_name: allBrands[0].brand_name,
      //   kam_email_id: allBrands[0].kam_email_id,
      //   normalized: allBrands[0].brand_name?.trim().toLowerCase()
      // });
      if (assessedChecks && assessedChecks.length > 0) {
        // console.log(`📊 [getBrandsForAssessment] First assessed check:`, {
        //   brand_name: assessedChecks[0].brand_name,
        //   kam_email: assessedChecks[0].kam_email,
        //   normalized: assessedChecks[0].brand_name?.trim().toLowerCase()
        // });
      }
    }
    
    return brandsForAssessment;
  },

  // Get assessment progress for current month
  async getAssessmentProgress(params: {
    userProfile: UserProfile; // email removed, userProfile required
    month: string;
  }) {
    const { userProfile: rawProfile, month } = params;
    const userProfile = normalizeUserProfile(rawProfile);
    
    if (!userProfile) {
      throw new Error("User profile not found");
    }
    
    // Get total brands
    let brandsQuery = getSupabaseAdmin().from('master_data').select('*', { count: 'exact' });
    
    const normalizedRole = userProfile.role.toLowerCase().replace(/[_\s]/g, '');
    const teamName = userProfile.team_name || userProfile.teamName;

    if (normalizedRole === 'agent') {
      brandsQuery = brandsQuery.eq('kam_email_id', userProfile.email);
    } else if (normalizedRole === 'subagent' || normalizedRole === 'sub_agent') {
      const lookupId = userProfile.dbId || userProfile.id;
      if (lookupId) {
        const { data: sacRows } = await getSupabaseAdmin()
          .from('sub_agent_coordinators').select('coordinator_id')
          .eq('sub_agent_id', lookupId) as { data: Array<{ coordinator_id: string }> | null; error: any };
        if (sacRows && sacRows.length > 0) {
          const { data: coords } = await getSupabaseAdmin()
            .from('user_profiles').select('email').in('id', sacRows.map(r => r.coordinator_id));
          const coordinatorEmails = (coords as any[])?.map((c: any) => c.email).filter(Boolean) || [];
          brandsQuery = coordinatorEmails.length > 0
            ? brandsQuery.in('kam_email_id', coordinatorEmails)
            : brandsQuery.eq('kam_email_id', 'NON_EXISTENT_EMAIL');
        } else {
          brandsQuery = brandsQuery.eq('kam_email_id', 'NON_EXISTENT_EMAIL');
        }
      } else {
        brandsQuery = brandsQuery.eq('kam_email_id', 'NON_EXISTENT_EMAIL');
      }
    } else if (normalizedRole === 'team_lead' || normalizedRole === 'teamlead') {
      if (teamName) {
        const { data: teamMembers } = await getSupabaseAdmin()
          .from('user_profiles')
          .select('email')
          .eq('team_name', teamName)
          .in('role', ['agent', 'Agent']) as { data: Array<{ email: string }> | null; error: any };
        
        const agentEmails = teamMembers?.map(m => m.email) || [];
        if (agentEmails.length > 0) {
          brandsQuery = brandsQuery.in('kam_email_id', agentEmails);
        } else {
          brandsQuery = brandsQuery.eq('kam_email_id', 'NON_EXISTENT_EMAIL');
        }
      } else {
        brandsQuery = brandsQuery.eq('kam_email_id', 'NON_EXISTENT_EMAIL');
      }
    } else if (normalizedRole === 'admin') {
      // Admin sees all
    } else {
      console.warn(`⚠️ Unknown role: ${userProfile.role}, denying access to assessment progress`);
      brandsQuery = brandsQuery.eq('kam_email_id', 'NON_EXISTENT_EMAIL');
    }
    
    // FIX: Add explicit limit to avoid Supabase default 1000 row limit
    const { count: totalBrands } = await brandsQuery.limit(10000);
    
    // Get assessed brands for this month
    let assessedQuery = getSupabaseAdmin()
      .from('health_checks')
      .select('*', { count: 'exact' })
      .eq('assessment_month', month);
    
    if (normalizedRole === 'agent') {
      assessedQuery = assessedQuery.eq('kam_email', userProfile.email);
    } else if (normalizedRole === 'subagent' || normalizedRole === 'sub_agent') {
      const lookupId = userProfile.dbId || userProfile.id;
      if (lookupId) {
        const { data: sacRows } = await getSupabaseAdmin()
          .from('sub_agent_coordinators').select('coordinator_id')
          .eq('sub_agent_id', lookupId) as { data: Array<{ coordinator_id: string }> | null; error: any };
        if (sacRows && sacRows.length > 0) {
          const { data: coords } = await getSupabaseAdmin()
            .from('user_profiles').select('email').in('id', sacRows.map(r => r.coordinator_id));
          const coordinatorEmails = (coords as any[])?.map((c: any) => c.email).filter(Boolean) || [];
          assessedQuery = coordinatorEmails.length > 0
            ? assessedQuery.in('kam_email', coordinatorEmails)
            : assessedQuery.eq('kam_email', 'NON_EXISTENT_EMAIL');
        } else {
          assessedQuery = assessedQuery.eq('kam_email', 'NON_EXISTENT_EMAIL');
        }
      } else {
        assessedQuery = assessedQuery.eq('kam_email', 'NON_EXISTENT_EMAIL');
      }
    } else if (normalizedRole === 'team_lead' || normalizedRole === 'teamlead') {
      if (teamName) {
        assessedQuery = assessedQuery.eq('team_name', teamName);
      }
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
