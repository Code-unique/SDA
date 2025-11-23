//lib/rate-limit.ts
import { LRUCache } from 'lru-cache'

const rateLimitCache = new LRUCache({
  max: 500,
  ttl: 60 * 1000 // 1 minute
})

export const rateLimit = (identifier: string, limit: number = 10) => {
  const count = (rateLimitCache.get(identifier) as number[]) || [0]
  
  if (count[0] === 0) {
    rateLimitCache.set(identifier, count)
  }
  
  count[0] += 1
  
  const currentUsage = count[0]
  const isRateLimited = currentUsage >= limit
  
  return {
    isRateLimited,
    headers: {
      'X-RateLimit-Limit': limit.toString(),
      'X-RateLimit-Remaining': isRateLimited ? '0' : (limit - currentUsage).toString()
    }
  }
}