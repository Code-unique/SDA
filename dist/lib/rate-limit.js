import { LRUCache } from 'lru-cache';
export function rateLimit(key, limit = 10) {
    // Create a simple cache for rate limiting
    const tokenCache = new LRUCache({
        max: 500,
        ttl: 60000, // 1 minute
    });
    // Get or initialize token count
    const tokenCount = tokenCache.get(key) || [];
    const currentTime = Date.now();
    // Remove timestamps older than 1 minute
    const validTokenCount = tokenCount.filter((timestamp) => currentTime - timestamp < 60000);
    // Check if rate limited
    const isRateLimited = validTokenCount.length >= limit;
    // Add current timestamp if not rate limited
    if (!isRateLimited) {
        validTokenCount.push(currentTime);
        tokenCache.set(key, validTokenCount);
    }
    // Create headers
    const headers = new Headers();
    headers.set('X-RateLimit-Limit', limit.toString());
    headers.set('X-RateLimit-Remaining', Math.max(0, limit - validTokenCount.length).toString());
    headers.set('X-RateLimit-Reset', Math.ceil((currentTime + 60000) / 1000).toString());
    if (isRateLimited) {
        headers.set('Retry-After', '60');
    }
    return {
        isRateLimited,
        headers
    };
}
