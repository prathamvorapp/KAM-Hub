/**
 * Escalation Service (Enhanced)
 *
 * Features:
 * - Pagination
 * - Close with reason + resolution_days calculation
 * - Change logs (every create/update/close/remark)
 * - Team Lead remarks (visible to all, notifies agent)
 * - Post-close editing by Team Lead
 * - In-app notifications (raised → TL, closed → TL, remark → agent)
 */

import { getSupabaseAdmin } from '../supabase-server';

export const ESCALATION_CLASSIFICATIONS = [
  'POS Config', 'Menu Management', 'Inventory Management', 'MP Service',
  'Payroll', 'Task', 'Report', 'Purchase', 'Payment/EDC Issue',
  'Renewal & Retention', 'Training & Development', 'Development',
  'Integration', 'Embedded Finance',
] as const;

export const BRAND_NATURES = ['Red', 'Orange', 'Amber'] as const;
export const RESPONSIBLE_PARTIES = ['Brand', 'KAM', 'Another Department'] as const;

export type EscalationClassification = typeof ESCALATION_CLASSIFICATIONS[number];
export type BrandNature = typeof BRAND_NATURES[number];
export type ResponsibleParty = typeof RESPONSIBLE_PARTIES[number];

export interface Escalation {
  id: string;
  brand_name: string;
  brand_id?: string;
  kam_email: string;
  kam_name?: string;
  team_name?: string;
  zone?: string;
  classification: EscalationClassification;
  description: string;
  brand_nature?: BrandNature;
  responsible_party?: ResponsibleParty;
  status: 'open' | 'closed';
  close_reason?: string;
  closed_at?: string;
  closed_by?: string;
  resolution_days?: number;
  team_lead_remark?: string;
  team_lead_remark_updated_at?: string;
  team_lead_remark_updated_by?: string;
  raised_by: string;
  actioned_by?: string;
  created_at: string;
  updated_at: string;
}

export interface EscalationLog {
  id: string;
  escalation_id: string;
  action: string;
  changed_by: string;
  changed_by_name?: string;
  changed_fields?: Record<string, { from: any; to: any }>;
  note?: string;
  created_at: string;
}

