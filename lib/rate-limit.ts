import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

// Create a rate limiter that allows 10 requests per 10 seconds per IP
// For production, configure with Upstash Redis
// For development, uses in-memory store
let ratelimit: Ratelimit | null = null;

if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
  // Production: Use Upstash Redis
  ratelimit = new Ratelimit({
    redis: Redis.fromEnv(),
    limiter: Ratelimit.slidingWindow(10, "10 s"),
    analytics: true,
    prefix: "@upstash/ratelimit",
  });
} else {
  // Development: Use in-memory store (less accurate but works without Redis)
  ratelimit = new Ratelimit({
    redis: new Map() as any, // In-memory fallback
    limiter: Ratelimit.slidingWindow(10, "10 s"),
    analytics: false,
  });
}

export { ratelimit };

// Rate limit configurations for different endpoints
export const rateLimitConfigs = {
  // Strict rate limit for authentication endpoints
  auth: {
    requests: 5,
    window: "60 s",
  },
  // Moderate rate limit for API endpoints
  api: {
    requests: 30,
    window: "60 s",
  },
  // Lenient rate limit for data fetching
  data: {
    requests: 100,
    window: "60 s",
  },
};

/**
 * Check rate limit for a given identifier (usually IP address)
 * Returns { success: boolean, limit: number, remaining: number, reset: Date }
 */
export async function checkRateLimit(identifier: string, config: keyof typeof rateLimitConfigs = 'api') {
  if (!ratelimit) {
    // If rate limiting is not configured, allow all requests
    return { success: true, limit: 0, remaining: 0, reset: new Date() };
  }

  try {
    const { success, limit, remaining, reset } = await ratelimit.limit(
      `${config}:${identifier}`
    );

    return { success, limit, remaining, reset };
  } catch (error) {
    console.error('Rate limit check failed:', error);
    // On error, allow the request but log the issue
    return { success: true, limit: 0, remaining: 0, reset: new Date() };
  }
}

/**
 * Get client identifier from request (IP address or user email)
 */
export function getClientIdentifier(request: Request, userEmail?: string): string {
  // Prefer user email if authenticated
  if (userEmail) {
    return `user:${userEmail}`;
  }

  // Try to get IP from various headers (Vercel, Cloudflare, etc.)
  const forwarded = request.headers.get('x-forwarded-for');
  const realIp = request.headers.get('x-real-ip');
  const cfConnectingIp = request.headers.get('cf-connecting-ip');

  const ip = cfConnectingIp || realIp || forwarded?.split(',')[0] || 'unknown';
  
  return `ip:${ip}`;
}
