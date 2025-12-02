// app/api/posts/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import Post from '@/lib/models/Post';
import { ApiResponse } from '@/types/post';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id || id.length !== 24) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Valid post ID is required' },
        { status: 400 }
      );
    }

    await connectToDatabase();

    const post = await Post.findById(id)
      .populate('author', 'username firstName lastName avatar isVerified isPro followers following badges')
      .populate('comments.user', 'username firstName lastName avatar isVerified isPro');

    if (!post) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Post not found' },
        { status: 404 }
      );
    }

    // Increment view count
    post.views = (post.views || 0) + 1;
    await post.save();

    return NextResponse.json<ApiResponse>({
      success: true,
      data: post
    });
  } catch (error) {
    console.error('Error fetching post:', error);
    return NextResponse.json<ApiResponse>(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}