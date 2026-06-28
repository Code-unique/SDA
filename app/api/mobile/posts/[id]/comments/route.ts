// app/api/mobile/posts/[id]/comments/route.ts
import { NextRequest } from 'next/server'
import { connectToDatabase } from '@/lib/mongodb'
import User from '@/lib/models/User'
import Post from '@/lib/models/Post'
import { authenticateMobileRequest, mobileResponse, mobileError } from '@/lib/mobile-auth'
import mongoose from 'mongoose'
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

    const { id } = await params
    
    if (!id || id.length !== 24) {
      return mobileError('Valid post ID is required', 400)
    }

    await connectToDatabase()

    const post = await Post.findById(id).populate('author')
    if (!post) {
      return mobileError('Post not found', 404)
    }

    const body = await request.json()
    const { text } = body

    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      return mobileError('Comment text is required', 400)
    }

    if (text.length > 1000) {
      return mobileError('Comment too long (max 1000 characters)', 400)
    }

    const comment = {
      _id: new mongoose.Types.ObjectId(),
      user: auth.user._id,
      text: text.substring(0, 1000),
      likes: [],
      replies: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      isEdited: false
    }

    post.comments.push(comment)
    await post.save()

    await post.populate('comments.user', 'username firstName lastName avatar isVerified isPro')

    const comments = post.comments.map((c: any) => ({
      ...c.toObject(),
      _id: c._id.toString(),
      user: c.user ? {
        ...c.user.toObject(),
        _id: c.user._id.toString()
      } : null,
      likesCount: c.likes?.length || 0,
      repliesCount: c.replies?.length || 0
    }))

    return mobileResponse({
      comments,
      totalComments: comments.length
    })
  } catch (error: any) {
    console.error('Mobile add comment error:', error)
    return mobileError(error.message || 'Failed to add comment', 500)
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    
    if (!id || id.length !== 24) {
      return mobileError('Valid post ID is required', 400)
    }

    await connectToDatabase()

    const post = await Post.findById(id)
      .populate('comments.user', 'username firstName lastName avatar isVerified isPro')
      .select('comments')

    if (!post) {
      return mobileError('Post not found', 404)
    }

    const comments = post.comments.map((c: any) => ({
      ...c.toObject(),
      _id: c._id.toString(),
      user: c.user ? {
        ...c.user.toObject(),
        _id: c.user._id.toString()
      } : null,
      likesCount: c.likes?.length || 0,
      repliesCount: c.replies?.length || 0
    }))

    return mobileResponse({
      comments,
      totalComments: comments.length
    })
  } catch (error: any) {
    console.error('Mobile get comments error:', error)
    return mobileError(error.message || 'Failed to fetch comments', 500)
  }
}