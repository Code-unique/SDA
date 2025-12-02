import { NextRequest, NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { NotificationService } from '@/lib/services/notificationService';
import { connectToDatabase } from '@/lib/mongodb';

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

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const limit = Math.max(1, Math.min(100, parseInt(searchParams.get('limit') || '20')));
    const unreadOnly = searchParams.get('unreadOnly') === 'true';

    const result = await NotificationService.getUserNotifications(user.id, {
      page,
      limit,
      unreadOnly
    });

    // Add cache control headers for performance
    const response = NextResponse.json(result);
    response.headers.set('Cache-Control', 'private, max-age=30, stale-while-revalidate=60');
    
    return response;
  } catch (error) {
    console.error('Error fetching notifications:', error);
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
    const { notificationIds, markAll } = body;

    if (markAll) {
      await NotificationService.markAllAsRead(user.id);
    } else if (notificationIds && Array.isArray(notificationIds) && notificationIds.length > 0) {
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

      await NotificationService.markAsRead(validIds, user.id);
    } else {
      return NextResponse.json(
        { error: 'No notification IDs provided' },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating notifications:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}