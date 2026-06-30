// app/api/mobile/users/[id]/route.ts
import { NextRequest } from 'next/server'
import { connectToDatabase } from '@/lib/mongodb'
import User from '@/lib/models/User'
import { requireUser, resolveUser } from '@/lib/mobile/auth'
import { mobileSuccess, mobileError } from '@/lib/mobile/responses'
import { isValidObjectId } from '@/lib/mobile/validation'
import "@/lib/loadmodels"

/**
 * GET /api/mobile/users/:id
 * Get user by ID or username
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    if (!id) {
      return mobileError('User ID is required', 400)
    }

    await connectToDatabase()

    const authResult = await requireUser(request)
    const currentUserId = authResult.success ? authResult.user._id : null

    let user
    if (isValidObjectId(id)) {
      user = await User.findById(id)
        .select('username firstName lastName avatar banner bio location website role interests skills isVerified followers following createdAt')
        .populate('followers', 'username firstName lastName avatar')
        .populate('following', 'username firstName lastName avatar')
    } else {
      user = await User.findOne({ username: id })
        .select('username firstName lastName avatar banner bio location website role interests skills isVerified followers following createdAt')
        .populate('followers', 'username firstName lastName avatar')
        .populate('following', 'username firstName lastName avatar')
    }

    if (!user) {
      return mobileError('User not found', 404)
    }

    let isFollowing = false
    if (currentUserId) {
      isFollowing = user.followers?.some(
        (f: any) => f._id.toString() === currentUserId.toString()
      ) || false
    }

    return mobileSuccess({
      _id: user._id.toString(),
      username: user.username,
      firstName: user.firstName,
      lastName: user.lastName,
      avatar: user.avatar,
      banner: user.banner,
      bio: user.bio,
      location: user.location,
      website: user.website,
      role: user.role,
      interests: user.interests || [],
      skills: user.skills || [],
      isVerified: user.isVerified || false,
      followers: user.followers?.map((f: any) => ({
        _id: f._id.toString(),
        username: f.username,
        firstName: f.firstName,
        lastName: f.lastName,
        avatar: f.avatar,
      })) || [],
      following: user.following?.map((f: any) => ({
        _id: f._id.toString(),
        username: f.username,
        firstName: f.firstName,
        lastName: f.lastName,
        avatar: f.avatar,
      })) || [],
      followersCount: user.followers?.length || 0,
      followingCount: user.following?.length || 0,
      createdAt: user.createdAt,
      isFollowing,
    })
  } catch (error: any) {
    console.error('Get user error:', error)
    return mobileError(error.message || 'Failed to fetch user', 500)
  }
}