// app/api/mobile/users/route.ts
import { NextRequest } from 'next/server'
import { connectToDatabase } from '@/lib/mongodb'
import User from '@/lib/models/User'
import { requireUser } from '@/lib/mobile/auth'
import { mobileSuccess, mobileError, mobileValidationError, serializeUser } from '@/lib/mobile/responses'
import { usernameSchema, bioSchema } from '@/lib/mobile/validation'
import { ZodError } from 'zod'
import "@/lib/loadmodels"

export async function GET(request: NextRequest) {
  const authResult = await requireUser(request)

  if (!authResult.success) {
    return mobileError(authResult.error, authResult.status)
  }

  const user = await User.findById(authResult.user._id)
    .select('username firstName lastName avatar banner bio location website role interests skills isVerified followers following createdAt onboardingCompleted')
    .populate('followers', 'username firstName lastName avatar')
    .populate('following', 'username firstName lastName avatar')

  if (!user) {
    return mobileError('User not found', 404)
  }

  return mobileSuccess(serializeUser(user))
}

export async function PATCH(request: NextRequest) {
  const authResult = await requireUser(request)

  if (!authResult.success) {
    return mobileError(authResult.error, authResult.status)
  }

  try {
    const body = await request.json()

    const allowedFields = [
      'username', 'firstName', 'lastName', 'avatar', 'banner',
      'bio', 'location', 'website', 'interests', 'skills',
      'onboardingCompleted'
    ]

    const updateData: any = {}
    const errors: Record<string, string[]> = {}

    if (body.username !== undefined) {
      const usernameValidation = usernameSchema.safeParse(body.username)
      if (!usernameValidation.success) {
        errors.username = usernameValidation.error.issues.map((e: any) => e.message)
      } else {
        const existing = await User.findOne({
          username: body.username,
          _id: { $ne: authResult.user._id }
        })
        if (existing) {
          errors.username = ['Username is already taken']
        } else {
          updateData.username = body.username
        }
      }
    }

    if (body.bio !== undefined) {
      const bioValidation = bioSchema.safeParse(body.bio)
      if (!bioValidation.success) {
        errors.bio = bioValidation.error.issues.map((e: any) => e.message)
      } else {
        updateData.bio = body.bio
      }
    }

    if (Object.keys(errors).length > 0) {
      return mobileValidationError(errors)
    }

    for (const field of allowedFields) {
      if (body[field] !== undefined && field !== 'username' && field !== 'bio') {
        updateData[field] = body[field]
      }
    }

    const updated = await User.findByIdAndUpdate(
      authResult.user._id,
      { $set: updateData },
      { new: true }
    ).select('username firstName lastName avatar banner bio location website role interests skills isVerified followers following createdAt onboardingCompleted')

    if (!updated) {
      return mobileError('User not found', 404)
    }

    return mobileSuccess(serializeUser(updated), 'Profile updated successfully')
  } catch (error: any) {
    console.error('Update user error:', error)
    return mobileError(error.message || 'Failed to update user', 500)
  }
}