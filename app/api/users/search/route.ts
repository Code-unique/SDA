// app/api/users/search/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import User from '@/lib/models/User';

export async function GET(request: NextRequest) {
  try {
    await connectToDatabase();

    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q') || '';
    const limit = Math.max(1, Math.min(100, parseInt(searchParams.get('limit') || '20')));

    let users = [];

    if (query) {
      const sanitizedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      users = await User.find({
        $or: [
          { username: { $regex: sanitizedQuery, $options: 'i' } },
          { firstName: { $regex: sanitizedQuery, $options: 'i' } },
          { lastName: { $regex: sanitizedQuery, $options: 'i' } },
          { bio: { $regex: sanitizedQuery, $options: 'i' } },
          { skills: { $in: [new RegExp(sanitizedQuery, 'i')] } },
          { interests: { $in: [new RegExp(sanitizedQuery, 'i')] } }
        ]
      })
        .select('-email -clerkId')
        .sort({ followers: -1, createdAt: -1 })
        .limit(limit);
    } else {
      users = await User.find({})
        .select('-email -clerkId')
        .sort({ followers: -1, createdAt: -1 })
        .limit(limit);
    }

    return NextResponse.json({
      users: users.map(user => ({
        ...user.toObject(),
        _id: user._id.toString()
      }))
    });
  } catch (error: any) {
    console.error('Error searching users:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}