// app/api/users/[id]/posts/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import Post from '@/lib/models/Post';
import User from '@/lib/models/User';
import { currentUser } from '@clerk/nextjs/server';
import "@/lib/loadmodels";
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectToDatabase();
    const { id } = await params;

    let user;

    if (id === 'me') {
      // Handle current user posts
      const currentUserObj = await currentUser();
      if (!currentUserObj) {
        return NextResponse.json(
          { error: 'Unauthorized' },
          { status: 401 }
        );
      }
      user = await User.findOne({ clerkId: currentUserObj.id });
    } else {
      // Handle both MongoDB ObjectId and username
      if (id.match(/^[0-9a-fA-F]{24}$/)) {
        // It's a MongoDB ObjectId
        user = await User.findById(id);
      } else {
        // It's a username
        user = await User.findOne({ username: id });
      }
    }

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    const posts = await Post.find({ author: user._id })
      .populate('author', 'username firstName lastName avatar')
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json({
      posts: posts.map(post => ({
        ...post,
        _id: post._id.toString()
      })),
      success: true
    });
  } catch (error: any) {
    console.error('Error fetching user posts:', error);
    return NextResponse.json(
      { error: 'Failed to fetch posts: ' + error.message },
      { status: 500 }
    );
  }
}