// app/api/posts/[id]/share/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { connectToDatabase } from '@/lib/mongodb';
import Post from '@/lib/models/Post';
import "@/lib/loadmodels";
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!id || id.length !== 24) {
      return NextResponse.json(
        { success: false, error: 'Valid post ID is required' },
        { status: 400 }
      );
    }

    const user = await currentUser();

    // Here you can track shares in your database
    console.log(`Post ${id} was shared by user ${user?.id || 'anonymous'}`);

    // Update share count in your database
    await Post.findByIdAndUpdate(id, { $inc: { shares: 1 } });

    return NextResponse.json({
      success: true,
      data: { shared: true, postId: id },
      message: 'Share recorded successfully'
    });
  } catch (error: any) {
    console.error('Error in share API:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to record share: ' + error.message },
      { status: 500 }
    );
  }
}