// app/api/mobile/posts/[id]/comments/[commentId]/route.ts
import { NextRequest } from 'next/server'
import { connectToDatabase } from '@/lib/mongodb'
import User from '@/lib/models/User'
import Post from '@/lib/models/Post'
import { authenticateMobileRequest, mobileResponse, mobileError } from '@/lib/mobile-auth'
import "@/lib/loadmodels"

export async function PATCH(
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

    if (comment.user.toString() !== auth.user._id.toString()) {
      return mobileError('Not authorized to edit this comment', 403)
    }

    const body = await request.json()
    const { text } = body

    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      return mobileError('Comment text is required', 400)
    }

    if (text.length > 1000) {
      return mobileError('Comment too long (max 1000 characters)', 400)
    }

    comment.text = text.trim()
    comment.isEdited = true
    comment.updatedAt = new Date()

    await post.save()

    return mobileResponse({
      success: true,
      message: 'Comment updated successfully'
    })
  } catch (error: any) {
    console.error('Mobile edit comment error:', error)
    return mobileError(error.message || 'Failed to edit comment', 500)
  }
}

export async function DELETE(
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

    const isCommentOwner = comment.user.toString() === auth.user._id.toString()
    const isPostOwner = post.author.toString() === auth.user._id.toString()
    
    if (!isCommentOwner && !isPostOwner) {
      return mobileError('Not authorized to delete this comment', 403)
    }

    // Find all replies (including nested)
    const findAllReplies = (parentId: string): string[] => {
      const replies: string[] = []
      const directReplies = post.comments.filter(
        (c: any) => c.parentComment && c.parentComment.toString() === parentId
      )
      directReplies.forEach((reply: any) => {
        replies.push(reply._id.toString())
        const nestedReplies = findAllReplies(reply._id.toString())
        replies.push(...nestedReplies)
      })
      return replies
    }

    if (comment.parentComment) {
      const parentComment = post.comments.find((c: any) => 
        c._id.toString() === comment.parentComment?.toString()
      )
      if (parentComment) {
        parentComment.replies = parentComment.replies.filter(
          (replyId: any) => replyId.toString() !== commentId
        )
      }
      
      const allReplyIds = findAllReplies(commentId)
      const allCommentIds = [commentId, ...allReplyIds]
      
      post.comments = post.comments.filter(
        (c: any) => !allCommentIds.includes(c._id.toString())
      )
    } else {
      const allReplyIds = findAllReplies(commentId)
      const allCommentIds = [commentId, ...allReplyIds]
      
      post.comments = post.comments.filter(
        (c: any) => !allCommentIds.includes(c._id.toString())
      )
    }

    await post.save()

    return mobileResponse({
      success: true,
      message: 'Comment deleted successfully'
    })
  } catch (error: any) {
    console.error('Mobile delete comment error:', error)
    return mobileError(error.message || 'Failed to delete comment', 500)
  }
}