/**
 * Engagement Call Service
 *
 * Lazy model: NO rows are pre-created for pending brands.
 * A row is only inserted when an agent marks a call as done.
 * Pending list = master_data brands - done call records for that month.
 *
 * Transfer-safe: because pending state lives in master_data (not this table),
 * a brand transfer automatically moves it to the new agent's pending list.
 */

import { getSupabaseAdmin } from '../supabase-server';
import { normalizeUserProfile } from '../../utils/authUtils';

interface UserProfile {
  id?: string;
  dbId?: string;
  email: string;
  fullName?: string;
  full_name?: string;
  role: string;
  team_name?: string;
  teamName?: string;
  coordinator_id?: string;
  [key: string]: any;
}

export interface EngagementCallConfig {
  id: string;
  month: string;
  topic: string;
  topic_description?: string;
  purpose: 'Upsell' | 'Awareness';
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface EngagementCall {
  id: string;
  month: string;
  brand_name: string;
  brand_id?: string;
  kam_email: string;
  kam_name?: string;
  team_name?: string;
  zone?: string;
  status: 'done';
  description?: string;
  next_step?: 'yes' | 'no';
  next_step_description?: string;
  called_at?: string;
  actioned_by?: string;
  created_at: string;
  updated_at: string;
}

export interface PendingBrand {
  id: string;
  brand_name: string;
  zone?: string;
}

export const engagementCallService = {

  // ─── Admin: Config ────────────────────────────────────────────────────────────

  async getConfig(month: string): Promise<EngagementCallConfig | null> {
    const { data, error } = await getSupabaseAdmin()
      .from('engagement_call_config')
      .select('*')
      .eq('month', month)
      .single();
    if (error || !data) return null;
    return data as EngagementCallConfig;
  },

  async upsertConfig(params: {
    month: string;
    topic: string;
    topic_description?: string;
    purpose: 'Upsell' | 'Awareness';
    createdBy: string;
  }): Promise<EngagementCallConfig> {
    const { month, topic, topic_description, purpose, createdBy } = params;
    const { data, error } = await getSupabaseAdmin()
      .from('engagement_call_config')
      .upsert(
        { month, topic, topic_description: topic_description || null, purpose, created_by: createdBy, updated_at: new Date().toISOString() },
        { onConflict: 'month' }
      )
      .select()
      .single();
    if (error) throw new Error(error.message);
    return data as EngagementCallConfig;
  },

  // ─── Calls: Get data for the page ────────────────────────────────────────────
  //
  // Returns:
  //   pendingBrands — brands from master_data not yet called this month (agent only)
  //   done          — engagement_calls rows with status=done
  //   totalBrands   — total brand count for the agent (for progress display)

  async getCallsData(params: {
    userProfile: UserProfile;
    month: string;
  }): Promise<{ pendingBrands: PendingBrand[]; done: EngagementCall[]; totalBrands: number }> {
    const { month } = params;
    const userProfile = normalizeUserProfile(params.userProfile);
    const normalizedRole = userProfile.role?.toLowerCase().replace(/[_\s]/g, '');

    // ── Resolve which KAM emails to scope to ──────────────────────────────────
    let kamEmails: string[] | null = null; // null = no filter (admin/team_lead by team)

    if (normalizedRole === 'agent') {
      kamEmails = [userProfile.email];
    } else if (normalizedRole === 'subagent' || normalizedRole === 'sub_agent') {
      kamEmails = await _getSubAgentCoordinatorEmails(userProfile);
    } else if (normalizedRole === 'boperson' || normalizedRole === 'bo_person') {
      const email = await _getBoPersonCoordinatorEmail(userProfile);
      kamEmails = email ? [email] : [];
    }
    // team_lead and admin: kamEmails stays null, filtered differently below

    if (kamEmails !== null && kamEmails.length === 0) {
      return { pendingBrands: [], done: [], totalBrands: 0 };
    }

    // ── Fetch done records ────────────────────────────────────────────────────
    let doneQuery = getSupabaseAdmin()
      .from('engagement_calls')
      .select('*')
      .eq('month', month);

    if (kamEmails !== null) {
      doneQuery = doneQuery.in('kam_email', kamEmails);
    } else if (normalizedRole === 'teamlead' || normalizedRole === 'team_lead') {
      const teamName = userProfile.team_name || userProfile.teamName;
      if (teamName) doneQuery = doneQuery.eq('team_name', teamName);
    }
    // admin: no filter — sees all org-wide done records

    const { data: doneRows, error: doneErr } = await doneQuery.order('called_at', { ascending: false });
    if (doneErr) throw new Error(doneErr.message);
    const done = (doneRows || []) as EngagementCall[];

    // ── Pending brands: meaningful for agent/subagent/bo_person/team_lead/admin ──
    let pendingBrands: PendingBrand[] = [];
    let totalBrands = done.length;

    if (normalizedRole === 'agent') {
      const { data: allBrands, error: brandsErr } = await getSupabaseAdmin()
        .from('master_data')
        .select('id, brand_name, zone')
        .eq('kam_email_id', userProfile.email)
        .limit(10000);

      console.log(`📞 [EngagementCallService] master_data query for ${userProfile.email}: found=${allBrands?.length ?? 0} err=${brandsErr?.message}`);

      const doneNames = new Set(done.map(d => d.brand_name));
      pendingBrands = ((allBrands || []) as PendingBrand[]).filter(b => !doneNames.has(b.brand_name));
      totalBrands = (allBrands || []).length;
    } else if (normalizedRole === 'admin') {
      // Admin sees all brands across all agents
      const allBrandsArr: any[] = [];
      let from = 0;
      const pageSize = 1000;
      while (true) {
        const { data: chunk } = await getSupabaseAdmin()
          .from('master_data')
          .select('id, brand_name, zone, kam_email_id')
          .order('brand_name')
          .range(from, from + pageSize - 1);
        if (!chunk || chunk.length === 0) break;
        allBrandsArr.push(...chunk);
        if (chunk.length < pageSize) break;
        from += pageSize;
      }

      console.log(`📞 [EngagementCallService] admin master_data query: found=${allBrandsArr.length}`);

      const doneNames = new Set(done.map(d => d.brand_name));
      pendingBrands = allBrandsArr.filter(b => !doneNames.has(b.brand_name));
      totalBrands = allBrandsArr.length;
    } else if ((normalizedRole === 'subagent' || normalizedRole === 'sub_agent') && kamEmails) {
      const { data: allBrands } = await getSupabaseAdmin()
        .from('master_data')
        .select('id, brand_name, zone')
        .in('kam_email_id', kamEmails)
        .limit(10000);

      const doneNames = new Set(done.map(d => d.brand_name));
      pendingBrands = ((allBrands || []) as PendingBrand[]).filter(b => !doneNames.has(b.brand_name));
      totalBrands = (allBrands || []).length;
    } else if (normalizedRole === 'teamlead' || normalizedRole === 'team_lead') {
      // Fetch all brands for the team via master_data
      const teamName = userProfile.team_name || userProfile.teamName;
      if (teamName) {
        const { data: teamMembers } = await getSupabaseAdmin()
          .from('user_profiles')
          .select('email')
          .eq('team_name', teamName)
          .in('role', ['agent', 'Agent', 'team_lead', 'Team Lead']) as { data: Array<{ email: string }> | null; error: any };

        // Always include the team lead's own email in case they have brands assigned
        const teamEmails = [...new Set([...(teamMembers?.map(m => m.email) || []), userProfile.email])];
        if (teamEmails.length > 0) {
          const { data: allBrands } = await getSupabaseAdmin()
            .from('master_data')
            .select('id, brand_name, zone, kam_email_id')
            .in('kam_email_id', teamEmails)
            .limit(10000);

          console.log(`📞 [EngagementCallService] team_lead master_data query for team=${teamName}: found=${allBrands?.length ?? 0}`);

          const doneNames = new Set(done.map(d => d.brand_name));
          pendingBrands = ((allBrands || []) as PendingBrand[]).filter(b => !doneNames.has(b.brand_name));
          totalBrands = (allBrands || []).length;
        }
      }
    }

    return { pendingBrands, done, totalBrands };
  },

  // ─── Lookup: Get the brand's actual KAM info from master_data ───────────────
  // Used so subagents/bo_persons record the brand's KAM, not themselves.

  async getBrandKamInfo(brandName: string): Promise<{ kamEmail: string; kamName: string; teamName?: string; zone?: string } | null> {
    const { data, error } = await getSupabaseAdmin()
      .from('master_data')
      .select('kam_email_id, kam_name, team_name, zone')
      .ilike('brand_name', brandName.trim())
      .limit(1)
      .single();
    if (error || !data) return null;
    return {
      kamEmail: (data as any).kam_email_id,
      kamName: (data as any).kam_name || (data as any).kam_email_id,
      teamName: (data as any).team_name || undefined,
      zone: (data as any).zone || undefined,
    };
  },

  // ─── Calls: Insert a done record (lazy — only called when call is logged) ────

  async markCallDone(params: {
    month: string;
    brandName: string;
    brandId?: string;
    kamEmail: string;
    kamName: string;
    teamName?: string;
    zone?: string;
    description: string;
    nextStep: 'yes' | 'no';
    nextStepDescription?: string;
    actionedBy: string;
  }): Promise<EngagementCall> {
    const now = new Date().toISOString();
    const { data, error } = await getSupabaseAdmin()
      .from('engagement_calls')
      .upsert(
        {
          month: params.month,
          brand_name: params.brandName,
          brand_id: params.brandId || null,
          kam_email: params.kamEmail,
          kam_name: params.kamName,
          team_name: params.teamName || null,
          zone: params.zone || null,
          status: 'done',
          description: params.description,
          next_step: params.nextStep,
          next_step_description: params.nextStep === 'yes' ? (params.nextStepDescription || null) : null,
          called_at: now,
          actioned_by: params.actionedBy,
          updated_at: now,
        },
        { onConflict: 'month,brand_name,kam_email' }
      )
      .select()
      .single();
    if (error) throw new Error(error.message);
    return data as EngagementCall;
  },

  // ─── Statistics (for admin/team lead page) ────────────────────────────────────

  async getStatistics(params: {
    userProfile: UserProfile;
    month: string;
  }): Promise<{ total: number; done: number; pending: number; byAgent: any[] }> {
    const { pendingBrands, done, totalBrands } = await engagementCallService.getCallsData(params);

    const byAgentMap: Record<string, { kam_email: string; kam_name: string; done: number }> = {};
    for (const c of done) {
      if (!byAgentMap[c.kam_email]) {
        byAgentMap[c.kam_email] = { kam_email: c.kam_email, kam_name: c.kam_name || c.kam_email, done: 0 };
      }
      byAgentMap[c.kam_email].done++;
    }

    return {
      total: totalBrands,
      done: done.length,
      pending: totalBrands - done.length,
      byAgent: Object.values(byAgentMap),
    };
  },

  // ─── Calls: Edit an existing done record ─────────────────────────────────────

  async updateCall(params: {
    callId: string;
    kamEmail: string;
    description: string;
    nextStep: 'yes' | 'no';
    nextStepDescription?: string;
  }): Promise<EngagementCall> {
    const { callId, kamEmail, description, nextStep, nextStepDescription } = params;

    // Verify ownership — only the KAM who logged it (or admin) can edit
    const { data: existing, error: fetchErr } = await getSupabaseAdmin()
      .from('engagement_calls')
      .select('*')
      .eq('id', callId)
      .single();
    if (fetchErr || !existing) throw new Error('Call not found');
    if (existing.kam_email !== kamEmail) throw new Error('Access denied');

    const { data, error } = await getSupabaseAdmin()
      .from('engagement_calls')
      .update({
        description,
        next_step: nextStep,
        next_step_description: nextStep === 'yes' ? (nextStepDescription || null) : null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', callId)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return data as EngagementCall;
  },

  // ─── Churn: Get churn records for agent's brands ─────────────────────────────
  // Matches churn records against master_data brands using:
  //   1. brand_name (master_data) vs brand_name (churn_records)  — trimmed, case-insensitive
  //   2. brand_name (master_data) vs restaurant_name (churn_records) — trimmed, case-insensitive
  //   3. brand_email_id (master_data) vs owner_email (churn_records) — when email is present

  async getChurnBrandsForAgent(params: { userProfile: UserProfile; brandName?: string }): Promise<any[]> {
    const { brandName } = params;
    const userProfile = normalizeUserProfile(params.userProfile);
    // Keep underscores so 'sub_agent' stays 'sub_agent', not 'subagent'
    const normalizedRole = userProfile.role?.toLowerCase().replace(/\s+/g, '_');

    // ── Admin: if a specific brand is requested, fall through to normal matching logic ──
    // (no early return — admin scoped to their own brands or the requested brand)

    // ── Resolve KAM emails to scope master_data lookup ────────────────────────
    let kamEmails: string[] = [userProfile.email];

    if (normalizedRole === 'sub_agent') {
      const lookupId = userProfile.dbId || userProfile.id;
      if (lookupId) {
        const { data: sacRows } = await getSupabaseAdmin()
          .from('sub_agent_coordinators')
          .select('coordinator_id')
          .eq('sub_agent_id', lookupId) as { data: Array<{ coordinator_id: string }> | null; error: any };
        if (sacRows && sacRows.length > 0) {
          const { data: coords } = await getSupabaseAdmin()
            .from('user_profiles')
            .select('email')
            .in('id', sacRows.map(r => r.coordinator_id));
          kamEmails = (coords as any[])?.map((c: any) => c.email).filter(Boolean) || [];
        }
      }
    } else if (normalizedRole === 'team_lead') {
      const teamName = userProfile.team_name || userProfile.teamName;
      if (teamName) {
        const { data: members } = await getSupabaseAdmin()
          .from('user_profiles')
          .select('email')
          .eq('team_name', teamName) as { data: Array<{ email: string }> | null; error: any };
        const memberEmails = (members || []).map(m => m.email).filter(Boolean);
        kamEmails = [...new Set([...memberEmails, userProfile.email])];
      }
    }

    console.log(`📞 [ChurnBrands] role=${normalizedRole} kamEmails=${kamEmails.join(',')}`);

    // ── Get brands from master_data for these KAMs ────────────────────────────
    const { data: brands } = await getSupabaseAdmin()
      .from('master_data')
      .select('brand_name, brand_email_id')
      .in('kam_email_id', kamEmails)
      .limit(10000);

    if (!brands || brands.length === 0) {
      console.log(`📞 [ChurnBrands] No brands found in master_data for kamEmails`);
      return [];
    }

    console.log(`📞 [ChurnBrands] Found ${brands.length} brands in master_data`);

    // Build lookup sets — trim + lowercase for reliable matching
    const brandNameSet = new Set(
      (brands as any[]).map((b: any) => b.brand_name?.trim().toLowerCase()).filter(Boolean)
    );
    // Collect both brand_email_id values for owner_email matching
    const ownerEmailSet = new Set(
      (brands as any[]).flatMap((b: any) => [
        b.brand_email_id?.trim().toLowerCase(),
      ]).filter(Boolean)
    );

    console.log(`📞 [ChurnBrands] brandNameSet size=${brandNameSet.size} ownerEmailSet size=${ownerEmailSet.size}`);

    // ── Fetch all churn records in chunks (bypass 1000-row limit) ────────────
    const allChurn: any[] = [];
    let from = 0;
    const chunkSize = 1000;
    while (true) {
      let q = getSupabaseAdmin()
        .from('churn_records')
        .select('rid, restaurant_name, brand_name, owner_email, churn_reason, zone, kam')
        .range(from, from + chunkSize - 1);
      const { data: chunk } = await q;
      if (!chunk || chunk.length === 0) break;
      allChurn.push(...chunk);
      if (chunk.length < chunkSize) break;
      from += chunkSize;
    }

    console.log(`📞 [ChurnBrands] Total churn records fetched: ${allChurn.length}`);

    // ── 4-way match ───────────────────────────────────────────────────────────
    // 1. churn.restaurant_name  matches master_data.brand_name
    // 2. churn.brand_name       matches master_data.brand_name
    // 3. churn.owner_email      matches master_data.brand_email_id
    // 4. If brandName filter provided, also narrow to that specific brand
    let matched = allChurn.filter(r => {
      const restaurantLower = r.restaurant_name?.trim().toLowerCase() || '';
      const churnBrandLower = r.brand_name?.trim().toLowerCase() || '';
      const emailLower = r.owner_email?.trim().toLowerCase() || '';

      const byRestaurant = brandNameSet.has(restaurantLower);
      const byBrandName  = churnBrandLower && brandNameSet.has(churnBrandLower);
      const byEmail      = emailLower && ownerEmailSet.size > 0 && ownerEmailSet.has(emailLower);

      return byRestaurant || byBrandName || byEmail;
    });

    // If a specific brand was requested, narrow further
    if (brandName) {
      const bn = brandName.trim().toLowerCase();
      matched = matched.filter(r =>
        r.brand_name?.trim().toLowerCase() === bn ||
        r.restaurant_name?.trim().toLowerCase().includes(bn)
      );
    }
    return matched;
  },

  // ─── History: Get previous months' calls for a brand ─────────────────────────

  async getCallHistory(params: { brandName: string; kamEmail: string }): Promise<EngagementCall[]> {
    const { brandName, kamEmail } = params;
    const { data, error } = await getSupabaseAdmin()
      .from('engagement_calls')
      .select('*')
      .eq('brand_name', brandName)
      .eq('kam_email', kamEmail)
      .order('called_at', { ascending: false })
      .limit(12); // last 12 months max
    if (error) throw new Error(error.message);
    return (data || []) as EngagementCall[];
  },

  // ─── Transfer hook: no-op now (pending lives in master_data, not this table) ─
  // Kept for backward compat with transfer-brand route — safe to call, does nothing.
  async handleBrandTransfer(_params: any): Promise<void> {
    // Nothing to do — pending state is derived from master_data at query time.
  },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function _getSubAgentCoordinatorEmails(userProfile: UserProfile): Promise<string[]> {
  const lookupId = userProfile.dbId || userProfile.id;
  if (!lookupId) return [];
  const { data: sacRows } = await getSupabaseAdmin()
    .from('sub_agent_coordinators')
    .select('coordinator_id')
    .eq('sub_agent_id', lookupId) as { data: Array<{ coordinator_id: string }> | null; error: any };
  if (!sacRows || sacRows.length === 0) return [];
  const { data: coords } = await getSupabaseAdmin()
    .from('user_profiles')
    .select('email')
    .in('id', sacRows.map(r => r.coordinator_id));
  return (coords as any[])?.map((c: any) => c.email) || [];
}

async function _getBoPersonCoordinatorEmail(userProfile: UserProfile): Promise<string | null> {
  if (!userProfile.coordinator_id) return null;
  const { data } = await getSupabaseAdmin()
    .from('user_profiles')
    .select('email')
    .eq('id', userProfile.coordinator_id)
    .single();
  return (data as any)?.email || null;
}
