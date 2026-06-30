// app/api/mobile/auth/route.ts - WITH DEBUGGING
import { NextRequest } from 'next/server'
import { auth, currentUser } from '@clerk/nextjs/server'
import { mobileSuccess, mobileError, serializeUser } from '@/lib/mobile/responses'
import { syncUserFromClerk } from '@/lib/mobile/sync'
import { moderateRateLimit } from '@/lib/mobile/rate-limit'
import "@/lib/loadmodels"

export async function POST(request: NextRequest) {
  const rateLimitResponse = await moderateRateLimit(request)
  if (rateLimitResponse) return rateLimitResponse

  try {
    // Log all headers for debugging
    console.log('📋 Request Headers:')
    console.log('  Authorization:', request.headers.get('authorization')?.substring(0, 30) + '...')
    console.log('  User-Agent:', request.headers.get('user-agent'))
    
    // Get the session from Clerk
    const { userId } = await auth()
    const clerkUser = await currentUser()
    
    console.log('🔐 Auth Debug:', {
      hasUserId: !!userId,
      hasClerkUser: !!clerkUser,
      userId: userId || 'none',
      clerkUserId: clerkUser?.id || 'none'
    })

    // If no userId from auth, try to get it from the token manually
    if (!userId && !clerkUser) {
      console.log('❌ No userId from auth or currentUser')
      
      // Try to get user from token manually
      const authHeader = request.headers.get('authorization')
      if (authHeader && authHeader.startsWith('Bearer ')) {
        console.log('🔑 Found Bearer token, but Clerk auth() returned no userId')
        return mobileError('Unauthorized - Invalid session', 401)
      }
      
      return mobileError('Unauthorized - No valid session', 401)
    }

    const clerkId = userId || clerkUser?.id
    
    if (!clerkId) {
      return mobileError('Unauthorized - Invalid user ID', 401)
    }

    const dbUser = await syncUserFromClerk(clerkId)

    return mobileSuccess({
      user: serializeUser(dbUser),
      synced: true,
    }, 'User synced successfully')
  } catch (error: any) {
    console.error('Auth sync error:', error)
    return mobileError(error.message || 'Failed to sync user', 500)
  }
}

export async function GET(request: NextRequest) {
  const rateLimitResponse = await moderateRateLimit(request)
  if (rateLimitResponse) return rateLimitResponse

  try {
    const { userId } = await auth()
    const clerkUser = await currentUser()

    if (!userId && !clerkUser) {
      return mobileError('Unauthorized - No valid session', 401)
    }

    const clerkId = userId || clerkUser?.id
    
    if (!clerkId) {
      return mobileError('Unauthorized - Invalid user ID', 401)
    }

    const dbUser = await syncUserFromClerk(clerkId)

    return mobileSuccess({
      authenticated: true,
      user: serializeUser(dbUser),
    })
  } catch (error: any) {
    console.error('Auth check error:', error)
    return mobileError(error.message || 'Failed to check auth', 500)
  }
}