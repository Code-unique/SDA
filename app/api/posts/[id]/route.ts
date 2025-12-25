import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import Post from '@/lib/models/Post';
import "@/lib/loadmodels";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    if (!id || id.length !== 24) {
      return NextResponse.json({ success: false, error: 'Valid post ID is required' }, { status: 400 });
    }

    await connectToDatabase();

    const post = await Post.findById(id)
      .populate('author', 'username firstName lastName avatar isVerified isPro followers following badges bio banner')
      .populate({
        path: 'comments.user',
        select: 'username firstName lastName avatar isVerified isPro'
      })
      .lean();

    if (!post) {
      return NextResponse.json({ success: false, error: 'Post not found' }, { status: 404 });
    }

    // Increment view count (fire and forget for performance, or await if critical)
    Post.findByIdAndUpdate(id, { $inc: { views: 1 } }).exec();

    return NextResponse.json({ success: true, data: post });
  } catch (error) {
    console.error('Error fetching post:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}