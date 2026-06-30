// app/api/mobile/posts/[id]/comments/[commentId]/reply/route.ts
import { NextRequest } from 'next/server'
import { connectToDatabase } from '@/lib/mongodb'
import Post from '@/lib/models/Post'
import { requireUser } from '@/lib/mobile/auth'
import { mobileSuccess, mobileError } from '@/lib/mobile/responses'
import { isValidObjectId, replySchema } from '@/lib/mobile/validation'
import { ZodError } from 'zod'
import mongoose from 'mongoose'
import "@/lib/loadmodels"

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; commentId: string }> }
) {
  const authResult = await requireUser(request)

  if (!authResult.success) {
    return mobileError(authResult.error, authResult.status)
  }

  try {
    const { id: postId, commentId } = await params

    if (!postId || !isValidObjectId(postId) || !commentId || !isValidObjectId(commentId)) {
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

    // Validate reply using Zod
    const replyValidation = replySchema.safeParse(text)
    if (!replyValidation.success) {
      const errorMessage = replyValidation.error.issues?.[0]?.message || 'Invalid reply'
      return mobileError(errorMessage, 400)
    }

    const reply = {
      _id: new mongoose.Types.ObjectId(),
      user: authResult.user._id,
      text: text.trim(),
      likes: [],
      replies: [],
      parentComment: parentComment._id,
      createdAt: new Date(),
      updatedAt: new Date(),
      isEdited: false
    }

    post.comments.push(reply)
    parentComment.replies.push(reply._id)

    await post.save()

    return mobileSuccess({
      _id: reply._id.toString(),
      user: {
        _id: authResult.user._id.toString(),
        username: authResult.user.username,
        firstName: authResult.user.firstName,
        lastName: authResult.user.lastName,
        avatar: authResult.user.avatar,
        isVerified: authResult.user.isVerified || false,
        isPro: authResult.user.isPro || false,
      },
      text: reply.text,
      likesCount: 0,
      createdAt: reply.createdAt.toISOString(),
      isEdited: false,
      isLiked: false,
      canEdit: true,
    }, 'Reply added successfully')
  } catch (error: any) {
    console.error('Reply error:', error)
    return mobileError(error.message || 'Failed to add reply', 500)
  }
}