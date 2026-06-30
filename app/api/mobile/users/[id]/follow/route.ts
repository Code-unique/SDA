// app/api/mobile/users/[id]/follow/route.ts - COMPLETE FIX
import { NextRequest } from 'next/server'
import { connectToDatabase } from '@/lib/mongodb'
import User from '@/lib/models/User'
import { requireUser } from '@/lib/mobile/auth'
import { mobileSuccess, mobileError, serializeUser } from '@/lib/mobile/responses'
import { isValidObjectId } from '@/lib/mobile/validation'
import { moderateRateLimit } from '@/lib/mobile/rate-limit'
import "@/lib/loadmodels"

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const rateLimitResponse = await moderateRateLimit(request)
  if (rateLimitResponse) return rateLimitResponse

  const authResult = await requireUser(request)

  if (!authResult.success) {
    return mobileError(authResult.error, authResult.status)
  }

  try {
    const { id } = await params

    if (!id) {
      return mobileError('User ID is required', 400)
    }

    await connectToDatabase()

    let targetUser
    if (isValidObjectId(id)) {
      targetUser = await User.findById(id)
    } else {
      targetUser = await User.findOne({ username: id })
    }

    if (!targetUser) {
      return mobileError('User not found', 404)
    }

    if (authResult.user._id.toString() === targetUser._id.toString()) {
      return mobileError('Cannot follow yourself', 400)
    }

    const isFollowing = authResult.user.following?.some(
      (f: any) => f.toString() === targetUser._id.toString()
    ) || false

    if (isFollowing) {
      await User.findByIdAndUpdate(authResult.user._id, {
        $pull: { following: targetUser._id }
      })
      await User.findByIdAndUpdate(targetUser._id, {
        $pull: { followers: authResult.user._id }
      })
    } else {
      await User.findByIdAndUpdate(authResult.user._id, {
        $addToSet: { following: targetUser._id }
      })
      await User.findByIdAndUpdate(targetUser._id, {
        $addToSet: { followers: authResult.user._id }
      })
    }

    const updatedUser = await User.findById(authResult.user._id)

    return mobileSuccess({
      following: !isFollowing,
      message: isFollowing ? 'Unfollowed successfully' : 'Following successfully',
      user: serializeUser(updatedUser),
      targetUser: serializeUser(targetUser),
    })
  } catch (error: any) {
    console.error('Follow error:', error)
    return mobileError(error.message || 'Failed to follow user', 500)
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireUser(request)

  if (!authResult.success) {
    return mobileSuccess({ isFollowing: false })
  }

  try {
    const { id } = await params

    if (!id) {
      return mobileSuccess({ isFollowing: false })
    }

    await connectToDatabase()

    let targetUser
    if (isValidObjectId(id)) {
      targetUser = await User.findById(id)
    } else {
      targetUser = await User.findOne({ username: id })
    }

    if (!targetUser) {
      return mobileSuccess({ isFollowing: false })
    }

    const isFollowing = authResult.user.following?.some(
      (f: any) => f.toString() === targetUser._id.toString()
    ) || false

    return mobileSuccess({
      isFollowing,
      targetUserId: targetUser._id.toString(),
      targetUsername: targetUser.username,
      followersCount: targetUser.followers?.length || 0,
      followingCount: targetUser.following?.length || 0,
    })
  } catch (error: any) {
    console.error('Check follow error:', error)
    return mobileSuccess({ isFollowing: false })
  }
}