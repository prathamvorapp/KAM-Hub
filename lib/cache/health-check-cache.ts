import NodeCache from 'node-cache';

// Centralized cache instances for health check routes
export const brandsCache = new NodeCache({ stdTTL: 300 }); // 5 minutes
export const progressCache = new NodeCache({ stdTTL: 300 }); // 5 minutes
export const statsCache = new NodeCache({ stdTTL: 600 }); // 10 minutes
export const agentStatsCache = new NodeCache({ stdTTL: 180 }); // 3 minutes - for agent statistics

// Visit statistics caches
export const adminStatsCache = new NodeCache({ stdTTL: 300 }); // 5 minutes - for admin visit statistics
export const teamStatsCache = new NodeCache({ stdTTL: 300 }); // 5 minutes - for team statistics

// Helper functions to clear caches
export function clearBrandsCache(email: string, month: string) {
  const cacheKey = `brands_for_assessment_${email}_${month}`;
  brandsCache.del(cacheKey);
  console.log(`🗑️ Cleared brands cache for ${email} - ${month}`);
}

export function clearAllBrandsCache() {
  brandsCache.flushAll();
  console.log(`🗑️ Cleared all brands cache`);
}

export function clearAllHealthCheckCaches() {
  brandsCache.flushAll();
  progressCache.flushAll();
  statsCache.flushAll();
  agentStatsCache.flushAll();
  adminStatsCache.flushAll();
  teamStatsCache.flushAll();
  console.log(`🗑️ Cleared all health check and statistics caches`);
}
