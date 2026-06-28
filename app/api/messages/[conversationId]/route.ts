// app/api/messages/[conversationId]/route.ts - Fixed
import { NextRequest, NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { connectToDatabase } from '@/lib/mongodb';
import User from '@/lib/models/User';
import { Conversation, Message } from '@/lib/models/Message';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ conversationId: string }> }
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

    // FIX: Unwrap params promise
    const { conversationId } = await params;

    // Verify user is a participant in this conversation
    const conversation = await Conversation.findOne({
      _id: conversationId,
      participants: dbUser._id
    });

    if (!conversation) {
      return NextResponse.json(
        { error: 'Conversation not found or access denied' },
        { status: 404 }
      );
    }

    // Fetch messages for this conversation
    const { searchParams } = new URL(request.url);
    const limit = Math.max(1, Math.min(100, parseInt(searchParams.get('limit') || '50')));
    const before = searchParams.get('before');

    let query: any = { conversation: conversationId };
    
    if (before) {
      query.createdAt = { $lt: new Date(before) };
    }

    const messages = await Message.find(query)
      .populate('sender', 'username firstName lastName avatar')
      .populate('receiver', 'username firstName lastName avatar')
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    // Mark messages as read if they're sent to the current user
    await Message.updateMany(
      {
        conversation: conversationId,
        receiver: dbUser._id,
        read: false
      },
      {
        $set: {
          read: true,
          readAt: new Date()
        }
      }
    );

    // Reset unread count for this conversation
    conversation.unreadCount = 0;
    await conversation.save();

    return NextResponse.json({ 
      messages: messages.reverse(), // Return in chronological order
      conversation 
    });
  } catch (error) {
    console.error('Error fetching conversation messages:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}