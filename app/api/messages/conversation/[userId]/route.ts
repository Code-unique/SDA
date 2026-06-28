// app/api/messages/conversation/[userId]/route.ts - FIXED
import { NextRequest, NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { connectToDatabase } from '@/lib/mongodb';
import User from '@/lib/models/User';
import { Conversation } from '@/lib/models/Message';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
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

    // Unwrap params promise
    const { userId: otherUserId } = await params;

    // Check if conversation already exists between these two users
    const conversation = await Conversation.findOne({
      participants: { $all: [dbUser._id, otherUserId] }
    })
      .populate('participants', 'username firstName lastName avatar')
      .populate('lastMessage')
      .lean();

    return NextResponse.json({ 
      conversation,
      success: true 
    });
  } catch (error) {
    console.error('Error checking conversation:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}