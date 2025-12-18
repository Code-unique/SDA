// middleware.ts - FIXED VERSION
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
])

export default clerkMiddleware(async (auth, req) => {
  const { userId } = await auth()
  
  // Add security headers to all responses
  const requestHeaders = new Headers(req.headers)
  requestHeaders.set('X-DNS-Prefetch-Control', 'on')
  requestHeaders.set('X-XSS-Protection', '1; mode=block')
  requestHeaders.set('X-Frame-Options', 'SAMEORIGIN')
  requestHeaders.set('X-Content-Type-Options', 'nosniff')
  
  // Handle API routes
  if (req.nextUrl.pathname.startsWith('/api')) {
    // Public API routes
    if (isPublicRoute(req)) {
      return NextResponse.next({
        request: {
          headers: requestHeaders,
        },
      })
    }
    
    // Protected API routes require auth
    if (isProtectedRoute(req) && !userId) {
      return new NextResponse(
        JSON.stringify({ error: 'Unauthorized' }),
        { 
          status: 401,
          headers: {
            'Content-Type': 'application/json',
            ...Object.fromEntries(requestHeaders),
          }
        }
      )
    }
    
    // Admin API routes - authorization checked in route handlers
    if (req.nextUrl.pathname.startsWith('/api/admin')) {
      return NextResponse.next({
        request: {
          headers: requestHeaders,
        },
      })
    }
  }
  
  // Handle protected pages
  if (isProtectedRoute(req) && !userId) {
    const signInUrl = new URL('/sign-in', req.url)
    signInUrl.searchParams.set('redirect_url', req.url)
    return NextResponse.redirect(signInUrl)
  }
  
  // Handle public pages
  if (isPublicRoute(req)) {
    return NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    })
  }
  
  // Default: allow access
  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  })
})

export const config = {
  matcher: [
    // Skip Next.js internals and all static files
    '/((?!_next/static|_next/image|favicon.ico|public/).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
}