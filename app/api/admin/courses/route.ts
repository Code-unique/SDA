import { NextRequest, NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { connectToDatabase } from '@/lib/mongodb';
import User from '@/lib/models/User';
import Course, { IS3Asset } from '@/lib/models/Course';
import "@/lib/loadmodels";

// app/api/admin/courses/route.ts (POST method - preserve S3 pattern)
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

    // UPDATED: Remove category from required fields
    const requiredFields = ['title', 'description', 'shortDescription', 'level', 'thumbnail'];
    const missingFields = requiredFields.filter(field => !body[field]);

    if (missingFields.length > 0) {
      return NextResponse.json(
        { error: `Missing required fields: ${missingFields.join(', ')}` },
        { status: 400 }
      );
    }

    // Preserve original field length patterns
    if (body.title.length > 100) {
      return NextResponse.json(
        { error: 'Title must be less than 100 characters' },
        { status: 400 }
      );
    }

    if (body.shortDescription.length > 200) {
      return NextResponse.json(
        { error: 'Short description must be less than 200 characters' },
        { status: 400 }
      );
    }

    if (!['beginner', 'intermediate', 'advanced'].includes(body.level)) {
      return NextResponse.json(
        { error: 'Invalid level value' },
        { status: 400 }
      );
    }

    // Validate price (preserve original pattern)
    if (body.price !== undefined && (typeof body.price !== 'number' || body.price < 0)) {
      return NextResponse.json(
        { error: 'Invalid price value' },
        { status: 400 }
      );
    }

    // Generate slug (preserve original pattern)
    const slug = body.title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .trim()
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .substring(0, 100);

    // Check for existing course (preserve original pattern)
    const existingCourse = await Course.findOne({
      $or: [
        { title: body.title },
        { slug }
      ]
    });

    if (existingCourse) {
      return NextResponse.json(
        { error: 'Course with this title already exists' },
        { status: 400 }
      );
    }

    // Transform modules data with validation (NEW: includes chapters)
    const transformedModules = body.modules?.map((module: any, index: number) => ({
      title: module.title?.substring(0, 200) || '',
      description: module.description?.substring(0, 1000) || '', // Optional
      thumbnailUrl: module.thumbnailUrl || '', // NEW FIELD
      order: typeof module.order === 'number' ? module.order : index,
      chapters: module.chapters?.map((chapter: any, chapterIndex: number) => ({
        title: chapter.title?.substring(0, 200) || '',
        description: chapter.description?.substring(0, 1000) || '', // Optional
        order: typeof chapter.order === 'number' ? chapter.order : chapterIndex,
        lessons: chapter.lessons?.map((lesson: any, lessonIndex: number) => ({
          title: lesson.title?.substring(0, 200) || '',
          description: lesson.description?.substring(0, 1000) || '', // Optional
          content: lesson.content || '', // Optional
          video: lesson.video as IS3Asset, // Preserve S3 asset pattern
          duration: Math.max(0, Math.min(lesson.duration || 0, 10000)),
          isPreview: !!lesson.isPreview,
          resources: Array.isArray(lesson.resources) ? lesson.resources.slice(0, 10) : [],
          order: typeof lesson.order === 'number' ? lesson.order : lessonIndex
        })) || []
      })) || []
    })) || [];

    // Create course with proper schema structure (preserve original pattern)
    const courseData = {
      title: body.title.substring(0, 100),
      slug,
      description: body.description,
      shortDescription: body.shortDescription.substring(0, 200),
      price: body.isFree ? 0 : (body.price || 0),
      isFree: !!body.isFree,
      level: body.level,
      // UPDATED: category is now optional
      category: body.category ? body.category.substring(0, 50) : undefined,
      tags: (body.tags || []).slice(0, 10).map((tag: string) => tag.substring(0, 30)),
      thumbnail: body.thumbnail as IS3Asset, // Preserve S3 asset pattern
      previewVideo: body.previewVideo as IS3Asset | undefined, // Preserve S3 asset pattern
      modules: transformedModules,
      instructor: adminUser._id,
      requirements: (body.requirements || []).slice(0, 10).map((req: string) => req.substring(0, 200)),
      learningOutcomes: (body.learningOutcomes || []).slice(0, 10).map((lo: string) => lo.substring(0, 200)),
      isPublished: false,
      isFeatured: !!body.isFeatured,
    };

    const course = await Course.create(courseData);
    await course.populate('instructor', 'username firstName lastName avatar');

    return NextResponse.json({
      _id: course._id,
      title: course.title,
      slug: course.slug,
      description: course.description,
      shortDescription: course.shortDescription,
      instructor: course.instructor,
      price: course.price,
      isFree: course.isFree,
      level: course.level,
      category: course.category,
      tags: course.tags,
      thumbnail: course.thumbnail,
      previewVideo: course.previewVideo,
      modules: course.modules,
      requirements: course.requirements,
      learningOutcomes: course.learningOutcomes,
      isPublished: course.isPublished,
      isFeatured: course.isFeatured,
      totalStudents: course.totalStudents,
      averageRating: course.averageRating,
      totalDuration: course.totalDuration,
      totalLessons: course.totalLessons,
      createdAt: course.createdAt,
      updatedAt: course.updatedAt
    });
  } catch (error: any) {
    console.error('Error creating course:', error);

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

// GET method remains the same...
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
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const limit = Math.max(1, Math.min(100, parseInt(searchParams.get('limit') || '10')));
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || 'all';

    const skip = (page - 1) * limit;

    let query: any = {};

    if (search) {
      query.$or = [
        { title: { $regex: search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' } },
        { description: { $regex: search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' } },
        { category: { $regex: search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' } }
      ];
    }

    if (status !== 'all') {
      if (status === 'published') query.isPublished = true;
      else if (status === 'draft') query.isPublished = false;
      else if (status === 'featured') query.isFeatured = true;
    }

    const [courses, total] = await Promise.all([
      Course.find(query)
        .populate('instructor', 'username firstName lastName avatar')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Course.countDocuments(query)
    ]);

    return NextResponse.json({
      courses: courses.map(course => ({
        ...course,
        totalReviews: course.ratings?.length || 0
      })),
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        total,
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1
      }
    });
  } catch (error: any) {
    console.error('Error fetching courses:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}