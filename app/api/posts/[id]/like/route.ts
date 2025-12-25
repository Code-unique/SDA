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
    if (!userId) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    if (!id || id.length !== 24) {
      return NextResponse.json({ success: false, error: 'Invalid post ID' }, { status: 400 });
    }

    await connectToDatabase();

    const currentUser = await User.findOne({ clerkId: userId });
    if (!currentUser) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
    }

    const post = await Post.findById(id).populate('author');
    if (!post) {
      return NextResponse.json({ success: false, error: 'Post not found' }, { status: 404 });
    }

    const userIdStr = currentUser._id.toString();
    const isLiked = post.likes.some((likeId: any) => likeId.toString() === userIdStr);

    if (isLiked) {
      // Unlike
      post.likes = post.likes.filter((likeId: any) => likeId.toString() !== userIdStr);
    } else {
      // Like
      post.likes.push(currentUser._id);
      
      // Create notification if not liking own post
      if (post.author._id.toString() !== userIdStr) {
        await NotificationService.createNotification({
          userId: post.author._id,
          type: 'like',
          fromUserId: currentUser._id,
          postId: post._id as mongoose.Types.ObjectId,
          message: `${currentUser.username} liked your post`,
          actionUrl: `/posts/${post._id}`
        });
      }
    }

    await post.save();

    // Re-populate for consistent response format
    await post.populate('author', 'username firstName lastName avatar isVerified isPro');
    await post.populate('comments.user', 'username firstName lastName avatar isVerified isPro');

    return NextResponse.json({
      success: true,
      data: {
        liked: !isLiked,
        likesCount: post.likes.length,
        post: post 
      }
    });
  } catch (error) {
    console.error('Error toggling like:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}