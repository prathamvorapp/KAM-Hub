// API wrapper for demos and other operations
import { convexAPI } from './convex-api';

// Re-export convex API functions with simpler names
export const api = {
  // Demo operations
  getDemosForAgent: convexAPI.getDemosForAgent,
  initializeBrandDemos: convexAPI.initializeBrandDemos,
  initializeBrandDemosFromMasterData: convexAPI.initializeBrandDemosFromMasterData,
  setProductApplicability: convexAPI.setProductApplicability,
  setUsageStatus: convexAPI.setUsageStatus,
  scheduleDemo: convexAPI.scheduleDemo,
  rescheduleDemo: convexAPI.rescheduleDemo,
  completeDemo: convexAPI.completeDemo,
  setConversionDecision: convexAPI.setConversionDecision,
  getDemoStatistics: convexAPI.getDemoStatistics,

  // Other existing operations
  getChurnData: convexAPI.getChurnData,
  updateChurnReason: convexAPI.updateChurnReason,
  authenticateUser: convexAPI.authenticateUser,
  getUserProfile: convexAPI.getUserProfile,
  getFollowUpStatus: convexAPI.getFollowUpStatus,
  recordCallAttempt: convexAPI.recordCallAttempt,
  getChurnStatistics: convexAPI.getChurnStatistics,
  getActiveFollowUps: convexAPI.getActiveFollowUps,
  getOverdueFollowUps: convexAPI.getOverdueFollowUps,
  getMasterData: convexAPI.getMasterData,
  getBrandsByAgentEmail: convexAPI.getBrandsByAgentEmail,
  getVisits: convexAPI.getVisits,
  createVisit: convexAPI.createVisit,
  updateVisitStatus: convexAPI.updateVisitStatus,
  submitMoM: convexAPI.submitMoM,
  approveVisit: convexAPI.approveVisit,
  getVisitStatistics: convexAPI.getVisitStatistics,
  getTeamVisitStatistics: convexAPI.getTeamVisitStatistics,
  
  // Password reset
  forgotPassword: convexAPI.forgotPassword,
};

export default api;