// app/api/mobile/users/[id]/posts/route.ts
import { NextRequest } from 'next/server'
import { connectToDatabase } from '@/lib/mongodb'
import User from '@/lib/models/User'
import Post from '@/lib/models/Post'
import { requireUser, resolveUser } from '@/lib/mobile/auth'
import { mobileSuccess, mobileError, mobilePaginated } from '@/lib/mobile/responses'
import { isValidObjectId, parsePagination } from '@/lib/mobile/validation'
import "@/lib/loadmodels"

/**
 * GET /api/mobile/users/:id/posts
 * Get posts by a user
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { searchParams } = new URL(request.url)
    const { page, limit } = parsePagination(searchParams)

    if (!id) {
      return mobileError('User ID is required', 400)
    }

    await connectToDatabase()

    let user
    if (isValidObjectId(id)) {
      user = await User.findById(id)
    } else {
      user = await User.findOne({ username: id })
    }

    if (!user) {
      return mobileError('User not found', 404)
    }

    const [posts, total] = await Promise.all([
      Post.find({ author: user._id, isPublic: true })
        .populate('author', 'username firstName lastName avatar isVerified isPro')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Post.countDocuments({ author: user._id, isPublic: true })
    ])

    const transformedPosts = posts.map((post: any) => ({
      _id: post._id.toString(),
      author: post.author ? {
        _id: post.author._id.toString(),
        username: post.author.username,
        firstName: post.author.firstName,
        lastName: post.author.lastName,
        avatar: post.author.avatar,
        isVerified: post.author.isVerified || false,
        isPro: post.author.isPro || false,
      } : null,
      media: post.media || [],
      caption: post.caption || '',
      hashtags: post.hashtags || [],
      likesCount: post.likes?.length || 0,
      commentsCount: post.comments?.length || 0,
      savesCount: post.saves?.length || 0,
      createdAt: post.createdAt?.toISOString() || new Date().toISOString(),
      containsVideo: post.containsVideo || false,
      views: post.views || 0,
      shares: post.shares || 0,
    }))

    return mobilePaginated(transformedPosts, { page, limit, total })
  } catch (error: any) {
    console.error('Get user posts error:', error)
    return mobileError(error.message || 'Failed to fetch posts', 500)
  }
}