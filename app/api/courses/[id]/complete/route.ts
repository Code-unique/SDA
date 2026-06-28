// app/api/courses/[id]/complete/route.ts - UPDATED FOR SUBLESSONS
import { NextRequest, NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { connectToDatabase } from '@/lib/mongodb';
import User from '@/lib/models/User';
import Course, { ICourse } from '@/lib/models/Course';
import { NotificationService } from '@/lib/services/notificationService';
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

    // Find course
    let course: ICourse | null = null;
    if (id.match(/^[0-9a-fA-F]{24}$/)) {
      course = await Course.findById(id).populate('instructor');
    } else {
      course = await Course.findOne({ slug: id }).populate('instructor');
    }

    if (!course) {
      return NextResponse.json(
        { error: 'Course not found' },
        { status: 404 }
      );
    }

    // Check if user is enrolled
    const isEnrolled = course.students.some(
      (student: any) => student.user.toString() === currentUserDoc._id.toString()
    );

    if (!isEnrolled) {
      return NextResponse.json(
        { error: 'Not enrolled in this course' },
        { status: 403 }
      );
    }

    // Check if already completed
    const student = course.students.find(
      (s: any) => s.user.toString() === currentUserDoc._id.toString()
    );

    if (student?.completed) {
      return NextResponse.json({
        alreadyCompleted: true,
        message: 'Course already completed'
      });
    }

    // Mark as completed
    const updatedCourse = await Course.findOneAndUpdate(
      {
        _id: course._id,
        'students.user': currentUserDoc._id
      },
      {
        $set: {
          'students.$.completed': true,
          'students.$.completedAt': new Date(),
          'students.$.progress': 100
        }
      },
      { new: true }
    );

    if (!updatedCourse) {
      return NextResponse.json(
        { error: 'Failed to update course progress' },
        { status: 500 }
      );
    }

    // Create completion notification for user
    await NotificationService.createNotification({
      userId: currentUserDoc._id,
      type: 'achievement',
      message: `Congratulations! You completed "${course.title}"`,
      actionUrl: `/courses/${course.slug || course._id}`,
      courseId: course._id as mongoose.Types.ObjectId
    });

    // Create notification for instructor (optional)
    if (course.instructor && course.instructor._id.toString() !== currentUserDoc._id.toString()) {
      await NotificationService.createNotification({
        userId: course.instructor._id,
        type: 'course',
        fromUserId: currentUserDoc._id,
        message: `${currentUserDoc.firstName} completed your course "${course.title}"`,
        actionUrl: `/dashboard/courses/${course.slug || course._id}/students`,
        courseId: course._id as mongoose.Types.ObjectId
      });
    }

    return NextResponse.json({
      success: true,
      completed: true,
      message: 'Course marked as completed',
      course: {
        _id: course._id,
        title: course.title,
        slug: course.slug
      }
    });
  } catch (error) {
    console.error('Error completing course:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}