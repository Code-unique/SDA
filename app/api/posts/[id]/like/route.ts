// app/api/posts/[id]/like/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { connectToDatabase } from '@/lib/mongodb';
import User from '@/lib/models/User';
import Post from '@/lib/models/Post';
import { ApiResponse } from '@/types/post';
import { NotificationService } from '@/lib/services/notificationService';
import mongoose from 'mongoose';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id } = await params;
    if (!id) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Post ID is required' },
        { status: 400 }
      );
    }

    await connectToDatabase();

    const currentUser = await User.findOne({ clerkId: userId });
    if (!currentUser) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    const post = await Post.findById(id).populate('author');
    if (!post) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Post not found' },
        { status: 404 }
      );
    }

    const isLiked = post.likes.some(
      (likeId: any) => likeId.toString() === currentUser._id.toString()
    );

    if (isLiked) {
      // Unlike
      post.likes = post.likes.filter(
        (likeId: any) => likeId.toString() !== currentUser._id.toString()
      );
    } else {
      // Like
      post.likes.push(currentUser._id);
      
      // Create notification for post author if not liking own post
      if (post.author._id.toString() !== currentUser._id.toString()) {
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

    // Populate after save
    await post.populate('author', 'username firstName lastName avatar isVerified isPro');
    await post.populate('comments.user', 'username firstName lastName avatar isVerified isPro');

    return NextResponse.json<ApiResponse>({
      success: true,
      data: {
        liked: !isLiked,
        likesCount: post.likes.length,
        post: {
          _id: post._id,
          author: post.author,
          caption: post.caption,
          media: post.media,
          likes: post.likes,
          comments: post.comments,
          createdAt: post.createdAt,
          updatedAt: post.updatedAt,
          isLiked: !isLiked
        }
      }
    });
  } catch (error) {
    console.error('Error liking post:', error);
    return NextResponse.json<ApiResponse>(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Add GET endpoint to check like status
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json<ApiResponse>({
        success: true,
        data: { liked: false, likesCount: 0 }
      });
    }

    const { id } = await params;
    if (!id) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Post ID is required' },
        { status: 400 }
      );
    }

    await connectToDatabase();

    const currentUser = await User.findOne({ clerkId: userId });
    const post = await Post.findById(id).populate('author');

    if (!post) {
      return NextResponse.json<ApiResponse>({
        success: true,
        data: { liked: false, likesCount: 0 }
      });
    }

    const liked = currentUser 
      ? post.likes.some(
          (likeId: any) => likeId.toString() === currentUser._id.toString()
        )
      : false;

    return NextResponse.json<ApiResponse>({
      success: true,
      data: {
        liked,
        likesCount: post.likes.length,
        postId: post._id
      }
    });
  } catch (error) {
    console.error('Error checking like status:', error);
    return NextResponse.json<ApiResponse>({
      success: true,
      data: { liked: false, likesCount: 0 }
    });
  }
}