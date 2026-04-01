/**
 * Services Index
 * Central export point for all Supabase services
 */

export { churnService } from './churnService';
export { visitService } from './visitService';
export { visitServiceEnhanced } from './visitServiceEnhanced';
export { demoService, PRODUCTS, DEMO_CONDUCTORS } from './demoService';
export { healthCheckService } from './healthCheckService';
export { momService } from './momService';
export { engagementCallService } from './engagementCallService';
export { masterDataService } from './masterDataService';
export { escalationService, ESCALATION_CLASSIFICATIONS, BRAND_NATURES, RESPONSIBLE_PARTIES } from './escalationService';
export { brandTransferService } from './brandTransferService';

// UserService is a class, export an instance
import { UserService } from './userService';
export const userService = new UserService();
export { UserService };
