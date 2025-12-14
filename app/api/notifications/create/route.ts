import { NextRequest, NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { NotificationService } from '@/lib/services/notificationService';
import { connectToDatabase } from '@/lib/mongodb';
import User from '@/lib/models/User';
import { rateLimit } from '@/lib/rate-limit';
import "@/lib/loadmodels";
export async function POST(request: NextRequest) {
  try {
    await connectToDatabase();
    const user = await currentUser();
    
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Rate limiting
    const rateLimitKey = `create-notification:${user.id}`;
    const rateLimitResult = rateLimit(rateLimitKey, 10); // 10 notifications per minute
    
    if (rateLimitResult.isRateLimited) {
      return NextResponse.json(
        { error: 'Too many notifications created. Please slow down.' },
        { status: 429, headers: rateLimitResult.headers }
      );
    }

    const body = await request.json();
    const { type, message, actionUrl, targetUserId } = body;

    // Validation
    if (!type || !message || !targetUserId) {
      return NextResponse.json(
        { error: 'Missing required fields: type, message, targetUserId' },
        { status: 400 }
      );
    }

    const validTypes = ['like', 'comment', 'follow', 'course', 'achievement', 'message', 'system'];
    if (!validTypes.includes(type)) {
      return NextResponse.json(
        { error: 'Invalid notification type' },
        { status: 400 }
      );
    }

    if (message.length > 500) {
      return NextResponse.json(
        { error: 'Message too long (max 500 characters)' },
        { status: 400 }
      );
    }

    // Check if current user has permission to create notifications
    const currentUserDoc = await User.findOne({ clerkId: user.id });
    if (!currentUserDoc) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // For system notifications, only allow admins
    if (type === 'system' && currentUserDoc.role !== 'admin') {
      return NextResponse.json(
        { error: 'Only admins can create system notifications' },
        { status: 403 }
      );
    }

    const targetUser = await User.findOne({ 
      $or: [
        { clerkId: targetUserId },
        { _id: targetUserId }
      ]
    });

    if (!targetUser) {
      return NextResponse.json(
        { error: 'Target user not found' },
        { status: 404 }
      );
    }

    // Create notification
    const notification = await NotificationService.createNotification({
      userId: targetUser._id,
      type: type as any,
      fromUserId: type === 'system' ? undefined : currentUserDoc._id,
      message,
      actionUrl
    });

    return NextResponse.json({
      success: true,
      notification,
      headers: rateLimitResult.headers
    });
  } catch (error) {
    console.error('Error creating notification:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}