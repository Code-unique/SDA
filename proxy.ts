// middleware.ts
import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'

const isProtectedRoute = createRouteMatcher([
  '/admin(.*)',
  '/dashboard(.*)',
  '/courses(.*)/learn',
  '/profile(.*)',
  '/messages(.*)',
  '/api/admin(.*)',
  '/api/courses(.*)/progress',
  '/api/courses(.*)/enroll',
  '/api/courses(.*)/notes',
  '/api/users(.*)',
  '/api/messages(.*)',
  '/api/notifications(.*)',
  '/api/upload(.*)',
])

const isPublicRoute = createRouteMatcher([
  '/',
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/api/webhooks(.*)',
  '/api/courses(.*)',
  '/api/explore(.*)',
  '/api/search(.*)',
  '/api/stats(.*)',
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
    
    // Admin API routes require admin role
    if (req.nextUrl.pathname.startsWith('/api/admin') && userId) {
      // Note: You'll need to check user role in the actual API route
      // This is just a basic check
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
  
  // Handle public pages - allow everyone
  if (isPublicRoute(req)) {
    return NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    })
  }
})

export const config = {
  matcher: [
    // Skip Next.js internals and all static files
    '/((?!_next/static|_next/image|favicon.ico|public/).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
}