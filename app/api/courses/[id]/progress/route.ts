// app/api/courses/[id]/progress/route.ts - UPDATED FOR LESSON AND SUBLESSON VIDEOS
import { NextRequest, NextResponse } from 'next/server'
import { currentUser } from '@clerk/nextjs/server'
import { connectToDatabase } from '@/lib/mongodb'
import User from '@/lib/models/User'
import Course, { ICourse, ILesson, ISubLesson } from '@/lib/models/Course'
import UserProgress from '@/lib/models/UserProgress'
import mongoose from 'mongoose'
import { NotificationService } from '@/lib/services/notificationService'
import "@/lib/loadmodels";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await currentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    await connectToDatabase()
    
    const currentUserDoc = await User.findOne({ clerkId: user.id })
    if (!currentUserDoc) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const { id } = await params

    // Handle both ObjectId and slug
    let course: ICourse | null = null
    
    if (mongoose.Types.ObjectId.isValid(id)) {
      course = await Course.findById(id)
        .populate('instructor', 'firstName lastName username avatar bio rating totalStudents expertise')
    } else {
      course = await Course.findOne({ slug: id })
        .populate('instructor', 'firstName lastName username avatar bio rating totalStudents expertise')
    }

    if (!course) {
      return NextResponse.json({ error: 'Course not found' }, { status: 404 })
    }

    // Check if user is enrolled
    const isEnrolled = course.students?.some(
      (student: any) => student.user.toString() === currentUserDoc._id.toString()
    )

    if (!isEnrolled) {
      return NextResponse.json({ 
        error: 'Not enrolled in this course',
        requiresEnrollment: true 
      }, { status: 403 })
    }

    // Get or create user progress
    let userProgress = await UserProgress.findOne({
      courseId: course._id,
      userId: currentUserDoc._id
    })

    // Find first content item for new users (check for lesson or sub-lesson)
    let firstContentId: mongoose.Types.ObjectId | null = null
    let contentType: 'lesson' | 'sublesson' | null = null
    
    if (course.modules && course.modules.length > 0) {
      outerLoop: for (const module of course.modules) {
        if (module.chapters && module.chapters.length > 0) {
          for (const chapter of module.chapters) {
            if (chapter.lessons && chapter.lessons.length > 0) {
              for (const lesson of chapter.lessons as ILesson[]) {
                // Check if lesson has video
                if (lesson.videoSource) {
                  firstContentId = lesson._id
                  contentType = 'lesson'
                  break outerLoop
                }
                
                // Check for sub-lessons with videos
                if (lesson.subLessons && lesson.subLessons.length > 0) {
                  for (const subLesson of lesson.subLessons as ISubLesson[]) {
                    if (subLesson.videoSource) {
                      firstContentId = subLesson._id as mongoose.Types.ObjectId
                      contentType = 'sublesson'
                      break outerLoop
                    }
                  }
                }
              }
            }
          }
        }
      }
    }

    if (!userProgress) {
      userProgress = await UserProgress.create({
        courseId: course._id,
        userId: currentUserDoc._id,
        enrolled: true,
        completedLessons: [],
        currentLesson: firstContentId,
        contentType: contentType,
        progress: 0,
        timeSpent: 0,
        lastAccessed: new Date(),
        completed: false
      })
    }

    // Convert to plain object for serialization
    const progressData = userProgress.toObject ? userProgress.toObject() : userProgress
    
    return NextResponse.json({
      ...progressData,
      _id: (progressData._id as any)?.toString() || '',
      courseId: (progressData.courseId as any)?.toString() || '',
      userId: (progressData.userId as any)?.toString() || '',
      currentLesson: (progressData.currentLesson as any)?.toString() || null,
      contentType: progressData.contentType || null,
      completedLessons: (progressData.completedLessons || []).map((id: any) => id?.toString() || '')
    })
  } catch (error: any) {
    console.error('Error fetching user progress:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message }, 
      { status: 500 }
    )
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await currentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    await connectToDatabase()
    
    const currentUserDoc = await User.findOne({ clerkId: user.id })
    if (!currentUserDoc) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const { id } = await params
    const body = await request.json()
    const { lessonId, completed, current, timeSpent = 0, contentType = 'sublesson' } = body

    if (!lessonId) {
      return NextResponse.json({ error: 'lessonId is required' }, { status: 400 })
    }

    // Handle both ObjectId and slug
    let course: ICourse | null = null
    
    if (mongoose.Types.ObjectId.isValid(id)) {
      course = await Course.findById(id)
    } else {
      course = await Course.findOne({ slug: id })
    }

    if (!course) {
      return NextResponse.json({ error: 'Course not found' }, { status: 404 })
    }

    // Check if user is enrolled
    const isEnrolled = course.students?.some(
      (student: any) => student.user.toString() === currentUserDoc._id.toString()
    )

    if (!isEnrolled) {
      return NextResponse.json({ 
        error: 'Not enrolled in this course',
        requiresEnrollment: true 
      }, { status: 403 })
    }

    // Verify content exists in course (could be lesson or sub-lesson)
    let contentExists = false
    let isLessonContent = false

    // Search through the course structure
    if (course.modules) {
      outerLoop: for (const module of course.modules) {
        if (module.chapters) {
          for (const chapter of module.chapters) {
            if (chapter.lessons) {
              for (const lesson of chapter.lessons as ILesson[]) {
                // Check main lesson
                if (lesson._id?.toString() === lessonId) {
                  contentExists = true
                  isLessonContent = true
                  break outerLoop
                }
                
                // Check sub-lessons
                if (lesson.subLessons) {
                  for (const subLesson of lesson.subLessons as ISubLesson[]) {
                    if (subLesson._id?.toString() === lessonId) {
                      contentExists = true
                      isLessonContent = false
                      break outerLoop
                    }
                  }
                }
              }
            }
          }
        }
      }
    }

    if (!contentExists) {
      return NextResponse.json({ error: 'Content not found in course' }, { status: 404 })
    }

    // Get or create user progress
    let userProgress = await UserProgress.findOne({
      courseId: course._id,
      userId: currentUserDoc._id
    })

    if (!userProgress) {
      // Find first content item for new users
      let firstContentId: mongoose.Types.ObjectId | null = null
      let firstContentType: 'lesson' | 'sublesson' | null = null
      
      if (course.modules && course.modules.length > 0) {
        outerLoop: for (const module of course.modules) {
          if (module.chapters && module.chapters.length > 0) {
            for (const chapter of module.chapters) {
              if (chapter.lessons && chapter.lessons.length > 0) {
                for (const lesson of chapter.lessons as ILesson[]) {
                  // Check if lesson has video
                  if (lesson.videoSource) {
                    firstContentId = lesson._id
                    firstContentType = 'lesson'
                    break outerLoop
                  }
                  
                  // Check for sub-lessons with videos
                  if (lesson.subLessons && lesson.subLessons.length > 0) {
                    for (const subLesson of lesson.subLessons as ISubLesson[]) {
                      if (subLesson.videoSource) {
                        firstContentId = subLesson._id as mongoose.Types.ObjectId
                        firstContentType = 'sublesson'
                        break outerLoop
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }

      userProgress = await UserProgress.create({
        courseId: course._id,
        userId: currentUserDoc._id,
        enrolled: true,
        completedLessons: [],
        currentLesson: firstContentId,
        contentType: firstContentType,
        progress: 0,
        timeSpent: 0,
        lastAccessed: new Date(),
        completed: false
      })
    }

    // Calculate total content items (lessons with videos + sub-lessons with videos)
    const totalContentItems = course.modules?.reduce((total: number, module: any) => {
      if (!module.chapters) return total
      return total + module.chapters.reduce((chapterTotal: number, chapter: any) => {
        if (!chapter.lessons) return chapterTotal
        return chapterTotal + chapter.lessons.reduce((lessonTotal: number, lesson: ILesson) => {
          let count = 0
          
          // Count lesson if it has video
          if (lesson.videoSource) {
            count += 1
          }
          
          // Count sub-lessons with videos
          if (lesson.subLessons) {
            count += lesson.subLessons.filter((subLesson: ISubLesson) => 
              subLesson.videoSource
            ).length
          }
          
          return lessonTotal + count
        }, 0)
      }, 0)
    }, 0) || 0

    // Update progress
    const updates: any = {
      lastAccessed: new Date(),
      timeSpent: (userProgress.timeSpent || 0) + timeSpent
    }

    if (current) {
      updates.currentLesson = new mongoose.Types.ObjectId(lessonId)
      updates.contentType = contentType
    }

    let completedLessons = [...(userProgress.completedLessons || [])]
    
    if (completed && !completedLessons.some(id => 
      (id as any)?.toString() === lessonId
    )) {
      completedLessons.push(new mongoose.Types.ObjectId(lessonId))
      updates.completedLessons = completedLessons
      
      // Calculate new progress
      const newCompletedCount = completedLessons.length
      updates.progress = totalContentItems > 0 ? Math.min(newCompletedCount / totalContentItems, 1) : 0
      
      // Check if course is completed
      if (newCompletedCount >= totalContentItems) {
        updates.completed = true
        updates.completedAt = new Date()
        
        // Create notifications
        if (currentUserDoc.notificationPreferences?.achievements) {
          await NotificationService.createNotification({
            userId: currentUserDoc._id,
            type: 'achievement',
            courseId: course._id as mongoose.Types.ObjectId,
            message: `🎉 You completed "${course.title}"! Congratulations!`,
            actionUrl: `/courses/${course.slug || course._id}/certificate`
          });
        }
        
        if (currentUserDoc.notificationPreferences?.courses) {
          await NotificationService.createNotification({
            userId: currentUserDoc._id,
            type: 'course',
            courseId: course._id as mongoose.Types.ObjectId,
            message: `You successfully completed "${course.title}"!`,
            actionUrl: `/profile/achievements`
          });
        }
      }
    }

    const updatedProgress = await UserProgress.findOneAndUpdate(
      { courseId: course._id, userId: currentUserDoc._id },
      updates,
      { new: true }
    )

    // Convert to plain object for serialization
    const progressData = updatedProgress?.toObject ? updatedProgress.toObject() : updatedProgress
    
    return NextResponse.json({
      ...progressData,
      _id: (progressData?._id as any)?.toString() || '',
      courseId: (progressData?.courseId as any)?.toString() || '',
      userId: (progressData?.userId as any)?.toString() || '',
      currentLesson: (progressData?.currentLesson as any)?.toString() || null,
      contentType: progressData?.contentType || null,
      completedLessons: (progressData?.completedLessons || []).map((id: any) => id?.toString() || '')
    })
  } catch (error: any) {
    console.error('Error updating user progress:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message }, 
      { status: 500 }
    )
  }
}