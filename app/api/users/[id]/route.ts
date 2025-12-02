// app/api/users/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import User from '@/lib/models/User';
import { currentUser } from '@clerk/nextjs/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectToDatabase();
    const { id } = await params;

    const currentAuthUser = await currentUser();
    let user;
    let isFollowing = false;

    if (id === 'me') {
      // Handle the special case for current user
      if (!currentAuthUser) {
        return NextResponse.json({
          success: false,
          error: 'Unauthorized'
        }, { status: 401 });
      }

      user = await User.findOne({ clerkId: currentAuthUser.id })
        .select('username firstName lastName avatar banner bio location website role interests skills isVerified followers following createdAt')
        .populate('followers', 'username firstName lastName avatar')
        .populate('following', 'username firstName lastName avatar');

      if (!user) {
        return NextResponse.json({
          success: false,
          error: 'User not found'
        }, { status: 404 });
      }

      isFollowing = false; // Can't follow yourself
    } else {
      // Handle both MongoDB ObjectId and username lookups
      if (id.match(/^[0-9a-fA-F]{24}$/)) {
        // It's a MongoDB ObjectId
        user = await User.findById(id)
          .select('username firstName lastName avatar banner bio location website role interests skills isVerified followers following createdAt')
          .populate('followers', 'username firstName lastName avatar')
          .populate('following', 'username firstName lastName avatar');
      } else {
        // It's a username
        user = await User.findOne({ username: id })
          .select('username firstName lastName avatar banner bio location website role interests skills isVerified followers following createdAt')
          .populate('followers', 'username firstName lastName avatar')
          .populate('following', 'username firstName lastName avatar');
      }

      if (!user) {
        return NextResponse.json({
          success: false,
          error: 'User not found'
        }, { status: 404 });
      }

      // Check if current user is following this user
      if (currentAuthUser) {
        const currentAppUser = await User.findOne({ clerkId: currentAuthUser.id });
        if (currentAppUser) {
          isFollowing = currentAppUser.following.includes(user._id);
        }
      }
    }

    // Convert ObjectId to string for safe serialization
    const safeUser = {
      ...user.toObject(),
      _id: user._id.toString(),
      followers: user.followers.map((f: any) => ({
        ...f.toObject(),
        _id: f._id.toString()
      })),
      following: user.following.map((f: any) => ({
        ...f.toObject(),
        _id: f._id.toString()
      }))
    };

    return NextResponse.json({
      success: true,
      data: {
        user: safeUser,
        isFollowing
      }
    });
  } catch (error: any) {
    console.error('API Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch user: ' + error.message
      },
      { status: 500 }
    );
  }
}