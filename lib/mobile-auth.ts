// lib/mobile-auth.ts
import { currentUser } from '@clerk/nextjs/server'
import { connectToDatabase } from '@/lib/mongodb'
import User from '@/lib/models/User'
import { NextRequest } from 'next/server'

export interface MobileAuthResult {
  success: boolean
  user?: any
  error?: string
  status?: number
}

export async function authenticateMobileRequest(request: NextRequest): Promise<MobileAuthResult> {
  try {
    // Get headers
    const apiKey = request.headers.get('x-api-key')
    const userId = request.headers.get('x-user-id')
    
    console.log('🔐 Auth attempt:', { 
      hasApiKey: !!apiKey, 
      hasUserId: !!userId,
      apiKeyValue: apiKey,
      expectedKey: process.env.MOBILE_API_KEY,
      keysMatch: apiKey === process.env.MOBILE_API_KEY
    })
    
    // First check: Mobile API key authentication
    if (apiKey && process.env.MOBILE_API_KEY && apiKey === process.env.MOBILE_API_KEY) {
      console.log('✅ API key matched!')
      
      if (!userId) {
        console.log('❌ No user ID provided')
        return { 
          success: false, 
          error: 'User ID required', 
          status: 400 
        }
      }
      
      await connectToDatabase()
      
      const user = await User.findById(userId)
      if (!user) {
        console.log('❌ User not found by ID:', userId)
        return { 
          success: false, 
          error: 'User not found', 
          status: 404 
        }
      }
      
      console.log('✅ Mobile auth success:', user.username)
      return { 
        success: true, 
        user 
      }
    }
    
    // Fallback: Clerk authentication (for web)
    const clerkUser = await currentUser()
    if (clerkUser) {
      console.log('🔐 Clerk user found:', clerkUser.id)
      await connectToDatabase()
      const user = await User.findOne({ clerkId: clerkUser.id })
      
      if (!user) {
        console.log('❌ Clerk user not found in DB:', clerkUser.id)
        return { 
          success: false, 
          error: 'User not found in system', 
          status: 404 
        }
      }
      
      console.log('✅ Clerk auth success:', user.username)
      return { 
        success: true, 
        user 
      }
    }
    
    console.log('❌ No authentication found')
    return { 
      success: false, 
      error: 'Unauthorized', 
      status: 401 
    }
  } catch (error) {
    console.error('Auth error:', error)
    return { 
      success: false, 
      error: 'Authentication error', 
      status: 500 
    }
  }
}

export function mobileResponse(data: any, status: number = 200) {
  return new Response(JSON.stringify({
    success: status >= 200 && status < 300,
    data,
    timestamp: new Date().toISOString()
  }), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-api-key, x-user-id',
    }
  })
}

export function mobileError(error: string, status: number = 400) {
  return new Response(JSON.stringify({
    success: false,
    error,
    timestamp: new Date().toISOString()
  }), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-api-key, x-user-id',
    }
  })
}