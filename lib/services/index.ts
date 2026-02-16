/**
 * Services Index
 * Central export point for all Supabase services
 */

export { churnService } from './churnService';
export { visitService } from './visitService';
export { demoService, PRODUCTS, DEMO_CONDUCTORS } from './demoService';
export { healthCheckService } from './healthCheckService';
export { momService } from './momService';
export { masterDataService } from './masterDataService';

// UserService is a class, export an instance
import { UserService } from './userService';
export const userService = new UserService();
export { UserService };
