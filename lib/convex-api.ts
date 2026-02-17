/**
 * Convex API Replacement - Now uses API routes
 * This file maintains backward compatibility by calling API routes instead of services
 * Services should ONLY be called from API routes (server-side), not from client code
 */

export const convexAPI = {
  // User Profile
  getUserProfile: async (email: string) => {
    try {
      const response = await fetch(`/api/user/profile-by-email?email=${encodeURIComponent(email)}`, {
        credentials: 'include'
      });
      return await response.json();
    } catch (error) {
      console.error('Error getting user profile:', error);
      return { success: false, error: 'Failed to get user profile' };
    }
  },
  
  // Churn Analytics
  getChurnAnalytics: async (email: string) => {
    try {
      const response = await fetch(`/api/churn/analytics`, {
        credentials: 'include'
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.json();
    } catch (error) {
      console.error('Error getting churn analytics:', error);
      throw error;
    }
  },
  
  // Agent Response Time Details
  getAgentResponseTimeDetails: async (userEmail: string, agentName: string) => {
    try {
      const response = await fetch(`/api/churn?limit=10000`, {
        credentials: 'include'
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      
      const agentRecords = data.data.filter((r: any) => r.kam === agentName);
      const recordsWithResponse = agentRecords.filter((r: any) => r.churn_reason && r.churn_reason.trim() !== '').length;
      const recordsWithoutResponse = agentRecords.length - recordsWithResponse;
      
      return {
        agentName,
        totalRecords: agentRecords.length,
        recordsWithResponse,
        recordsWithoutResponse,
        completionPercentage: agentRecords.length > 0 
          ? Math.round((recordsWithResponse / agentRecords.length) * 100) 
          : 0,
        records: agentRecords
      };
    } catch (error) {
      console.error('Error getting agent response time details:', error);
      throw error;
    }
  },
  
  // Call Attempt
  recordCallAttempt: async (params: {
    rid: string;
    call_response: string;
    notes?: string;
    churn_reason: string;
    email?: string;
  }) => {
    try {
      const response = await fetch(`/api/follow-up/${params.rid}/attempt`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(params)
      });
      return await response.json();
    } catch (error) {
      console.error('Error recording call attempt:', error);
      return { success: false, error: 'Failed to record call attempt' };
    }
  },

  // Get Follow-Up Status
  getFollowUpStatus: async (rid: string, churnReason?: string, email?: string) => {
    try {
      const response = await fetch(`/api/follow-up/${rid}/status`, {
        credentials: 'include' // Ensure cookies are sent for authentication
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.json();
    } catch (error) {
      console.error('Error getting follow-up status:', error);
      return { success: false, error: 'Failed to get follow-up status' };
    }
  },
  
  // Churn Data
  getChurnData: async (params: { email: string; page?: number; limit?: number; search?: string; filter?: string }): Promise<any> => {
    try {
      const searchParams = new URLSearchParams({ 
        page: (params.page || 1).toString(), 
        limit: (params.limit || 100).toString() 
      });
      if (params.search) searchParams.append('search', params.search);
      if (params.filter) searchParams.append('filter', params.filter);
      
      // Email is passed via cookies/headers, not query params
      const response = await fetch(`/api/churn?${searchParams}`, {
        credentials: 'include' // Ensure cookies are sent
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.json();
    } catch (error) {
      console.error('Error getting churn data:', error);
      return { success: false, error: 'Failed to get churn data' };
    }
  },

  // Churn Statistics
  getChurnStatistics: async (email: string) => {
    try {
      const response = await fetch(`/api/churn/statistics`, {
        credentials: 'include' // Ensure cookies are sent
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.json();
    } catch (error) {
      console.error('Error getting churn statistics:', error);
      return { success: false, error: 'Failed to get churn statistics' };
    }
  },
  
  // Approvals (Visits pending approval)
  getApprovals: async (email: string) => {
    try {
      const response = await fetch(`/api/data/visits/statistics`, {
        credentials: 'include'
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      
      return {
        success: true,
        data: data.pending_approvals || [],
        total: data.pending_approvals?.length || 0
      };
    } catch (error) {
      console.error('Error getting approvals:', error);
      return { success: false, error: 'Failed to get approvals' };
    }
  },

  // Get visits
  getVisits: async (params: { email: string; search?: string; page?: number; limit?: number; paginationOpts?: { numItems?: number } }) => {
    try {
      const limit = params.paginationOpts?.numItems || params.limit || 1000;
      const searchParams = new URLSearchParams({
        limit: limit.toString()
      });
      if (params.search) searchParams.append('search', params.search);
      
      const response = await fetch(`/api/data/visits?${searchParams}`, {
        credentials: 'include' // Ensure cookies are sent for authentication
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.json();
    } catch (error) {
      console.error('Error getting visits:', error);
      return { success: false, error: 'Failed to get visits' };
    }
  },

  // Get visit statistics
  getVisitStatistics: async (email: string, bustCache = false) => {
    try {
      const url = `/api/data/visits/statistics?email=${encodeURIComponent(email)}${bustCache ? '&bustCache=true' : ''}`;
      const response = await fetch(url, {
        credentials: 'include'
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      return data.success ? data.data : data;
    } catch (error) {
      console.error('Error getting visit statistics:', error);
      return { success: false, error: 'Failed to get visit statistics' };
    }
  },

  // Create visit
  createVisit: async (visitData: any) => {
    try {
      const response = await fetch(`/api/data/visits/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(visitData)
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.json();
    } catch (error) {
      console.error('Error creating visit:', error);
      return { success: false, error: 'Failed to create visit' };
    }
  },

  // Get MOMs
  getMOM: async (params: { email: string; search?: string; page?: number; limit?: number }) => {
    try {
      const searchParams = new URLSearchParams({
        page: (params.page || 1).toString(),
        limit: (params.limit || 1000).toString()
      });
      if (params.search) searchParams.append('search', params.search);
      
      const response = await fetch(`/api/data/mom?${searchParams}`, {
        credentials: 'include'
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.json();
    } catch (error) {
      console.error('Error getting MOMs:', error);
      return { success: false, error: 'Failed to get MOMs' };
    }
  },

  // Get MOMs (alias)
  getMOMs: async (params: { email: string; search?: string; page?: number; limit?: number }) => {
    try {
      const searchParams = new URLSearchParams({
        page: (params.page || 1).toString(),
        limit: (params.limit || 1000).toString()
      });
      if (params.search) searchParams.append('search', params.search);
      
      const response = await fetch(`/api/data/mom?${searchParams}`, {
        credentials: 'include'
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.json();
    } catch (error) {
      console.error('Error getting MOMs:', error);
      return { success: false, error: 'Failed to get MOMs' };
    }
  },

  // Approve or reject a visit
  approveVisit: async (visitId: string, approverEmail: string, approvalStatus: string, rejectionRemarks?: string) => {
    try {
      const response = await fetch(`/api/data/visits/${visitId}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          approver_email: approverEmail,
          approval_status: approvalStatus,
          rejection_remarks: rejectionRemarks
        })
      });
      return await response.json();
    } catch (error) {
      console.error('Error approving visit:', error);
      return { success: false, error: 'Failed to approve visit' };
    }
  },

  // Update churn reason
  updateChurnReason: async (rid: string, churnReason: string, remarks?: string, mailSentConfirmation?: boolean, email?: string) => {
    try {
      const response = await fetch(`/api/churn/update-reason`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          rid,
          churn_reason: churnReason,
          remarks,
          mail_sent_confirmation: mailSentConfirmation
        })
      });
      return await response.json();
    } catch (error) {
      console.error('Error updating churn reason:', error);
      return { success: false, error: 'Failed to update churn reason' };
    }
  },

  // Update MOM open point status
  updateMOMOpenPointStatus: async (ticketId: string, pointIndex: number, status: string) => {
    try {
      const response = await fetch(`/api/data/mom/${ticketId}/open-points/${pointIndex}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ status })
      });
      return await response.json();
    } catch (error) {
      console.error('Error updating MOM open point status:', error);
      return { success: false, error: 'Failed to update open point status' };
    }
  },

  // Get master data (supports role-based filtering for Team Leads and Admins)
  getMasterData: async (email: string, page?: number, limit?: number, search?: string) => {
    try {
      const searchParams = new URLSearchParams({
        page: (page || 1).toString(),
        limit: (limit || 50).toString()
      });
      if (search) searchParams.append('search', search);
      
      const response = await fetch(`/api/data/master-data?${searchParams}`, {
        credentials: 'include' // Ensure cookies are sent for authentication
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.json();
    } catch (error) {
      console.error('Error getting master data:', error);
      return { success: false, error: 'Failed to get master data' };
    }
  },

  // Get brands by agent email
  getBrandsByAgentEmail: async (email: string, page?: number, limit?: number, search?: string) => {
    try {
      const searchParams = new URLSearchParams();
      if (search) searchParams.append('search', search);
      
      const queryString = searchParams.toString();
      const url = `/api/data/master-data/brands/${encodeURIComponent(email)}${queryString ? `?${queryString}` : ''}`;
      
      const response = await fetch(url, {
        credentials: 'include' // Ensure cookies are sent for authentication
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.json();
    } catch (error) {
      console.error('Error getting brands by agent email:', error);
      return { success: false, error: 'Failed to get brands' };
    }
  },

  // Get overdue follow-ups
  getOverdueFollowUps: async (kam?: string, email?: string) => {
    try {
      const response = await fetch(`/api/follow-up/reminders/overdue`, {
        credentials: 'include' // Ensure cookies are sent
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.json();
    } catch (error) {
      console.error('Error getting overdue follow-ups:', error);
      return { success: false, error: 'Failed to get overdue follow-ups' };
    }
  },

  // Get active follow-ups
  getActiveFollowUps: async (kam?: string, email?: string) => {
    try {
      const response = await fetch(`/api/follow-up/reminders/active`, {
        credentials: 'include' // Ensure cookies are sent
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.json();
    } catch (error) {
      console.error('Error getting active follow-ups:', error);
      return { success: false, error: 'Failed to get active follow-ups' };
    }
  },

  // Update visit status (Complete/Cancel/Pending)
  updateVisitStatus: async (visitId: string, status: 'Completed' | 'Cancelled' | 'Pending') => {
    try {
      const response = await fetch(`/api/data/visits/${visitId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ visit_status: status })
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.json();
    } catch (error) {
      console.error('Error updating visit status:', error);
      return { success: false, error: 'Failed to update visit status' };
    }
  },

  // Submit visit MOM
  submitVisitMOM: async (momData: any) => {
    try {
      const response = await fetch(`/api/data/visits/${momData.visit_id}/mom`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(momData)
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.json();
    } catch (error) {
      console.error('Error submitting visit MOM:', error);
      return { success: false, error: 'Failed to submit MOM' };
    }
  },

  // Submit MoM (update MOM shared status)
  submitMoM: async (params: { visit_id: string; mom_shared: string }) => {
    try {
      const response = await fetch(`/api/data/visits/${params.visit_id}/mom-status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ mom_shared: params.mom_shared })
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.json();
    } catch (error) {
      console.error('Error updating MOM status:', error);
      return { success: false, error: 'Failed to update MOM status' };
    }
  },

  // Resubmit MoM after rejection
  resubmitMoM: async (visitId: string, agentEmail: string) => {
    try {
      const response = await fetch(`/api/data/visits/${visitId}/resubmit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ agent_email: agentEmail })
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.json();
    } catch (error) {
      console.error('Error resubmitting MOM:', error);
      return { success: false, error: 'Failed to resubmit MOM' };
    }
  },

  // Reschedule visit
  rescheduleVisit: async (visitId: string, newDate: string, reason: string, rescheduledBy: string) => {
    try {
      const response = await fetch(`/api/data/visits/${visitId}/reschedule`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          new_scheduled_date: newDate,
          reason,
          rescheduled_by: rescheduledBy
        })
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.json();
    } catch (error) {
      console.error('Error rescheduling visit:', error);
      return { success: false, error: 'Failed to reschedule visit' };
    }
  },

  // Get team members
  getTeamMembers: async (teamName: string) => {
    try {
      const response = await fetch(`/api/user/team-members?team=${encodeURIComponent(teamName)}`, {
        credentials: 'include'
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.json();
    } catch (error) {
      console.error('Error getting team members:', error);
      return { success: false, error: 'Failed to get team members' };
    }
  },

  // Get all active agents
  getAllActiveAgents: async () => {
    try {
      const response = await fetch(`/api/user/agents`, {
        credentials: 'include'
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.json();
    } catch (error) {
      console.error('Error getting all active agents:', error);
      return { success: false, error: 'Failed to get agents' };
    }
  },

  // Schedule backdated visit
  scheduleBackdatedVisit: async (visitData: any) => {
    try {
      const response = await fetch(`/api/data/visits/backdated`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(visitData)
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.json();
    } catch (error) {
      console.error('Error scheduling backdated visit:', error);
      return { success: false, error: 'Failed to schedule backdated visit' };
    }
  },

  // Demo operations
  getDemosForAgent: async (agentId: string, role?: string, teamName?: string) => {
    try {
      const response = await fetch(`/api/data/demos`, {
        credentials: 'include'
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.json();
    } catch (error) {
      console.error('Error getting demos:', error);
      return { success: false, error: 'Failed to get demos' };
    }
  },

  initializeBrandDemos: async (brandEmailOrId: string) => {
    try {
      // This method now uses brandId since the service only supports initializeBrandDemosFromMasterData
      const response = await fetch(`/api/data/demos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ brandId: brandEmailOrId })
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.json();
    } catch (error) {
      console.error('Error initializing brand demos:', error);
      return { success: false, error: 'Failed to initialize brand demos' };
    }
  },

  initializeBrandDemosFromMasterData: async (brandId: string) => {
    try {
      const response = await fetch(`/api/data/demos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ brandId })
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.json();
    } catch (error) {
      console.error('Error initializing demos from master data:', error);
      return { success: false, error: 'Failed to initialize demos from master data' };
    }
  },

  setProductApplicability: async (demoId: string, isApplicable: boolean, nonApplicableReason?: string) => {
    try {
      const response = await fetch(`/api/data/demos/${demoId}/applicability`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ isApplicable, nonApplicableReason })
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.json();
    } catch (error) {
      console.error('Error setting product applicability:', error);
      return { success: false, error: 'Failed to set product applicability' };
    }
  },

  setUsageStatus: async (demoId: string, usageStatus: string) => {
    try {
      const response = await fetch(`/api/data/demos/${demoId}/usage-status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ usageStatus })
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.json();
    } catch (error) {
      console.error('Error setting usage status:', error);
      return { success: false, error: 'Failed to set usage status' };
    }
  },

  scheduleDemo: async (demoId: string, scheduledDate: string, scheduledTime: string, reason?: string) => {
    try {
      const response = await fetch(`/api/data/demos/${demoId}/schedule`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ scheduledDate, scheduledTime, reason, isReschedule: false })
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.json();
    } catch (error) {
      console.error('Error scheduling demo:', error);
      return { success: false, error: 'Failed to schedule demo' };
    }
  },

  rescheduleDemo: async (demoId: string, scheduledDate: string, scheduledTime: string, reason: string, userEmail?: string, userRole?: string) => {
    try {
      const response = await fetch(`/api/data/demos/${demoId}/schedule`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ scheduledDate, scheduledTime, reason, isReschedule: true })
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.json();
    } catch (error) {
      console.error('Error rescheduling demo:', error);
      return { success: false, error: 'Failed to reschedule demo' };
    }
  },

  completeDemo: async (demoId: string, conductedBy: string, completionNotes?: string) => {
    try {
      const response = await fetch(`/api/data/demos/${demoId}/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ conductedBy, completionNotes })
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.json();
    } catch (error) {
      console.error('Error completing demo:', error);
      return { success: false, error: 'Failed to complete demo' };
    }
  },

  setConversionDecision: async (demoId: string, conversionStatus: string, nonConversionReason?: string) => {
    try {
      const response = await fetch(`/api/data/demos/${demoId}/conversion`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ conversionStatus, nonConversionReason })
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.json();
    } catch (error) {
      console.error('Error setting conversion decision:', error);
      return { success: false, error: 'Failed to set conversion decision' };
    }
  },

  getDemoStatistics: async (agentId?: string, teamName?: string, role?: string) => {
    try {
      const response = await fetch(`/api/data/demos/statistics`, {
        credentials: 'include'
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.json();
    } catch (error) {
      console.error('Error getting demo statistics:', error);
      return { success: false, error: 'Failed to get demo statistics' };
    }
  },

  // Authentication
  authenticateUser: async (email: string, password: string) => {
    try {
      const response = await fetch(`/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, password })
      });
      return await response.json();
    } catch (error) {
      console.error('Error authenticating user:', error);
      return { success: false, error: 'Failed to authenticate' };
    }
  },

  // Password reset
  forgotPassword: async (email: string) => {
    try {
      const response = await fetch(`/api/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email })
      });
      return await response.json();
    } catch (error) {
      console.error('Error requesting password reset:', error);
      return { success: false, error: 'Failed to request password reset' };
    }
  },

  // Team visit statistics
  getTeamVisitStatistics: async (email: string) => {
    try {
      const response = await fetch(`/api/data/visits/team-statistics`, {
        credentials: 'include'
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.json();
    } catch (error) {
      console.error('Error getting team visit statistics:', error);
      return { success: false, error: 'Failed to get team visit statistics' };
    }
  }
};

// Export for backward compatibility
export default convexAPI;
