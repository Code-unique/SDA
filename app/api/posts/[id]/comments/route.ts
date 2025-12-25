import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { connectToDatabase } from '@/lib/mongodb';
import User from '@/lib/models/User';
import Post from '@/lib/models/Post';
import { NotificationService } from '@/lib/services/notificationService';
import mongoose from 'mongoose';
import "@/lib/loadmodels";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    if (!id || id.length !== 24) {
      return NextResponse.json({ success: false, error: 'Valid post ID is required' }, { status: 400 });
    }

    await connectToDatabase();

    const currentUser = await User.findOne({ clerkId: userId });
    if (!currentUser) return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });

    const post = await Post.findById(id).populate('author');
    if (!post) return NextResponse.json({ success: false, error: 'Post not found' }, { status: 404 });

    const body = await request.json();
    const { text } = body;

    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      return NextResponse.json({ success: false, error: 'Comment text is required' }, { status: 400 });
    }

    if (text.length > 1000) {
      return NextResponse.json({ success: false, error: 'Comment too long (max 1000 characters)' }, { status: 400 });
    }

    post.comments.push({
      _id: new mongoose.Types.ObjectId(),
      user: currentUser._id,
      text: text.substring(0, 1000),
      likes: [],
      replies: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      isEdited: false
    });

    await post.save();

    await post.populate('comments.user', 'username firstName lastName avatar isVerified isPro');

    if (post.author._id.toString() !== currentUser._id.toString()) {
      await NotificationService.createNotification({
        userId: post.author._id,
        type: 'comment',
        fromUserId: currentUser._id,
        postId: post._id as mongoose.Types.ObjectId,
        message: `${currentUser.username} commented on your post`,
        actionUrl: `/posts/${post._id}`
      });
    }

    return NextResponse.json({ success: true, data: post });
  } catch (error) {
    console.error('Error adding comment:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

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
      .populate('comments.user', 'username firstName lastName avatar isVerified isPro')
      .select('comments');

    if (!post) return NextResponse.json({ success: false, error: 'Post not found' }, { status: 404 });

    return NextResponse.json({ success: true, data: { comments: post.comments } });
  } catch (error) {
    console.error('Error fetching comments:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}