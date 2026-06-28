import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { connectToDatabase } from "@/lib/mongodb";
import User from "@/lib/models/User";
import Course, { ICourse } from "@/lib/models/Course";
import UserProgress from "@/lib/models/UserProgress";
import Activity from "@/lib/models/Activity";
import "@/lib/loadmodels";
import { Types } from "mongoose";

// Define interface for populated instructor
interface IInstructor {
  _id: Types.ObjectId;
  username: string;
  firstName: string;
  lastName: string;
  avatar: string;
}

interface IPopulatedCourse {
  _id: Types.ObjectId;
  title: string;
  description: string;
  shortDescription?: string;
  thumbnail?: {
    url: string;
  };
  instructor: IInstructor | Types.ObjectId;
  level: string;
  totalDuration: number;
  totalStudents: number;
  averageRating: number;
  slug: string;
  isFree: boolean;
  price: number;
  totalLessons?: number;
  students?: Array<{
    user: Types.ObjectId;
    enrolledAt: Date;
  }>;
}

interface IUserProgress {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  courseId: IPopulatedCourse | Types.ObjectId;
  progress: number;
  completed: boolean;
  completedLessons?: Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
  lastAccessed?: Date;
}

export async function GET(request: NextRequest) {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    await connectToDatabase();

    // Get the database user
    const dbUser = await User.findOne({ clerkId: user.id });
    if (!dbUser) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    // Get user's progress for all courses
    const userProgresses = await UserProgress.find({ userId: dbUser._id })
      .populate<{ courseId: IPopulatedCourse }>({
        path: 'courseId',
        select: 'title description thumbnail instructor level totalDuration totalStudents averageRating slug isFree price totalLessons',
        populate: {
          path: 'instructor',
          select: 'username firstName lastName avatar'
        }
      })
      .sort({ lastAccessed: -1 })
      .lean();

    // Transform the data to match the frontend interface
    const enrolledCourses = userProgresses.map((progress: any) => {
      const course = progress.courseId as IPopulatedCourse;
      
      // Helper function to get instructor data safely
      const getInstructorData = () => {
        if (!course?.instructor) {
          return {
            username: "instructor",
            firstName: "",
            lastName: "",
            avatar: ""
          };
        }
        
        // Check if instructor is populated (has username property)
        const instructor = course.instructor as any;
        if (instructor.username) {
          return {
            username: instructor.username || "instructor",
            firstName: instructor.firstName || "",
            lastName: instructor.lastName || "",
            avatar: instructor.avatar || ""
          };
        }
        
        // Instructor is just an ObjectId
        return {
          username: "instructor",
          firstName: "",
          lastName: "",
          avatar: ""
        };
      };

      // Calculate percentage progress
      let progressPercentage = 0;
      if (course && course.totalLessons && progress.completedLessons) {
        progressPercentage = Math.round((progress.completedLessons.length / course.totalLessons) * 100);
      } else {
        progressPercentage = progress.progress * 100;
      }

      const instructorData = getInstructorData();

      return {
        _id: progress._id.toString(),
        enrolledAt: progress.createdAt ? progress.createdAt.toISOString() : new Date().toISOString(),
        progress: progressPercentage,
        completed: progress.completed || false,
        lastAccessed: progress.lastAccessed ? progress.lastAccessed.toISOString() : (progress.updatedAt ? progress.updatedAt.toISOString() : new Date().toISOString()),
        course: course ? {
          _id: course._id.toString(),
          title: course.title || "Untitled Course",
          description: course.description || course.shortDescription || "No description",
          slug: course.slug || "",
          thumbnail: course.thumbnail?.url || "",
          instructor: instructorData,
          level: course.level || "beginner",
          duration: course.totalDuration || 0,
          totalStudents: course.totalStudents || 0,
          averageRating: course.averageRating || 0,
          isFree: course.isFree || false,
          price: course.price || 0
        } : {
          _id: "",
          title: "Course not found",
          description: "This course may have been removed",
          slug: "",
          thumbnail: "",
          instructor: {
            username: "unknown",
            firstName: "",
            lastName: "",
            avatar: ""
          },
          level: "beginner",
          duration: 0,
          totalStudents: 0,
          averageRating: 0,
          isFree: false,
          price: 0
        }
      };
    });

    // Also get courses directly from students array (for backward compatibility)
    const coursesFromStudents = await Course.find({
      'students.user': dbUser._id,
      isPublished: true
    })
      .select('title description thumbnail instructor level totalDuration totalStudents averageRating slug isFree price students')
      .populate<IInstructor>('instructor', 'username firstName lastName avatar')
      .lean();

    // Combine both sources, avoiding duplicates
    const courseIdsInProgress = new Set(enrolledCourses.map(ec => ec.course._id));
    
    const additionalCourses = coursesFromStudents
      .filter(course => !courseIdsInProgress.has(course._id.toString()))
      .map(course => {
        const courseData = course as any;
        const instructor = courseData.instructor as IInstructor;
        
        // Find student enrollment date
        const studentData = courseData.students?.find((s: any) => {
          if (s.user && s.user.toString) {
            return s.user.toString() === dbUser._id.toString();
          }
          return false;
        });

        return {
          _id: `direct-${course._id.toString()}`,
          enrolledAt: studentData?.enrolledAt ? studentData.enrolledAt.toISOString() : new Date().toISOString(),
          progress: 0,
          completed: false,
          lastAccessed: new Date().toISOString(),
          course: {
            _id: course._id.toString(),
            title: courseData.title || "Untitled Course",
            description: courseData.description || "No description",
            slug: courseData.slug || "",
            thumbnail: courseData.thumbnail?.url || "",
            instructor: {
              username: instructor?.username || "instructor",
              firstName: instructor?.firstName || "",
              lastName: instructor?.lastName || "",
              avatar: instructor?.avatar || ""
            },
            level: courseData.level || "beginner",
            duration: courseData.totalDuration || 0,
            totalStudents: courseData.totalStudents || 0,
            averageRating: courseData.averageRating || 0,
            isFree: courseData.isFree || false,
            price: courseData.price || 0
          }
        };
      });

    const allEnrolledCourses = [...enrolledCourses, ...additionalCourses];

    return NextResponse.json({
      enrolledCourses: allEnrolledCourses,
      count: allEnrolledCourses.length,
      stats: {
        total: allEnrolledCourses.length,
        completed: allEnrolledCourses.filter(c => c.completed).length,
        inProgress: allEnrolledCourses.filter(c => c.progress > 0 && !c.completed).length,
        notStarted: allEnrolledCourses.filter(c => c.progress === 0).length
      }
    });

  } catch (error: any) {
    console.error("Error fetching enrolled courses:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error.message },
      { status: 500 }
    );
  }
}

