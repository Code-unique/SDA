// app/api/mobile/users/[id]/route.ts
import { NextRequest } from 'next/server'
import { connectToDatabase } from '@/lib/mongodb'
import User from '@/lib/models/User'
import { authenticateMobileRequest, mobileResponse, mobileError } from '@/lib/mobile-auth'
import "@/lib/loadmodels"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectToDatabase()
    const { id } = await params
    
    if (!id) {
      return mobileError('User ID is required', 400)
    }
    
    const auth = await authenticateMobileRequest(request)
    
    let user
    if (id.match(/^[0-9a-fA-F]{24}$/)) {
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
    if (auth.success) {
      isFollowing = auth.user.following?.some(
        (f: any) => f.toString() === user._id.toString()
      ) || false
    }
    
    return mobileResponse({
      user: {
        ...user.toObject(),
        _id: user._id.toString(),
        followers: user.followers?.map((f: any) => ({
          ...f.toObject(),
          _id: f._id.toString()
        })) || [],
        following: user.following?.map((f: any) => ({
          ...f.toObject(),
          _id: f._id.toString()
        })) || []
      },
      isFollowing
    })
  } catch (error: any) {
    console.error('Mobile user detail error:', error)
    return mobileError('Failed to fetch user: ' + error.message, 500)
  }
}