import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { connectToDatabase } from '@/lib/mongodb';
import User from '@/lib/models/User';
import Post from '@/lib/models/Post';
import mongoose from 'mongoose';
import "@/lib/loadmodels";

export async function PATCH(
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

    const body = await request.json();
    const { text } = body;

    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: 'Comment text is required' },
        { status: 400 }
      );
    }

    if (text.length > 1000) {
      return NextResponse.json(
        { success: false, error: 'Comment too long (max 1000 characters)' },
        { status: 400 }
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

    // Check if user owns the comment
    if (comment.user.toString() !== currentUser._id.toString()) {
      return NextResponse.json(
        { success: false, error: 'Not authorized to edit this comment' },
        { status: 403 }
      );
    }

    // Update comment
    comment.text = text.trim();
    comment.isEdited = true;
    comment.updatedAt = new Date();

    await post.save();

    // Populate data
    await post.populate({
      path: 'comments.user',
      select: 'username firstName lastName avatar isVerified isPro'
    });

    return NextResponse.json({
      success: true,
      data: post
    });
  } catch (error) {
    console.error('Error editing comment:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
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

    // Check if user owns the comment or is post author/admin
    const isCommentOwner = comment.user.toString() === currentUser._id.toString();
    const isPostOwner = post.author.toString() === currentUser._id.toString();
    
    if (!isCommentOwner && !isPostOwner) {
      return NextResponse.json(
        { success: false, error: 'Not authorized to delete this comment' },
        { status: 403 }
      );
    }

    // Find all reply IDs (including nested replies)
    const findAllReplies = (parentId: string): string[] => {
      const replies: string[] = [];
      
      // Get direct replies
      const directReplies = post.comments.filter(
        (c: any) => c.parentComment && c.parentComment.toString() === parentId
      );
      
      directReplies.forEach((reply: any) => {
        replies.push(reply._id.toString());
        // Recursively find nested replies
        const nestedReplies = findAllReplies(reply._id.toString());
        replies.push(...nestedReplies);
      });
      
      return replies;
    };

    // If this is a reply (has parentComment)
    if (comment.parentComment) {
      // Remove from parent's replies array
      const parentComment = post.comments.find((c: any) => 
        c._id.toString() === comment.parentComment?.toString()
      );
      if (parentComment) {
        parentComment.replies = parentComment.replies.filter(
          (replyId: any) => replyId.toString() !== commentId
        );
      }
      
      // Remove this comment and all its replies
      const allReplyIds = findAllReplies(commentId);
      const allCommentIds = [commentId, ...allReplyIds];
      
      post.comments = post.comments.filter(
        (c: any) => !allCommentIds.includes(c._id.toString())
      );
    } else {
      // If this is a parent comment, delete it and all its replies
      const allReplyIds = findAllReplies(commentId);
      const allCommentIds = [commentId, ...allReplyIds];
      
      post.comments = post.comments.filter(
        (c: any) => !allCommentIds.includes(c._id.toString())
      );
    }

    await post.save();

    return NextResponse.json({
      success: true,
      data: { message: 'Comment deleted successfully' }
    });
  } catch (error) {
    console.error('Error deleting comment:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}