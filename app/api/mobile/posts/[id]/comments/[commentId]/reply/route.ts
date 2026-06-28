// app/api/mobile/posts/[id]/comments/[commentId]/reply/route.ts
import { NextRequest } from 'next/server'
import { connectToDatabase } from '@/lib/mongodb'
import User from '@/lib/models/User'
import Post from '@/lib/models/Post'
import { authenticateMobileRequest, mobileResponse, mobileError } from '@/lib/mobile-auth'
import mongoose from 'mongoose'
import "@/lib/loadmodels"

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; commentId: string }> }
) {
  try {
    const auth = await authenticateMobileRequest(request)
    if (!auth.success) {
      return mobileError(auth.error || 'Unauthorized', auth.status || 401)
    }

    const { id: postId, commentId } = await params
    
    if (!postId || postId.length !== 24 || !commentId || commentId.length !== 24) {
      return mobileError('Valid IDs required', 400)
    }

    await connectToDatabase()

    const post = await Post.findById(postId)
    if (!post) {
      return mobileError('Post not found', 404)
    }

    const parentComment = post.comments.find((c: any) => c._id.toString() === commentId)
    if (!parentComment) {
      return mobileError('Comment not found', 404)
    }

    const body = await request.json()
    const { text } = body

    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      return mobileError('Reply text is required', 400)
    }

    if (text.length > 500) {
      return mobileError('Reply too long (max 500 characters)', 400)
    }

    const reply = {
      _id: new mongoose.Types.ObjectId(),
      user: auth.user._id,
      text: text.trim(),
      likes: [],
      replies: [],
      parentComment: parentComment._id,
      createdAt: new Date(),
      updatedAt: new Date(),
      isEdited: false
    }

    post.comments.push(reply)

    // Add to parent's replies array
    parentComment.replies.push(reply._id)

    await post.save()

    return mobileResponse({
      success: true,
      message: 'Reply added successfully'
    })
  } catch (error: any) {
    console.error('Mobile reply error:', error)
    return mobileError(error.message || 'Failed to add reply', 500)
  }
}