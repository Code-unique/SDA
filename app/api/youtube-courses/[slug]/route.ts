import { NextRequest, NextResponse } from 'next/server'
import { connectToDatabase } from '@/lib/mongodb'
import YouTubeCourse from '@/lib/models/YouTubeCourse'
import '@/lib/loadmodels'
import mongoose from 'mongoose'
import { isValidObjectId } from '@/lib/utils/objectId'

// Define interfaces
interface Lesson {
  duration?: number;
  subLessons?: SubLesson[];
}

interface SubLesson {
  duration?: number;
}

interface Chapter {
  lessons?: Lesson[];
}

interface Module {
  chapters?: Chapter[];
}

interface Rating {
  user?: any;
}

interface Course {
  _id: mongoose.Types.ObjectId;
  title: string;
  slug: string;
  category?: string;
  instructor?: any;
  ratings?: Rating[];
  modules?: Module[];
  isPublished: boolean;
  description?: string;
  shortDescription?: string;
  price: number;
  isFree: boolean;
  level?: string;
  tags?: string[];
  thumbnail?: string;
  previewVideo?: string;
  requirements?: string[];
  learningOutcomes?: string[];
  totalStudents: number;
  averageRating: number;
  createdAt: Date;
  updatedAt: Date;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    await connectToDatabase()

    const { slug } = await params

    if (!slug) {
      return NextResponse.json(
        { error: 'Course slug is required' },
        { status: 400 }
      )
    }

    // Build query based on whether slug is ObjectId or regular slug
    let query: any = { isPublished: true }
    
    if (isValidObjectId(slug)) {
      // If slug looks like an ObjectId, search by _id
      query._id = new mongoose.Types.ObjectId(slug)
    } else {
      // Otherwise search by slug
      query.slug = slug
    }

    const course = await YouTubeCourse.findOne(query)
      .populate('instructor', 'username firstName lastName avatar bio')
      .populate('ratings.user', 'username firstName lastName avatar')
      .lean() as Course | null

    if (!course) {
      return NextResponse.json(
        { error: 'Course not found or not published' },
        { status: 404 }
      )
    }

    // Get similar courses
    const similarCourses = await YouTubeCourse.find({
      _id: { $ne: course._id },
      category: course.category,
      isPublished: true
    })
      .populate('instructor', 'username firstName lastName avatar')
      .limit(4)
      .select('title slug thumbnail price isFree level category totalStudents averageRating')
      .lean() as unknown as Course[]

    // Calculate total reviews
    const totalReviews = course.ratings?.length || 0

    // Calculate total duration and lessons
    let totalDuration = 0
    let totalLessons = 0
    
    if (course.modules) {
      course.modules.forEach((module: Module) => {
        if (module.chapters) {
          module.chapters.forEach((chapter: Chapter) => {
            if (chapter.lessons) {
              totalLessons += chapter.lessons.length
              chapter.lessons.forEach((lesson: Lesson) => {
                totalDuration += lesson.duration || 0
                if (lesson.subLessons) {
                  totalLessons += lesson.subLessons.length
                  lesson.subLessons.forEach((subLesson: SubLesson) => {
                    totalDuration += subLesson.duration || 0
                  })
                }
              })
            }
          })
        }
      })
    }

    const enhancedCourse = {
      ...course,
      _id: course._id.toString(),
      totalDuration,
      totalLessons,
      totalReviews,
      similarCourses: similarCourses.map((c: Course) => ({
        ...c,
        _id: c._id.toString(),
        totalReviews: c.ratings?.length || 0
      }))
    }

    return NextResponse.json(enhancedCourse)
    
  } catch (error: any) {
    console.error('Error fetching YouTube course:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}