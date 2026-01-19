// app/api/courses/[id]/notes/route.ts - UPDATED FOR LESSON AND SUBLESSON VIDEOS
import { NextRequest, NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { connectToDatabase } from '@/lib/mongodb';
import User from '@/lib/models/User';
import Course from '@/lib/models/Course';
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
    const body = await request.json();
    const { lessonId, notes, contentType = 'sublesson' } = body;

    if (!lessonId || !mongoose.Types.ObjectId.isValid(lessonId)) {
      return NextResponse.json(
        { error: 'Valid lessonId is required' },
        { status: 400 }
      );
    }

    if (!notes || typeof notes !== 'string') {
      return NextResponse.json(
        { error: 'Notes content is required' },
        { status: 400 }
      );
    }

    // Limit notes length
    if (notes.length > 5000) {
      return NextResponse.json(
        { error: 'Notes too long (max 5000 characters)' },
        { status: 400 }
      );
    }

    // Check if user is enrolled
    const course = await Course.findOne({
      _id: id,
      'students.user': currentUserDoc._id
    });

    if (!course) {
      return NextResponse.json(
        { error: 'Not enrolled in this course' },
        { status: 403 }
      );
    }

    // Verify content exists in course (could be lesson or sub-lesson)
    let contentExists = false;
    let isLessonContent = contentType === 'lesson';

    // Search through modules -> chapters -> lessons -> subLessons
    if (course.modules) {
      for (const module of course.modules) {
        if (module.chapters) {
          for (const chapter of module.chapters) {
            if (chapter.lessons) {
              for (const lesson of chapter.lessons) {
                // Check lesson
                if (lesson._id?.toString() === lessonId && isLessonContent) {
                  contentExists = true;
                  break;
                }
                
                // Check sub-lessons
                if (lesson.subLessons && !isLessonContent) {
                  for (const subLesson of lesson.subLessons) {
                    if (subLesson._id?.toString() === lessonId) {
                      contentExists = true;
                      break;
                    }
                  }
                }
              }
              if (contentExists) break;
            }
          }
          if (contentExists) break;
        }
      }
    }

    if (!contentExists) {
      return NextResponse.json(
        { error: 'Content not found in this course' },
        { status: 404 }
      );
    }

    // Get user progress
    let userProgress = await UserProgress.findOne({
      courseId: id,
      userId: currentUserDoc._id
    });

    if (!userProgress) {
      userProgress = await UserProgress.create({
        courseId: id,
        userId: currentUserDoc._id,
        completedLessons: [],
        currentLesson: null,
        contentType: 'sublesson',
        progress: 0,
        timeSpent: 0,
        lastAccessed: new Date(),
        completed: false,
        notes: []
      });
    }

    // Update or add note
    const noteIndex = userProgress.notes.findIndex((note: any) =>
      note.lessonId.toString() === lessonId
    );

    if (noteIndex > -1) {
      // Update existing note
      userProgress.notes[noteIndex].content = notes.substring(0, 5000);
      userProgress.notes[noteIndex].updatedAt = new Date();
      userProgress.notes[noteIndex].contentType = contentType;
    } else {
      // Add new note
      userProgress.notes.push({
        lessonId: new mongoose.Types.ObjectId(lessonId),
        contentType: contentType,
        content: notes.substring(0, 5000),
        createdAt: new Date(),
        updatedAt: new Date()
      });
    }

    await userProgress.save();

    return NextResponse.json({ success: true, notes: userProgress.notes });
  } catch (error: any) {
    console.error('Error saving notes:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(
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
    const { searchParams } = new URL(request.url);
    const lessonId = searchParams.get('lessonId');
    const contentType = searchParams.get('contentType') || 'sublesson';

    if (lessonId && !mongoose.Types.ObjectId.isValid(lessonId)) {
      return NextResponse.json(
        { error: 'Invalid lessonId' },
        { status: 400 }
      );
    }

    // Get user progress with notes
    const userProgress = await UserProgress.findOne({
      courseId: id,
      userId: currentUserDoc._id
    });

    if (!userProgress) {
      return NextResponse.json({ notes: [] });
    }

    if (lessonId) {
      const note = userProgress.notes.find((note: any) =>
        note.lessonId.toString() === lessonId && note.contentType === contentType
      );
      return NextResponse.json({ note: note || null });
    }

    return NextResponse.json({ notes: userProgress.notes });
  } catch (error: any) {
    console.error('Error fetching notes:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}