// app/api/posts/featured/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import Post from '@/lib/models/Post';
import { ApiResponse, PaginatedResponse } from '@/types/post';
import { Post as PostType } from '@/types/post';
import "@/lib/loadmodels";

export async function GET(request: NextRequest) {
  try {
    await connectToDatabase();

    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get('limit') || '3'), 20);
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));

    const skip = (page - 1) * limit;

    // Get featured posts based on engagement (likes + comments)
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
      { $unwind: '$author' },
      {
        $project: {
          caption: 1,
          media: 1,
          likes: 1,
          comments: 1,
          createdAt: 1,
          hashtags: 1,
          views: 1,
          engagement: 1,
          isFeatured: 1,
          'author.firstName': 1,
          'author.lastName': 1,
          'author.avatar': 1,
          'author.username': 1,
          'author.isVerified': 1,
          'author.isPro': 1
        }
      }
    ]);

    const totalPosts = await Post.countDocuments({ isPublic: true, isFeatured: true });

    // Convert _id to string
    const formattedPosts = posts.map((post: any) => ({
      ...post,
      _id: post._id.toString(),
      author: {
        ...post.author,
        _id: post.author._id.toString()
      }
    }));

    // Create the paginated response correctly
    const paginatedResponse: PaginatedResponse<PostType> = {
      data: formattedPosts,
      total: totalPosts,
      page: page,
      limit: limit,
      totalPages: Math.ceil(totalPosts / limit),
      hasNextPage: page < Math.ceil(totalPosts / limit),
      hasPrevPage: page > 1
    };

    return NextResponse.json<ApiResponse<PaginatedResponse<PostType>>>({
      success: true,
      data: paginatedResponse
    });
  } catch (error: any) {
    console.error('Error fetching featured posts:', error);
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}