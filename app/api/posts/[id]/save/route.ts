// app/api/posts/[id]/save/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { connectToDatabase } from '@/lib/mongodb';
import User from '@/lib/models/User';
import { SavedItem } from '@/lib/models/UserInteractions';
import { ApiResponse } from '@/types/post';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id } = await params;
    if (!id || id.length !== 24) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Valid post ID is required' },
        { status: 400 }
      );
    }

    await connectToDatabase();

    const currentUser = await User.findOne({ clerkId: userId });
    if (!currentUser) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    // Check if already saved
    const existingSave = await SavedItem.findOne({
      user: currentUser._id,
      itemType: 'post',
      itemId: id
    });

    return NextResponse.json<ApiResponse>({
      success: true,
      data: { saved: !!existingSave }
    });
  } catch (error) {
    console.error('Error checking save status:', error);
    return NextResponse.json<ApiResponse>(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id } = await params;
    if (!id || id.length !== 24) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Valid post ID is required' },
        { status: 400 }
      );
    }

    await connectToDatabase();

    const currentUser = await User.findOne({ clerkId: userId });
    if (!currentUser) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    // Check if already saved
    const existingSave = await SavedItem.findOne({
      user: currentUser._id,
      itemType: 'post',
      itemId: id
    });

    if (existingSave) {
      // Unsave
      await SavedItem.findByIdAndDelete(existingSave._id);
      return NextResponse.json<ApiResponse>({
        success: true,
        data: { saved: false }
      });
    } else {
      // Save
      await SavedItem.create({
        user: currentUser._id,
        itemType: 'post',
        itemId: id,
        savedAt: new Date()
      });
      return NextResponse.json<ApiResponse>({
        success: true,
        data: { saved: true }
      });
    }
  } catch (error) {
    console.error('Error saving post:', error);
    return NextResponse.json<ApiResponse>(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}