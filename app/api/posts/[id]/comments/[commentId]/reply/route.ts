import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { connectToDatabase } from '@/lib/mongodb';
import User from '@/lib/models/User';
import Post from '@/lib/models/Post';
import { NotificationService } from '@/lib/services/notificationService';
import mongoose from 'mongoose';
import "@/lib/loadmodels";

interface IComment {
  _id: mongoose.Types.ObjectId;
  user: mongoose.Types.ObjectId;
  text: string;
  likes: mongoose.Types.ObjectId[];
  replies: mongoose.Types.ObjectId[];
  parentComment?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
  isEdited: boolean;
}

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
        { success: false, error: 'Valid post and comment ID required' },
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

    const body = await request.json();
    const { text } = body;

    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: 'Reply text is required' },
        { status: 400 }
      );
    }

    if (text.length > 500) {
      return NextResponse.json(
        { success: false, error: 'Reply too long (max 500 characters)' },
        { status: 400 }
      );
    }

    // Find the parent comment - cast to any to access id method
    const commentsArray = post.comments as any as IComment[];
    const parentComment = commentsArray.find((comment: IComment) => 
      comment._id.toString() === commentId
    );
    
    if (!parentComment) {
      return NextResponse.json(
        { success: false, error: 'Comment not found' },
        { status: 404 }
      );
    }

    // Create reply as a separate comment with parent reference
    const reply: IComment = {
      _id: new mongoose.Types.ObjectId(),
      user: currentUser._id as mongoose.Types.ObjectId,
      text: text.trim(),
      likes: [],
      replies: [], // Empty array for this reply's own replies
      parentComment: parentComment._id, // Set parent
      createdAt: new Date(),
      updatedAt: new Date(),
      isEdited: false
    };

    // Add to post's comments array (this makes it a top-level comment with parent reference)
    post.comments.push(reply as any);

    await post.save();

    // Populate all comments including the new reply
    await post.populate({
      path: 'comments.user',
      select: 'username firstName lastName avatar isVerified isPro'
    });

    // Send notification to parent comment author if it's not the same user
    if (parentComment.user.toString() !== currentUser._id.toString()) {
      await NotificationService.createNotification({
        userId: parentComment.user,
        type: 'comment',
        fromUserId: currentUser._id,
        postId: post._id as mongoose.Types.ObjectId,
        message: `${currentUser.username} replied to your comment`,
        actionUrl: `/posts/${post._id}`
      });
    }

    return NextResponse.json({
      success: true,
      data: post
    });
  } catch (error) {
    console.error('Error adding reply:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}