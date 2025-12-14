// app/api/search/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import User from '@/lib/models/User';
import Post from '@/lib/models/Post';
import Course from '@/lib/models/Course';
import "@/lib/loadmodels";
export async function GET(request: NextRequest) {
  try {
    await connectToDatabase();

    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q') || '';
    const type = searchParams.get('type') || 'all';
    const limit = Math.max(1, Math.min(50, parseInt(searchParams.get('limit') || '10')));

    if (!query || query.trim().length === 0) {
      return NextResponse.json({ results: [] });
    }

    // Sanitize query to prevent regex injection
    const sanitizedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const searchRegex = new RegExp(sanitizedQuery, 'i');
    let results: any[] = [];

    if (type === 'all' || type === 'users') {
      const users = await User.find({
        $or: [
          { username: searchRegex },
          { firstName: searchRegex },
          { lastName: searchRegex },
          { bio: searchRegex }
        ]
      })
        .select('username firstName lastName avatar bio role')
        .limit(limit)
        .lean();

      results.push(...users.map(user => ({
        type: 'user',
        data: {
          ...user,
          _id: (user._id as any).toString()
        },
        score: 1
      })));
    }

    if (type === 'all' || type === 'posts') {
      const posts = await Post.find({
        $or: [
          { caption: searchRegex },
          { hashtags: searchRegex }
        ],
        isPublic: true
      })
        .populate('author', 'username firstName lastName avatar')
        .limit(limit)
        .lean();

      results.push(...posts.map(post => ({
        type: 'post',
        data: {
          ...post,
          _id: (post._id as any).toString(),
          author: post.author ? {
            ...post.author,
            _id: (post.author as any)._id.toString()
          } : null
        },
        score: 1
      })));
    }

    if (type === 'all' || type === 'courses') {
      const courses = await Course.find({
        $or: [
          { title: searchRegex },
          { description: searchRegex },
          { category: searchRegex }
        ],
        isPublished: true
      })
        .populate('instructor', 'username firstName lastName avatar')
        .limit(limit)
        .lean();

      results.push(...courses.map(course => ({
        type: 'course',
        data: {
          ...course,
          _id: (course._id as any).toString(),
          instructor: course.instructor ? {
            ...course.instructor,
            _id: (course.instructor as any)._id.toString()
          } : null
        },
        score: 1
      })));
    }

    // Sort by relevance score (simplified)
    results.sort((a, b) => b.score - a.score);

    return NextResponse.json({ results });
  } catch (error) {
    console.error('Search error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}