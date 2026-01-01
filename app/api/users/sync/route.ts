import { NextRequest, NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { connectToDatabase } from '@/lib/mongodb';
import User from '@/lib/models/User';
import "@/lib/loadmodels";

export async function POST(request: NextRequest) {
  try {
    console.log('--- Sync User Request Received ---');

    // 1️⃣ Get current user from Clerk
    const user = await currentUser();
    console.log('Clerk user:', user);

    if (!user) {
      console.warn('Unauthorized: No user from Clerk');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2️⃣ Connect to MongoDB
    try {
      await connectToDatabase();
      console.log('MongoDB connected successfully');
    } catch (dbConnError) {
      console.error('MongoDB connection failed:', dbConnError);
      return NextResponse.json({ error: 'Database connection failed' }, { status: 500 });
    }

    // 3️⃣ Check if user already exists
    let existingUser;
    try {
      existingUser = await User.findOne({ clerkId: user.id });
      console.log('Existing user check:', existingUser);
    } catch (dbQueryError) {
      console.error('Error checking existing user:', dbQueryError);
      return NextResponse.json({ error: 'Database query failed' }, { status: 500 });
    }

    if (existingUser) {
      console.log('User already exists, returning existing record');
      return NextResponse.json({
        user: {
          ...existingUser.toObject(),
          _id: existingUser._id.toString(),
        },
        created: false,
      });
    }

    // 4️⃣ Create new user
    let newUser;
    try {
      newUser = await User.create({
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
        onboardingCompleted: false,
        notificationPreferences: {
          likes: true,
          comments: true,
          follows: true,
          courses: true,
          achievements: true,
          messages: true,
          announcements: true,
          marketing: false,
        },
        lastNotificationReadAt: new Date(),
      });
      console.log('New user created successfully:', newUser);
    } catch (dbCreateError) {
      console.error('Error creating user:', dbCreateError);
      return NextResponse.json({ error: 'Failed to create user' }, { status: 500 });
    }

    // 5️⃣ Return newly created user
    return NextResponse.json({
      user: {
        ...newUser.toObject(),
        _id: newUser._id.toString(),
      },
      created: true,
    });
  } catch (error: any) {
    console.error('Unexpected error syncing user:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
