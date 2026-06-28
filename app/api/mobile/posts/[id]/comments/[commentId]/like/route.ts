// app/api/mobile/posts/[id]/comments/[commentId]/like/route.ts
import { NextRequest } from 'next/server'
import { connectToDatabase } from '@/lib/mongodb'
import User from '@/lib/models/User'
import Post from '@/lib/models/Post'
import { authenticateMobileRequest, mobileResponse, mobileError } from '@/lib/mobile-auth'
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

    const comment = post.comments.find((c: any) => c._id.toString() === commentId)
    if (!comment) {
      return mobileError('Comment not found', 404)
    }

    const userIdStr = auth.user._id.toString()
    const isLiked = comment.likes.some((likeId: any) => likeId.toString() === userIdStr)

    if (isLiked) {
      comment.likes = comment.likes.filter((likeId: any) => likeId.toString() !== userIdStr)
    } else {
      comment.likes.push(auth.user._id)
    }

    await post.save()

    return mobileResponse({
      liked: !isLiked,
      likesCount: comment.likes.length
    })
  } catch (error: any) {
    console.error('Mobile comment like error:', error)
    return mobileError(error.message || 'Failed to toggle comment like', 500)
  }
}