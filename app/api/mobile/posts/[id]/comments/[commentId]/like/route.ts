// app/api/mobile/posts/[id]/comments/[commentId]/like/route.ts
import { NextRequest } from 'next/server'
import { connectToDatabase } from '@/lib/mongodb'
import Post from '@/lib/models/Post'
import { requireUser } from '@/lib/mobile/auth'
import { mobileSuccess, mobileError } from '@/lib/mobile/responses'
import { isValidObjectId } from '@/lib/mobile/validation'
import "@/lib/loadmodels"

/**
 * POST /api/mobile/posts/:id/comments/:commentId/like
 * Like or unlike a comment
 */
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

    const comment = post.comments.find((c: any) => c._id.toString() === commentId)
    if (!comment) {
      return mobileError('Comment not found', 404)
    }

    const userIdStr = authResult.user._id.toString()
    const isLiked = comment.likes?.some((likeId: any) => likeId.toString() === userIdStr)

    if (isLiked) {
      comment.likes = comment.likes.filter((likeId: any) => likeId.toString() !== userIdStr)
    } else {
      comment.likes.push(authResult.user._id)
    }

    await post.save()

    return mobileSuccess({
      liked: !isLiked,
      likesCount: comment.likes.length
    })
  } catch (error: any) {
    console.error('Comment like error:', error)
    return mobileError(error.message || 'Failed to toggle comment like', 500)
  }
}