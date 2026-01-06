//app/api/posts/explore/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import Post from '@/lib/models/Post';
import "@/lib/loadmodels";

export async function GET(request: NextRequest) {
  try {
    await connectToDatabase();
    
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = Math.min(parseInt(searchParams.get('limit') || '12'), 50);
    const type = searchParams.get('type') || 'all';
    const sort = searchParams.get('sort') || 'trending';
    const hashtag = searchParams.get('hashtag');
    const search = searchParams.get('search');

    const filters: any = { isPublic: true };
    
    // Media Type Filter
    if (type === 'images') filters.containsVideo = false;
    else if (type === 'videos') filters.containsVideo = true;
    
    // Hashtag Filter
    if (hashtag) filters.hashtags = { $in: [hashtag.toLowerCase()] };
    
    // Search Filter
    if (search) {
      filters.$or = [
        { caption: { $regex: search, $options: 'i' } },
        { hashtags: { $in: [new RegExp(`^${search}$`, 'i')] } }
      ];
    }
    
    // Sort Logic
    let sortOptions: any = { createdAt: -1 };
    if (sort === 'popular') sortOptions = { likes: -1, createdAt: -1 };
    else if (sort === 'trending') sortOptions = { engagement: -1, createdAt: -1 };

    const [posts, total] = await Promise.all([
      Post.find(filters)
        .populate('author', 'username firstName lastName avatar isVerified isPro')
        .sort(sortOptions)
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Post.countDocuments(filters)
    ]);

    return NextResponse.json({
      success: true,
      posts: posts.map(post => ({
        ...post,
        _id: post._id.toString(),
        author: post.author ? { ...post.author, _id: post.author._id.toString() } : null,
        // Pre-calculate counts for frontend performance
        likesCount: post.likes?.length || 0,
        savesCount: post.saves?.length || 0,
        commentsCount: post.comments?.length || 0
      })),
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
        hasMore: page < Math.ceil(total / limit)
      }
    });

  } catch (error: any) {
    console.error('Error fetching explore posts:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}