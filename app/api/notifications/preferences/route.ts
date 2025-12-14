import { NextRequest, NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { connectToDatabase } from '@/lib/mongodb';
import User from '@/lib/models/User';
import "@/lib/loadmodels";
export async function GET(request: NextRequest) {
  try {
    await connectToDatabase();
    const user = await currentUser();
    
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const userDoc = await User.findOne({ clerkId: user.id });
    if (!userDoc) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    const preferences = userDoc.notificationPreferences || {
      email: {
        likes: true,
        comments: true,
        follows: true,
        courses: true,
        achievements: true,
        messages: true,
        announcements: true
      },
      push: {
        likes: true,
        comments: true,
        follows: true,
        courses: true,
        achievements: true,
        messages: true
      },
      inApp: {
        likes: true,
        comments: true,
        follows: true,
        courses: true,
        achievements: true,
        messages: true,
        system: true
      }
    };

    return NextResponse.json({
      success: true,
      preferences
    });
  } catch (error) {
    console.error('Error fetching notification preferences:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    await connectToDatabase();
    const user = await currentUser();
    
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { preferences } = body;

    if (!preferences || typeof preferences !== 'object') {
      return NextResponse.json(
        { error: 'Invalid preferences format' },
        { status: 400 }
      );
    }

    const userDoc = await User.findOneAndUpdate(
      { clerkId: user.id },
      { 
        $set: { 
          notificationPreferences: preferences,
          updatedAt: new Date()
        } 
      },
      { new: true }
    );

    if (!userDoc) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Notification preferences updated',
      preferences: userDoc.notificationPreferences
    });
  } catch (error) {
    console.error('Error updating notification preferences:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}