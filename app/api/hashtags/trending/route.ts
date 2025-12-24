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

    const posts = await Post.aggregate([
      {
        $match: {
          createdAt: { $gte: oneWeekAgo },
          isPublic: true
        }
      },
      { $unwind: '$hashtags' },
      {
        $group: {
          _id: '$hashtags',
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } },
      { $limit: 20 }
    ]);

    const hashtags = posts.map(item => ({
      tag: item._id,
      count: item.count
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