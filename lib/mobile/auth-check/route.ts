// app/api/mobile/auth-check/route.ts
import { NextRequest } from 'next/server'
import { auth, currentUser } from '@clerk/nextjs/server'

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    const { userId } = await auth()
    const clerkUser = await currentUser()

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          authenticated: !!userId || !!clerkUser,
          userId: userId || null,
          clerkUser: clerkUser
            ? {
                id: clerkUser.id,
                username: clerkUser.username,
                firstName: clerkUser.firstName,
                lastName: clerkUser.lastName,
                email: clerkUser.emailAddresses?.[0]?.emailAddress,
                imageUrl: clerkUser.imageUrl,
              }
            : null,
          hasAuthHeader: !!authHeader,
          timestamp: new Date().toISOString(),
        },
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    )
  } catch (error: any) {
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Authentication check failed',
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    )
  }
}