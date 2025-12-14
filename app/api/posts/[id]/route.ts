// app/api/posts/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import Post from '@/lib/models/Post';
import { ApiResponse } from '@/types/post';
import "@/lib/loadmodels";
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    console.log('Fetching post ID:', id);
    
    if (!id || id.length !== 24) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Valid post ID is required',
          data: null 
        },
        { status: 400 }
      );
    }

    await connectToDatabase();

    const post = await Post.findById(id)
      .populate('author', 'username firstName lastName avatar isVerified isPro followers following badges bio banner')
      .populate({
        path: 'comments.user',
        select: 'username firstName lastName avatar isVerified isPro'
      })
      .populate('likes', '_id')
      .populate('saves', '_id')
      .lean();

    if (!post) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Post not found',
          data: null 
        },
        { status: 404 }
      );
    }

    // Increment view count
    await Post.findByIdAndUpdate(id, { $inc: { views: 1 } });

    return NextResponse.json({
      success: true,
      data: post
    });
  } catch (error) {
    console.error('Error fetching post:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Internal server error',
        data: null 
      },
      { status: 500 }
    );
  }
}