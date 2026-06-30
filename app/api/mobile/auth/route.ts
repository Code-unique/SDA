// app/api/mobile/auth/route.ts
import { NextRequest } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { mobileSuccess, mobileError, serializeUser } from '@/lib/mobile/responses'
import { syncUserFromClerk } from '@/lib/mobile/sync'
import { requireUser } from '@/lib/mobile/auth'
import { moderateRateLimit } from '@/lib/mobile/rate-limit'
import "@/lib/loadmodels"

export async function POST(request: NextRequest) {
  // Apply strict rate limiting
  const rateLimitResponse = await moderateRateLimit(request)
  if (rateLimitResponse) return rateLimitResponse

  try {
    const { userId } = await auth()

    if (!userId) {
      return mobileError('Unauthorized - No valid session', 401)
    }

    const dbUser = await syncUserFromClerk(userId)

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
  // Apply moderate rate limiting
  const rateLimitResponse = await moderateRateLimit(request)
  if (rateLimitResponse) return rateLimitResponse

  const authResult = await requireUser(request)

  if (!authResult.success) {
    return mobileError(authResult.error, authResult.status)
  }

  return mobileSuccess({
    authenticated: true,
    user: serializeUser(authResult.user),
  })
}