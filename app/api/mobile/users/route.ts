// app/api/mobile/users/route.ts
import { NextRequest } from 'next/server'
import { connectToDatabase } from '@/lib/mongodb'
import User from '@/lib/models/User'
import { authenticateMobileRequest, mobileResponse, mobileError } from '@/lib/mobile-auth'
import "@/lib/loadmodels"

export async function GET(request: NextRequest) {
  try {
    const auth = await authenticateMobileRequest(request)
    if (!auth.success) {
      return mobileError(auth.error || 'Unauthorized', auth.status || 401)
    }
    
    // Refresh user data
    const user = await User.findById(auth.user._id)
      .select('username firstName lastName avatar banner bio location website role interests skills isVerified followers following createdAt')
      .populate('followers', 'username firstName lastName avatar')
      .populate('following', 'username firstName lastName avatar')
    
    if (!user) {
      return mobileError('User not found', 404)
    }
    
    return mobileResponse({
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
    })
  } catch (error: any) {
    console.error('Mobile user error:', error)
    return mobileError('Failed to fetch user: ' + error.message, 500)
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const auth = await authenticateMobileRequest(request)
    if (!auth.success) {
      return mobileError(auth.error || 'Unauthorized', auth.status || 401)
    }
    
    const body = await request.json()
    const allowedFields = ['username', 'firstName', 'lastName', 'avatar', 'bio', 'location', 'website', 'interests', 'skills']
    const updateData: any = {}
    
    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updateData[field] = body[field]
      }
    }
    
    const updated = await User.findByIdAndUpdate(
      auth.user._id,
      { $set: updateData },
      { new: true }
    ).select('username firstName lastName avatar banner bio location website role interests skills isVerified followers following createdAt')
    
    if (!updated) {
      return mobileError('User not found', 404)
    }
    
    return mobileResponse({
      ...updated.toObject(),
      _id: updated._id.toString(),
      followers: updated.followers?.map((f: any) => f.toString()) || [],
      following: updated.following?.map((f: any) => f.toString()) || []
    })
  } catch (error: any) {
    console.error('Mobile update error:', error)
    return mobileError('Failed to update user: ' + error.message, 500)
  }
}