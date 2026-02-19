import NodeCache from 'node-cache';

// Shared cache instance for demo statistics
// TTL: 30 seconds (reduced for better real-time updates)
export const demoStatsCache = new NodeCache({ stdTTL: 30 });

export function clearDemoStatsCache(userEmail: string) {
  const cacheKey = `demo_stats_${userEmail}`;
  demoStatsCache.del(cacheKey);
  console.log(`🗑️ Cleared demo statistics cache for: ${userEmail}`);
}

export function getDemoStatsCacheKey(userEmail: string) {
  return `demo_stats_${userEmail}`;
}
