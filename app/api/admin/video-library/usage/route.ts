import { NextRequest, NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { connectToDatabase } from '@/lib/mongodb';
import User from '@/lib/models/User';
import VideoLibrary from '@/lib/models/VideoLibrary';
import "@/lib/loadmodels";

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
    const {
      videoLibraryId,
      type = 'course', // 'course' or 'preview'
      courseId,
      courseTitle,
      moduleId,
      chapterId,
      lessonId,
      referrer
    } = body;

    console.log('📊 Tracking video usage:', {
      videoLibraryId,
      type,
      courseId,
      courseTitle,
      moduleId,
      chapterId,
      lessonId,
      referrer
    });

    if (!videoLibraryId) {
      return NextResponse.json(
        { error: 'videoLibraryId is required' },
        { status: 400 }
      );
    }

    const video = await VideoLibrary.findById(videoLibraryId);
    if (!video) {
      return NextResponse.json(
        { error: 'Video not found' },
        { status: 404 }
      );
    }

    if (type === 'preview') {
      // Add preview usage
      await (video as any).addPreviewUsage(referrer || 'course_creator');
      console.log('✅ Preview usage tracked');
      
      return NextResponse.json({
        success: true,
        message: 'Preview usage tracked successfully',
        usageCount: video.usageCount,
        type: 'preview'
      });
    } else {
      // Add course usage
      if (!courseId || !courseTitle) {
        return NextResponse.json(
          { error: 'courseId and courseTitle are required for course usage tracking' },
          { status: 400 }
        );
      }

      // Check if this video is already used in this specific course/lesson
      const existingUsage = (video as any).courses.find((course: any) =>
        course.courseId.toString() === courseId.toString() &&
        (!moduleId || course.moduleId?.toString() === moduleId?.toString()) &&
        (!chapterId || course.chapterId?.toString() === chapterId?.toString()) &&
        (!lessonId || course.lessonId?.toString() === lessonId?.toString())
      );

      if (!existingUsage) {
        await (video as any).addUsage(
          courseId,
          courseTitle,
          moduleId,
          chapterId,
          lessonId
        );
        console.log('✅ Course usage tracked');
      } else {
        console.log('✅ Usage already tracked, skipping duplicate');
      }
      
      return NextResponse.json({
        success: true,
        message: 'Course usage tracked successfully',
        usageCount: video.usageCount,
        type: 'course'
      });
    }

  } catch (error: any) {
    console.error('❌ Error tracking video usage:', error);
    console.error('Stack:', error.stack);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    );
  }
}