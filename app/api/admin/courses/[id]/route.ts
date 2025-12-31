import { NextRequest, NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { connectToDatabase } from '@/lib/mongodb';
import User from '@/lib/models/User';
import Course, { IS3Asset, IModule, IChapter, ILesson, ILessonResource } from '@/lib/models/Course';
import mongoose from 'mongoose';
import "@/lib/loadmodels";

// GET - Fetch single course for admin
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

    // Verify admin role
    const adminUser = await User.findOne({ clerkId: user.id });
    if (!adminUser || adminUser.role !== 'admin') {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      );
    }

    const { id } = await params;

    if (!id || id.length !== 24) {
      return NextResponse.json(
        { error: 'Invalid course ID' },
        { status: 400 }
      );
    }

    const course = await Course.findById(id)
      .populate('instructor', 'username firstName lastName avatar')
      .populate('students.user', 'username firstName lastName avatar');

    if (!course) {
      return NextResponse.json(
        { error: 'Course not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(course);
  } catch (error: any) {
    console.error('Error fetching course:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE - Delete course
export async function DELETE(
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

    // Verify admin role
    const adminUser = await User.findOne({ clerkId: user.id });
    if (!adminUser || adminUser.role !== 'admin') {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      );
    }

    const { id } = await params;

    if (!id || id.length !== 24) {
      return NextResponse.json(
        { error: 'Invalid course ID' },
        { status: 400 }
      );
    }

    const course = await Course.findByIdAndDelete(id);

    if (!course) {
      return NextResponse.json(
        { error: 'Course not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { message: 'Course deleted successfully' }
    );
  } catch (error: any) {
    console.error('Error deleting course:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PATCH - Update course
export async function PATCH(
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

    const adminUser = await User.findOne({ clerkId: user.id });
    if (!adminUser || adminUser.role !== 'admin') {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      );
    }

    const { id } = await params;

    if (!id || id.length !== 24) {
      return NextResponse.json(
        { error: 'Invalid course ID' },
        { status: 400 }
      );
    }

    const body = await request.json();

    // Input validation
    if (body.price !== undefined && (typeof body.price !== 'number' || body.price < 0)) {
      return NextResponse.json(
        { error: 'Invalid price value' },
        { status: 400 }
      );
    }

    if (body.level && !['beginner', 'intermediate', 'advanced'].includes(body.level)) {
      return NextResponse.json(
        { error: 'Invalid level value' },
        { status: 400 }
      );
    }

    // Find existing course
    const existingCourse = await Course.findById(id);
    if (!existingCourse) {
      return NextResponse.json(
        { error: 'Course not found' },
        { status: 404 }
      );
    }

    // Generate new slug if title changed
    let slug = existingCourse.slug;
    if (body.title && body.title !== existingCourse.title) {
      slug = body.title
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .trim()
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .substring(0, 100);
    }

    // Transform modules data with chapters structure
    const transformModules = (modules: any[]): IModule[] => {
      return modules.map((module, moduleIndex) => ({
        _id: module._id && mongoose.Types.ObjectId.isValid(module._id) 
          ? new mongoose.Types.ObjectId(module._id) 
          : new mongoose.Types.ObjectId(),
        title: module.title?.substring(0, 200) || `Module ${moduleIndex + 1}`,
        // UPDATED: description is optional
        description: module.description?.substring(0, 1000) || undefined,
        thumbnailUrl: module.thumbnailUrl || undefined,
        order: typeof module.order === 'number' ? module.order : moduleIndex,
        chapters: transformChapters(module.chapters || [], moduleIndex)
      }));
    };

    const transformChapters = (chapters: any[], moduleIndex: number): IChapter[] => {
      return chapters.map((chapter, chapterIndex) => ({
        _id: chapter._id && mongoose.Types.ObjectId.isValid(chapter._id) 
          ? new mongoose.Types.ObjectId(chapter._id) 
          : new mongoose.Types.ObjectId(),
        title: chapter.title?.substring(0, 200) || `Chapter ${chapterIndex + 1}`,
        // UPDATED: description is optional
        description: chapter.description?.substring(0, 1000) || undefined,
        order: typeof chapter.order === 'number' ? chapter.order : chapterIndex,
        lessons: transformLessons(chapter.lessons || [], chapterIndex)
      }));
    };

    const transformLessons = (lessons: any[], chapterIndex: number): ILesson[] => {
      return lessons.map((lesson, lessonIndex) => ({
        _id: lesson._id && mongoose.Types.ObjectId.isValid(lesson._id) 
          ? new mongoose.Types.ObjectId(lesson._id) 
          : new mongoose.Types.ObjectId(),
        title: lesson.title?.substring(0, 200) || `Lesson ${lessonIndex + 1}`,
        // UPDATED: description and content are optional
        description: lesson.description?.substring(0, 1000) || undefined,
        content: lesson.content || undefined,
        video: lesson.video as IS3Asset || {
          key: '',
          url: '',
          size: 0,
          type: 'video'
        },
        duration: Math.max(0, Math.min(lesson.duration || 0, 10000)),
        isPreview: !!lesson.isPreview,
        resources: transformResources(lesson.resources || []),
        order: typeof lesson.order === 'number' ? lesson.order : lessonIndex
      }));
    };

    const transformResources = (resources: any[]): ILessonResource[] => {
      return resources.map((resource, resourceIndex) => ({
        _id: resource._id && mongoose.Types.ObjectId.isValid(resource._id) 
          ? new mongoose.Types.ObjectId(resource._id) 
          : new mongoose.Types.ObjectId(),
        title: resource.title?.substring(0, 200) || `Resource ${resourceIndex + 1}`,
        url: resource.url || '',
        type: ['pdf', 'document', 'link', 'video'].includes(resource.type) 
          ? resource.type as 'pdf' | 'document' | 'link' | 'video'
          : 'pdf'
      }));
    };

    // Transform modules data
    const transformedModules = body.modules ? transformModules(body.modules) : existingCourse.modules;

    // Update course
    const updateData: any = {
      ...(body.title && { title: body.title.substring(0, 100) }),
      ...(body.description && { description: body.description }),
      ...(body.shortDescription && { shortDescription: body.shortDescription.substring(0, 200) }),
      ...(body.price !== undefined && { price: body.price }),
      ...(body.isFree !== undefined && { isFree: !!body.isFree }),
      ...(body.level && { level: body.level }),
      // UPDATED: category is now optional
      ...(body.category !== undefined && { 
        category: body.category ? body.category.substring(0, 50) : undefined 
      }),
      ...(body.tags && { tags: body.tags.slice(0, 10).map((tag: string) => tag.substring(0, 30)) }),
      ...(body.thumbnail && { thumbnail: body.thumbnail as IS3Asset }),
      ...(body.previewVideo !== undefined && { previewVideo: body.previewVideo as IS3Asset }),
      ...(body.modules && { modules: transformedModules }),
      ...(body.requirements && { requirements: body.requirements.slice(0, 10).map((req: string) => req.substring(0, 200)) }),
      ...(body.learningOutcomes && { learningOutcomes: body.learningOutcomes.slice(0, 10).map((lo: string) => lo.substring(0, 200)) }),
      ...(body.isFeatured !== undefined && { isFeatured: !!body.isFeatured }),
      ...(body.isPublished !== undefined && { isPublished: !!body.isPublished }),
      ...(slug && { slug })
    };

    console.log('Updating course with data:', {
      id,
      title: updateData.title,
      modulesCount: updateData.modules?.length || 0,
      chaptersCount: updateData.modules?.reduce((total: number, module: any) => total + (module.chapters?.length || 0), 0) || 0,
      lessonsCount: updateData.modules?.reduce((total: number, module: any) => 
        total + (module.chapters?.reduce((chapterTotal: number, chapter: any) => 
          chapterTotal + (chapter.lessons?.length || 0), 0) || 0), 0) || 0
    });

    const updatedCourse = await Course.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    ).populate('instructor', 'username firstName lastName avatar');

    if (!updatedCourse) {
      return NextResponse.json(
        { error: 'Course not found' },
        { status: 404 }
      );
    }

    console.log('Course updated successfully:', {
      id: updatedCourse._id,
      title: updatedCourse.title,
      modulesCount: updatedCourse.modules.length,
      chaptersCount: updatedCourse.modules.reduce((total, module) => total + module.chapters.length, 0),
      lessonsCount: updatedCourse.modules.reduce((total, module) => 
        total + module.chapters.reduce((chapterTotal, chapter) => chapterTotal + chapter.lessons.length, 0), 0)
    });

    return NextResponse.json(updatedCourse);
  } catch (error: any) {
    console.error('Error updating course:', error);
    
    if (error.code === 11000) {
      return NextResponse.json(
        { error: 'Course with this title already exists' },
        { status: 400 }
      );
    }

    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map((err: any) => err.message);
      return NextResponse.json(
        { error: 'Validation failed', details: errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}