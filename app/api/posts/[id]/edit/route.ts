import { NextRequest, NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { connectToDatabase } from '@/lib/mongodb';
import User from '@/lib/models/User';
import Post from '@/lib/models/Post';
import "@/lib/loadmodels";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    await connectToDatabase();

    const dbUser = await User.findOne({ clerkId: user.id });
    if (!dbUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    const { id } = await params;
    
    if (!id || id.length !== 24) {
      return NextResponse.json(
        { error: 'Invalid post ID' },
        { status: 400 }
      );
    }

    const post = await Post.findById(id);
    if (!post) {
      return NextResponse.json(
        { error: 'Post not found' },
        { status: 404 }
      );
    }

    // Check if user is the author
    if (post.author.toString() !== dbUser._id.toString()) {
      return NextResponse.json(
        { error: 'Not authorized to edit this post' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { caption, hashtags, media } = body;

    // Validate required fields
    if (!caption || caption.trim().length === 0) {
      return NextResponse.json(
        { error: 'Caption is required' },
        { status: 400 }
      );
    }

    // Update post
    post.caption = caption.substring(0, 2200);
    post.hashtags = hashtags ? hashtags.map((tag: string) => tag.toLowerCase()) : [];
    post.isEdited = true;
    post.updatedAt = new Date();

    // Update media if provided
    if (media && Array.isArray(media)) {
      // Validate media constraints
      if (media.length > 4) {
        return NextResponse.json(
          { error: 'Maximum 4 media items allowed' },
          { status: 400 }
        );
      }

      const videoCount = media.filter((item: any) => item.type === 'video').length;
      if (videoCount > 1) {
        return NextResponse.json(
          { error: 'Only one video allowed per post' },
          { status: 400 }
        );
      }

      const totalDuration = media.reduce((sum: number, item: any) => {
        return item.type === 'video' ? sum + (item.duration || 0) : sum;
      }, 0);

      if (totalDuration > 120) {
        return NextResponse.json(
          { error: 'Total video duration cannot exceed 2 minutes' },
          { status: 400 }
        );
      }

      // Update media with proper ordering
      post.media = media.map((item: any, index: number) => ({
        ...item,
        order: item.order !== undefined ? item.order : index
      }));
    }

    await post.save();

    // Populate data
    await post.populate('author', 'username firstName lastName avatar isVerified isPro');
    await post.populate('comments.user', 'username firstName lastName avatar isVerified isPro');

    // Get populated author data
    const populatedPost = await Post.findById(post._id)
      .populate('author', 'username firstName lastName avatar isVerified isPro')
      .populate('comments.user', 'username firstName lastName avatar isVerified isPro')
      .lean(); // Use lean() to get plain object

    if (!populatedPost) {
      return NextResponse.json(
        { error: 'Failed to load updated post' },
        { status: 500 }
      );
    }

    // populatedPost is already a plain object from lean()
    const populatedPostObj = populatedPost;
    const authorData = populatedPostObj.author as any;

    return NextResponse.json({
      success: true,
      data: {
        ...populatedPostObj,
        _id: populatedPostObj._id.toString(),
        author: {
          ...authorData,
          _id: authorData._id.toString()
        }
      },
      message: 'Post updated successfully'
    });
  } catch (error: any) {
    console.error('Error updating post:', error);
    return NextResponse.json(
      { 
        success: false,
        error: error.message || 'Failed to update post' 
      },
      { status: 500 }
    );
  }
}