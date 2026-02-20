// app/api/live-classes/create/route.ts
import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { connectToDatabase } from '@/lib/mongodb';
import LiveClass from '@/lib/models/LiveClass';
import User from '@/lib/models/User';

export async function POST(request: Request) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    await connectToDatabase();

    // Check if user is authorized to create classes
    const user = await User.findOne({ clerkId: userId });
    if (!user || (user.role !== 'designer' && user.role !== 'admin')) {
      return NextResponse.json(
        { error: 'Only designers and admins can create classes' },
        { status: 403 }
      );
    }

    const body = await request.json();
    
    // Validate required fields
    if (!body.title || !body.scheduledFor || !body.roomName) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Check if room name already exists
    const existingClass = await LiveClass.findOne({ roomName: body.roomName });
    if (existingClass) {
      return NextResponse.json(
        { error: 'Room name already exists' },
        { status: 400 }
      );
    }

    const newClass = await LiveClass.create(body);
    
    return NextResponse.json(newClass, { status: 201 });
  } catch (error) {
    console.error('Error creating class:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// app/api/live-classes/route.ts
export async function GET(request: Request) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    await connectToDatabase();

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const upcoming = searchParams.get('upcoming') === 'true';

    let query: any = {};

    if (status) {
      query.status = status;
    }

    if (upcoming) {
      query.scheduledFor = { $gte: new Date() };
    }

    const classes = await LiveClass.find(query)
      .sort({ scheduledFor: 1 })
      .limit(50)
      .lean();

    return NextResponse.json(classes);
  } catch (error) {
    console.error('Error fetching classes:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}