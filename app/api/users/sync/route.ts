// app/api/users/sync/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { connectToDatabase } from '@/lib/mongodb';
import User from '@/lib/models/User';

export async function POST(request: NextRequest) {
  try {
    const user = await currentUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    await connectToDatabase();

    // Check if user already exists
    const existingUser = await User.findOne({ clerkId: user.id });

    if (existingUser) {
      return NextResponse.json({
        user: {
          ...existingUser.toObject(),
          _id: existingUser._id.toString()
        },
        created: false
      });
    }

    // Create new user in database
    const newUser = await User.create({
      clerkId: user.id,
      email: user.emailAddresses[0]?.emailAddress || '',
      username: user.username || `user_${user.id.slice(0, 8)}`,
      firstName: user.firstName || 'User',
      lastName: user.lastName || 'Name',
      avatar: user.imageUrl || '',
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

    return NextResponse.json({
      user: {
        ...newUser.toObject(),
        _id: newUser._id.toString()
      },
      created: true
    });
  } catch (error: any) {
    console.error('Error syncing user:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}