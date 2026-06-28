// app/api/mobile/posts/featured/route.ts
import { NextRequest } from 'next/server'
import { connectToDatabase } from '@/lib/mongodb'
import Post from '@/lib/models/Post'
import { mobileResponse, mobileError } from '@/lib/mobile-auth'
import "@/lib/loadmodels"

export async function GET(request: NextRequest) {
  try {
    await connectToDatabase()

    const { searchParams } = new URL(request.url)
    const limit = Math.min(parseInt(searchParams.get('limit') || '3'), 20)
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
    const skip = (page - 1) * limit

    const posts = await Post.aggregate([
      { $match: { isPublic: true, isFeatured: true } },
      {
        $addFields: {
          engagement: {
            $add: [
              { $size: '$likes' },
              { $size: '$comments' },
              { $multiply: ['$views', 0.1] }
            ]
          }
        }
      },
      { $sort: { engagement: -1, createdAt: -1 } },
      { $skip: skip },
      { $limit: limit },
      {
        $lookup: {
          from: 'users',
          localField: 'author',
          foreignField: '_id',
          as: 'author'
        }
      },
      { $unwind: '$author' }
    ])

    const total = await Post.countDocuments({ isPublic: true, isFeatured: true })

    const formattedPosts = posts.map((post: any) => ({
      ...post,
      _id: post._id.toString(),
      author: {
        ...post.author,
        _id: post.author._id.toString()
      },
      likesCount: post.likes?.length || 0,
      commentsCount: post.comments?.length || 0,
      savesCount: post.saves?.length || 0
    }))

    return mobileResponse({
      posts: formattedPosts,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
        hasMore: page < Math.ceil(total / limit)
      }
    })
  } catch (error: any) {
    console.error('Mobile featured error:', error)
    return mobileError(error.message || 'Failed to fetch featured posts', 500)
  }
}