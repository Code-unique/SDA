// app/api/admin/courses/[id]/route.ts - UPDATED WITH SUBLESSONS
import { NextRequest, NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { connectToDatabase } from '@/lib/mongodb';
import User from '@/lib/models/User';
import Course, { 
  IS3Asset, 
  IModule, 
  IChapter, 
  ILesson, 
  ISubLesson, 
  ILessonResource,
  IVideoSource
} from '@/lib/models/Course';
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

// PATCH - Update course (UPDATED FOR SUBLESSONS)
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

    // Helper function to create video source
    const createVideoSource = (videoData: any, duration: number = 0): IVideoSource => {
      if (!videoData || !videoData.key) {
        return {
          type: 'uploaded',
          video: {
            key: '',
            url: '',
            size: 0,
            type: 'video',
            duration: duration || 0
          } as IS3Asset,
          uploadedAt: new Date(),
          uploadedBy: adminUser._id
        };
      }

      return {
        type: 'uploaded',
        video: {
          key: videoData.key || '',
          url: videoData.url || '',
          size: videoData.size || 0,
          type: 'video',
          duration: videoData.duration || duration || 0,
          width: videoData.width,
          height: videoData.height,
          fileName: videoData.fileName || videoData.originalFileName || '',
          originalFileName: videoData.originalFileName || videoData.fileName || ''
        } as IS3Asset,
        uploadedAt: new Date(),
        uploadedBy: adminUser._id
      };
    };

    // Transform resources
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

    // Transform sub-lessons
    const transformSubLessons = (subLessons: any[]): ISubLesson[] => {
      return subLessons.map((subLesson, subLessonIndex) => {
        let videoSource: IVideoSource;
        
        // Handle different video data formats
        if (subLesson.video || subLesson.videoSource) {
          const videoData = subLesson.video || subLesson.videoSource?.video || subLesson.videoSource;
          videoSource = createVideoSource(videoData, subLesson.duration);
        } else {
          videoSource = createVideoSource(null, subLesson.duration);
        }

        const subLessonData: ISubLesson = {
          _id: subLesson._id && mongoose.Types.ObjectId.isValid(subLesson._id) 
            ? new mongoose.Types.ObjectId(subLesson._id) 
            : new mongoose.Types.ObjectId(),
          title: subLesson.title?.substring(0, 200) || `Sub-lesson ${subLessonIndex + 1}`,
          description: subLesson.description || '',
          content: subLesson.content || '',
          videoSource: videoSource,
          duration: subLesson.duration || 0,
          isPreview: subLesson.isPreview || false,
          resources: transformResources(subLesson.resources || []),
          order: typeof subLesson.order === 'number' ? subLesson.order : subLessonIndex,
          createdAt: subLesson.createdAt || new Date(),
          updatedAt: new Date()
        };

        return subLessonData;
      });
    };

    // Transform lessons (now with videoSource)
    const transformLessons = (lessons: any[]): ILesson[] => {
      return lessons.map((lesson, lessonIndex) => {
        let videoSource: IVideoSource;
        
        // Create video source for lesson if provided
        if (lesson.video || lesson.videoSource) {
          const videoData = lesson.video || lesson.videoSource?.video || lesson.videoSource;
          videoSource = createVideoSource(videoData, lesson.duration);
        } else {
          videoSource = createVideoSource(null, lesson.duration);
        }

        const lessonData: ILesson = {
          _id: lesson._id && mongoose.Types.ObjectId.isValid(lesson._id) 
            ? new mongoose.Types.ObjectId(lesson._id) 
            : new mongoose.Types.ObjectId(),
          title: lesson.title?.substring(0, 200) || `Lesson ${lessonIndex + 1}`,
          description: lesson.description || '',
          videoSource: videoSource,
          content: lesson.content || '',
          subLessons: transformSubLessons(lesson.subLessons || []),
          duration: lesson.duration || 0,
          order: typeof lesson.order === 'number' ? lesson.order : lessonIndex,
          createdAt: lesson.createdAt || new Date(),
          updatedAt: new Date()
        };

        return lessonData;
      });
    };

    const transformChapters = (chapters: any[]): IChapter[] => {
      return chapters.map((chapter, chapterIndex) => {
        const chapterData: IChapter = {
          _id: chapter._id && mongoose.Types.ObjectId.isValid(chapter._id) 
            ? new mongoose.Types.ObjectId(chapter._id) 
            : new mongoose.Types.ObjectId(),
          title: chapter.title?.substring(0, 200) || `Chapter ${chapterIndex + 1}`,
          description: chapter.description?.substring(0, 1000) || undefined,
          order: typeof chapter.order === 'number' ? chapter.order : chapterIndex,
          lessons: transformLessons(chapter.lessons || []),
          createdAt: chapter.createdAt || new Date(),
          updatedAt: new Date()
        };

        return chapterData;
      });
    };

    const transformModules = (modules: any[]): IModule[] => {
      return modules.map((module, moduleIndex) => {
        const moduleData: IModule = {
          _id: module._id && mongoose.Types.ObjectId.isValid(module._id) 
            ? new mongoose.Types.ObjectId(module._id) 
            : new mongoose.Types.ObjectId(),
          title: module.title?.substring(0, 200) || `Module ${moduleIndex + 1}`,
          description: module.description?.substring(0, 1000) || undefined,
          thumbnailUrl: module.thumbnailUrl || undefined,
          order: typeof module.order === 'number' ? module.order : moduleIndex,
          chapters: transformChapters(module.chapters || []),
          createdAt: module.createdAt || new Date(),
          updatedAt: new Date()
        };

        return moduleData;
      });
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
      ...(body.category !== undefined && { 
        category: body.category ? body.category.substring(0, 50) : undefined 
      }),
      ...(body.tags && { tags: body.tags.slice(0, 10).map((tag: string) => tag.substring(0, 30)) }),
      ...(body.thumbnail && { thumbnail: body.thumbnail as IS3Asset }),
      ...(body.previewVideo !== undefined && { previewVideo: body.previewVideo as IS3Asset }),
      modules: transformedModules,
      ...(body.requirements && { requirements: body.requirements.slice(0, 10).map((req: string) => req.substring(0, 200)) }),
      ...(body.learningOutcomes && { learningOutcomes: body.learningOutcomes.slice(0, 10).map((lo: string) => lo.substring(0, 200)) }),
      ...(body.isFeatured !== undefined && { isFeatured: !!body.isFeatured }),
      ...(body.isPublished !== undefined && { isPublished: !!body.isPublished }),
      ...(slug && { slug }),
      instructor: existingCourse.instructor
    };

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