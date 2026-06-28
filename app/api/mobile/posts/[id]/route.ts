// app/api/mobile/posts/[id]/route.ts
import { NextRequest } from 'next/server'
import { connectToDatabase } from '@/lib/mongodb'
import Post from '@/lib/models/Post'
import { authenticateMobileRequest, mobileResponse, mobileError } from '@/lib/mobile-auth'
import "@/lib/loadmodels"

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
      .populate('author', 'username firstName lastName avatar isVerified isPro followers following badges bio banner')
      .populate({
        path: 'comments.user',
        select: 'username firstName lastName avatar isVerified isPro'
      })
      .lean()

    if (!post) {
      return mobileError('Post not found', 404)
    }

    // Increment view count
    await Post.findByIdAndUpdate(id, { $inc: { views: 1 } })

    const postData = {
      ...post,
      _id: post._id.toString(),
      author: post.author ? {
        ...post.author,
        _id: (post.author as any)._id.toString()
      } : null,
      likesCount: (post.likes as any[])?.length || 0,
      commentsCount: (post.comments as any[])?.length || 0,
      savesCount: (post.saves as any[])?.length || 0,
      comments: (post.comments || []).map((c: any) => ({
        ...c,
        _id: c._id.toString(),
        user: c.user ? {
          ...c.user,
          _id: c.user._id.toString()
        } : null,
        likesCount: c.likes?.length || 0,
        repliesCount: c.replies?.length || 0
      }))
    }

    return mobileResponse(postData)
  } catch (error: any) {
    console.error('Mobile get post error:', error)
    return mobileError(error.message || 'Failed to fetch post', 500)
  }
}

export async function PATCH(
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

    const post = await Post.findById(id)
    if (!post) {
      return mobileError('Post not found', 404)
    }

    if (post.author.toString() !== auth.user._id.toString()) {
      return mobileError('Not authorized to edit this post', 403)
    }

    const body = await request.json()
    const { caption, hashtags, media } = body

    if (!caption || caption.trim().length === 0) {
      return mobileError('Caption is required', 400)
    }

    post.caption = caption.substring(0, 2200)
    post.hashtags = hashtags ? hashtags.map((tag: string) => tag.toLowerCase()) : []
    post.isEdited = true
    post.updatedAt = new Date()

    if (media && Array.isArray(media)) {
      if (media.length > 4) {
        return mobileError('Maximum 4 media items allowed', 400)
      }
      const videoCount = media.filter((item: any) => item.type === 'video').length
      if (videoCount > 1) {
        return mobileError('Only one video allowed per post', 400)
      }
      post.media = media.map((item: any, index: number) => ({
        ...item,
        order: item.order !== undefined ? item.order : index
      }))
    }

    await post.save()
    await post.populate('author', 'username firstName lastName avatar isVerified isPro')

    const postData = {
      ...post.toObject(),
      _id: post._id.toString(),
      author: post.author ? {
        ...(post.author as any).toObject(),
        _id: (post.author as any)._id.toString()
      } : null,
      likesCount: post.likes?.length || 0,
      commentsCount: post.comments?.length || 0,
      savesCount: post.saves?.length || 0
    }

    return mobileResponse({
      ...postData,
      message: 'Post updated successfully'
    })
  } catch (error: any) {
    console.error('Mobile update post error:', error)
    return mobileError(error.message || 'Failed to update post', 500)
  }
}

export async function DELETE(
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

    const post = await Post.findById(id)
    if (!post) {
      return mobileError('Post not found', 404)
    }

    if (post.author.toString() !== auth.user._id.toString()) {
      return mobileError('Not authorized to delete this post', 403)
    }

    await Post.findByIdAndDelete(id)

    return mobileResponse({ message: 'Post deleted successfully' })
  } catch (error: any) {
    console.error('Mobile delete post error:', error)
    return mobileError(error.message || 'Failed to delete post', 500)
  }
}