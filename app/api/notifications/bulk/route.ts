import { NextRequest, NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { NotificationService } from '@/lib/services/notificationService';
import { connectToDatabase } from '@/lib/mongodb';
import User from '@/lib/models/User';
import mongoose from 'mongoose';

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

    // Find user by clerkId
    const userDoc = await User.findOne({ clerkId: user.id });
    if (!userDoc) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    const body = await request.json();
    const { operation, notificationIds } = body;

    if (!operation || !['read', 'unread', 'delete'].includes(operation)) {
      return NextResponse.json(
        { error: 'Invalid operation. Must be "read", "unread", or "delete"' },
        { status: 400 }
      );
    }

    if (!notificationIds || !Array.isArray(notificationIds) || notificationIds.length === 0) {
      return NextResponse.json(
        { error: 'No notification IDs provided' },
        { status: 400 }
      );
    }

    // Validate notification IDs
    const validIds = notificationIds.filter((id: string) =>
      typeof id === 'string' && /^[0-9a-fA-F]{24}$/.test(id)
    );

    if (validIds.length === 0) {
      return NextResponse.json(
        { error: 'No valid notification IDs provided' },
        { status: 400 }
      );
    }

    let result: Record<string, any> = {}; // Fix: Define type for result
    
    switch (operation) {
      case 'read':
        result = await NotificationService.markAsRead(validIds, userDoc._id) as Record<string, any>;
        break;
        
      case 'unread':
        // Check if markAsUnread exists, otherwise use bulkUpdate
        if ('markAsUnread' in NotificationService && typeof NotificationService.markAsUnread === 'function') {
          result = await NotificationService.markAsUnread(validIds, userDoc._id) as Record<string, any>;
        } else {
          // Use a custom method or direct MongoDB update
          const Notification = mongoose.models.Notification || (await import('@/lib/models/Notification')).default;
          const updateResult = await Notification.updateMany(
            {
              _id: { $in: validIds },
              userId: userDoc._id
            },
            { 
              $set: { 
                read: false,
                readAt: null
              }
            }
          );
          result = { 
            success: true, 
            modifiedCount: updateResult.modifiedCount 
          };
        }
        break;
        
      case 'delete':
        // Delete each notification
        const deleteResults = await Promise.all(
          validIds.map(id => NotificationService.deleteNotification(id, userDoc._id))
        );
        const successfulDeletes = deleteResults.filter(r => r && (r as any).success).length;
        result = { 
          deletedCount: successfulDeletes
        };
        break;
        
      default:
        return NextResponse.json(
          { error: 'Invalid operation' },
          { status: 400 }
        );
    }

    // Build response without duplicate success property
    const responseData: Record<string, any> = {
      success: true,
      operation,
      affectedCount: validIds.length
    };

    // Only add result properties if they exist and won't conflict
    if (result) {
      Object.keys(result).forEach((key: string) => {
        if (!responseData.hasOwnProperty(key)) {
          responseData[key] = result[key];
        }
      });
    }

    return NextResponse.json(responseData);
  } catch (error: any) {
    console.error('Error performing bulk operation:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}