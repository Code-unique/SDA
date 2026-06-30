// lib/mobile/auth.ts - COMPLETE
import { auth } from '@clerk/nextjs/server'
import { connectToDatabase } from '@/lib/mongodb'
import User from '@/lib/models/User'
import { NextRequest } from 'next/server'
import { Types } from 'mongoose'

export interface AuthenticatedUser {
  _id: Types.ObjectId
  clerkId: string
  username: string
  firstName: string
  lastName: string
  email: string
  avatar?: string
  role: 'user' | 'admin' | 'instructor'
  followers?: Types.ObjectId[]
  following?: Types.ObjectId[]
  isVerified: boolean
  onboardingCompleted: boolean
  [key: string]: any
}

export interface AuthResult {
  success: true
  user: AuthenticatedUser
  clerkId: string
  isMobile: boolean
}

export interface AuthError {
  success: false
  error: string
  status: number
}

export type AuthResponse = AuthResult | AuthError

/**
 * Require authenticated user for mobile routes
 * This ONLY verifies - NEVER creates
 */
export async function requireUser(request: NextRequest): Promise<AuthResponse> {
  try {
    const { userId } = await auth()

    if (!userId) {
      return {
        success: false,
        error: 'Unauthorized - No valid session found',
        status: 401,
      }
    }

    await connectToDatabase()

    const dbUser = await User.findOne({ clerkId: userId })

    if (!dbUser) {
      return {
        success: false,
        error: 'User not found. Please sync your account.',
        status: 404,
      }
    }

    return {
      success: true,
      user: dbUser,
      clerkId: userId,
      isMobile: true,
    }
  } catch (error) {
    console.error('Authentication error:', error)
    return {
      success: false,
      error: 'Authentication service error',
      status: 500,
    }
  }
}

/**
 * Authenticate mobile request without requiring user
 * Returns user if authenticated, otherwise null
 */
export async function authenticateMobileRequest(request: NextRequest) {
  try {
    const { userId } = await auth()

    if (!userId) {
      return { success: false, user: null }
    }

    await connectToDatabase()

    const dbUser = await User.findOne({ clerkId: userId })

    if (!dbUser) {
      return { success: false, user: null }
    }

    return {
      success: true,
      user: dbUser,
    }
  } catch (error) {
    console.error('Authentication error:', error)
    return { success: false, user: null }
  }
}

/**
 * Get user ID from Clerk without loading from MongoDB
 */
export async function getUserId(request: NextRequest): Promise<string | null> {
  try {
    const { userId } = await auth()
    return userId || null
  } catch {
    return null
  }
}

/**
 * Check if user exists in MongoDB
 */
export async function userExists(clerkId: string): Promise<boolean> {
  await connectToDatabase()
  const user = await User.findOne({ clerkId }).select('_id').lean()
  return !!user
}

/**
 * Check if user is admin
 */
export async function requireAdmin(request: NextRequest): Promise<AuthResponse> {
  const authResult = await requireUser(request)

  if (!authResult.success) {
    return authResult
  }

  if (authResult.user.role !== 'admin') {
    return {
      success: false,
      error: 'Forbidden - Admin access required',
      status: 403,
    }
  }

  return authResult
}

/**
 * Check if user is instructor or admin
 */
export async function requireInstructor(request: NextRequest): Promise<AuthResponse> {
  const authResult = await requireUser(request)

  if (!authResult.success) {
    return authResult
  }

  if (!['admin', 'instructor'].includes(authResult.user.role)) {
    return {
      success: false,
      error: 'Forbidden - Instructor or admin access required',
      status: 403,
    }
  }

  return authResult
}

/**
 * Resolve user by ID or username
 */
export async function resolveUser(identifier: string) {
  await connectToDatabase()
  
  if (Types.ObjectId.isValid(identifier)) {
    return User.findById(identifier)
  }
  
  return User.findOne({ username: identifier})
}