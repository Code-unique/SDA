// app/api/mobile/posts/[id]/comments/[commentId]/route.ts
import { NextRequest } from 'next/server'
import { connectToDatabase } from '@/lib/mongodb'
import Post from '@/lib/models/Post'
import { requireUser } from '@/lib/mobile/auth'
import { mobileSuccess, mobileError } from '@/lib/mobile/responses'
import { isValidObjectId, commentSchema } from '@/lib/mobile/validation'
import { canEditComment, canDeleteComment } from '@/lib/mobile/permissions'
import { ZodError } from 'zod'
import "@/lib/loadmodels"

export async function PATCH(
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

    if (!canEditComment(authResult.user._id, comment)) {
      return mobileError('Not authorized to edit this comment', 403)
    }

    const body = await request.json()
    const { text } = body

    // Validate comment using Zod
    const commentValidation = commentSchema.safeParse(text)
    if (!commentValidation.success) {
      const errorMessage = commentValidation.error.issues?.[0]?.message || 'Invalid comment'
      return mobileError(errorMessage, 400)
    }

    comment.text = text.trim()
    comment.isEdited = true
    comment.updatedAt = new Date()

    await post.save()

    return mobileSuccess({
      _id: comment._id.toString(),
      text: comment.text,
      isEdited: comment.isEdited,
      updatedAt: comment.updatedAt.toISOString(),
    }, 'Comment updated successfully')
  } catch (error: any) {
    console.error('Edit comment error:', error)
    return mobileError(error.message || 'Failed to edit comment', 500)
  }
}

export async function DELETE(
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

    if (!canDeleteComment(
      authResult.user._id,
      comment,
      post.author,
      authResult.user.role
    )) {
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

    return mobileSuccess({ deleted: true }, 'Comment deleted successfully')
  } catch (error: any) {
    console.error('Delete comment error:', error)
    return mobileError(error.message || 'Failed to delete comment', 500)
  }
}