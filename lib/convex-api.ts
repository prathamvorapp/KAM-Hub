// Convex API stub - Replace with actual Convex implementation when ready
// This file provides placeholder functions to prevent build errors

interface ConvexAPIResult<T = any> {
  success: boolean;
  data?: T;
  message?: string;
}

class ConvexAPI {
  async getFollowUpStatus(rid: string, churnReason?: string, email?: string): Promise<ConvexAPIResult> {
    console.warn('ConvexAPI.getFollowUpStatus called but not implemented');
    return {
      success: false,
      message: 'Convex API not configured. Please set up Convex backend.'
    };
  }

  async recordCallAttempt(params: {
    rid: string;
    call_response: string;
    notes?: string;
    churn_reason: string;
    email: string;
  }): Promise<ConvexAPIResult> {
    console.warn('ConvexAPI.recordCallAttempt called but not implemented');
    return {
      success: false,
      message: 'Convex API not configured. Please set up Convex backend.'
    };
  }

  async getChurnAnalytics(): Promise<any> {
    console.warn('ConvexAPI.getChurnAnalytics called but not implemented');
    return {
      overallStats: {
        totalRecords: 0,
        avgResponseTime: 0,
        recordsWithResponse: 0,
        recordsWithoutResponse: 0
      },
      agentStats: []
    };
  }

  async getAgentResponseTimeDetails(agentName: string): Promise<any> {
    console.warn('ConvexAPI.getAgentResponseTimeDetails called but not implemented');
    return {
      agentName,
      recordsWithResponse: 0,
      avgResponseTime: 0,
      records: []
    };
  }
}

export const convexAPI = new ConvexAPI();
