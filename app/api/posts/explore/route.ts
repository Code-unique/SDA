// app/api/posts/explore/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import PostModel from '@/lib/models/Post';
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
    if (hashtag) {
      filters.hashtags = { $in: [hashtag.toLowerCase()] };
    }
    
    // Search Filter
    if (search) {
      const searchRegex = new RegExp(search, 'i');
      filters.$or = [
        { caption: { $regex: searchRegex } },
        { hashtags: { $in: [search.toLowerCase()] } }
      ];
    }
    
    // Sort Logic
    let sortOptions: any = { createdAt: -1 };
    if (sort === 'popular') {
      sortOptions = { likesCount: -1, createdAt: -1 };
    } else if (sort === 'trending') {
      sortOptions = { engagement: -1, createdAt: -1 };
    }

    // Build query
    const query = PostModel.find(filters)
      .populate('author', 'username firstName lastName avatar isVerified isPro')
      .sort(sortOptions);

    // Execute query with pagination
    const [posts, total] = await Promise.all([
      query
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      PostModel.countDocuments(filters)
    ]);

    // Transform the posts
    const transformedPosts = posts.map(post => {
      const postObj = post as any;
      
      return {
        _id: postObj._id.toString(),
        author: postObj.author ? {
          _id: postObj.author._id?.toString() || '',
          username: postObj.author.username || '',
          firstName: postObj.author.firstName || '',
          lastName: postObj.author.lastName || '',
          avatar: postObj.author.avatar || '',
          isVerified: postObj.author.isVerified || false,
          isPro: postObj.author.isPro || false
        } : null,
        media: postObj.media || [],
        caption: postObj.caption || '',
        hashtags: postObj.hashtags || [],
        likesCount: postObj.likes?.length || 0,
        savesCount: postObj.saves?.length || 0,
        commentsCount: postObj.comments?.length || 0,
        createdAt: postObj.createdAt?.toISOString() || new Date().toISOString(),
        containsVideo: postObj.containsVideo || false,
        views: postObj.views || 0,
        category: postObj.category || '',
        location: postObj.location || '',
        isSponsored: postObj.isSponsored || false,
        isFeatured: postObj.isFeatured || false,
        availableForSale: postObj.availableForSale || false,
        price: postObj.price || 0,
        currency: postObj.currency || 'USD',
        shares: postObj.shares || 0,
        engagement: postObj.engagement || 0,
        aiGenerated: postObj.aiGenerated || false,
        isPublic: postObj.isPublic || true,
        tags: postObj.tags || []
      };
    });

    return NextResponse.json({
      success: true,
      posts: transformedPosts,
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
    return NextResponse.json({ 
      success: false, 
      error: error.message || 'Failed to fetch posts' 
    }, { status: 500 });
  }
}