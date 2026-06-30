// lib/mobile/rate-limit.ts
import { NextRequest, NextResponse } from 'next/server'
import { mobileError } from './responses'

interface RateLimitStore {
  [key: string]: {
    count: number
    resetAt: number
  }
}

// In-memory store (use Redis in production)
const store: RateLimitStore = {}

interface RateLimitConfig {
  windowMs: number
  maxRequests: number
  message?: string
  statusCode?: number
}

const DEFAULT_CONFIG: RateLimitConfig = {
  windowMs: 60 * 1000,
  maxRequests: 60,
  message: 'Too many requests, please try again later',
  statusCode: 429,
}

/**
 * Get client IP from request
 */
function getClientIp(request: NextRequest): string {
  // Try various headers for IP
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) {
    return forwarded.split(',')[0].trim()
  }
  
  const realIp = request.headers.get('x-real-ip')
  if (realIp) {
    return realIp
  }
  
  // Fallback to a unique identifier
  return 'anonymous'
}

/**
 * Rate limit middleware for mobile API routes
 */
export function rateLimit(config: Partial<RateLimitConfig> = {}) {
  const { windowMs, maxRequests, message, statusCode } = {
    ...DEFAULT_CONFIG,
    ...config,
  }

  return async function (request: NextRequest): Promise<NextResponse | null> {
    const ip = getClientIp(request)
    const path = request.nextUrl.pathname
    const key = `${ip}:${path}`

    const now = Date.now()
    const record = store[key]

    // Clean up expired records
    if (record && record.resetAt < now) {
      delete store[key]
    }

    // Check if rate limit is exceeded
    if (record && record.count >= maxRequests!) {
      return mobileError(
        message!,
        statusCode!,
        'RATE_LIMIT_EXCEEDED'
      )
    }

    // Update or create record
    if (record) {
      record.count += 1
    } else {
      store[key] = {
        count: 1,
        resetAt: now + windowMs!,
      }
    }

    // Clean up old records periodically
    if (Math.random() < 0.01) {
      const expiredKeys = Object.keys(store).filter(
        (k) => store[k].resetAt < now
      )
      expiredKeys.forEach((k) => delete store[k])
    }

    return null
  }
}

/**
 * Strict rate limit for sensitive operations
 */
export const strictRateLimit = rateLimit({
  windowMs: 60 * 1000,
  maxRequests: 10,
  message: 'Too many requests, please slow down',
})

/**
 * Moderate rate limit for read operations
 */
export const moderateRateLimit = rateLimit({
  windowMs: 60 * 1000,
  maxRequests: 120,
  message: 'Too many requests, please try again later',
})

/**
 * Loose rate limit for public endpoints
 */
export const looseRateLimit = rateLimit({
  windowMs: 60 * 1000,
  maxRequests: 300,
  message: 'Request limit exceeded',
})