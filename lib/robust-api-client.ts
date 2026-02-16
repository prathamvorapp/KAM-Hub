// Robust API Client for all modules
// This provides a unified interface for all API calls with built-in error handling and retry logic

import { authHandler, ApiResponse } from './auth-error-handler';

interface StatisticsData {
  team_statistics?: any[];
  team_wise_breakdown?: any[];
  team_summary?: any;
  team_name?: string;
  team_lead?: string;
  agent_statistics?: any[];
  visit_statistics?: any;
  brand_statistics?: any[];
  mom_statistics?: any;
  health_check_statistics?: any;
  demo_statistics?: any;
  churn_statistics?: any;
  approval_statistics?: any;
}

class RobustApiClient {
  private static instance: RobustApiClient;

  private constructor() {}

  static getInstance(): RobustApiClient {
    if (!RobustApiClient.instance) {
      RobustApiClient.instance = new RobustApiClient();
    }
    return RobustApiClient.instance;
  }

  // ==================== AUTHENTICATION ENDPOINTS ====================

  // Login (unauthenticated)
  async login(email: string, password: string): Promise<ApiResponse<any>> {
    console.log('🔐 Logging in user:', email);
    return authHandler.login(email, password);
  }

  // ==================== STATISTICS ENDPOINTS ====================

  // Team Visit Statistics
  async getTeamVisitStatistics(email?: string): Promise<ApiResponse<StatisticsData>> {
    console.log('📊 Fetching team visit statistics...');
    return authHandler.get('/api/data/visits/team-statistics');
  }

  // Agent Visit Statistics
  async getAgentVisitStatistics(email?: string): Promise<ApiResponse<StatisticsData>> {
    console.log('📊 Fetching agent visit statistics...');
    const endpoint = email ? `/api/data/visits/agent-statistics?email=${encodeURIComponent(email)}` : '/api/data/visits/agent-statistics';
    return authHandler.get(endpoint);
  }

  // Individual Visit Statistics
  async getVisitStatistics(email?: string): Promise<ApiResponse<StatisticsData>> {
    console.log('📊 Fetching visit statistics...');
    const endpoint = email ? `/api/data/visits/statistics?email=${encodeURIComponent(email)}` : '/api/data/visits/statistics';
    return authHandler.get(endpoint);
  }

  // Brand Statistics
  async getBrandStatistics(email?: string): Promise<ApiResponse<StatisticsData>> {
    console.log('📊 Fetching brand statistics...');
    const endpoint = email ? `/api/data/brands/statistics?email=${encodeURIComponent(email)}` : '/api/data/brands/statistics';
    return authHandler.get(endpoint);
  }

  // MOM Statistics
  async getMomStatistics(email?: string): Promise<ApiResponse<StatisticsData>> {
    console.log('📊 Fetching MOM statistics...');
    const endpoint = email ? `/api/data/mom/statistics?email=${encodeURIComponent(email)}` : '/api/data/mom/statistics';
    return authHandler.get(endpoint);
  }

  // Health Check Statistics
  async getHealthCheckStatistics(email?: string): Promise<ApiResponse<StatisticsData>> {
    console.log('📊 Fetching health check statistics...');
    const endpoint = email ? `/api/data/health-check/statistics?email=${encodeURIComponent(email)}` : '/api/data/health-check/statistics';
    return authHandler.get(endpoint);
  }

  // Demo Statistics
  async getDemoStatistics(email?: string): Promise<ApiResponse<StatisticsData>> {
    console.log('📊 Fetching demo statistics...');
    const endpoint = email ? `/api/data/demos/statistics?email=${encodeURIComponent(email)}` : '/api/data/demos/statistics';
    return authHandler.get(endpoint);
  }

  // Churn Statistics
  async getChurnStatistics(email?: string): Promise<ApiResponse<StatisticsData>> {
    console.log('📊 Fetching churn statistics...');
    const endpoint = email ? `/api/data/churn/statistics?email=${encodeURIComponent(email)}` : '/api/data/churn/statistics';
    return authHandler.get(endpoint);
  }

  // Approval Statistics
  async getApprovalStatistics(email?: string): Promise<ApiResponse<StatisticsData>> {
    console.log('📊 Fetching approval statistics...');
    const endpoint = email ? `/api/data/approvals/statistics?email=${encodeURIComponent(email)}` : '/api/data/approvals/statistics';
    return authHandler.get(endpoint);
  }

  // ==================== UTILITY METHODS ====================

  // Check API health
  async checkHealth(): Promise<ApiResponse<any>> {
    console.log('🏥 Checking API health...');
    return authHandler.get('/api/health');
  }

  // Get user profile
  async getUserProfile(email?: string): Promise<ApiResponse<any>> {
    console.log('👤 Fetching user profile...');
    const endpoint = email ? `/api/auth/profile?email=${encodeURIComponent(email)}` : '/api/auth/profile';
    return authHandler.get(endpoint);
  }

  // Logout
  async logout(): Promise<ApiResponse<any>> {
    console.log('👋 Logging out...');
    const response = await authHandler.post('/api/auth/logout');
    
    // Clear local storage regardless of response
    authHandler.clearAuthTokens();
    
    return response;
  }
}

// Export singleton instance
export const apiClient = RobustApiClient.getInstance();

// Export types
export type { StatisticsData };