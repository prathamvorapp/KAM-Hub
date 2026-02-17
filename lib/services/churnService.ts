/**
 * Churn Service - Supabase Implementation
 * Replaces Convex churn functions
 */

import { supabase, getSupabaseAdmin } from '../supabase-client';
import { 
  ACTIVE_FOLLOW_UP_REASONS, 
  COMPLETED_CHURN_REASONS,
  getControlledStatus as getControlledStatusHelper,
  isNoAgentResponse,
  isCompletedReason
} from '../constants/churnReasons';

// User profile type
interface UserProfile {
  email: string;
  full_name: string;
  role: string;
  team_name?: string;
  is_active: boolean;
}

// Churn record type
interface ChurnRecord {
  rid: string;
  kam: string;
  restaurant_name: string;
  churn_reason?: string;
  churn_date?: string;
  follow_up_date?: string;
  status?: string;
  [key: string]: any; // Allow other properties
}

// Safe date parser
function safeParseDate(dateStr: string): Date | null {
  if (!dateStr || typeof dateStr !== 'string') return null;
  const cleanDate = dateStr.trim();
  if (!cleanDate) return null;

  const parts = cleanDate.split(/[-/.]/);
  if (parts.length === 3) {
    try {
      const day = parts[0].padStart(2, '0');
      const month = parts[1].length === 3 ? parts[1] : parts[1].padStart(2, '0');
      const year = parts[2].length === 2 ? `20${parts[2]}` : parts[2];
      const testDate = new Date(`${year}-${month}-${day}`);
      if (!isNaN(testDate.getTime())) return testDate;
    } catch (e) {}
  }

  try {
    const fallback = new Date(cleanDate);
    return isNaN(fallback.getTime()) ? null : fallback;
  } catch (e) {
    return null;
  }
}