export interface EscalationNotification {
  id: string;
  escalation_id: string;
  recipient_email: string;
  type: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

export interface GetEscalationsParams {
  userProfile: any;
  status?: 'open' | 'closed' | 'all';
  brand_name?: string;
  kam_name?: string;
  brand_nature?: string;
  page?: number;
  limit?: number;
}

export interface CreateEscalationParams {
  brand_name: string;
  brand_id?: string;
  classification: EscalationClassification;
  description: string;
  brand_nature?: BrandNature;
  userProfile: any;
}

export interface UpdateEscalationParams {
  id: string;
  description?: string;
  brand_nature?: BrandNature;
  responsible_party?: ResponsibleParty;
  team_lead_remark?: string;
  userProfile: any;
}

export interface CloseEscalationParams {
  id: string;
  close_reason: string;
  userProfile: any;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function calcResolutionDays(createdAt: string): number {
  const created = new Date(createdAt);
  const now = new Date();
  const diffMs = now.getTime() - created.getTime();
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  return days; // 0 = same day
}

async function insertLog(
  escalationId: string,
  action: string,
  changedBy: string,
  changedByName: string,
  note: string,
  changedFields?: Record<string, { from: any; to: any }>
) {
  await getSupabaseAdmin().from('escalation_logs').insert({
    escalation_id: escalationId,
    action,
    changed_by: changedBy,
    changed_by_name: changedByName,
    changed_fields: changedFields || null,
    note,
  });
}

async function getTeamLeadEmails(teamName: string): Promise<string[]> {
  const { data } = await getSupabaseAdmin()
    .from('user_profiles')
    .select('email, role')
    .eq('team_name', teamName);
  return (data || [])
    .filter((r: any) => {
      const r2 = (r.role || '').toLowerCase().replace(/\s+/g, '_');
      return r2 === 'team_lead' || r2 === 'admin';
    })
    .map((r: any) => r.email)
    .filter(Boolean);
}

async function sendNotification(
  escalationId: string,
  recipientEmails: string[],
  type: string,
  message: string
) {
  if (!recipientEmails.length) return;
  const rows = recipientEmails.map(email => ({
    escalation_id: escalationId,
    recipient_email: email,
    type,
    message,
  }));
  await getSupabaseAdmin().from('escalation_notifications').insert(rows);
}

// ─── Service ──────────────────────────────────────────────────────────────────

export const escalationService = {

  async getEscalations({ userProfile, status = 'all', brand_name, kam_name, brand_nature, page = 1, limit = 20 }: GetEscalationsParams) {
    const supabase = getSupabaseAdmin();
    const role = (userProfile.role || '').toLowerCase().replace(/\s+/g, '_');
    const offset = (page - 1) * limit;

    let query = supabase
      .from('escalations')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (role === 'agent' || role === 'sub_agent') {
      let kamEmails: string[] = [userProfile.email];

      if (role === 'sub_agent') {
        const lookupId = userProfile.dbId || userProfile.id;
        if (lookupId) {
          const { data: sacRows } = await supabase
            .from('sub_agent_coordinators')
            .select('coordinator_id')
            .eq('sub_agent_id', lookupId);
          if (sacRows?.length) {
            const { data: coords } = await supabase
              .from('user_profiles')
              .select('email')
              .in('id', sacRows.map((r: any) => r.coordinator_id));
            kamEmails = (coords || []).map((c: any) => c.email).filter(Boolean);
          } else {
            kamEmails = [];
          }
        } else {
          kamEmails = [];
        }
      }

      let brandIds: string[] = [];
      if (kamEmails.length > 0) {
        const { data: ownedBrands } = await supabase
          .from('master_data').select('id').in('kam_email_id', kamEmails);
        brandIds = (ownedBrands || []).map((b: any) => b.id).filter(Boolean);
      }

      if (brandIds.length > 0) {
        const [byBrand, byRaisedBy, byKamEmail] = await Promise.all([
          supabase.from('escalations').select('*').in('brand_id', brandIds),
          supabase.from('escalations').select('*').eq('raised_by', userProfile.email),
          supabase.from('escalations').select('*').in('kam_email', kamEmails),
        ]);
        const seen = new Set<string>();
        const merged: Escalation[] = [];
        for (const row of [...(byBrand.data || []), ...(byRaisedBy.data || []), ...(byKamEmail.data || [])]) {
          if (!seen.has(row.id)) { seen.add(row.id); merged.push(row as Escalation); }
        }
        let filtered = merged;
        if (status !== 'all') filtered = filtered.filter(e => e.status === status);
        if (brand_name) filtered = filtered.filter(e => e.brand_name.toLowerCase().includes(brand_name.toLowerCase()));
        if (kam_name) filtered = filtered.filter(e => (e.kam_name || e.kam_email).toLowerCase().includes(kam_name.toLowerCase()));
        if (brand_nature) filtered = filtered.filter(e => e.brand_nature === brand_nature);
        filtered.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        const paginated = filtered.slice(offset, offset + limit);
        return { escalations: paginated, total: filtered.length, page, limit };
      } else {
        query = query.eq('kam_email', userProfile.email);
      }
    } else if (role === 'team_lead') {
      const teamName = userProfile.team_name || userProfile.teamName;
      if (teamName) query = query.eq('team_name', teamName);
    }

    if (status !== 'all') query = query.eq('status', status);
    if (brand_name) query = query.ilike('brand_name', `%${brand_name}%`);
    if (kam_name) query = query.ilike('kam_name', `%${kam_name}%`);
    if (brand_nature) query = query.eq('brand_nature', brand_nature);

    const { data, error, count } = await query;
    if (error) throw new Error(error.message);
    return { escalations: (data || []) as Escalation[], total: count || 0, page, limit };
  },

  async getEscalationById(id: string): Promise<Escalation> {
    const { data, error } = await getSupabaseAdmin()
      .from('escalations').select('*').eq('id', id).single();
    if (error || !data) throw new Error('Escalation not found');
    return data as Escalation;
  },

  async getEscalationLogs(escalationId: string): Promise<EscalationLog[]> {
    const { data, error } = await getSupabaseAdmin()
      .from('escalation_logs')
      .select('*')
      .eq('escalation_id', escalationId)
      .order('created_at', { ascending: true });
    if (error) throw new Error(error.message);
    return (data || []) as EscalationLog[];
  },

  async createEscalation(params: CreateEscalationParams): Promise<Escalation> {
    const supabase = getSupabaseAdmin();
    const { userProfile, ...fields } = params;

    let kam_email = userProfile.email;
    let kam_name = userProfile.fullName || userProfile.full_name;
    let team_name = userProfile.team_name || userProfile.teamName;
    let zone = userProfile.zone;

    if (fields.brand_id) {
      const { data: brandRow } = await supabase
        .from('master_data').select('kam_email_id, kam_name, zone').eq('id', fields.brand_id).single();
      if (brandRow) {
        kam_email = brandRow.kam_email_id;
        zone = brandRow.zone;
        if (brandRow.kam_name) {
          kam_name = brandRow.kam_name;
        } else if (brandRow.kam_email_id) {
          const { data: kp } = await supabase.from('user_profiles').select('full_name').eq('email', brandRow.kam_email_id).single();
          kam_name = kp?.full_name || brandRow.kam_email_id;
        }
        if (brandRow.kam_email_id) {
          const { data: kp } = await supabase.from('user_profiles').select('team_name').eq('email', brandRow.kam_email_id).single();
          if (kp?.team_name) team_name = kp.team_name;
        }
      }
    }

    const row = { ...fields, kam_email, kam_name, team_name, zone, raised_by: userProfile.email, status: 'open' };
    const { data, error } = await supabase.from('escalations').insert(row).select().single();
    if (error) throw new Error(error.message);
    const esc = data as Escalation;

    // Log creation
    const actorName = userProfile.fullName || userProfile.full_name || userProfile.email;
    await insertLog(esc.id, 'created', userProfile.email, actorName,
      `Escalation raised by ${actorName} for ${esc.brand_name}`);

    // Notify team lead
    if (team_name) {
      const tlEmails = await getTeamLeadEmails(team_name);
      await sendNotification(esc.id, tlEmails, 'raised',
        `New escalation raised for ${esc.brand_name} (${esc.classification}) by ${actorName}`);
    }

    return esc;
  },

  async updateEscalation(params: UpdateEscalationParams): Promise<Escalation> {
    const supabase = getSupabaseAdmin();
    const { id, userProfile, team_lead_remark, ...updates } = params;
    const role = (userProfile.role || '').toLowerCase().replace(/\s+/g, '_');
    const actorName = userProfile.fullName || userProfile.full_name || userProfile.email;

    const { data: existing, error: fetchErr } = await supabase
      .from('escalations').select('*').eq('id', id).single();
    if (fetchErr || !existing) throw new Error('Escalation not found');

    const isTeamLeadOrAdmin = role === 'team_lead' || role === 'admin';

    // Closed escalations: only team lead/admin can edit (for remark or responsible_party)
    if (existing.status === 'closed' && !isTeamLeadOrAdmin) {
      throw new Error('Cannot edit a closed escalation');
    }

    // Agent/sub_agent auth check for open escalations
    if (!isTeamLeadOrAdmin && existing.status === 'open') {
      // Can edit if: they raised it, they are the KAM, or they currently own the brand
      let canEdit =
        existing.raised_by === userProfile.email ||
        existing.kam_email === userProfile.email;
      if (!canEdit && existing.brand_id) {
        const { data: owned } = await supabase.from('master_data').select('id')
          .eq('id', existing.brand_id).eq('kam_email_id', userProfile.email).maybeSingle();
        canEdit = !!owned;
      }
      if (!canEdit) throw new Error('Not authorized to edit this escalation');
    }

    const allowedUpdates: any = { actioned_by: userProfile.email, updated_at: new Date().toISOString() };
    const changedFields: Record<string, { from: any; to: any }> = {};

    if (updates.description !== undefined && updates.description !== existing.description) {
      allowedUpdates.description = updates.description;
      changedFields.description = { from: existing.description, to: updates.description };
    }
    if (updates.brand_nature !== undefined && updates.brand_nature !== existing.brand_nature) {
      allowedUpdates.brand_nature = updates.brand_nature;
      changedFields.brand_nature = { from: existing.brand_nature, to: updates.brand_nature };
    }
    if (isTeamLeadOrAdmin && updates.responsible_party !== undefined && updates.responsible_party !== existing.responsible_party) {
      allowedUpdates.responsible_party = updates.responsible_party;
      changedFields.responsible_party = { from: existing.responsible_party, to: updates.responsible_party };
    }

    // Team lead remark — separate handling with notification
    let remarkUpdated = false;
    if (isTeamLeadOrAdmin && team_lead_remark !== undefined && team_lead_remark !== existing.team_lead_remark) {
      allowedUpdates.team_lead_remark = team_lead_remark;
      allowedUpdates.team_lead_remark_updated_at = new Date().toISOString();
      allowedUpdates.team_lead_remark_updated_by = userProfile.email;
      changedFields.team_lead_remark = { from: existing.team_lead_remark, to: team_lead_remark };
      remarkUpdated = true;
    }

    if (Object.keys(allowedUpdates).length <= 2) {
      // Only timestamp fields — nothing real changed
      return existing as Escalation;
    }

    const { data, error } = await supabase.from('escalations').update(allowedUpdates).eq('id', id).select().single();
    if (error) throw new Error(error.message);
    const updated = data as Escalation;

    // Log
    const notes = Object.keys(changedFields).map(f => `${f} updated`).join(', ');
    const action = remarkUpdated && Object.keys(changedFields).length === 1 ? 'remark_updated' : 'updated';
    await insertLog(id, action, userProfile.email, actorName, notes || 'Record updated', changedFields);

    // Notify agent when TL updates remark
    if (remarkUpdated) {
      await sendNotification(id, [existing.kam_email], 'remark_updated',
        `Team Lead added a remark on your escalation for ${existing.brand_name}: "${team_lead_remark}"`);
    }

    return updated;
  },

  async closeEscalation({ id, close_reason, userProfile }: CloseEscalationParams): Promise<Escalation> {
    const supabase = getSupabaseAdmin();
    const actorName = userProfile.fullName || userProfile.full_name || userProfile.email;

    const { data: existing, error: fetchErr } = await supabase
      .from('escalations').select('*').eq('id', id).single();
    if (fetchErr || !existing) throw new Error('Escalation not found');
    if (existing.status === 'closed') throw new Error('Escalation is already closed');
    if (!close_reason?.trim()) throw new Error('Close reason is required');

    const role = (userProfile.role || '').toLowerCase().replace(/\s+/g, '_');
    if (role === 'agent' || role === 'sub_agent') {
      // Can close if: they raised it, they are the KAM, or they currently own the brand
      let canClose =
        existing.raised_by === userProfile.email ||
        existing.kam_email === userProfile.email;
      if (!canClose && existing.brand_id) {
        const { data: owned } = await supabase.from('master_data').select('id')
          .eq('id', existing.brand_id).eq('kam_email_id', userProfile.email).maybeSingle();
        canClose = !!owned;
      }
      if (!canClose) throw new Error('Not authorized to close this escalation');
    }

    const resolutionDays = calcResolutionDays(existing.created_at);
    const now = new Date().toISOString();

    const { data, error } = await supabase.from('escalations').update({
      status: 'closed',
      close_reason: close_reason.trim(),
      closed_at: now,
      closed_by: userProfile.email,
      resolution_days: resolutionDays,
      updated_at: now,
    }).eq('id', id).select().single();
    if (error) throw new Error(error.message);
    const closed = data as Escalation;

    // Log
    const daysLabel = resolutionDays === 0 ? 'same day' : `${resolutionDays}d`;
    await insertLog(id, 'closed', userProfile.email, actorName,
      `Closed by ${actorName} in ${daysLabel}. Reason: ${close_reason}`);

    // Notify team lead
    if (existing.team_name) {
      const tlEmails = await getTeamLeadEmails(existing.team_name);
      await sendNotification(id, tlEmails, 'closed',
        `Escalation for ${existing.brand_name} was closed by ${actorName} in ${daysLabel}. Reason: ${close_reason}`);
    }

    return closed;
  },

  async getNotifications(recipientEmail: string, unreadOnly = false): Promise<EscalationNotification[]> {
    let query = getSupabaseAdmin()
      .from('escalation_notifications')
      .select('*')
      .eq('recipient_email', recipientEmail)
      .order('created_at', { ascending: false })
      .limit(50);
    if (unreadOnly) query = query.eq('is_read', false);
    const { data, error } = await query;
    if (error) throw new Error(error.message);
    return (data || []) as EscalationNotification[];
  },

  async markNotificationsRead(recipientEmail: string, ids?: string[]): Promise<void> {
    let query = getSupabaseAdmin()
      .from('escalation_notifications')
      .update({ is_read: true })
      .eq('recipient_email', recipientEmail);
    if (ids?.length) query = query.in('id', ids);
    await query;
  },

  async getEscalationsByBrand(brand_name: string) {
    const { data, error } = await getSupabaseAdmin()
      .from('escalations').select('*').eq('brand_name', brand_name)
      .order('created_at', { ascending: false });
    if (error) throw new Error(error.message);
    return data as Escalation[];
  },
};
