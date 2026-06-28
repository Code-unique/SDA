// app/api/mobile/users/[id]/follow/route.ts
import { NextRequest } from 'next/server'
import { connectToDatabase } from '@/lib/mongodb'
import User from '@/lib/models/User'
import { authenticateMobileRequest, mobileResponse, mobileError } from '@/lib/mobile-auth'
import "@/lib/loadmodels"

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await authenticateMobileRequest(request)
    if (!auth.success) {
      return mobileError(auth.error || 'Unauthorized', auth.status || 401)
    }
    
    await connectToDatabase()
    const { id } = await params
    
    if (!id) {
      return mobileError('User ID is required', 400)
    }
    
    // Find target user
    let targetUser
    if (id.match(/^[0-9a-fA-F]{24}$/)) {
      targetUser = await User.findById(id)
    } else {
      targetUser = await User.findOne({ username: id })
    }
    
    if (!targetUser) {
      return mobileError('User not found', 404)
    }
    
    if (auth.user._id.toString() === targetUser._id.toString()) {
      return mobileError('Cannot follow yourself', 400)
    }
    
    const isFollowing = auth.user.following?.some(
      (f: any) => f.toString() === targetUser._id.toString()
    ) || false
    
    if (isFollowing) {
      // Unfollow
      await User.findByIdAndUpdate(auth.user._id, {
        $pull: { following: targetUser._id }
      })
      await User.findByIdAndUpdate(targetUser._id, {
        $pull: { followers: auth.user._id }
      })
    } else {
      // Follow
      await User.findByIdAndUpdate(auth.user._id, {
        $addToSet: { following: targetUser._id }
      })
      await User.findByIdAndUpdate(targetUser._id, {
        $addToSet: { followers: auth.user._id }
      })
    }
    
    const updatedUser = await User.findById(auth.user._id)
      .populate('followers', 'username firstName lastName avatar')
      .populate('following', 'username firstName lastName avatar')
    
    return mobileResponse({
      following: !isFollowing,
      message: isFollowing ? 'Unfollowed' : 'Following',
      user: {
        ...updatedUser?.toObject(),
        _id: updatedUser?._id.toString(),
        followers: updatedUser?.followers?.map((f: any) => ({
          ...f.toObject(),
          _id: f._id.toString()
        })) || [],
        following: updatedUser?.following?.map((f: any) => ({
          ...f.toObject(),
          _id: f._id.toString()
        })) || []
      }
    })
  } catch (error: any) {
    console.error('Mobile follow error:', error)
    return mobileError('Failed to follow user: ' + error.message, 500)
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await authenticateMobileRequest(request)
    if (!auth.success) {
      return mobileResponse({ isFollowing: false })
    }
    
    await connectToDatabase()
    const { id } = await params
    
    if (!id) {
      return mobileResponse({ isFollowing: false })
    }
    
    let targetUser
    if (id.match(/^[0-9a-fA-F]{24}$/)) {
      targetUser = await User.findById(id)
    } else {
      targetUser = await User.findOne({ username: id })
    }
    
    if (!targetUser) {
      return mobileResponse({ isFollowing: false })
    }
    
    const isFollowing = auth.user.following?.some(
      (f: any) => f.toString() === targetUser._id.toString()
    ) || false
    
    return mobileResponse({
      isFollowing,
      targetUserId: targetUser._id.toString(),
      targetUsername: targetUser.username
    })
  } catch (error: any) {
    console.error('Mobile follow check error:', error)
    return mobileResponse({ isFollowing: false })
  }
}