// Optional: POST endpoint to manually enroll in a course
export async function POST(request: NextRequest) {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { courseId } = body;

    if (!courseId) {
      return NextResponse.json(
        { error: "Course ID is required" },
        { status: 400 }
      );
    }

    await connectToDatabase();

    // Get the database user
    const dbUser = await User.findOne({ clerkId: user.id });
    if (!dbUser) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    // Check if course exists
    const course = await Course.findById(courseId);
    if (!course) {
      return NextResponse.json(
        { error: "Course not found" },
        { status: 404 }
      );
    }

    // Check if already enrolled via UserProgress
    const existingProgress = await UserProgress.findOne({
      userId: dbUser._id,
      courseId: course._id
    });

    if (existingProgress) {
      return NextResponse.json(
        { error: "Already enrolled in this course" },
        { status: 400 }
      );
    }

    // Create user progress entry
    const userProgress = await UserProgress.create({
      userId: dbUser._id,
      courseId: course._id,
      progress: 0,
      completed: false,
      timeSpent: 0,
      lastAccessed: new Date()
    });

    // Add student to course (for backward compatibility)
    // Fix the type issue by casting and accessing the method properly
    const courseDoc = course as any;
    if (courseDoc.addStudent && typeof courseDoc.addStudent === 'function') {
      await courseDoc.addStudent(dbUser._id);
    } else {
      // Fallback: Update course directly
      await Course.findByIdAndUpdate(course._id, {
        $addToSet: {
          students: {
            user: dbUser._id,
            enrolledAt: new Date()
          }
        },
        $inc: { totalStudents: 1 }
      });
    }

    // Create activity log
    await Activity.create({
      type: 'enrollment',
      userId: dbUser._id,
      courseId: course._id,
      courseTitle: course.title,
      metadata: {
        method: 'manual',
        free: course.isFree
      }
    });

    return NextResponse.json({
      success: true,
      message: "Successfully enrolled in course",
      enrollment: {
        id: userProgress._id,
        courseId: course._id,
        progress: 0,
        enrolledAt: userProgress.createdAt
      }
    });

  } catch (error: any) {
    console.error("Error enrolling in course:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error.message },
      { status: 500 }
    );
  }
}