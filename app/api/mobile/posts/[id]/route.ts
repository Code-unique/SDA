// app/api/mobile/posts/[id]/route.ts
import { NextRequest } from 'next/server'
import { connectToDatabase } from '@/lib/mongodb'
import Post from '@/lib/models/Post'
import { requireUser } from '@/lib/mobile/auth'
import { mobileSuccess, mobileError } from '@/lib/mobile/responses'
import { isValidObjectId } from '@/lib/mobile/validation'
import { canEditPost } from '@/lib/mobile/permissions'
import "@/lib/loadmodels"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    if (!id || !isValidObjectId(id)) {
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
    Post.findByIdAndUpdate(id, { $inc: { views: 1 } }).exec()

    const authResult = await requireUser(request)
    const currentUserId = authResult.success ? authResult.user._id.toString() : null

    // Handle author safely
    const author = post.author as any

    const postData = {
      _id: post._id.toString(),
      author: author ? {
        _id: author._id.toString(),
        username: author.username || '',
        firstName: author.firstName || '',
        lastName: author.lastName || '',
        avatar: author.avatar || '',
        isVerified: author.isVerified || false,
        isPro: author.isPro || false,
        followersCount: author.followers?.length || 0,
        followingCount: author.following?.length || 0,
        bio: author.bio || '',
        banner: author.banner || '',
      } : null,
      media: post.media || [],
      caption: post.caption || '',
      hashtags: post.hashtags || [],
      likesCount: post.likes?.length || 0,
      commentsCount: post.comments?.length || 0,
      savesCount: post.saves?.length || 0,
      createdAt: post.createdAt?.toISOString() || new Date().toISOString(),
      updatedAt: post.updatedAt?.toISOString() || new Date().toISOString(),
      containsVideo: post.containsVideo || false,
      views: post.views || 0,
      shares: post.shares || 0,
      isEdited: post.isEdited || false,
      isPublic: post.isPublic !== undefined ? post.isPublic : true,
      isFeatured: post.isFeatured || false,
      isSponsored: post.isSponsored || false,
      engagement: post.engagement || 0,
      comments: (post.comments || []).map((c: any) => ({
        _id: c._id.toString(),
        user: c.user ? {
          _id: c.user._id.toString(),
          username: c.user.username,
          firstName: c.user.firstName,
          lastName: c.user.lastName,
          avatar: c.user.avatar,
          isVerified: c.user.isVerified || false,
          isPro: c.user.isPro || false,
        } : null,
        text: c.text,
        likesCount: c.likes?.length || 0,
        repliesCount: c.replies?.length || 0,
        createdAt: c.createdAt?.toISOString() || new Date().toISOString(),
        isEdited: c.isEdited || false,
        isLiked: currentUserId ? c.likes?.some((l: any) => l.toString() === currentUserId) : false,
        canEdit: currentUserId ? c.user?._id.toString() === currentUserId : false,
      })),
      isLiked: currentUserId ? post.likes?.some((l: any) => l.toString() === currentUserId) : false,
      isSaved: currentUserId ? post.saves?.some((s: any) => s.toString() === currentUserId) : false,
      canEdit: currentUserId ? author?._id.toString() === currentUserId : false,
    }

    return mobileSuccess(postData)
  } catch (error: any) {
    console.error('Get post error:', error)
    return mobileError(error.message || 'Failed to fetch post', 500)
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireUser(request)

  if (!authResult.success) {
    return mobileError(authResult.error, authResult.status)
  }

  try {
    const { id } = await params

    if (!id || !isValidObjectId(id)) {
      return mobileError('Valid post ID is required', 400)
    }

    await connectToDatabase()

    const post = await Post.findById(id)
    if (!post) {
      return mobileError('Post not found', 404)
    }

    if (!canEditPost(authResult.user._id, post)) {
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

    const author = post.author as any

    return mobileSuccess({
      _id: post._id.toString(),
      author: author ? {
        _id: author._id.toString(),
        username: author.username,
        firstName: author.firstName,
        lastName: author.lastName,
        avatar: author.avatar,
        isVerified: author.isVerified || false,
        isPro: author.isPro || false,
      } : null,
      media: post.media || [],
      caption: post.caption || '',
      hashtags: post.hashtags || [],
      likesCount: post.likes?.length || 0,
      commentsCount: post.comments?.length || 0,
      savesCount: post.saves?.length || 0,
      createdAt: post.createdAt?.toISOString() || new Date().toISOString(),
      updatedAt: post.updatedAt?.toISOString() || new Date().toISOString(),
      containsVideo: post.containsVideo || false,
      views: post.views || 0,
      shares: post.shares || 0,
      isEdited: post.isEdited || false,
    }, 'Post updated successfully')
  } catch (error: any) {
    console.error('Update post error:', error)
    return mobileError(error.message || 'Failed to update post', 500)
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireUser(request)

  if (!authResult.success) {
    return mobileError(authResult.error, authResult.status)
  }

  try {
    const { id } = await params

    if (!id || !isValidObjectId(id)) {
      return mobileError('Valid post ID is required', 400)
    }

    await connectToDatabase()

    const post = await Post.findById(id)
    if (!post) {
      return mobileError('Post not found', 404)
    }

    if (!canEditPost(authResult.user._id, post) && authResult.user.role !== 'admin') {
      return mobileError('Not authorized to delete this post', 403)
    }

    await Post.findByIdAndDelete(id)

    return mobileSuccess({ deleted: true }, 'Post deleted successfully')
  } catch (error: any) {
    console.error('Delete post error:', error)
    return mobileError(error.message || 'Failed to delete post', 500)
  }
}