export const churnService = {
  // Get churn data with role-based filtering and pagination
  async getChurnData(params: {
    email?: string;
    page?: number;
    limit?: number;
    search?: string;
    filter?: 'all' | 'newCount' | 'overdue' | 'followUps' | 'completed';
  }) {
    const { email, page = 1, limit = 100, search, filter = 'all' } = params;
    
    let userProfile: UserProfile | null = null;
    let kamFilter: string[] | null = null;
    
    if (email) {
      console.log(`🔍 Querying user profile for email: ${email}`);
      const { data: profile, error: profileError } = await getSupabaseAdmin()
        .from('user_profiles')
        .select('*')
        .eq('email', email)
        .single() as { data: UserProfile | null; error: any };
      
      if (profileError) {
        console.error(`❌ Error fetching user profile:`, profileError);
      }
      
      userProfile = profile;
      
      console.log(`🔍 User Profile for ${email}:`, profile);
      
      if (profile) {
        // Normalize role for comparison
        const normalizedRole = profile.role?.toLowerCase().replace(/\s+/g, '_');
        console.log(`🔍 Normalized role: ${normalizedRole}`);
        
        if (normalizedRole === 'agent') {
          kamFilter = [profile.full_name];
          console.log(`👤 Agent filter - showing records for KAM: ${profile.full_name}`);
        } else if (normalizedRole === 'team_lead' || normalizedRole === 'teamlead') {
          if (profile.team_name) {
            const { data: teamMembers } = await getSupabaseAdmin()
              .from('user_profiles')
              .select('full_name')
              .eq('team_name', profile.team_name)
              .eq('is_active', true) as { data: Array<{ full_name: string }> | null; error: any };
            kamFilter = teamMembers?.map(m => m.full_name) || [];
            console.log(`👥 Team Lead filter - showing records for team ${profile.team_name}:`, kamFilter);
          } else {
            console.log(`⚠️ Team Lead has no team_name, showing no records`);
            kamFilter = [];
          }
        } else if (normalizedRole === 'admin') {
          console.log(`👑 Admin - showing all records`);
          kamFilter = null; // Admin sees all
        } else {
          console.log(`⚠️ Unknown role: ${profile.role}, treating as no filter`);
        }
      } else {
        console.error(`❌ No user profile found for email: ${email}`);
      }
    }
    
    let query = getSupabaseAdmin().from('churn_records').select('*', { count: 'exact' });
    
    if (kamFilter && kamFilter.length > 0) {
      console.log(`🔒 Applying KAM filter:`, kamFilter);
      query = query.in('kam', kamFilter);
    } else {
      console.log(`🔓 No KAM filter applied - showing all records`);
    }
    
    const { data: allRecords, count } = await query as { data: ChurnRecord[] | null; count: number | null };
    console.log(`📊 Query returned ${allRecords?.length || 0} records`);
    
    // Log first few records to see KAM names
    if (allRecords && allRecords.length > 0) {
      console.log(`📋 Sample records (first 3):`, allRecords.slice(0, 3).map(r => ({ rid: r.rid, kam: r.kam, restaurant: r.restaurant_name })));
    }
    
    let records = allRecords || [];
    
    // AUTO-FIX: Update any records that have completed reasons but wrong status
    console.log(`🔧 Auto-fixing records with incorrect statuses...`);
    let autoFixedCount = 0;
    const fixPromises = [];
    
    for (const record of records) {
      const churnReason = record.churn_reason?.trim() || "";
      const callAttempts = record.call_attempts || [];
      const shouldBeCompleted = isCompletedReason(churnReason) || callAttempts.length >= 3;
      
      if (shouldBeCompleted && record.follow_up_status !== "COMPLETED") {
        console.log(`   🔧 Auto-fixing RID ${record.rid}: "${churnReason}" → COMPLETED`);
        
        // Queue the fix (don't await yet for better performance)
        const fixPromise = (getSupabaseAdmin()
          .from('churn_records') as any)
          .update({
            follow_up_status: "COMPLETED",
            is_follow_up_active: false,
            next_reminder_time: null,
            follow_up_completed_at: record.follow_up_completed_at || new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('rid', record.rid)
          .then(() => {
            // Update the in-memory record too
            record.follow_up_status = "COMPLETED";
            record.is_follow_up_active = false;
            record.next_reminder_time = null;
          });
        
        fixPromises.push(fixPromise);
        autoFixedCount++;
      }
    }
    
    // Wait for all fixes to complete
    if (fixPromises.length > 0) {
      await Promise.all(fixPromises);
      console.log(`✅ Auto-fixed ${autoFixedCount} records`);
    }
    
    // Calculate categorization
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Set to start of day for fair comparison
    const threeDaysAgo = new Date(today.getTime() - (3 * 24 * 60 * 60 * 1000));
    
    console.log(`📅 Today: ${today.toISOString()}, Three days ago: ${threeDaysAgo.toISOString()}`);
    
    const categorization = records.reduce((acc, record) => {
      const recordDate = safeParseDate(record.date);
      if (!recordDate) return acc;
      
      const churnReason = record.churn_reason?.trim() || "";
      
      // PRIORITY 1: Check if completed (using centralized helper + status check)
      // A record is completed if:
      // 1. Has a completed churn reason (from the 7 completed reasons list), OR
      // 2. Has follow_up_status === "COMPLETED", OR
      // 3. Has 3 or more call attempts
      const hasCompletedReason = isCompletedReason(churnReason);
      const hasCompletedStatus = record.follow_up_status === "COMPLETED";
      const hasThreeCalls = record.call_attempts && record.call_attempts.length >= 3;
      const completed = hasCompletedReason || hasCompletedStatus || hasThreeCalls;
      
      // Log for debugging (first 10 records)
      if (acc.newCount + acc.overdue + acc.followUps + acc.completed < 10) {
        console.log(`📋 RID ${record.rid}: reason="${churnReason}", hasCompletedReason=${hasCompletedReason}, hasCompletedStatus=${hasCompletedStatus}, hasThreeCalls=${hasThreeCalls}, completed=${completed}`);
      }
      
      if (completed) {
        acc.completed++;
        return acc;
      }
      
      // PRIORITY 2: Check if in follow-up state
      // A record is in follow-up if:
      // 1. Has call attempts (agent has taken action), OR
      // 2. Has active follow-up status, OR
      // 3. Has a real churn reason (not "I don't know" or "KAM needs to respond")
      const hasCallAttempts = record.call_attempts && record.call_attempts.length > 0;
      const hasActiveFollowUp = record.follow_up_status === "ACTIVE" || 
                               record.is_follow_up_active ||
                               (record.follow_up_status === "INACTIVE" && record.next_reminder_time);
      
      // Check if no agent response (using centralized helper)
      const noResponse = isNoAgentResponse(churnReason);
      const hasRealChurnReason = !noResponse && churnReason !== "";
      
      if (hasCallAttempts || hasActiveFollowUp || hasRealChurnReason) {
        acc.followUps++;
        return acc;
      }
      
      // PRIORITY 3: Categorize as new or overdue based on date
      // Only records with no agent response reach here
      if (noResponse) {
        if (recordDate >= threeDaysAgo) {
          acc.newCount++;
        } else {
          acc.overdue++;
        }
      }
      
      return acc;
    }, { newCount: 0, overdue: 0, followUps: 0, completed: 0 });
    
    // Apply category filter BEFORE search
    if (filter && filter !== 'all') {
      console.log(`🔍 Applying category filter: ${filter}`);
      console.log(`📅 Three days ago threshold: ${threeDaysAgo.toISOString()}`);
      console.log(`📅 Today: ${today.toISOString()}`);
      
      records = records.filter(record => {
        const recordDate = safeParseDate(record.date);
        if (!recordDate) {
          console.log(`❌ Record ${record.rid}: Invalid date ${record.date}`);
          return false;
        }
        
        const churnReason = record.churn_reason?.trim() || "";
        
        // PRIORITY 1: Check if record is completed (same logic as categorization)
        const hasCompletedReason = isCompletedReason(churnReason);
        const hasCompletedStatus = record.follow_up_status === "COMPLETED";
        const hasThreeCalls = record.call_attempts && record.call_attempts.length >= 3;
        const completed = hasCompletedReason || hasCompletedStatus || hasThreeCalls;
        
        if (filter === 'completed') {
          return completed;
        }
        
        // For other filters, exclude completed records first
        if (completed) {
          return false;
        }
        
        // PRIORITY 2: Check if record has agent action (follow-ups)
        const hasCallAttempts = record.call_attempts && record.call_attempts.length > 0;
        const hasActiveFollowUp = record.follow_up_status === "ACTIVE" || 
                                 record.is_follow_up_active ||
                                 (record.follow_up_status === "INACTIVE" && record.next_reminder_time);
        const noResponse = isNoAgentResponse(churnReason);
        const hasRealChurnReason = !noResponse && churnReason !== "";
        const hasAgentAction = hasCallAttempts || hasActiveFollowUp || hasRealChurnReason;
        
        if (filter === 'followUps') {
          return hasAgentAction;
        }
        
        // For newCount and overdue, exclude records with agent action
        if (hasAgentAction) {
          return false;
        }
        
        // PRIORITY 3: Categorize by date (only for records with no agent action)
        if (filter === 'newCount') {
          const isNew = noResponse && recordDate >= threeDaysAgo;
          if (record.rid === '139244' || record.rid === '363995') {
            console.log(`🔍 Record ${record.rid} (${record.date}): noResponse=${noResponse}, recordDate=${recordDate.toISOString()}, hasAgentAction=${hasAgentAction}, isNew=${isNew}`);
          }
          return isNew;
        }
        
        if (filter === 'overdue') {
          const isOverdue = noResponse && recordDate < threeDaysAgo;
          if (record.rid === '139244' || record.rid === '363995') {
            console.log(`🔍 Record ${record.rid} (${record.date}): noResponse=${noResponse}, recordDate=${recordDate.toISOString()}, hasAgentAction=${hasAgentAction}, isOverdue=${isOverdue}`);
          }
          return isOverdue;
        }
        
        return false;
      });
      
      console.log(`📊 After ${filter} filter: ${records.length} records`);
    }
    
    // Apply search filter
    if (search) {
      const searchTerm = search.toLowerCase();
      records = records.filter(record => 
        record.rid.toLowerCase().includes(searchTerm) ||
        record.restaurant_name.toLowerCase().includes(searchTerm) ||
        record.kam.toLowerCase().includes(searchTerm) ||
        (record.churn_reason && record.churn_reason.toLowerCase().includes(searchTerm)) ||
        record.zone.toLowerCase().includes(searchTerm) ||
        record.owner_email.toLowerCase().includes(searchTerm)
      );
    }
    
    // Sort by date
    records.sort((a, b) => {
      const dateA = safeParseDate(a.date);
      const dateB = safeParseDate(b.date);
      if (!dateA && !dateB) return 0;
      if (!dateA) return 1;
      if (!dateB) return -1;
      return dateB.getTime() - dateA.getTime();
    });
    
    const total = records.length;
    const startIndex = (page - 1) * limit;
    const paginatedRecords = records.slice(startIndex, startIndex + limit);
    
    return {
      data: paginatedRecords,
      total,
      missing_churn_reasons: categorization.newCount + categorization.overdue,
      categorization,
      page,
      limit,
      total_pages: Math.ceil(total / limit),
      has_next: page < Math.ceil(total / limit),
      has_prev: page > 1,
      user_role: userProfile?.role || null,
      kam_filter: kamFilter
    };
  },

  // Update churn reason
  async updateChurnReason(params: {
    rid: string;
    churn_reason: string;
    remarks?: string;
    mail_sent_confirmation?: boolean;
    email?: string;
  }) {
    const { rid, churn_reason, remarks, mail_sent_confirmation } = params;
    
    const { data: record } = await getSupabaseAdmin()
      .from('churn_records')
      .select('*')
      .eq('rid', rid)
      .single() as { data: ChurnRecord | null; error: any };
    
    if (!record) {
      throw new Error(`Record with RID ${rid} not found`);
    }
    
    const currentDateTime = new Date().toISOString();
    const controlledStatus = getControlledStatusHelper(churn_reason);
    
    const shouldActivateFollowUp = ACTIVE_FOLLOW_UP_REASONS.includes(churn_reason as any);
    const shouldCompleteFollowUp = isCompletedReason(churn_reason);
    
    let followUpStatus = "INACTIVE";
    let isFollowUpActive = false;
    let followUpCompletedAt = record.follow_up_completed_at;
    
    if (shouldActivateFollowUp) {
      followUpStatus = "ACTIVE";
      isFollowUpActive = true;
    } else if (shouldCompleteFollowUp) {
      followUpStatus = "COMPLETED";
      isFollowUpActive = false;
      followUpCompletedAt = currentDateTime;
    }
    
    const updateData: any = {
      churn_reason,
      controlled_status: controlledStatus,
      remarks: remarks || record.remarks,
      mail_sent_confirmation: mail_sent_confirmation ?? record.mail_sent_confirmation,
      date_time_filled: currentDateTime,
      updated_at: currentDateTime,
      follow_up_status: followUpStatus,
      is_follow_up_active: isFollowUpActive,
      current_call: shouldActivateFollowUp ? (record.current_call || 1) : record.current_call,
      mail_sent: mail_sent_confirmation ?? record.mail_sent ?? false,
      follow_up_completed_at: followUpCompletedAt,
    };
    
    if (shouldActivateFollowUp && !record.is_follow_up_active) {
      const nextReminder = new Date();
      nextReminder.setHours(nextReminder.getHours() + 24);
      updateData.next_reminder_time = nextReminder.toISOString();
    } else if (shouldCompleteFollowUp) {
      updateData.next_reminder_time = null;
    }
    
    await (getSupabaseAdmin()
      .from('churn_records') as any)
      .update(updateData)
      .eq('rid', rid);
    
    return {
      success: true,
      message: `Churn reason updated for RID ${rid}`,
      rid,
      churn_reason,
      controlled_status: controlledStatus,
      follow_up_activated: shouldActivateFollowUp,
    };
  },

  // Create churn record
  async createChurnRecord(data: any) {
    const currentDateTime = new Date().toISOString();
    const controlledStatus = data.churn_reason ? getControlledStatusHelper(data.churn_reason) : "Unknown";
    
    const { error } = await getSupabaseAdmin()
      .from('churn_records')
      .insert({
        ...data,
        controlled_status: controlledStatus,
        created_at: currentDateTime,
        updated_at: currentDateTime,
      });
    
    if (error) throw error;
    return { success: true };
  },

  // Get churn statistics
  async getChurnStatistics(email?: string) {
    let kamFilter: string[] | null = null;
    
    if (email) {
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('email', email)
        .single() as { data: UserProfile | null; error: any };
      
      if (profile) {
        if (profile.role === 'Agent' || profile.role === 'agent') {
          kamFilter = [profile.full_name];
        } else if (profile.role === 'Team Lead' || profile.role === 'team_lead') {
          if (profile.team_name) {
            const { data: teamMembers } = await supabase
              .from('user_profiles')
              .select('full_name')
              .eq('team_name', profile.team_name)
              .eq('is_active', true) as { data: Array<{ full_name: string }> | null; error: any };
            kamFilter = teamMembers?.map(m => m.full_name) || [];
          }
        }
      }
    }
    
    let query = getSupabaseAdmin().from('churn_records').select('*');
    if (kamFilter && kamFilter.length > 0) {
      query = query.in('kam', kamFilter);
    }
    
    const { data: records } = await query as { data: ChurnRecord[] | null; error: any };
    const totalRecords = records?.length || 0;
    
    let missingChurnReasons = 0;
    let activeFollowUps = 0;
    let completedFollowUps = 0;
    const churnReasonCounts: Record<string, number> = {};
    
    records?.forEach(record => {
      if (!record.churn_reason || record.churn_reason.trim() === "") {
        missingChurnReasons++;
      }
      if (record.is_follow_up_active) activeFollowUps++;
      if (record.follow_up_status === "COMPLETED") completedFollowUps++;
      
      const reason = record.churn_reason || "Not Specified";
      churnReasonCounts[reason] = (churnReasonCounts[reason] || 0) + 1;
    });
    
    const completedChurnReasons = totalRecords - missingChurnReasons;
    
    return {
      total_records: totalRecords,
      missing_churn_reasons: missingChurnReasons,
      completed_churn_reasons: completedChurnReasons,
      completion_percentage: totalRecords > 0 ? Math.round((completedChurnReasons / totalRecords) * 100) : 0,
      active_follow_ups: activeFollowUps,
      completed_follow_ups: completedFollowUps,
      churn_reason_breakdown: churnReasonCounts,
    };
  },

  // Get follow-up status
  async getFollowUpStatus(rid: string, email?: string) {
    const { data: record } = await getSupabaseAdmin()
      .from('churn_records')
      .select('*')
      .eq('rid', rid)
      .single() as { data: ChurnRecord | null; error: any };
    
    if (!record) {
      return {
        success: true,
        rid,
        is_active: false,
        current_call: 1,
        call_attempts: [],
        mail_sent: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
    }
    
    // Role-based access check
    if (email) {
      const { data: userProfile } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('email', email)
        .single() as { data: UserProfile | null; error: any };
      
      if (userProfile) {
        let hasAccess = false;
        
        if (userProfile.role === 'Admin' || userProfile.role === 'admin') {
          hasAccess = true;
        } else if (userProfile.role === 'Team Lead' || userProfile.role === 'team_lead') {
          if (userProfile.team_name) {
            const { data: teamMembers } = await supabase
              .from('user_profiles')
              .select('full_name')
              .eq('team_name', userProfile.team_name)
              .eq('is_active', true) as { data: Array<{ full_name: string }> | null; error: any };
            const teamKams = teamMembers?.map(m => m.full_name) || [];
            hasAccess = teamKams.includes(record.kam);
          }
        } else if (userProfile.role === 'Agent' || userProfile.role === 'agent') {
          hasAccess = record.kam === userProfile.full_name;
        }
        
        if (!hasAccess) {
          throw new Error(`Access denied: User ${email} cannot access RID ${rid}`);
        }
      }
    }
    
    const currentTime = new Date().toISOString();
    let dynamicIsActive = record.is_follow_up_active || false;
    let dynamicFollowUpStatus = record.follow_up_status || "INACTIVE";
    
    if (record.follow_up_status === "INACTIVE" && record.next_reminder_time) {
      if (record.next_reminder_time <= currentTime) {
        dynamicIsActive = true;
        dynamicFollowUpStatus = "ACTIVE";
      }
    }
    
    return {
      success: true,
      rid: record.rid,
      is_active: dynamicIsActive,
      current_call: record.current_call || 1,
      call_attempts: record.call_attempts || [],
      mail_sent: record.mail_sent || false,
      next_reminder_time: record.next_reminder_time,
      follow_up_status: dynamicFollowUpStatus,
      created_at: record.created_at,
      updated_at: record.updated_at,
    };
  },

  // Record call attempt
  async recordCallAttempt(params: {
    rid: string;
    call_response: string;
    notes?: string;
    churn_reason: string;
    email?: string;
  }) {
    const { rid, call_response, notes, churn_reason, email } = params;
    
    const { data: record } = await getSupabaseAdmin()
      .from('churn_records')
      .select('*')
      .eq('rid', rid)
      .single() as { data: ChurnRecord | null; error: any };
    
    if (!record) {
      throw new Error(`Churn record with RID ${rid} not found`);
    }
    
    // Role-based access check (same as getFollowUpStatus)
    if (email) {
      const { data: userProfile } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('email', email)
        .single() as { data: UserProfile | null; error: any };
      
      if (userProfile) {
        let hasAccess = false;
        
        if (userProfile.role === 'Admin' || userProfile.role === 'admin') {
          hasAccess = true;
        } else if (userProfile.role === 'Team Lead' || userProfile.role === 'team_lead') {
          if (userProfile.team_name) {
            const { data: teamMembers } = await supabase
              .from('user_profiles')
              .select('full_name')
              .eq('team_name', userProfile.team_name)
              .eq('is_active', true) as { data: Array<{ full_name: string }> | null; error: any };
            const teamKams = teamMembers?.map(m => m.full_name) || [];
            hasAccess = teamKams.includes(record.kam);
          }
        } else if (userProfile.role === 'Agent' || userProfile.role === 'agent') {
          hasAccess = record.kam === userProfile.full_name;
        }
        
        if (!hasAccess) {
          throw new Error(`Access denied: User ${email} cannot record call attempt for RID ${rid}`);
        }
      }
    }
    
    const currentDateTime = new Date().toISOString();
    const callNumber = record.current_call || 1;
    
    const newCallAttempt = {
      call_number: callNumber,
      timestamp: currentDateTime,
      call_response,
      notes: notes || "",
      churn_reason,
    };
    
    const existingAttempts = record.call_attempts || [];
    const updatedAttempts = [...existingAttempts, newCallAttempt];
    
    const nextCall = callNumber + 1;
    const isConnected = call_response === "Connected";
    const hasCompletedReason = isCompletedReason(churn_reason); // Check if churn reason is completed
    const hasMoreCalls = nextCall <= 4;
    const hasCompletedThreeCalls = callNumber >= 3; // After 3rd call, auto-complete
    
    console.log(`🔍 Call Attempt Logic for RID ${rid}:`);
    console.log(`   Call Number: ${callNumber}`);
    console.log(`   Call Response: ${call_response}`);
    console.log(`   Churn Reason: "${churn_reason}"`);
    console.log(`   Is Connected: ${isConnected}`);
    console.log(`   Has Completed Reason: ${hasCompletedReason}`);
    console.log(`   Has More Calls: ${hasMoreCalls}`);
    console.log(`   Has Completed 3 Calls: ${hasCompletedThreeCalls}`);
    
    // Should continue follow-up if:
    // - Not connected OR connected but no completed reason
    // - Has more calls available
    // - Hasn't completed 3 calls yet
    const shouldContinueFollowUp = (!isConnected || (isConnected && !hasCompletedReason)) && hasMoreCalls && !hasCompletedThreeCalls;
    
    console.log(`   Should Continue Follow-Up: ${shouldContinueFollowUp}`);
    
    let nextReminderTime: string | null = null;
    if (shouldContinueFollowUp) {
      const nextReminder = new Date();
      nextReminder.setHours(nextReminder.getHours() + 24);
      nextReminderTime = nextReminder.toISOString();
    }
    
    // Mark as COMPLETED if:
    // - Connected AND has completed reason, OR
    // - Completed 3 calls
    let followUpStatus = "COMPLETED";
    let isFollowUpActive = false;
    
    if (shouldContinueFollowUp) {
      followUpStatus = "INACTIVE";
      isFollowUpActive = false;
    }
    
    console.log(`   Final Follow-Up Status: ${followUpStatus}`);
    console.log(`   Final Is Active: ${isFollowUpActive}`);
    console.log(`   Final Next Reminder: ${nextReminderTime}`);
    
    // Determine controlled status for the churn reason
    const controlledStatus = churn_reason ? getControlledStatusHelper(churn_reason) : record.controlled_status;
    
    await (getSupabaseAdmin()
      .from('churn_records') as any)
      .update({
        call_attempts: updatedAttempts,
        current_call: nextCall,
        is_follow_up_active: isFollowUpActive,
        follow_up_status: followUpStatus,
        next_reminder_time: nextReminderTime,
        follow_up_completed_at: followUpStatus === "COMPLETED" ? currentDateTime : record.follow_up_completed_at,
        churn_reason: churn_reason || record.churn_reason, // Update churn reason if provided
        controlled_status: controlledStatus, // Update controlled status based on churn reason
        date_time_filled: churn_reason ? currentDateTime : record.date_time_filled, // Update timestamp if churn reason changed
        updated_at: currentDateTime,
      })
      .eq('rid', rid);
    
    return {
      success: true,
      message: `Call attempt ${callNumber} recorded`,
      call_number: callNumber,
      next_call: nextCall,
      is_active: isFollowUpActive,
      follow_up_status: followUpStatus,
      next_reminder_time: nextReminderTime,
    };
  },

  // Get active follow-ups
  async getActiveFollowUps(kam?: string, email?: string) {
    let kamFilter: string[] | null = null;
    
    if (email) {
      console.log(`🔍 [getActiveFollowUps] Fetching profile for email: ${email}`);
      
      const { data: userProfile, error: profileError } = await getSupabaseAdmin()
        .from('user_profiles')
        .select('*')
        .eq('email', email)
        .single() as { data: UserProfile | null; error: any };
      
      if (profileError) {
        console.error(`❌ [getActiveFollowUps] Error fetching profile:`, profileError);
      }
      
      if (userProfile) {
        console.log(`👤 [getActiveFollowUps] User profile found:`, {
          email: userProfile.email,
          full_name: userProfile.full_name,
          role: userProfile.role,
          team_name: userProfile.team_name
        });
        
        const normalizedRole = userProfile.role.toLowerCase().replace(/[_\s]/g, '');
        
        if (normalizedRole === 'agent') {
          kamFilter = [userProfile.full_name];
          console.log(`🔒 [getActiveFollowUps] Agent filter applied - showing only records for: ${userProfile.full_name}`);
        } else if (normalizedRole === 'teamlead') {
          if (userProfile.team_name) {
            const { data: teamMembers } = await getSupabaseAdmin()
              .from('user_profiles')
              .select('full_name')
              .eq('team_name', userProfile.team_name)
              .eq('is_active', true) as { data: Array<{ full_name: string }> | null; error: any };
            kamFilter = teamMembers?.map(m => m.full_name) || [];
            console.log(`👥 [getActiveFollowUps] Team Lead filter applied - showing records for team members:`, kamFilter);
          }
        } else if (normalizedRole === 'admin') {
          console.log(`👑 [getActiveFollowUps] Admin - showing all records`);
          kamFilter = null;
        }
      } else {
        console.warn(`⚠️ [getActiveFollowUps] No user profile found for email: ${email}`);
      }
    }
    
    let query = getSupabaseAdmin()
      .from('churn_records')
      .select('*')
      .eq('follow_up_status', 'ACTIVE');
    
    if (kamFilter && kamFilter.length > 0) {
      console.log(`🔒 [getActiveFollowUps] Applying KAM filter:`, kamFilter);
      query = query.in('kam', kamFilter);
    } else if (kam) {
      console.log(`🔒 [getActiveFollowUps] Applying single KAM filter:`, kam);
      query = query.eq('kam', kam);
    } else {
      console.log(`🔓 [getActiveFollowUps] No KAM filter - showing all records`);
    }
    
    const { data: records, error: queryError } = await query as { data: ChurnRecord[] | null; error: any };
    
    if (queryError) {
      console.error(`❌ [getActiveFollowUps] Error querying records:`, queryError);
    }
    
    console.log(`📊 [getActiveFollowUps] Found ${records?.length || 0} active records`);
    
    return records?.map(record => ({
      rid: record.rid,
      restaurant_name: record.restaurant_name,
      kam: record.kam,
      churn_reason: record.churn_reason,
      current_call: record.current_call,
      next_reminder_time: record.next_reminder_time,
      call_attempts: record.call_attempts || [],
    })) || [];
  },

  // Get overdue follow-ups
  async getOverdueFollowUps(kam?: string, email?: string) {
    const currentTime = new Date().toISOString();
    
    let kamFilter: string[] | null = null;
    
    if (email) {
      console.log(`🔍 [getOverdueFollowUps] Fetching profile for email: ${email}`);
      
      const { data: userProfile, error: profileError } = await getSupabaseAdmin()
        .from('user_profiles')
        .select('*')
        .eq('email', email)
        .single() as { data: UserProfile | null; error: any };
      
      if (profileError) {
        console.error(`❌ [getOverdueFollowUps] Error fetching profile:`, profileError);
      }
      
      if (userProfile) {
        console.log(`👤 [getOverdueFollowUps] User profile found:`, {
          email: userProfile.email,
          full_name: userProfile.full_name,
          role: userProfile.role,
          team_name: userProfile.team_name
        });
        
        const normalizedRole = userProfile.role.toLowerCase().replace(/[_\s]/g, '');
        
        if (normalizedRole === 'agent') {
          kamFilter = [userProfile.full_name];
          console.log(`🔒 [getOverdueFollowUps] Agent filter applied - showing only records for: ${userProfile.full_name}`);
        } else if (normalizedRole === 'teamlead') {
          if (userProfile.team_name) {
            const { data: teamMembers } = await getSupabaseAdmin()
              .from('user_profiles')
              .select('full_name')
              .eq('team_name', userProfile.team_name)
              .eq('is_active', true) as { data: Array<{ full_name: string }> | null; error: any };
            kamFilter = teamMembers?.map(m => m.full_name) || [];
            console.log(`👥 [getOverdueFollowUps] Team Lead filter applied - showing records for team members:`, kamFilter);
          }
        } else if (normalizedRole === 'admin') {
          console.log(`👑 [getOverdueFollowUps] Admin - showing all records`);
          kamFilter = null;
        }
      } else {
        console.warn(`⚠️ [getOverdueFollowUps] No user profile found for email: ${email}`);
      }
    }
    
    let query = getSupabaseAdmin()
      .from('churn_records')
      .select('*')
      .eq('follow_up_status', 'INACTIVE')
      .not('next_reminder_time', 'is', null)
      .lte('next_reminder_time', currentTime);
    
    if (kamFilter && kamFilter.length > 0) {
      console.log(`🔒 [getOverdueFollowUps] Applying KAM filter:`, kamFilter);
      query = query.in('kam', kamFilter);
    } else if (kam) {
      console.log(`🔒 [getOverdueFollowUps] Applying single KAM filter:`, kam);
      query = query.eq('kam', kam);
    } else {
      console.log(`🔓 [getOverdueFollowUps] No KAM filter - showing all records`);
    }
    
    const { data: records, error: queryError } = await query as { data: ChurnRecord[] | null; error: any };
    
    if (queryError) {
      console.error(`❌ [getOverdueFollowUps] Error querying records:`, queryError);
    }
    
    console.log(`📊 [getOverdueFollowUps] Found ${records?.length || 0} overdue records`);
    
    return records?.map(record => ({
      rid: record.rid,
      restaurant_name: record.restaurant_name,
      kam: record.kam,
      churn_reason: record.churn_reason,
      current_call: record.current_call,
      next_reminder_time: record.next_reminder_time,
      call_attempts: record.call_attempts || [],
    })) || [];
  },

  // Check existing RIDs (for CSV upload)
  async checkExistingChurnRIDs(rids: string[]): Promise<string[]> {
    if (!rids || rids.length === 0) return [];
    
    const { data: records } = await getSupabaseAdmin()
      .from('churn_records')
      .select('rid')
      .in('rid', rids) as { data: Array<{ rid: string }> | null; error: any };
    
    return records?.map(r => r.rid) || [];
  },

  // Bulk create churn records (for CSV upload)
  async bulkCreateChurnRecords(records: any[]): Promise<{ successful: number; failed: number; errors: any[] }> {
    if (!records || records.length === 0) {
      return { successful: 0, failed: 0, errors: [] };
    }

    const errors: any[] = [];
    let successful = 0;
    let failed = 0;

    // Insert in batches of 100 to avoid timeout
    const batchSize = 100;
    for (let i = 0; i < records.length; i += batchSize) {
      const batch = records.slice(i, i + batchSize);
      
      try {
        const { error } = await (getSupabaseAdmin()
          .from('churn_records') as any)
          .insert(batch);
        
        if (error) {
          failed += batch.length;
          errors.push({
            batch: `${i}-${i + batch.length}`,
            error: error.message
          });
        } else {
          successful += batch.length;
        }
      } catch (error: any) {
        failed += batch.length;
        errors.push({
          batch: `${i}-${i + batch.length}`,
          error: String(error)
        });
      }
    }

    return { successful, failed, errors };
  },
};
