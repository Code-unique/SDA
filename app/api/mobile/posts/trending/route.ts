// app/api/mobile/posts/trending/route.ts
import { NextRequest } from 'next/server'
import { connectToDatabase } from '@/lib/mongodb'
import Post from '@/lib/models/Post'
import { mobileResponse, mobileError } from '@/lib/mobile-auth'
import "@/lib/loadmodels"

export async function GET(request: NextRequest) {
  try {
    await connectToDatabase()
    
    const oneWeekAgo = new Date()
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7)

    const posts = await Post.aggregate([
      {
        $match: {
          createdAt: { $gte: oneWeekAgo },
          isPublic: true,
          $or: [
            { hashtags: { $exists: true, $ne: [] } },
            { hashtags: { $exists: true, $ne: null } }
          ]
        }
      },
      { $unwind: { path: '$hashtags', preserveNullAndEmptyArrays: false } },
      { $match: { hashtags: { $exists: true, $nin: [null, ''] } } },
      {
        $group: {
          _id: { $toLower: '$hashtags' },
          count: { $sum: 1 },
          lastUsed: { $max: '$createdAt' }
        }
      },
      { $sort: { count: -1, lastUsed: -1 } },
      { $limit: 20 }
    ])

    const hashtags = posts.map(item => ({
      tag: item._id,
      count: item.count,
      trendScore: Math.round(item.count * 100),
      lastUsed: item.lastUsed
    }))

    return mobileResponse({ hashtags })
  } catch (error: any) {
    console.error('Mobile trending hashtags error:', error)
    return mobileError(error.message || 'Failed to fetch trending hashtags', 500)
  }
}