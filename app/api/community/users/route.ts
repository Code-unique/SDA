// app/api/explore/users/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import User from '@/lib/models/User';
import "@/lib/loadmodels";
export async function GET(request: NextRequest) {
  try {
    await connectToDatabase();

    const users = await User.find({})
      .select('-email -clerkId')
      .sort({ followers: -1, createdAt: -1 })
      .limit(50);

    return NextResponse.json({ users });
  } catch (error: any) {
    console.error('Error fetching users:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}