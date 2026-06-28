import { NextRequest, NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { connectToDatabase } from '@/lib/mongodb';
import User from '@/lib/models/User';
import Course from '@/lib/models/Course';
import ManualAccess from '@/lib/models/ManualAccess';
import "@/lib/loadmodels";

// POST - Grant manual access to course
export async function POST(request: NextRequest) {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    await connectToDatabase();

    const adminUser = await User.findOne({ clerkId: user.id });
    if (!adminUser || adminUser.role !== 'admin') {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { userId, courseId, reason, expiresAt } = body;

    // Validate required fields
    if (!userId || !courseId) {
      return NextResponse.json(
        { error: 'User ID and Course ID are required' },
        { status: 400 }
      );
    }

    // Check if user exists
    const targetUser = await User.findById(userId);
    if (!targetUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Check if course exists
    const course = await Course.findById(courseId);
    if (!course) {
      return NextResponse.json(
        { error: 'Course not found' },
        { status: 404 }
      );
    }

    // Check if already enrolled
    const isAlreadyEnrolled = course.students.some(
      (student: any) => student.user.toString() === userId.toString()
    );

    if (isAlreadyEnrolled) {
      return NextResponse.json(
        { error: 'User is already enrolled in this course' },
        { status: 400 }
      );
    }

    // Create manual access record
    const manualAccess = await ManualAccess.create({
      userId,
      courseId,
      grantedBy: adminUser._id,
      reason,
      expiresAt: expiresAt ? new Date(expiresAt) : undefined,
      isActive: true
    });

    // Enroll user in course
    await Course.findByIdAndUpdate(
      courseId,
      {
        $push: {
          students: {
            user: userId,
            enrolledAt: new Date(),
            progress: 0,
            completed: false,
            enrolledThrough: 'manual_grant',
            grantedBy: adminUser._id
          }
        },
        $inc: { totalStudents: 1 }
      }
    );

    return NextResponse.json({
      success: true,
      message: 'Manual access granted successfully',
      access: manualAccess
    });

  } catch (error: any) {
    console.error('Error granting manual access:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET - Search users for manual access
export async function GET(request: NextRequest) {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    await connectToDatabase();

    const adminUser = await User.findOne({ clerkId: user.id });
    if (!adminUser || adminUser.role !== 'admin') {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const limit = Math.min(20, parseInt(searchParams.get('limit') || '10'));

    let query: any = {};

    if (search) {
      query.$or = [
        { email: { $regex: search, $options: 'i' } },
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { username: { $regex: search, $options: 'i' } }
      ];
    }

    const users = await User.find(query)
      .select('_id firstName lastName email username avatar clerkId')
      .limit(limit);

    return NextResponse.json({ users });

  } catch (error: any) {
    console.error('Error searching users:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}