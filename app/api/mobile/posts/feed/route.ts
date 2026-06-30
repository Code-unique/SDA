// app/api/mobile/posts/feed/route.ts
import { NextRequest } from 'next/server'
import { connectToDatabase } from '@/lib/mongodb'
import User from '@/lib/models/User'
import Post from '@/lib/models/Post'
import { requireUser } from '@/lib/mobile/auth'
import { mobileSuccess, mobileError, mobilePaginated } from '@/lib/mobile/responses'
import { parsePagination } from '@/lib/mobile/validation'
import "@/lib/loadmodels"

/**
 * GET /api/mobile/posts/feed
 * Get feed posts from followed users
 */
export async function GET(request: NextRequest) {
  const authResult = await requireUser(request)

  if (!authResult.success) {
    return mobileError(authResult.error, authResult.status)
  }

  try {
    const { searchParams } = new URL(request.url)
    const { page, limit } = parsePagination(searchParams)

    await connectToDatabase()

    const user = await User.findById(authResult.user._id)
    if (!user) {
      return mobileError('User not found', 404)
    }

    const feedUserIds = [...(user.following || []), user._id]

    const [posts, total] = await Promise.all([
      Post.find({
        author: { $in: feedUserIds },
        isPublic: true
      })
        .populate('author', 'username firstName lastName avatar isVerified isPro')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Post.countDocuments({
        author: { $in: feedUserIds },
        isPublic: true
      })
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
    console.error('Feed error:', error)
    return mobileError(error.message || 'Failed to fetch feed', 500)
  }
}