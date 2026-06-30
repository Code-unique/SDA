// middleware.ts - COMPLETE FIXED VERSION
import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'

const isProtectedRoute = createRouteMatcher([
  '/admin(.*)',
  '/dashboard(.*)',
  '/profile(.*)',
  '/orders(.*)',
  '/cart',
  '/checkout',
  '/api/admin(.*)',
  '/api/orders(.*)',
  '/api/products(.*)', // POST, PUT, DELETE
])

const isPublicRoute = createRouteMatcher([
  '/',
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/shop(.*)',
  '/api/products', // GET is public
  '/api/webhooks(.*)',
  '/api/placeholder(.*)',
  '/api/users/sync',
  '/api/mobile/health(.*)', // Health check is public
])

/**
 * Security headers for all responses
 */
const securityHeaders = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'geolocation=(), microphone=(), camera=()',
}

/**
 * CORS headers for mobile API
 */
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, idempotency-key',
  'Access-Control-Allow-Credentials': 'true',
}

/**
 * Apply security headers to response
 */
function applySecurityHeaders(response: NextResponse): NextResponse {
  Object.entries(securityHeaders).forEach(([key, value]) => {
    response.headers.set(key, value)
  })
  return response
}

/**
 * Apply CORS headers to response
 */
function applyCorsHeaders(response: NextResponse): NextResponse {
  Object.entries(corsHeaders).forEach(([key, value]) => {
    response.headers.set(key, value)
  })
  return response
}

export default clerkMiddleware(async (auth, req) => {
  const { userId } = await auth()
  const pathname = req.nextUrl.pathname

  // Add security headers to all responses
  const requestHeaders = new Headers(req.headers)
  requestHeaders.set('X-DNS-Prefetch-Control', 'on')
  requestHeaders.set('X-XSS-Protection', '1; mode=block')
  requestHeaders.set('X-Frame-Options', 'SAMEORIGIN')
  requestHeaders.set('X-Content-Type-Options', 'nosniff')

  // ============================================================
  // HANDLE MOBILE API ROUTES
  // ============================================================
  if (pathname.startsWith('/api/mobile')) {
    // Handle OPTIONS preflight
    if (req.method === 'OPTIONS') {
      const response = new NextResponse(null, { status: 204 })
      applyCorsHeaders(response)
      applySecurityHeaders(response)
      return response
    }

    // For mobile routes, we use Clerk authentication via bearer token
    // The routes themselves handle auth via requireUser()
    const response = NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    })

    applyCorsHeaders(response)
    applySecurityHeaders(response)
    return response
  }

  // ============================================================
  // HANDLE API ROUTES (non-mobile)
  // ============================================================
  if (pathname.startsWith('/api')) {
    // Public API routes (no auth required)
    if (isPublicRoute(req)) {
      const response = NextResponse.next({
        request: {
          headers: requestHeaders,
        },
      })
      applySecurityHeaders(response)
      return response
    }

    // Protected API routes require Clerk auth
    if (isProtectedRoute(req) && !userId) {
      return new NextResponse(
        JSON.stringify({ 
          error: 'Unauthorized',
          code: 'AUTH_REQUIRED',
          message: 'Authentication required for this endpoint'
        }),
        {
          status: 401,
          headers: {
            'Content-Type': 'application/json',
            ...Object.fromEntries(requestHeaders),
          },
        }
      )
    }

    // Admin API routes - authorization checked in route handlers
    if (pathname.startsWith('/api/admin')) {
      const response = NextResponse.next({
        request: {
          headers: requestHeaders,
        },
      })
      applySecurityHeaders(response)
      return response
    }

    // Default API response
    const response = NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    })
    applySecurityHeaders(response)
    return response
  }

  // ============================================================
  // HANDLE PROTECTED PAGES
  // ============================================================
  if (isProtectedRoute(req) && !userId) {
    const signInUrl = new URL('/sign-in', req.url)
    signInUrl.searchParams.set('redirect_url', req.url)
    return NextResponse.redirect(signInUrl)
  }

  // ============================================================
  // HANDLE PUBLIC PAGES
  // ============================================================
  if (isPublicRoute(req)) {
    const response = NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    })
    applySecurityHeaders(response)
    return response
  }

  // ============================================================
  // DEFAULT: ALLOW ACCESS
  // ============================================================
  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  })
  applySecurityHeaders(response)
  return response
})

export const config = {
  matcher: [
    // Skip Next.js internals and all static files
    '/((?!_next/static|_next/image|favicon.ico|public/).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
}