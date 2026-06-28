//app/api/posts/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { connectToDatabase } from '@/lib/mongodb';
import User from '@/lib/models/User';
import Post from '@/lib/models/Post';
import { PostService } from '@/lib/services/post-service';
import "@/lib/loadmodels";

export async function POST(request: NextRequest) {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    await connectToDatabase();

    // Get user from database
    const dbUser = await User.findOne({ clerkId: user.id });
    if (!dbUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    const data = await request.json();
    const { caption, hashtags, media } = data;

    // Validate required fields
    if (!caption || !media || !Array.isArray(media) || media.length === 0) {
      return NextResponse.json(
        { error: 'Caption and at least one media item are required' },
        { status: 400 }
      );
    }

    // Validate media array
    const validMedia = media.map((item: any, index: number) => {
      if (!item.type || !item.url) {
        throw new Error(`Invalid media item at index ${index}`);
      }
      
      if (!['image', 'video'].includes(item.type)) {
        throw new Error(`Invalid media type at index ${index}`);
      }

      return {
        ...item,
        order: item.order !== undefined ? item.order : index
      };
    });

    // Create post
    const post = await PostService.createPost(dbUser._id, {
      caption: caption.substring(0, 2200),
      hashtags: hashtags ? hashtags.map((tag: string) => tag.toLowerCase()) : [],
      media: validMedia,
      author: dbUser._id
    });

    // Convert to JSON
    const postJson = post.toJSON();
    
    return NextResponse.json({
      success: true,
      data: {
        ...postJson,
        _id: postJson._id.toString(),
        author: {
          ...postJson.author,
          _id: postJson.author._id.toString()
        }
      },
      message: 'Post created successfully'
    });

  } catch (error: any) {
    console.error('Error creating post:', error);
    return NextResponse.json(
      { 
        success: false,
        error: error.message || 'Failed to create post' 
      },
      { status: 500 }
    );
  }
}


export async function GET(request: NextRequest) {
  try {
    await connectToDatabase();
    
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const userId = searchParams.get('userId');
    const hashtag = searchParams.get('hashtag');
    const mediaType = searchParams.get('mediaType');
    const sort = searchParams.get('sort') || 'recent';

    const filters: any = {};
    
    if (userId) {
      filters.userId = userId;
    }
    
    if (hashtag) {
      filters.hashtags = [hashtag.toLowerCase()];
    }
    
    if (mediaType) {
      filters.mediaType = mediaType;
    }
    
    filters.sort = sort;

    const result = await PostService.explorePosts(page, limit, filters);

    // Transform the posts to include counts
    const transformedPosts = result.posts.map((post: any) => {
      // Calculate counts
      const likesCount = Array.isArray(post.likes) ? post.likes.length : 0;
      const savesCount = Array.isArray(post.saves) ? post.saves.length : 0;
      const commentsCount = Array.isArray(post.comments) ? post.comments.length : 0;
      
      // Ensure author is properly populated
      let author = post.author;
      if (typeof post.author === 'string') {
        // If author is just an ID, we need to fetch it separately
        // For now, create a minimal author object
        author = {
          _id: post.author,
          username: 'unknown',
          firstName: 'Unknown',
          lastName: 'User',
          avatar: '',
          isVerified: false,
          isPro: false
        };
      }

      return {
        ...post,
        _id: post._id.toString(),
        author: {
          ...author,
          _id: author._id ? author._id.toString() : author._id
        },
        likesCount,
        savesCount,
        commentsCount,
        // Also keep the arrays for backward compatibility
        likes: post.likes || [],
        saves: post.saves || [],
        comments: post.comments || []
      };
    });

    return NextResponse.json({
      success: true,
      posts: transformedPosts,
      pagination: result.pagination
    });

  } catch (error: any) {
    console.error('Error fetching posts:', error);
    return NextResponse.json(
      { 
        success: false,
        error: error.message || 'Failed to fetch posts' 
      },
      { status: 500 }
    );
  }
}