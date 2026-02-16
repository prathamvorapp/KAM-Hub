/**
 * Convex Client Stub
 * 
 * This file exists for backward compatibility.
 * All Convex functionality has been migrated to Supabase.
 * 
 * Please use the service files in lib/services/ instead:
 * - churnService
 * - visitService
 * - demoService
 * - healthCheckService
 * - momService
 * - masterDataService
 * - userService
 */

console.warn('Convex has been removed. Please use Supabase services instead.');

export const api = {
  health_checks: {},
  visits: {},
  moms: {},
  churn: {},
  demos: {},
  users: {},
  user_profiles: {},
  master_data: {}
};

export default api;
