import { NextRequest, NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { connectToDatabase } from '@/lib/mongodb';
import User from '@/lib/models/User';
import Course, { ICourse } from '@/lib/models/Course';
import UserProgress from '@/lib/models/UserProgress';
import mongoose from 'mongoose';
import "@/lib/loadmodels";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    await connectToDatabase();

    const currentUserDoc = await User.findOne({ clerkId: user.id });
    if (!currentUserDoc) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    const { id } = await params;

    // Validate course ID
    if (!mongoose.Types.ObjectId.isValid(id) && !id.includes('-')) {
      return NextResponse.json(
        { error: 'Invalid course ID' },
        { status: 400 }
      );
    }

    let course: ICourse | null = null;

    // Try by ObjectId first, then by slug
    if (mongoose.Types.ObjectId.isValid(id)) {
      course = await Course.findById(id);
    } else {
      course = await Course.findOne({ slug: id });
    }

    if (!course) {
      return NextResponse.json(
        { error: 'Course not found' },
        { status: 404 }
      );
    }

    if (!course.isPublished) {
      return NextResponse.json(
        { error: 'Course is not available' },
        { status: 403 }
      );
    }

    // Check if user is already enrolled
    const isAlreadyEnrolled = course.students.some(
      (student: any) => student.user.toString() === currentUserDoc._id.toString()
    );

    if (isAlreadyEnrolled) {
      return NextResponse.json({
        alreadyEnrolled: true,
        message: 'Already enrolled in this course'
      });
    }

    // For free courses, enroll directly
    if (course.isFree || course.price === 0) {
      // Enroll user
      await Course.findByIdAndUpdate(
        course._id,
        {
          $push: {
            students: {
              user: currentUserDoc._id,
              enrolledAt: new Date(),
              progress: 0,
              completed: false,
              enrolledThrough: 'free'
            }
          },
          $inc: { totalStudents: 1 }
        }
      );

      // Create initial user progress
      const firstChapter = course.modules[0]?.chapters?.[0];
      const firstLesson = firstChapter?.lessons?.[0];
      
      const userProgress = await UserProgress.create({
        courseId: course._id,
        userId: currentUserDoc._id,
        completedLessons: [],
        currentLesson: firstLesson?._id || null,
        progress: 0,
        timeSpent: 0,
        lastAccessed: new Date(),
        completed: false
      });

      return NextResponse.json({
        success: true,
        enrolled: true,
        message: 'Successfully enrolled in course',
        courseId: course._id,
        slug: course.slug,
        progress: userProgress
      });
    }

    // For paid courses, redirect to payment request page
    return NextResponse.json({
      requiresPayment: true,
      price: course.price,
      message: 'This course requires payment approval',
      action: 'request_payment',
      courseId: course._id,
      courseTitle: course.title
    }, { status: 402 });

  } catch (error: any) {
    console.error('Error enrolling in course:', error);
    return NextResponse.json(
      { error: 'Failed to enroll in course' },
      { status: 500 }
    );
  }
}