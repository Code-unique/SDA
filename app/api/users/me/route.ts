// app/api/users/me/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import User from '@/lib/models/User';
import { currentUser } from '@clerk/nextjs/server';
import "@/lib/loadmodels";
export async function GET(request: NextRequest) {
  try {
    const currentUserObj = await currentUser();
    if (!currentUserObj) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    await connectToDatabase();

    let user = await User.findOne({ clerkId: currentUserObj.id })
      .select('username firstName lastName avatar banner bio location website role interests skills isVerified followers following createdAt')
      .populate('followers', 'username firstName lastName avatar')
      .populate('following', 'username firstName lastName avatar');

    if (!user) {
      // Auto-create user if not found
      user = await User.create({
        clerkId: currentUserObj.id,
        email: currentUserObj.emailAddresses[0]?.emailAddress || '',
        username: currentUserObj.username || `user_${currentUserObj.id.slice(0, 8)}`,
        firstName: currentUserObj.firstName || 'User',
        lastName: currentUserObj.lastName || 'Name',
        avatar: currentUserObj.imageUrl || '',
        banner: '',
        bio: '',
        location: '',
        website: '',
        role: 'user',
        interests: [],
        skills: [],
        isVerified: false,
        followers: [],
        following: [],
        onboardingCompleted: false
      });
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
      user: safeUser,
      success: true
    });
  } catch (error: any) {
    console.error('Error fetching current user:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}