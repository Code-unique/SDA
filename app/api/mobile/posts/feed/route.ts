// app/api/mobile/posts/feed/route.ts
import { NextRequest } from 'next/server'
import { connectToDatabase } from '@/lib/mongodb'
import User from '@/lib/models/User'
import Post from '@/lib/models/Post'
import { authenticateMobileRequest, mobileResponse, mobileError } from '@/lib/mobile-auth'
import "@/lib/loadmodels"

export async function GET(request: NextRequest) {
  try {
    const auth = await authenticateMobileRequest(request)
    if (!auth.success) {
      return mobileError(auth.error || 'Unauthorized', auth.status || 401)
    }

    await connectToDatabase()

    const { searchParams } = new URL(request.url)
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
    const limit = Math.max(1, Math.min(50, parseInt(searchParams.get('limit') || '10')))

    const user = await User.findById(auth.user._id)
    if (!user) {
      return mobileError('User not found', 404)
    }

    // If user has no following, return empty feed
    const feedUserIds = [...(user.following || []), user._id]
    
    if (feedUserIds.length === 0) {
      return mobileResponse({
        posts: [],
        pagination: {
          page,
          limit,
          total: 0,
          pages: 0,
          hasMore: false
        }
      })
    }

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
      ...post,
      _id: post._id.toString(),
      author: post.author ? {
        ...post.author,
        _id: post.author._id.toString()
      } : null,
      likesCount: post.likes?.length || 0,
      commentsCount: post.comments?.length || 0,
      savesCount: post.saves?.length || 0
    }))

    return mobileResponse({
      posts: transformedPosts,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
        hasMore: page < Math.ceil(total / limit)
      }
    })
  } catch (error: any) {
    console.error('Mobile feed error:', error)
    return mobileError(error.message || 'Failed to fetch feed', 500)
  }
}