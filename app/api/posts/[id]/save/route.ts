// app/api/posts/[id]/save/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { connectToDatabase } from '@/lib/mongodb';
import User from '@/lib/models/User';
import { SavedItem } from '@/lib/models/UserInteractions';
import Post from '@/lib/models/Post';
import { ApiResponse } from '@/types/post';
import "@/lib/loadmodels";
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json<ApiResponse>({
        success: true,
        data: { saved: false }
      });
    }

    const { id } = await params;
    if (!id) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Post ID is required' },
        { status: 400 }
      );
    }

    await connectToDatabase();

    const currentUser = await User.findOne({ clerkId: userId });
    if (!currentUser) {
      return NextResponse.json<ApiResponse>({
        success: true,
        data: { saved: false }
      });
    }

    // Check if already saved
    const existingSave = await SavedItem.findOne({
      user: currentUser._id,
      itemType: 'post',
      itemId: id
    });

    // Also get the post to count saves
    const post = await Post.findById(id);
    const saveCount = post?.saves?.length || 0;

    return NextResponse.json<ApiResponse>({
      success: true,
      data: { 
        saved: !!existingSave,
        savedAt: existingSave?.savedAt,
        saveCount
      }
    });
  } catch (error) {
    console.error('Error checking save status:', error);
    return NextResponse.json<ApiResponse>({
      success: true,
      data: { saved: false }
    });
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
    if (!id) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Post ID is required' },
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

    // Check if post exists
    const post = await Post.findById(id);
    if (!post) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Post not found' },
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
      
      // Update post saves array
      await Post.findByIdAndUpdate(id, {
        $pull: { saves: currentUser._id }
      });

      return NextResponse.json<ApiResponse>({
        success: true,
        data: { 
          saved: false,
          message: 'Post unsaved successfully',
          saveCount: (post.saves?.length || 1) - 1
        }
      });
    } else {
      // Save
      await SavedItem.create({
        user: currentUser._id,
        itemType: 'post',
        itemId: id,
        savedAt: new Date()
      });

      // Update post saves array
      await Post.findByIdAndUpdate(id, {
        $addToSet: { saves: currentUser._id }
      });

      return NextResponse.json<ApiResponse>({
        success: true,
        data: { 
          saved: true,
          message: 'Post saved successfully',
          savedAt: new Date(),
          saveCount: (post.saves?.length || 0) + 1
        }
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