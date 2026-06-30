// lib/mobile/idempotency.ts
import { NextRequest, NextResponse } from 'next/server'
import { connectToDatabase } from '@/lib/mongodb'
import { mobileError } from './responses'

interface IdempotencyRecord {
  _id: string
  key: string
  response: any
  statusCode: number
  createdAt: Date
  expiresAt: Date
}

// In-memory store (use Redis in production)
const idempotencyStore: Map<string, { response: any; statusCode: number }> = new Map()

const IDEMPOTENCY_TTL = 60 * 60 * 1000 // 1 hour

/**
 * Get idempotency key from request headers
 */
export function getIdempotencyKey(request: NextRequest): string | null {
  return request.headers.get('idempotency-key') || null
}

/**
 * Check if request has idempotency key and return cached response
 */
export function checkIdempotency(request: NextRequest): { 
  isIdempotent: boolean
  cachedResponse?: { response: any; statusCode: number }
} {
  const key = getIdempotencyKey(request)
  
  if (!key) {
    return { isIdempotent: false }
  }

  const cached = idempotencyStore.get(key)
  
  if (cached) {
    return {
      isIdempotent: true,
      cachedResponse: cached,
    }
  }

  return { isIdempotent: false }
}

/**
 * Store idempotent response
 */
export function storeIdempotentResponse(
  request: NextRequest,
  response: any,
  statusCode: number = 200
): void {
  const key = getIdempotencyKey(request)
  
  if (!key) {
    return
  }

  idempotencyStore.set(key, { response, statusCode })

  // Auto-cleanup after TTL
  setTimeout(() => {
    idempotencyStore.delete(key)
  }, IDEMPOTENCY_TTL)
}

/**
 * Clean expired idempotency records (run periodically)
 */
export function cleanIdempotencyStore(): void {
  // Map doesn't support TTL, so we rely on setTimeout cleanup
  // In production with Redis, use TTL
}