// app/api/posts/feed/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/api-handler';
import { PostService } from '@/lib/services/post-service';
import User from '@/lib/models/User';
import "@/lib/loadmodels";
const getFeed = async (request: NextRequest, userId: string) => {
  const { searchParams } = new URL(request.url);
  const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
  const limit = Math.max(1, Math.min(50, parseInt(searchParams.get('limit') || '10')));

  const user = await User.findOne({ clerkId: userId });
  if (!user) {
    return NextResponse.json(
      { error: 'User not found' },
      { status: 404 }
    );
  }

  const feed = await PostService.getUserFeed(user._id, page, limit);

  return NextResponse.json(feed);
};

export const GET = withAuth(getFeed);