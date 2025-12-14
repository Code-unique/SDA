'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { useToast } from "@/components/ui/use-toast"
import { Textarea } from '@/components/ui/textarea'
import { PaymentModal } from '@/components/payment/PaymentModal'
import { 
  Star, 
  Clock, 
  PlayCircle, 
  BookOpen, 
  ChevronDown,
  Heart,
  Share2,
  Download,
  Award,
  CheckCircle,
  Loader2,
  MessageCircle,
  ArrowLeft,
  ArrowRight,
  Video,
  Play,
  Users,
  Check,
  Calendar,
  FileText,
  Menu,
  X,
  Bookmark,
  GraduationCap,
  Target,
  Zap,
  Shield,
  TrendingUp,
  BookCheck,
  Eye,
  Clock4,
  ChevronRight,
  ExternalLink,
  Globe,
  UserCheck,
  Medal,
  Crown,
  Rocket,
  Sparkles
} from 'lucide-react'

interface S3Asset {
  key: string
  url: string
  size: number
  type: 'image' | 'video'
  duration?: number
  width?: number
  height?: number
}

interface Lesson {
  _id: string
  title: string
  description: string
  duration: number
  isPreview: boolean
  order: number
  video?: S3Asset
  resources: Array<{
    title: string
    url: string
    type: string
  }>
}

interface Chapter {
  _id: string
  title: string
  description: string
  order: number
  lessons: Lesson[]
}

interface Module {
  _id: string
  title: string
  description: string
  thumbnailUrl?: string
  order: number
  chapters: Chapter[]
}

interface Course {
  _id: string
  title: string
  description: string
  shortDescription: string
  slug: string
  instructor: {
    _id: string
    firstName: string
    lastName: string
    username: string
    avatar?: string
    bio?: string
    rating?: number
    totalStudents?: number
    expertise?: string[]
  }
  price: number
  isFree: boolean
  level: 'beginner' | 'intermediate' | 'advanced'
  category: string
  tags: string[]
  thumbnail: S3Asset
  previewVideo?: S3Asset
  totalStudents: number
  averageRating: number
  totalReviews: number
  modules: Module[]
  totalDuration: number
  totalLessons: number
  isPublished: boolean
  isFeatured: boolean
  requirements: string[]
  learningOutcomes: string[]
  ratings: Array<{
    _id: string
    user: {
      _id: string
      firstName: string
      lastName: string
      username: string
      avatar?: string
    }
    rating: number
    review?: string
    createdAt: string
  }>
  createdAt: string
  updatedAt: string
  completionRate?: number
  similarCourses?: Course[]
}

interface UserProgress {
  _id: string
  courseId: string
  userId: string
  enrolled: boolean
  progress: number
  completed: boolean
  completedLessons: string[]
  currentLesson: string | null
  timeSpent: number
  lastAccessed: Date
  completedAt?: Date
}

