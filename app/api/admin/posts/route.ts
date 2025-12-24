// app/api/admin/posts/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { connectToDatabase } from '@/lib/mongodb';
import User from '@/lib/models/User';
import Post from '@/lib/models/Post';
import "@/lib/loadmodels";

export async function GET(request: NextRequest) {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();

    // Verify admin role
    const adminUser = await User.findOne({ clerkId: user.id });
    if (!adminUser || adminUser.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const type = searchParams.get('type') || 'all';
    const sort = searchParams.get('sort') || 'recent';

    // Build query
    const query: any = {};
    
    if (type === 'images') {
      query.containsVideo = false;
    } else if (type === 'videos') {
      query.containsVideo = true;
    }

    // Build sort
    const sortOptions: any = {};
    if (sort === 'recent') {
      sortOptions.createdAt = -1;
    } else if (sort === 'popular') {
      sortOptions.likes = -1;
    } else if (sort === 'engagement') {
      sortOptions.engagement = -1;
    }

    const [posts, total] = await Promise.all([
      Post.find(query)
        .populate('author', 'username firstName lastName avatar')
        .sort(sortOptions)
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Post.countDocuments(query)
    ]);

    return NextResponse.json({
      success: true,
      posts: posts.map(post => ({
        ...post,
        _id: post._id.toString(),
        author: post.author ? {
          ...post.author,
          _id: post.author._id.toString()
        } : null
      })),
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error: any) {
    console.error('Error fetching admin posts:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}