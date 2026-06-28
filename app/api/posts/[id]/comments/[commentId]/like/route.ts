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
  { params }: { params: Promise<{ id: string; commentId: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id: postId, commentId } = await params;
    
    if (!postId || postId.length !== 24 || !commentId || commentId.length !== 24) {
      return NextResponse.json(
        { success: false, error: 'Valid IDs required' },
        { status: 400 }
      );
    }

    await connectToDatabase();

    const currentUser = await User.findOne({ clerkId: userId });
    if (!currentUser) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    const post = await Post.findById(postId);
    if (!post) {
      return NextResponse.json(
        { success: false, error: 'Post not found' },
        { status: 404 }
      );
    }

    // Find the comment by ID
    const comment = post.comments.find((c: any) => c._id.toString() === commentId);
    if (!comment) {
      return NextResponse.json(
        { success: false, error: 'Comment not found' },
        { status: 404 }
      );
    }

    const userIdObj = currentUser._id;
    const isLiked = comment.likes.some(
      (likeId: any) => likeId.toString() === userIdObj.toString()
    );

    if (isLiked) {
      // Unlike
      comment.likes = comment.likes.filter(
        (likeId: any) => likeId.toString() !== userIdObj.toString()
      );
    } else {
      // Like
      comment.likes.push(userIdObj);
      
      // Send notification to comment author if not liking own comment
      if (comment.user.toString() !== userIdObj.toString()) {
        await NotificationService.createNotification({
          userId: comment.user,
          type: 'like',
          fromUserId: userIdObj,
          postId: post._id as mongoose.Types.ObjectId,
          message: `${currentUser.username} liked your comment`,
          actionUrl: `/posts/${post._id}`
        });
      }
    }

    await post.save();

    // Populate data
    await post.populate({
      path: 'comments.user',
      select: 'username firstName lastName avatar isVerified isPro'
    });

    return NextResponse.json({
      success: true,
      data: {
        liked: !isLiked,
        likesCount: comment.likes.length,
        post
      }
    });
  } catch (error) {
    console.error('Error toggling comment like:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}