export default function CourseDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { toast } = useToast()
  const [course, setCourse] = useState<Course | null>(null)
  const [userProgress, setUserProgress] = useState<UserProgress | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isEnrolling, setIsEnrolling] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'overview' | 'curriculum' | 'reviews' | 'instructor'>('overview')
  const [expandedModules, setExpandedModules] = useState<Set<number>>(new Set([0]))
  const [expandedChapters, setExpandedChapters] = useState<Set<string>>(new Set())
  const [newRating, setNewRating] = useState({ rating: 5, review: '' })
  const [isSubmittingRating, setIsSubmittingRating] = useState(false)
  const [isLearningMode, setIsLearningMode] = useState(false)
  const [updatingProgress, setUpdatingProgress] = useState<string | null>(null)
  const [activeLesson, setActiveLesson] = useState<Lesson | null>(null)
  const [completedLessons, setCompletedLessons] = useState<Set<string>>(new Set())
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [showEnrollmentSuccess, setShowEnrollmentSuccess] = useState(false)
  const [showMobileCurriculum, setShowMobileCurriculum] = useState(false)
  const [isBookmarked, setIsBookmarked] = useState(false)

  const slug = params.slug as string

  const fetchCourseData = async () => {
    try {
      setLoading(true)
      setError(null)

      const [courseResponse, progressResponse] = await Promise.all([
        fetch(`/api/courses/${slug}`),
        fetch(`/api/courses/${slug}/progress`)
      ])

      if (!courseResponse.ok) {
        throw new Error(`Failed to load course`)
      }

      const data = await courseResponse.json()
      
      const processedCourse: Course = {
        ...data,
        thumbnail: data.thumbnail ? {
          key: data.thumbnail.key || data.thumbnail.public_id,
          url: data.thumbnail.url || data.thumbnail.secure_url,
          size: data.thumbnail.size || data.thumbnail.bytes,
          type: data.thumbnail.type || 'image',
          width: data.thumbnail.width,
          height: data.thumbnail.height
        } : {
          key: 'default',
          url: '/placeholder-course.jpg',
          size: 0,
          type: 'image'
        },
        previewVideo: data.previewVideo ? {
          key: data.previewVideo.key || data.previewVideo.public_id,
          url: data.previewVideo.url || data.previewVideo.secure_url,
          size: data.previewVideo.size || data.previewVideo.bytes,
          type: data.previewVideo.type || 'video',
          duration: data.previewVideo.duration
        } : undefined,
        modules: data.modules?.map((module: any) => ({
          ...module,
          chapters: module.chapters?.map((chapter: any) => ({
            ...chapter,
            lessons: chapter.lessons?.map((lesson: any) => ({
              ...lesson,
              video: lesson.video ? {
                key: lesson.video.key || lesson.video.public_id,
                url: lesson.video.url || lesson.video.secure_url,
                size: lesson.video.size || lesson.video.bytes,
                type: lesson.video.type || 'video',
                duration: lesson.video.duration
              } : undefined
            })) || []
          })) || []
        })) || []
      }

      setCourse(processedCourse)

      if (progressResponse.ok) {
        const progressData = await progressResponse.json()
        
        const userProgressData: UserProgress = {
          _id: progressData._id || `temp-${processedCourse._id}`,
          courseId: progressData.courseId || processedCourse._id,
          userId: progressData.userId || 'current-user',
          enrolled: true,
          progress: progressData.progress || 0,
          completed: progressData.completed || false,
          completedLessons: progressData.completedLessons || [],
          currentLesson: progressData.currentLesson || null,
          timeSpent: progressData.timeSpent || 0,
          lastAccessed: progressData.lastAccessed ? new Date(progressData.lastAccessed) : new Date()
        }
        
        setUserProgress(userProgressData)
        setCompletedLessons(new Set(userProgressData.completedLessons))
        
        if (userProgressData.currentLesson) {
          const lesson = findLessonById(processedCourse, userProgressData.currentLesson)
          if (lesson) {
            setActiveLesson(lesson)
          }
        } else if (processedCourse.modules[0]?.chapters[0]?.lessons[0]) {
          setActiveLesson(processedCourse.modules[0].chapters[0].lessons[0])
        }
      } else {
        setUserProgress(null)
        setCompletedLessons(new Set())
        
        if (processedCourse.modules[0]?.chapters[0]?.lessons[0]) {
          setActiveLesson(processedCourse.modules[0].chapters[0].lessons[0])
        }
      }
      
    } catch (err: any) {
      console.error('Error fetching course:', err)
      setError(err.message || 'Failed to load course')
      toast({
        title: 'Error',
        description: 'Failed to load course details',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const findLessonById = (courseData: Course, lessonId: string): Lesson | null => {
    for (const module of courseData.modules) {
      for (const chapter of module.chapters) {
        for (const lesson of chapter.lessons) {
          if (lesson._id === lessonId) {
            return lesson
          }
        }
      }
    }
    return null
  }

  useEffect(() => {
    if (slug) {
      fetchCourseData()
    }
  }, [slug])

  // In CourseDetailPage component, replace the enrollInCourse function with:

const enrollInCourse = async () => {
  if (!course || isEnrolling) return
  
  setIsEnrolling(course._id)
  setError(null)
  
  try {
    console.log('📤 Attempting to enroll in course:', course._id);
    const response = await fetch(`/api/courses/${course._id}/enroll`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include' // Important for authentication
    })

    console.log('📥 Enrollment response status:', response.status);
    const result = await response.json();
    console.log('📥 Enrollment response data:', result);

    // Handle payment required - THIS IS NOT AN ERROR
    if (response.status === 402 && result.requiresPayment) {
      console.log('💳 Payment required, showing payment modal');
      setShowPaymentModal(true);
      setIsEnrolling(null);
      return;
    }

    // Handle actual errors (not 402)
    if (!response.ok) {
      console.error('❌ Server error response:', {
        status: response.status,
        statusText: response.statusText,
        result
      });
      throw new Error(result.error || `Failed to enroll (${response.status})`);
    }

    // Handle successful enrollment
    if (result.enrolled || result.alreadyEnrolled) {
      console.log('✅ Enrollment successful or already enrolled');
      
      const newProgress: UserProgress = {
        _id: result.progress?._id || `temp-${course._id}`,
        courseId: course._id,
        userId: 'current-user',
        enrolled: true,
        progress: result.progress?.progress || 0,
        completed: result.progress?.completed || false,
        completedLessons: result.progress?.completedLessons || [],
        currentLesson: result.progress?.currentLesson || course.modules[0]?.chapters[0]?.lessons[0]?._id || null,
        timeSpent: result.progress?.timeSpent || 0,
        lastAccessed: new Date()
      }
      
      setUserProgress(newProgress);
      setCompletedLessons(new Set(newProgress.completedLessons));
      
      toast({
        title: result.alreadyEnrolled ? 'Already Enrolled' : '🎉 Welcome to the Course!',
        description: result.alreadyEnrolled 
          ? 'You are already enrolled in this course' 
          : 'Your learning journey begins now. Enjoy!',
        variant: 'default',
      });

      if (!result.alreadyEnrolled) {
        setShowEnrollmentSuccess(true);
        setTimeout(() => setShowEnrollmentSuccess(false), 3000);
      }
    } else {
      console.error('❌ Unexpected response structure:', result);
      throw new Error('Unexpected response from server');
    }

  } catch (err: any) {
    console.error('❌ Error enrolling:', err);
    
    // More specific error handling
    if (err.message.includes('Unauthorized') || err.message.includes('401')) {
      toast({
        title: 'Login Required',
        description: 'Please log in to enroll in courses',
        variant: 'destructive',
      });
    } else if (err.message.includes('not found') || err.message.includes('404')) {
      toast({
        title: 'Course Not Available',
        description: 'This course is no longer available',
        variant: 'destructive',
      });
    } else if (err.message.includes('Payment Required') || err.message.includes('402')) {
      // This should have been caught earlier, but just in case
      setShowPaymentModal(true);
    } else {
      toast({
        title: 'Enrollment Failed',
        description: err.message || 'Failed to enroll in course. Please try again.',
        variant: 'destructive',
      });
    }
  } finally {
    setIsEnrolling(null);
  }
}

  const handlePaymentSuccess = (courseId: string) => {
  setShowPaymentModal(false)
  
  // Update user progress immediately
  const newProgress: UserProgress = {
    _id: `temp-${courseId}`,
    courseId,
    userId: 'current-user',
    enrolled: true,
    progress: 0,
    completed: false,
    completedLessons: [],
    currentLesson: course?.modules[0]?.chapters[0]?.lessons[0]?._id || null,
    timeSpent: 0,
    lastAccessed: new Date()
  }
  
  setUserProgress(newProgress)
  setCompletedLessons(new Set(newProgress.completedLessons))
  
  toast({
    title: '🎉 Payment Successful!',
    description: 'Welcome aboard! Let\'s start learning.',
    variant: 'default',
  })
  
  // Refresh course data to get updated enrollment count
  fetchCourseData()
}

  const updateProgress = async (lessonId: string, completed: boolean = false, isCurrent: boolean = true) => {
    if (!course || !userProgress?.enrolled) return

    setUpdatingProgress(lessonId)
    
    try {
      const response = await fetch(`/api/courses/${course._id}/progress`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          lessonId,
          completed,
          current: isCurrent
        })
      })

      if (response.ok) {
        const updatedProgress = await response.json()
        setUserProgress(updatedProgress)
        setCompletedLessons(new Set(updatedProgress.completedLessons || []))
        
        if (completed) {
          toast({
            title: '✨ Great Work!',
            description: 'Lesson completed successfully!',
            variant: 'default'
          })
        }
      } else {
        throw new Error('Failed to update progress')
      }
    } catch (error) {
      console.error('Error updating progress:', error)
      toast({
        title: 'Error',
        description: 'Failed to update progress',
        variant: 'destructive'
      })
    } finally {
      setUpdatingProgress(null)
    }
  }

  const handleLessonSelect = (lesson: Lesson) => {
    setActiveLesson(lesson)
    updateProgress(lesson._id, false, true)
  }

  const handleLessonComplete = (lessonId: string) => {
    updateProgress(lessonId, true, false)
  }

  const getNextLesson = (): Lesson | null => {
    if (!course || !activeLesson) return null

    let found = false
    for (const module of course.modules) {
      for (const chapter of module.chapters) {
        for (const lesson of chapter.lessons) {
          if (found) return lesson
          if (lesson._id === activeLesson._id) found = true
        }
      }
    }
    return null
  }

  const getPreviousLesson = (): Lesson | null => {
    if (!course || !activeLesson) return null

    const allLessons: Lesson[] = []
    course.modules.forEach(module => {
      module.chapters.forEach(chapter => {
        chapter.lessons.forEach(lesson => {
          allLessons.push(lesson)
        })
      })
    })

    const currentIndex = allLessons.findIndex(lesson => lesson._id === activeLesson._id)
    
    if (currentIndex > 0) {
      return allLessons[currentIndex - 1]
    }
    return null
  }

  const navigateToLesson = (direction: 'next' | 'prev') => {
    if (!course || !activeLesson) return

    const allLessons: Lesson[] = []
    course.modules.forEach(module => {
      module.chapters.forEach(chapter => {
        chapter.lessons.forEach(lesson => {
          allLessons.push(lesson)
        })
      })
    })

    const currentIndex = allLessons.findIndex(lesson => lesson._id === activeLesson._id)

    let targetLesson: Lesson | null = null

    if (direction === 'next' && currentIndex < allLessons.length - 1) {
      targetLesson = allLessons[currentIndex + 1]
    } else if (direction === 'prev' && currentIndex > 0) {
      targetLesson = allLessons[currentIndex - 1]
    }

    if (targetLesson) {
      handleLessonSelect(targetLesson)
    }
  }

  useEffect(() => {
    if (!isLearningMode) return

    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') {
        navigateToLesson('next')
      } else if (e.key === 'ArrowLeft') {
        navigateToLesson('prev')
      }
    }

    window.addEventListener('keydown', handleKeyPress)
    return () => window.removeEventListener('keydown', handleKeyPress)
  }, [isLearningMode, activeLesson, course])

  const submitRating = async () => {
    if (!course || !newRating.rating || isSubmittingRating) return
    
    setIsSubmittingRating(true)
    try {
      const response = await fetch(`/api/courses/${course._id}/rate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newRating)
      })

      const result = await response.json()

      if (response.ok && result.success) {
        setCourse(result.course)
        setNewRating({ rating: 5, review: '' })
        toast({
          title: '⭐ Thank You!',
          description: 'Your review has been submitted.',
          variant: 'default',
        })
      } else {
        throw new Error(result.error || 'Failed to submit rating')
      }
    } catch (err: any) {
      console.error('Error submitting rating:', err)
      toast({
        title: 'Error',
        description: 'Failed to submit review',
        variant: 'destructive',
      })
    } finally {
      setIsSubmittingRating(false)
    }
  }

  const toggleModule = (moduleIndex: number) => {
    setExpandedModules(prev => {
      const newSet = new Set(prev)
      if (newSet.has(moduleIndex)) {
        newSet.delete(moduleIndex)
      } else {
        newSet.add(moduleIndex)
      }
      return newSet
    })
  }

  const toggleChapter = (chapterId: string) => {
    setExpandedChapters(prev => {
      const newSet = new Set(prev)
      if (newSet.has(chapterId)) {
        newSet.delete(chapterId)
      } else {
        newSet.add(chapterId)
      }
      return newSet
    })
  }

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    if (hours > 0) {
      return `${hours}h ${mins > 0 ? `${mins}m` : ''}`.trim()
    }
    return `${mins}m`
  }

  const handlePreviewLesson = (lesson: Lesson) => {
    if (lesson.video && lesson.isPreview) {
      window.open(lesson.video.url, '_blank')
    }
  }

  const calculateModuleProgress = (module: Module) => {
  if (!userProgress || !module.chapters) return 0
  
  const totalLessonsInModule = module.chapters.reduce((total, chapter) => 
    total + (chapter.lessons?.length || 0), 0
  )
  
  if (totalLessonsInModule === 0) return 0
  
  const completedInModule = module.chapters.reduce((total, chapter) => 
    total + (chapter.lessons?.filter(lesson => 
      completedLessons.has(lesson._id)
    ).length || 0), 0
  )
  
  return (completedInModule / totalLessonsInModule) * 100
}

  const calculateChapterProgress = (chapter: Chapter) => {
    if (!userProgress || chapter.lessons.length === 0) return 0
    const completedInChapter = chapter.lessons.filter(lesson => 
      completedLessons.has(lesson._id)
    ).length
    return (completedInChapter / chapter.lessons.length) * 100
  }

  // Stunning Enrollment Button
  const EnrollmentButton = () => {
    if (!userProgress || userProgress.enrolled === false) {
      return (
        <Button
          onClick={enrollInCourse}
          disabled={!!isEnrolling}
          className="group w-full h-12 text-sm font-semibold relative overflow-hidden bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
          
          <div className="relative flex items-center justify-center gap-2">
            {isEnrolling === course?._id ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Enrolling...</span>
              </>
            ) : (
              <>
                <GraduationCap className="w-4 h-4" />
                <span>{course?.isFree ? 'Try Sample Lesson' : `Enroll Now - $${course?.price}`}</span>
              </>
            )}
          </div>
        </Button>
      )
    }

    if (userProgress.completed) {
      return (
        <Button
          onClick={() => router.push(`/certificates/${course?._id}`)}
          className="w-full h-12 text-sm font-semibold bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white rounded-xl shadow-sm"
        >
          <Award className="w-4 h-4 mr-2" />
          View Certificate
        </Button>
      )
    }

    const hasProgress = userProgress.progress > 0
    
    return (
      <Button
        onClick={() => setIsLearningMode(true)}
        className="w-full h-12 text-sm font-semibold bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-xl shadow-sm"
      >
        <Play className="w-4 h-4 mr-2" />
        {hasProgress ? 'Continue' : 'Start'}
      </Button>
    )
  }

  // Compact Feature Cards for mobile
  const FeatureCard = ({ icon: Icon, title, description, color }: {
    icon: any
    title: string
    description: string
    color: 'blue' | 'green' | 'purple' | 'amber'
  }) => {
    const colors = {
      blue: 'from-blue-50 to-blue-100 border-blue-100',
      green: 'from-green-50 to-green-100 border-green-100',
      purple: 'from-purple-50 to-purple-100 border-purple-100',
      amber: 'from-amber-50 to-amber-100 border-amber-100'
    }

    const iconColors = {
      blue: 'text-blue-600',
      green: 'text-green-600',
      purple: 'text-purple-600',
      amber: 'text-amber-600'
    }

    return (
      <div className={`p-3 rounded-lg bg-gradient-to-br ${colors[color]} border`}>
        <div className="flex items-center gap-2 mb-2">
          <div className={`p-1.5 rounded-md ${color === 'blue' ? 'bg-blue-100' : color === 'green' ? 'bg-green-100' : color === 'purple' ? 'bg-purple-100' : 'bg-amber-100'}`}>
            <Icon className={`w-3.5 h-3.5 ${iconColors[color]}`} />
          </div>
          <h4 className="font-semibold text-gray-900 text-sm">{title}</h4>
        </div>
        <p className="text-xs text-gray-600 leading-tight">{description}</p>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="container mx-auto px-4 py-8">
          <div className="flex justify-center items-center min-h-[60vh]">
            <div className="text-center">
              <div className="relative">
                <div className="w-12 h-12 border-3 border-blue-200 rounded-full"></div>
                <div className="w-12 h-12 border-3 border-blue-600 border-t-transparent rounded-full animate-spin absolute top-0"></div>
              </div>
              <p className="mt-4 text-sm text-gray-600">Loading course...</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (error || !course) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center py-12">
            <div className="w-14 h-14 bg-gray-100 rounded-xl flex items-center justify-center mx-auto mb-4">
              <BookOpen className="w-7 h-7 text-gray-400" />
            </div>
            <h2 className="text-lg font-bold text-gray-900 mb-2">
              Course Not Available
            </h2>
            <p className="text-sm text-gray-600 mb-6 max-w-xs mx-auto">
              This course is currently not available or may have been updated.
            </p>
            <div className="flex flex-col gap-2">
              <Button 
                onClick={fetchCourseData} 
                className="px-5 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm"
              >
                Try Again
              </Button>
              <Button 
                onClick={() => router.push('/courses')}
                variant="outline"
                className="px-5 py-2.5 rounded-lg text-sm"
              >
                Browse Courses
              </Button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (isLearningMode && activeLesson) {
    const nextLesson = getNextLesson()
    const previousLesson = getPreviousLesson()

    return (
      <div className="min-h-screen bg-gray-50">
        <div className="sticky top-0 z-50 bg-white border-b">
          <div className="px-4 py-3 flex items-center justify-between">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsLearningMode(false)}
              className="p-1.5"
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div className="flex-1 mx-3 min-w-0">
              <h1 className="text-xs font-semibold text-gray-900 truncate">{course.title}</h1>
              <div className="flex items-center gap-1.5 mt-1">
                <div className="w-12 h-1 bg-gray-200 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-blue-600 transition-all duration-500"
                    style={{ width: `${Math.round((userProgress?.progress || 0) * 100)}%` }}
                  />
                </div>
                <span className="text-xs font-semibold text-blue-600">
                  {Math.round((userProgress?.progress || 0) * 100)}%
                </span>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowMobileCurriculum(!showMobileCurriculum)}
              className="p-1.5"
            >
              <Menu className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <div className="container px-4 py-4">
          <div className="space-y-4">
            <div className="bg-black rounded-lg overflow-hidden">
              {activeLesson.video ? (
                <video
                  src={activeLesson.video.url}
                  controls
                  className="w-full aspect-video"
                  playsInline
                />
              ) : (
                <div className="aspect-video flex items-center justify-center bg-gray-900">
                  <div className="text-center">
                    <div className="w-12 h-12 bg-white/10 rounded-lg flex items-center justify-center mx-auto mb-3">
                      <PlayCircle className="w-6 h-6 text-white/60" />
                    </div>
                    <p className="text-white/80 text-sm">Video loading...</p>
                  </div>
                </div>
              )}
            </div>

            <div className="bg-white rounded-lg border p-4">
              <div className="mb-4">
                <div className="flex items-center gap-1.5 mb-3">
                  <Badge className="bg-blue-100 text-blue-700 border-0 text-xs px-2 py-0.5">
                    Lesson {(() => {
                      let lessonCount = 0
                      for (const module of course.modules) {
                        for (const chapter of module.chapters) {
                          for (const lesson of chapter.lessons) {
                            lessonCount++
                            if (lesson._id === activeLesson._id) {
                              return lessonCount
                            }
                          }
                        }
                      }
                      return lessonCount
                    })()}
                  </Badge>
                  {activeLesson.isPreview && (
                    <Badge className="bg-amber-100 text-amber-700 border-0 text-xs px-2 py-0.5">
                      <Eye className="w-2.5 h-2.5 mr-1" />
                      Preview
                    </Badge>
                  )}
                </div>
                
                <h1 className="text-lg font-bold text-gray-900 mb-2">
                  {activeLesson.title}
                </h1>
                
                <p className="text-sm text-gray-600">
                  {activeLesson.description}
                </p>
              </div>
              
              <div className="flex items-center justify-between pt-3 border-t">
                <div className="flex items-center gap-4 text-gray-500">
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5" />
                    <span className="text-sm">{formatDuration(activeLesson.duration)}</span>
                  </div>
                </div>
                
                <Button
                  onClick={() => handleLessonComplete(activeLesson._id)}
                  disabled={updatingProgress === activeLesson._id || completedLessons.has(activeLesson._id)}
                  className={`rounded-lg text-sm px-3 py-1.5 h-8 ${
                    completedLessons.has(activeLesson._id) 
                      ? 'bg-green-600 hover:bg-green-700' 
                      : 'bg-blue-600 hover:bg-blue-700'
                  }`}
                >
                  {updatingProgress === activeLesson._id ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : completedLessons.has(activeLesson._id) ? (
                    'Completed'
                  ) : (
                    'Mark Complete'
                  )}
                </Button>
              </div>
            </div>

            {activeLesson.resources && activeLesson.resources.length > 0 && (
              <div className="bg-white rounded-lg border p-4">
                <h3 className="text-base font-semibold text-gray-900 mb-3 flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-blue-600" />
                  Lesson Resources
                </h3>
                
                <div className="space-y-2">
                  {activeLesson.resources.map((resource, index) => (
                    <div
                      key={index}
                      className="p-3 bg-gray-50 rounded border hover:border-blue-300 transition-colors cursor-pointer"
                      onClick={() => window.open(resource.url, '_blank')}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="p-1.5 bg-blue-100 rounded">
                            <Download className="w-3 h-3 text-blue-600" />
                          </div>
                          <div>
                            <p className="font-medium text-gray-900 text-sm">
                              {resource.title}
                            </p>
                            <p className="text-xs text-gray-500">
                              {resource.type.toUpperCase()}
                            </p>
                          </div>
                        </div>
                        <ExternalLink className="w-3 h-3 text-gray-400" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => navigateToLesson('prev')}
                disabled={!previousLesson}
                className="flex-1 rounded-lg text-sm py-2"
              >
                <ArrowLeft className="w-3.5 h-3.5 mr-1.5" />
                Previous
              </Button>

              <Button
                onClick={() => navigateToLesson('next')}
                disabled={!nextLesson}
                className="flex-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm py-2"
              >
                Next
                <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
              </Button>
            </div>
          </div>
        </div>

        {showMobileCurriculum && (
          <div className="fixed inset-0 z-50 bg-white animate-in slide-in-from-right">
            <div className="sticky top-0 bg-white border-b p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-blue-600" />
                  <h2 className="text-base font-semibold text-gray-900">Course Content</h2>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowMobileCurriculum(false)}
                  className="p-1.5"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>
            <div className="h-[calc(100vh-64px)] overflow-y-auto p-4">
              {course.modules.map((module, moduleIndex) => (
                <div key={module._id} className="mb-3">
                  <div 
                    className="p-3 bg-gray-50 rounded border cursor-pointer hover:border-blue-300 transition-colors"
                    onClick={() => toggleModule(moduleIndex)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 bg-blue-100 rounded flex items-center justify-center">
                          <span className="font-semibold text-blue-700 text-xs">{moduleIndex + 1}</span>
                        </div>
                        <div>
                          <h3 className="font-medium text-gray-900 text-sm">{module.title}</h3>
                          <p className="text-xs text-gray-500 mt-0.5">
                            {module.chapters.length} chapters
                          </p>
                        </div>
                      </div>
                      <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform ${expandedModules.has(moduleIndex) ? 'rotate-180' : ''}`} />
                    </div>
                  </div>
                  
                  {expandedModules.has(moduleIndex) && (
                    <div className="mt-1.5 space-y-1.5 animate-in fade-in">
                      {module.chapters.map((chapter, chapterIndex) => (
                        <div key={chapter._id} className="ml-4">
                          <div 
                            className="p-3 bg-gray-100 rounded border cursor-pointer hover:border-blue-300 transition-colors"
                            onClick={() => toggleChapter(chapter._id)}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <div className="w-5 h-5 bg-blue-50 rounded flex items-center justify-center">
                                  <span className="font-semibold text-blue-600 text-xs">{chapterIndex + 1}</span>
                                </div>
                                <div>
                                  <h4 className="font-medium text-gray-900 text-sm">{chapter.title}</h4>
                                  <p className="text-xs text-gray-500 mt-0.5">
                                    {chapter.lessons.length} lessons
                                  </p>
                                </div>
                              </div>
                              <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform ${expandedChapters.has(chapter._id) ? 'rotate-180' : ''}`} />
                            </div>
                          </div>
                          
                          {expandedChapters.has(chapter._id) && (
                            <div className="mt-1.5 ml-4 space-y-1.5 animate-in fade-in">
                              {chapter.lessons.map((lesson, lessonIndex) => {
                                const isCompleted = completedLessons.has(lesson._id)
                                const isActive = activeLesson?._id === lesson._id
                                
                                return (
                                  <div
                                    key={lesson._id}
                                    className={`p-3 rounded border cursor-pointer transition-colors ${
                                      isActive 
                                        ? 'bg-blue-600 text-white border-blue-600' 
                                        : isCompleted
                                        ? 'bg-green-50 border-green-200'
                                        : 'bg-white border-gray-200 hover:border-blue-300'
                                    }`}
                                    onClick={() => {
                                      handleLessonSelect(lesson)
                                      setShowMobileCurriculum(false)
                                    }}
                                  >
                                    <div className="flex items-center justify-between">
                                      <div className="flex items-center gap-2">
                                        <div className={`w-5 h-5 rounded flex items-center justify-center ${
                                          isActive ? 'bg-white/20' : isCompleted ? 'bg-green-100' : 'bg-gray-100'
                                        }`}>
                                          {isCompleted ? (
                                            <Check className={`w-2.5 h-2.5 ${isActive ? 'text-white' : 'text-green-600'}`} />
                                          ) : (
                                            <PlayCircle className={`w-2.5 h-2.5 ${isActive ? 'text-white' : 'text-gray-500'}`} />
                                          )}
                                        </div>
                                        <div className="flex-1">
                                          <p className={`font-medium text-sm ${isActive ? 'text-white' : 'text-gray-900'}`}>
                                            {lessonIndex + 1}. {lesson.title}
                                          </p>
                                          <div className="flex items-center gap-1.5 mt-0.5">
                                            <Clock className={`w-2.5 h-2.5 ${isActive ? 'text-white/80' : 'text-gray-400'}`} />
                                            <span className={`text-xs ${isActive ? 'text-white/80' : 'text-gray-500'}`}>
                                              {formatDuration(lesson.duration)}
                                            </span>
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                )
                              })}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile Header */}
      <div className="sticky top-0 z-50 bg-white border-b">
        <div className="px-4 py-3 flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.back()}
            className="p-1.5"
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <h1 className="text-sm font-semibold text-gray-900 truncate max-w-[140px]">
            {course.title}
          </h1>
          <div className="flex items-center gap-0">
            <Button 
              variant="ghost" 
              size="sm" 
              className="p-1.5"
              onClick={() => setIsBookmarked(!isBookmarked)}
            >
              <Heart className={`w-4 h-4 ${isBookmarked ? 'fill-red-500 text-red-500' : 'text-gray-500'}`} />
            </Button>
          </div>
        </div>
      </div>

      {/* Preview Video Section - Moved to TOP */}
      {course.previewVideo && (
        <div className="bg-white border-b">
          <div className="px-4 py-4">
            <h2 className="text-base font-semibold text-gray-900 mb-3">Course Preview</h2>
            <div className="rounded-lg overflow-hidden bg-black">
              <video
                src={course.previewVideo.url}
                className="w-full aspect-video"
                controls
                playsInline
              />
            </div>
          </div>
        </div>
      )}

      {/* Course Header */}
      <div className="bg-white px-4 py-6 border-b">
        <div className="space-y-4">
          <div className="flex flex-wrap gap-1.5">
            <Badge className="bg-blue-100 text-blue-700 border-0 text-xs px-2 py-0.5">
              {course.category}
            </Badge>
            <Badge className="bg-gray-100 text-gray-700 border-0 text-xs px-2 py-0.5">
              {course.level.charAt(0).toUpperCase() + course.level.slice(1)} Level
            </Badge>
          </div>

          <h1 className="text-2xl font-bold text-gray-900 leading-tight">
            {course.title}
          </h1>
          
          <p className="text-gray-600 text-sm leading-relaxed">
            {course.shortDescription}
          </p>

          <div className="flex items-center justify-between py-3">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="w-10 h-10 rounded-lg overflow-hidden bg-gradient-to-br from-blue-100 to-purple-100">
                  <img
                    src={course.instructor.avatar || '/placeholder-avatar.jpg'}
                    alt={course.instructor.username}
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
              <div>
                <p className="font-semibold text-gray-900 text-sm">
                  {course.instructor.firstName} {course.instructor.lastName}
                </p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                  <span className="text-xs font-medium text-gray-900">{course.instructor.rating?.toFixed(1) || '4.8'}</span>
                  <span className="text-xs text-gray-500">• Instructor</span>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 py-3 border-y">
            <div className="text-center">
              <div className="flex items-center justify-center gap-1.5 mb-1">
                <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                <span className="font-bold text-gray-900">{course.averageRating.toFixed(1)}</span>
              </div>
              <p className="text-xs text-gray-500">Rating</p>
            </div>
            
            <div className="text-center">
              <div className="flex items-center justify-center gap-1.5 mb-1">
                <BookOpen className="w-4 h-4 text-blue-600" />
                <span className="font-bold text-gray-900">{course.totalLessons}</span>
              </div>
              <p className="text-xs text-gray-500">Lessons</p>
            </div>
            
            <div className="text-center">
              <div className="flex items-center justify-center gap-1.5 mb-1">
                <Users className="w-4 h-4 text-emerald-600" />
                <span className="font-bold text-gray-900">{course.totalStudents}</span>
              </div>
              <p className="text-xs text-gray-500">Students</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="sticky top-[60px] z-40 bg-white border-b">
        <div className="flex overflow-x-auto px-4 -mb-px">
          {[
            { id: 'overview', label: 'Overview', icon: BookOpen },
            { id: 'curriculum', label: 'Curriculum', icon: GraduationCap },
            { id: 'reviews', label: 'Reviews', icon: Star },
            { id: 'instructor', label: 'Instructor', icon: UserCheck }
          ].map((tab) => {
            const Icon = tab.icon
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-1.5 px-4 py-3 font-medium border-b-2 whitespace-nowrap text-sm ${
                  activeTab === tab.id
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {tab.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Main Content */}
      <div className="px-4 py-6">
        <div className="space-y-6">
          {activeTab === 'overview' && (
            <>
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-bold text-gray-900 mb-3">About This Course</h3>
                  <p className="text-gray-700 text-sm leading-relaxed whitespace-pre-line">
                    {course.description}
                  </p>
                </div>

                <div>
                  <h3 className="text-lg font-bold text-gray-900 mb-3">What You'll Learn</h3>
                  <div className="space-y-2">
                    {course.learningOutcomes.map((outcome, index) => (
                      <div key={index} className="flex items-start gap-2 p-2.5 bg-gray-50 rounded-lg">
                        <Check className="w-3.5 h-3.5 text-green-600 flex-shrink-0 mt-0.5" />
                        <span className="font-medium text-gray-900 text-sm">{outcome}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-bold text-gray-900 mb-3">Requirements</h3>
                  <div className="space-y-2">
                    {course.requirements.map((requirement, index) => (
                      <div key={index} className="flex items-center gap-2 p-2.5 bg-gray-50 rounded-lg">
                        <div className="w-5 h-5 bg-blue-100 rounded flex items-center justify-center">
                          <span className="font-medium text-blue-700 text-xs">{index + 1}</span>
                        </div>
                        <span className="font-medium text-gray-900 text-sm">{requirement}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </>
          )}

          {activeTab === 'curriculum' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Course Curriculum</h3>
                  <p className="text-gray-600 text-sm mt-0.5">
                    {course.totalLessons} lessons in {course.modules.length} modules
                  </p>
                </div>
                {userProgress?.enrolled && (
                  <div className="text-right">
                    <p className="text-xs text-gray-500">Progress</p>
                    <p className="text-base font-bold text-blue-600">
                      {Math.round(userProgress.progress * 100)}%
                    </p>
                  </div>
                )}
              </div>

              <div className="space-y-3">
                {course.modules.map((module, moduleIndex) => {
                  const moduleProgress = calculateModuleProgress(module)
                  
                  return (
                    <div key={module._id} className="bg-white rounded-lg border overflow-hidden">
                      <div 
                        className="p-3 cursor-pointer hover:bg-gray-50 transition-colors"
                        onClick={() => toggleModule(moduleIndex)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 bg-blue-100 rounded flex items-center justify-center">
                              <span className="font-bold text-blue-700 text-sm">{moduleIndex + 1}</span>
                            </div>
                            <div className="flex-1">
                              <h4 className="font-bold text-gray-900 text-sm">{module.title}</h4>
                              <div className="flex items-center gap-2 text-xs text-gray-500 mt-0.5">
                                <span>{module.chapters.length} chapters</span>
                              </div>
                            </div>
                          </div>
                          <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform ${expandedModules.has(moduleIndex) ? 'rotate-180' : ''}`} />
                        </div>
                      </div>
                      
                      {expandedModules.has(moduleIndex) && (
                        <div className="px-3 pb-3 animate-in fade-in">
                          <div className="space-y-2">
                            {module.chapters.map((chapter, chapterIndex) => {
                              const chapterProgress = calculateChapterProgress(chapter)
                              
                              return (
                                <div key={chapter._id} className="ml-4">
                                  <div 
                                    className="p-3 bg-gray-50 rounded border cursor-pointer hover:border-blue-300 transition-colors"
                                    onClick={() => toggleChapter(chapter._id)}
                                  >
                                    <div className="flex items-center justify-between">
                                      <div className="flex items-center gap-2">
                                        <div className="w-6 h-6 bg-blue-50 rounded flex items-center justify-center">
                                          <span className="font-bold text-blue-600 text-xs">{chapterIndex + 1}</span>
                                        </div>
                                        <div className="flex-1">
                                          <h5 className="font-bold text-gray-900 text-sm">{chapter.title}</h5>
                                          <div className="flex items-center gap-2 text-xs text-gray-500 mt-0.5">
                                            <span>{chapter.lessons.length} lessons</span>
                                          </div>
                                        </div>
                                      </div>
                                      <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform ${expandedChapters.has(chapter._id) ? 'rotate-180' : ''}`} />
                                    </div>
                                  </div>
                                  
                                  {expandedChapters.has(chapter._id) && (
                                    <div className="mt-2 ml-4 space-y-1.5 animate-in fade-in">
                                      {chapter.lessons.map((lesson, lessonIndex) => {
                                        const isCompleted = completedLessons.has(lesson._id)
                                        
                                        return (
                                          <div
                                            key={lesson._id}
                                            className="p-2.5 bg-white rounded border"
                                          >
                                            <div className="flex items-center justify-between">
                                              <div className="flex items-center gap-2">
                                                <div className={`w-6 h-6 rounded flex items-center justify-center ${
                                                  isCompleted ? 'bg-green-100' : 'bg-blue-100'
                                                }`}>
                                                  {isCompleted ? (
                                                    <Check className="w-3 h-3 text-green-600" />
                                                  ) : (
                                                    <PlayCircle className="w-3 h-3 text-blue-600" />
                                                  )}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                  <p className="font-medium text-gray-900 text-sm truncate">
                                                    {lessonIndex + 1}. {lesson.title}
                                                  </p>
                                                  <div className="flex items-center gap-2 mt-0.5">
                                                    <div className="flex items-center gap-1 text-xs text-gray-500">
                                                      <Clock className="w-2.5 h-2.5" />
                                                      <span>{formatDuration(lesson.duration)}</span>
                                                    </div>
                                                    {lesson.isPreview && (
                                                      <Badge className="bg-amber-100 text-amber-700 text-xs px-1.5 py-0">
                                                        Preview
                                                      </Badge>
                                                    )}
                                                  </div>
                                                </div>
                                              </div>
                                              
                                              {userProgress?.enrolled ? (
                                                <Button 
                                                  onClick={() => {
                                                    setActiveLesson(lesson)
                                                    setIsLearningMode(true)
                                                  }}
                                                  className={`rounded text-xs px-2 py-1 h-6 ${
                                                    isCompleted 
                                                      ? 'bg-green-100 text-green-700 hover:bg-green-200' 
                                                      : 'bg-blue-600 hover:bg-blue-700 text-white'
                                                  }`}
                                                >
                                                  {isCompleted ? 'Review' : 'Start'}
                                                </Button>
                                              ) : lesson.isPreview && lesson.video ? (
                                                <Button 
                                                  onClick={() => handlePreviewLesson(lesson)}
                                                  className="rounded bg-amber-100 text-amber-700 hover:bg-amber-200 text-xs px-2 py-1 h-6"
                                                >
                                                  Preview
                                                </Button>
                                              ) : null}
                                            </div>
                                          </div>
                                        )
                                      })}
                                    </div>
                                  )}
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {activeTab === 'reviews' && (
            <div className="space-y-6">
              <div className="bg-white rounded-lg border p-4">
                <div className="text-center mb-4">
                  <div className="text-3xl font-bold text-gray-900 mb-1">
                    {course.averageRating.toFixed(1)}
                  </div>
                  <div className="flex items-center justify-center mb-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        className={`w-4 h-4 ${
                          star <= Math.floor(course.averageRating)
                            ? 'fill-amber-400 text-amber-400'
                            : 'text-gray-300'
                        }`}
                      />
                    ))}
                  </div>
                  <p className="text-gray-600 text-sm">
                    Based on {course.totalReviews} reviews
                  </p>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Your Rating</label>
                    <div className="flex gap-0.5">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          type="button"
                          onClick={() => setNewRating(prev => ({ ...prev, rating: star }))}
                          className="p-1"
                        >
                          <Star
                            className={`w-5 h-5 ${
                              star <= newRating.rating
                                ? 'fill-amber-400 text-amber-400'
                                : 'text-gray-300'
                            }`}
                          />
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Your Review</label>
                    <Textarea
                      value={newRating.review}
                      onChange={(e) => setNewRating(prev => ({ ...prev, review: e.target.value }))}
                      placeholder="Share your experience..."
                      className="min-h-[80px] rounded-lg text-sm"
                    />
                  </div>
                  <Button
                    onClick={submitRating}
                    disabled={isSubmittingRating || !newRating.rating}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm py-2"
                  >
                    {isSubmittingRating ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                        Submitting...
                      </>
                    ) : (
                      'Submit Review'
                    )}
                  </Button>
                </div>
              </div>

              <div className="space-y-3">
                {course.ratings.map((rating) => (
                  <div key={rating._id} className="bg-white rounded-lg border p-3">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 bg-gradient-to-br from-blue-100 to-purple-100 rounded flex items-center justify-center flex-shrink-0">
                        <span className="font-bold text-blue-700 text-xs">
                          {rating.user.firstName.charAt(0)}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-col mb-2">
                          <p className="font-bold text-gray-900 text-sm">
                            {rating.user.firstName} {rating.user.lastName}
                          </p>
                          <div className="flex items-center gap-0.5 mt-0.5">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <Star
                                key={star}
                                className={`w-3 h-3 ${
                                  star <= rating.rating
                                    ? 'fill-amber-400 text-amber-400'
                                    : 'text-gray-300'
                                }`}
                              />
                            ))}
                          </div>
                        </div>
                        {rating.review && (
                          <p className="text-gray-700 text-sm">{rating.review}</p>
                        )}
                        <span className="text-xs text-gray-500 mt-1.5 block">
                          {new Date(rating.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'instructor' && course.instructor && (
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-12 h-12 rounded-lg overflow-hidden bg-gradient-to-br from-blue-100 to-purple-100">
                  <img
                    src={course.instructor.avatar || '/placeholder-avatar.jpg'}
                    alt={course.instructor.username}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">
                    {course.instructor.firstName} {course.instructor.lastName}
                  </h3>
                  <p className="text-gray-600 text-sm mt-0.5">
                    Expert Instructor
                  </p>
                </div>
              </div>

              <div>
                <h4 className="font-bold text-gray-900 mb-2">About Instructor</h4>
                <p className="text-gray-700 text-sm leading-relaxed">
                  {course.instructor.bio || 'Expert instructor with years of experience in the field, dedicated to helping students achieve their goals.'}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="p-2.5 bg-blue-50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                    <div>
                      <p className="font-bold text-gray-900">
                        {course.instructor.rating?.toFixed(1) || '4.8'}
                      </p>
                      <p className="text-xs text-gray-500">Rating</p>
                    </div>
                  </div>
                </div>
                
                <div className="p-2.5 bg-green-50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Users className="w-3.5 h-3.5 text-green-600" />
                    <div>
                      <p className="font-bold text-gray-900">
                        {course.instructor.totalStudents?.toLocaleString() || '1,000+'}
                      </p>
                      <p className="text-xs text-gray-500">Students</p>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="font-bold text-gray-900 mb-2">Expertise</h4>
                <div className="flex flex-wrap gap-1.5">
                  {(course.instructor.expertise || [
                    'Industry Best Practices',
                    'Practical Application',
                    'Career Development'
                  ]).map((expertise, index) => (
                    <Badge 
                      key={index}
                      className="bg-blue-100 text-blue-700 border-0 text-xs px-2 py-0.5"
                    >
                      {expertise}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Features Section */}
      <div className="px-4 py-6 bg-gray-50 border-t">
        <h3 className="text-lg font-bold text-gray-900 mb-4">Course Features</h3>
        <div className="grid grid-cols-2 gap-3">
          <FeatureCard
            icon={Shield}
            title="5-Year Access"
            description="Extended access to all materials"
            color="blue"
          />
          
          <FeatureCard
            icon={Award}
            title="Certificate"
            description="Earn upon completion"
            color="green"
          />
          
          <FeatureCard
            icon={Download}
            title="Resources"
            description="Downloadable content"
            color="purple"
          />
          
          <FeatureCard
            icon={Clock}
            title="Self-Paced"
            description="Learn at your own speed"
            color="amber"
          />
        </div>
      </div>

      {/* Mobile Enrollment Footer */}
      <div className="sticky bottom-0 z-40 bg-white border-t shadow-lg">
        <div className="p-4">
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <div className="text-xl font-bold text-gray-900">
                {userProgress?.enrolled ? 'Already Enrolled' : course.isFree ? 'Complimentary' : `$${course.price}`}
              </div>
              {!userProgress?.enrolled && !course.isFree && (
                <div className="flex items-center gap-1.5 mt-0.5">
                  <p className="text-gray-500 line-through text-sm">${course.price * 2}</p>
                  <Badge className="bg-green-100 text-green-700 text-xs">
                    50% OFF
                  </Badge>
                </div>
              )}
            </div>
            <div className="flex-shrink-0 w-36">
              <EnrollmentButton />
            </div>
          </div>
        </div>
      </div>

      {course && (
        <PaymentModal
          course={course}
          isOpen={showPaymentModal}
          onClose={() => setShowPaymentModal(false)}
          onSuccess={handlePaymentSuccess}
        />
      )}
    </div>
  )
}