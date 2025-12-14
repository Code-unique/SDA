// app/api/admin/courses/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { connectToDatabase } from '@/lib/mongodb';
import User from '@/lib/models/User';
import Course, { IS3Asset } from '@/lib/models/Course';
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

    // Transform modules data with validation
    const transformedModules = body.modules?.map((module: any, index: number) => ({
      _id: module._id && mongoose.Types.ObjectId.isValid(module._id) ? module._id : undefined,
      title: module.title?.substring(0, 200) || '',
      description: module.description?.substring(0, 1000) || '',
      order: typeof module.order === 'number' ? module.order : index,
      lessons: module.lessons?.map((lesson: any, lessonIndex: number) => ({
        _id: lesson._id && mongoose.Types.ObjectId.isValid(lesson._id) ? lesson._id : undefined,
        title: lesson.title?.substring(0, 200) || '',
        description: lesson.description?.substring(0, 1000) || '',
        content: lesson.content || '',
        video: lesson.video as IS3Asset,
        duration: Math.max(0, Math.min(lesson.duration || 0, 10000)),
        isPreview: !!lesson.isPreview,
        resources: Array.isArray(lesson.resources) ? lesson.resources.slice(0, 10) : [],
        order: typeof lesson.order === 'number' ? lesson.order : lessonIndex
      })) || []
    })) || [];

    // Update course
    const updateData: any = {
      ...(body.title && { title: body.title.substring(0, 100) }),
      ...(body.description && { description: body.description }),
      ...(body.shortDescription && { shortDescription: body.shortDescription.substring(0, 200) }),
      ...(body.price !== undefined && { price: body.price }),
      ...(body.isFree !== undefined && { isFree: !!body.isFree }),
      ...(body.level && { level: body.level }),
      ...(body.category && { category: body.category.substring(0, 50) }),
      ...(body.tags && { tags: body.tags.slice(0, 10).map((tag: string) => tag.substring(0, 30)) }),
      ...(body.thumbnail && { thumbnail: body.thumbnail as IS3Asset }),
      ...(body.previewVideo && { previewVideo: body.previewVideo as IS3Asset }),
      ...(body.modules && { modules: transformedModules }),
      ...(body.requirements && { requirements: body.requirements.slice(0, 10).map((req: string) => req.substring(0, 200)) }),
      ...(body.learningOutcomes && { learningOutcomes: body.learningOutcomes.slice(0, 10).map((lo: string) => lo.substring(0, 200)) }),
      ...(body.isFeatured !== undefined && { isFeatured: !!body.isFeatured }),
      ...(body.isPublished !== undefined && { isPublished: !!body.isPublished }),
      ...(slug && { slug })
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

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}