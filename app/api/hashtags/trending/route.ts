// app/api/hashtags/trending/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import Post from '@/lib/models/Post';
import "@/lib/loadmodels";

export async function GET(request: NextRequest) {
  try {
    await connectToDatabase();
    
    // Get trending hashtags from last 7 days
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    // Log to debug
    console.log('Fetching hashtags from:', oneWeekAgo);

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
      { $unwind: { 
        path: '$hashtags', 
        preserveNullAndEmptyArrays: false 
      }},
      {
        $match: {
          hashtags: { 
  $exists: true,
  $nin: [null, '']
}
        }
      },
      {
        $group: {
          _id: { $toLower: '$hashtags' }, // Case insensitive grouping
          count: { $sum: 1 },
          lastUsed: { $max: '$createdAt' }
        }
      },
      { 
        $sort: { 
          count: -1,
          lastUsed: -1 
        } 
      },
      { $limit: 20 }
    ]);

    console.log('Aggregation result:', posts.length, 'hashtags found');

    const hashtags = posts.map(item => ({
      tag: item._id,
      count: item.count,
      trendScore: Math.round(item.count * 100),
      lastUsed: item.lastUsed
    }));

    return NextResponse.json({
      success: true,
      hashtags
    });

  } catch (error: any) {
    console.error('Error fetching trending hashtags:', error);
    return NextResponse.json(
      { 
        success: false,
        error: error.message || 'Failed to fetch trending hashtags' 
      },
      { status: 500 }
    );
  }
}