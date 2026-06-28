//app/api/posts/[id]/save/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { connectToDatabase } from '@/lib/mongodb';
import User from '@/lib/models/User';
import Post from '@/lib/models/Post';
import { SavedItem } from '@/lib/models/UserInteractions';
import "@/lib/loadmodels";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    if (!id || id.length !== 24) {
      return NextResponse.json({ success: false, error: 'Invalid post ID' }, { status: 400 });
    }

    await connectToDatabase();

    const currentUser = await User.findOne({ clerkId: userId });
    if (!currentUser) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
    }

    const post = await Post.findById(id);
    if (!post) {
      return NextResponse.json({ success: false, error: 'Post not found' }, { status: 404 });
    }

    const existingSave = await SavedItem.findOne({
      user: currentUser._id,
      itemType: 'post',
      itemId: id
    });

    if (existingSave) {
      // Unsave
      await SavedItem.findByIdAndDelete(existingSave._id);
      await Post.findByIdAndUpdate(id, { $pull: { saves: currentUser._id } });
      
      return NextResponse.json({
        success: true,
        data: { saved: false, saveCount: Math.max(0, ((post.saves?.length || 1) - 1)) }
      });
    } else {
      // Save
      await SavedItem.create({
        user: currentUser._id,
        itemType: 'post',
        itemId: id,
        savedAt: new Date()
      });
      await Post.findByIdAndUpdate(id, { $addToSet: { saves: currentUser._id } });

      return NextResponse.json({
        success: true,
        data: { saved: true, saveCount: (post.saves?.length || 0) + 1, savedAt: new Date() }
      });
    }
  } catch (error) {
    console.error('Error toggling save:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}