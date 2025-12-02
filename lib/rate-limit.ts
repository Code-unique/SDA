// lib/rate-limit.ts
import { LRUCache } from 'lru-cache';

interface RateLimitCache {
  count: number;
  resetTime: number;
}

const rateLimitCache = new LRUCache<string, RateLimitCache>({
  max: 500,
  ttl: 60 * 1000 // 1 minute
});

export const rateLimit = (identifier: string, limit: number = 10) => {
  const now = Date.now();
  const windowMs = 60 * 1000; // 1 minute

  const cacheEntry = rateLimitCache.get(identifier);
  let count = cacheEntry?.count || 0;
  let resetTime = cacheEntry?.resetTime || now + windowMs;

  // Reset if window has passed
  if (now > resetTime) {
    count = 0;
    resetTime = now + windowMs;
  }

  // Increment count
  count += 1;

  // Update cache
  rateLimitCache.set(identifier, { count, resetTime });

  const isRateLimited = count > limit;

  return {
    isRateLimited,
    headers: {
      'X-RateLimit-Limit': limit.toString(),
      'X-RateLimit-Remaining': isRateLimited ? '0' : (limit - count).toString(),
      'X-RateLimit-Reset': Math.ceil(resetTime / 1000).toString()
    }
  };
};