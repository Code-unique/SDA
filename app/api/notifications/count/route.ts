import { NextRequest, NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { NotificationService } from '@/lib/services/notificationService';
import { connectToDatabase } from '@/lib/mongodb';
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

    const unreadCount = await NotificationService.getUnreadCount(user.id);

    // Cache for 30 seconds for performance
    const response = NextResponse.json({ unreadCount });
    response.headers.set('Cache-Control', 'private, max-age=30, stale-while-revalidate=60');
    
    return response;
  } catch (error) {
    console.error('Error fetching unread count:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}