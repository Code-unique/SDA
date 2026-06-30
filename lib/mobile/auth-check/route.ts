// app/api/mobile/auth-check/route.ts
import { NextRequest } from 'next/server'
import { auth, currentUser } from '@clerk/nextjs/server'
import { mobileSuccess, mobileError } from '@/lib/mobile/responses'

export async function GET(request: NextRequest) {
  try {
    // Log headers
    console.log('📋 Auth Check Headers:')
    console.log('  Authorization:', request.headers.get('authorization')?.substring(0, 50) + '...')
    
    const { userId } = await auth()
    const clerkUser = await currentUser()
    
    console.log('🔐 Auth Check Result:', {
      hasUserId: !!userId,
      hasClerkUser: !!clerkUser,
      userId: userId || 'none',
      clerkUserId: clerkUser?.id || 'none'
    })

    return mobileSuccess({
      authenticated: !!userId || !!clerkUser,
      userId: userId || null,
      clerkUser: clerkUser ? {
        id: clerkUser.id,
        username: clerkUser.username,
        firstName: clerkUser.firstName,
        lastName: clerkUser.lastName,
        email: clerkUser.emailAddresses?.[0]?.emailAddress,
        imageUrl: clerkUser.imageUrl,
      } : null,
      hasAuthHeader: !!request.headers.get('authorization'),
      authHeaderPreview: request.headers.get('authorization')?.substring(0, 30) + '...' || 'none',
      timestamp: new Date().toISOString(),
    })
  } catch (error: any) {
    console.error('Auth check error:', error)
    return mobileError(error.message, 500)
  }
}