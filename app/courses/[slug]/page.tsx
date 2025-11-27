// app/courses/[slug]/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { useToast } from "@/components/ui/use-toast"
import { Textarea } from '@/components/ui/textarea'
import { 
  Star, 
  Users, 
  Clock, 
  PlayCircle, 
  BookOpen, 
  ChevronDown,
  ChevronUp,
  Heart,
  Share2,
  Bookmark,
  Download,
  Award,
  Shield,
  Globe,
  Sparkles,
  Crown,
  CheckCircle,
  Loader2,
  MessageCircle,
  ArrowLeft,
  ArrowRight,
  Video,
  Zap,
  Check
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

interface Module {
  _id: string
  title: string
  description: string
  order: number
  lessons: Lesson[]
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
  aiFeatures?: {
    hasAIAssistant: boolean
    hasPersonalizedLearning: boolean
    hasSmartRecommendations: boolean
    hasProgressTracking: boolean
    hasPersonalizedFeedback: boolean
    estimatedCompletion?: string
    difficultyAdjustment?: boolean
  }
  completionRate?: number
  similarCourses?: Course[]
}

interface UserProgress {
  _id: string
  courseId: string
  userId: string
  completedLessons: string[]
  currentLesson: string | null
  progress: number
  timeSpent: number
  lastAccessed: Date
  completed: boolean
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
  const [isEnrolling, setIsEnrolling] = useState(false)
  const [activeTab, setActiveTab] = useState('overview')
  const [expandedModules, setExpandedModules] = useState<Set<number>>(new Set([0]))
  const [newRating, setNewRating] = useState({ rating: 5, review: '' })
  const [isSubmittingRating, setIsSubmittingRating] = useState(false)
  const [isLearningMode, setIsLearningMode] = useState(false)
  const [updatingProgress, setUpdatingProgress] = useState<string | null>(null)
  const [activeLesson, setActiveLesson] = useState<Lesson | null>(null)
  const [completedLessons, setCompletedLessons] = useState<Set<string>>(new Set())
  const [enrolledCourses, setEnrolledCourses] = useState<Set<string>>(new Set())
  const [showEnrollmentSuccess, setShowEnrollmentSuccess] = useState(false)

  const slug = params.slug as string

  const fetchCourseData = async () => {
    try {
      setLoading(true)
      setError(null)

      console.log('Fetching course with slug:', slug)

      const [courseResponse, progressResponse] = await Promise.all([
        fetch(`/api/courses/${slug}`),
        fetch(`/api/courses/${slug}/progress`)
      ])

      if (!courseResponse.ok) {
        const errorData = await courseResponse.json().catch(() => ({}))
        throw new Error(errorData.error || `API returned ${courseResponse.status}`)
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
          url: '/default-thumbnail.jpg',
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
          lessons: module.lessons?.map((lesson: any) => ({
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
      }

      setCourse(processedCourse)

      if (progressResponse.ok) {
        const progressData = await progressResponse.json()
        setUserProgress(progressData)
        setCompletedLessons(new Set(progressData.completedLessons || []))
        
        if (progressData.currentLesson) {
          const lesson = findLessonById(processedCourse, progressData.currentLesson)
          if (lesson) {
            setActiveLesson(lesson)
          }
        } else if (processedCourse.modules[0]?.lessons[0]) {
          setActiveLesson(processedCourse.modules[0].lessons[0])
        }
        
        setEnrolledCourses(prev => new Set([...prev, processedCourse._id]))
      } else {
        setUserProgress(null)
      }
      
    } catch (err: any) {
      console.error('Error fetching course:', err)
      setError(err.message || 'Failed to load course')
      toast({
        title: 'Error',
        description: err.message || 'Failed to load course',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const findLessonById = (courseData: Course, lessonId: string): Lesson | null => {
    for (const module of courseData.modules) {
      for (const lesson of module.lessons) {
        if (lesson._id === lessonId) {
          return lesson
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

  const enrollInCourse = async () => {
    if (!course || isEnrolling) return
    
    setIsEnrolling(true)
    setError(null)
    
    try {
      const response = await fetch(`/api/courses/${course._id}/enroll`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || `Failed to enroll (${response.status})`)
      }

      const result = await response.json()
      
      if (result.alreadyEnrolled || result.enrolled) {
        toast({
          title: result.alreadyEnrolled ? 'Welcome Back!' : '🎉 Successfully Enrolled!',
          description: result.alreadyEnrolled 
            ? 'Continuing your learning journey' 
            : `You've been enrolled in "${course.title}". Check your notifications for details!`,
          variant: 'default',
        })
        
        setCourse(prev => prev ? {
          ...prev,
          totalStudents: result.course?.totalStudents || prev.totalStudents + 1,
          instructor: result.course?.instructor || prev.instructor
        } : null)
        
        if (result.progress) {
          setUserProgress(result.progress)
          setCompletedLessons(new Set(result.progress.completedLessons || []))
        }
        
        setEnrolledCourses(prev => new Set([...prev, course!._id]))
        
        if (result.enrolled) {
          setShowEnrollmentSuccess(true)
          setTimeout(() => setShowEnrollmentSuccess(false), 3000)
        }
        
        if (result.enrolled && course?.modules[0]?.lessons[0]) {
          setActiveLesson(course.modules[0].lessons[0])
          setTimeout(() => setIsLearningMode(true), 1000)
        } else if (result.alreadyEnrolled && result.progress?.currentLesson) {
          const currentLesson = findLessonById(course!, result.progress.currentLesson)
          if (currentLesson) {
            setActiveLesson(currentLesson)
            setIsLearningMode(true)
          }
        }
      } else {
        throw new Error('Unexpected response from server')
      }

    } catch (err: any) {
      console.error('Error enrolling:', err)
      const errorMessage = err.message || 'Failed to enroll in course. Please try again.'
      setError(errorMessage)
      toast({
        title: 'Enrollment Failed',
        description: errorMessage,
        variant: 'destructive',
      })
    } finally {
      setIsEnrolling(false)
    }
  }

  const updateProgress = async (lessonId: string, completed: boolean = false, isCurrent: boolean = true) => {
    if (!course) return

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
            title: '🎉 Progress Updated!',
            description: 'Lesson marked as completed. Keep up the great work!',
            variant: 'default'
          })

          if (updatedProgress.completed) {
            toast({
              title: '🏆 Course Completed!',
              description: `Congratulations! You've completed "${course.title}"!`,
              variant: 'default',
              duration: 5000
            })
          }
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
      for (const lesson of module.lessons) {
        if (found) return lesson
        if (lesson._id === activeLesson._id) found = true
      }
    }
    return null
  }

  const getPreviousLesson = (): Lesson | null => {
    if (!course || !activeLesson) return null

    const allLessons: Lesson[] = []
    course.modules.forEach(module => {
      module.lessons.forEach(lesson => {
        allLessons.push(lesson)
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
      module.lessons.forEach(lesson => {
        allLessons.push(lesson)
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
          title: '⭐ Rating Submitted!',
          description: 'Thank you for your feedback! Your review helps other students.',
          variant: 'default',
        })
      } else {
        throw new Error(result.error || 'Failed to submit rating')
      }
    } catch (err: any) {
      console.error('Error submitting rating:', err)
      const errorMessage = err.message || 'Failed to submit rating'
      setError(errorMessage)
      toast({
        title: 'Rating Failed',
        description: errorMessage,
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
    if (!userProgress) return 0
    const completedInModule = module.lessons.filter(lesson => 
      completedLessons.has(lesson._id)
    ).length
    return (completedInModule / module.lessons.length) * 100
  }

  const EnrollmentButton = () => {
    if (enrolledCourses.has(course!._id)) {
      return (
        <Button
          onClick={() => setIsLearningMode(true)}
          variant="default"
          className="w-full rounded-2xl mb-4 relative overflow-hidden group bg-rose-600 hover:bg-rose-700"
          size="lg"
        >
          <div className="flex items-center">
            <PlayCircle className="w-5 h-5 mr-2" />
            {userProgress?.progress && userProgress.progress > 0 ? 'Continue Learning' : 'Start Learning'}
          </div>
          {userProgress?.progress && userProgress.progress > 0 && !userProgress.completed && (
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-rose-700/30">
              <div 
                className="h-full bg-rose-100 transition-all duration-1000"
                style={{ width: `${userProgress.progress * 100}%` }}
              />
            </div>
          )}
        </Button>
      )
    }

    return (
      <Button
        onClick={enrollInCourse}
        disabled={isEnrolling}
        variant="default"
        className="w-full rounded-2xl mb-4 relative overflow-hidden group bg-rose-600 hover:bg-rose-700"
        size="lg"
      >
        {isEnrolling ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin mr-2" />
            Enrolling...
          </>
        ) : (
          <>
            <Zap className="w-5 h-5 mr-2" />
            {course?.isFree ? 'Enroll for Free' : `Enroll Now - $${course?.price}`}
          </>
        )}
        
        {showEnrollmentSuccess && (
          <div className="absolute inset-0 bg-green-500 animate-pulse rounded-2xl flex items-center justify-center">
            <div className="flex items-center text-white">
              <CheckCircle className="w-5 h-5 mr-2" />
              Enrolled Successfully!
            </div>
          </div>
        )}
      </Button>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
        <div className="container mx-auto px-6 py-8">
          <div className="flex justify-center items-center min-h-96">
            <div className="text-center">
              <Loader2 className="w-12 h-12 animate-spin text-rose-600 mx-auto mb-4" />
              <p className="text-slate-600 dark:text-slate-400">Loading course...</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (error || !course) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
        <div className="container mx-auto px-6 py-8">
          <div className="text-center py-12">
            <BookOpen className="w-16 h-16 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-slate-600 dark:text-slate-400 mb-2">
              {error ? 'Error Loading Course' : 'Course Not Found'}
            </h2>
            <p className="text-slate-500 dark:text-slate-500 mb-6">
              {error || 'The course you are looking for does not exist.'}
            </p>
            <Button onClick={fetchCourseData} className="rounded-2xl bg-rose-600 hover:bg-rose-700">
              Try Again
            </Button>
          </div>
        </div>
      </div>
    )
  }

  if (isLearningMode && activeLesson) {
    const nextLesson = getNextLesson()
    const previousLesson = getPreviousLesson()

    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
        {/* Header */}
        <div className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
          <div className="container mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <Button
                  variant="ghost"
                  onClick={() => setIsLearningMode(false)}
                  className="rounded-xl"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Course
                </Button>
                <div>
                  <h1 className="text-xl font-bold">{course.title}</h1>
                  <p className="text-slate-600 dark:text-slate-400 text-sm">
                    by {course.instructor.firstName} {course.instructor.lastName}
                  </p>
                </div>
              </div>
              
              {/* Progress */}
              <div className="flex items-center space-x-4">
                <div className="text-right">
                  <p className="text-sm font-medium">Overall Progress</p>
                  <p className="text-2xl font-bold text-rose-600">
                    {userProgress ? Math.round(userProgress.progress * 100) : 0}%
                  </p>
                </div>
                <div className="w-32">
                  <Progress 
                    value={userProgress ? userProgress.progress * 100 : 0} 
                    className="h-3 rounded-full"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="container mx-auto px-6 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            {/* Sidebar - Course Content */}
            <div className="lg:col-span-1">
              <Card className="rounded-2xl sticky top-24">
                <CardHeader>
                  <CardTitle>Course Content</CardTitle>
                  <CardDescription>
                    {course.totalLessons} lessons • {formatDuration(course.totalDuration)}
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="max-h-[calc(100vh-200px)] overflow-y-auto">
                    {course.modules.map((module, moduleIndex) => (
                      <div key={module._id} className="border-b border-slate-200 dark:border-slate-700 last:border-b-0">
                        <div className="p-4 bg-slate-50 dark:bg-slate-800/50">
                          <div className="flex items-center justify-between mb-2">
                            <h3 className="font-semibold">
                              {moduleIndex + 1}. {module.title}
                            </h3>
                            <Badge variant="secondary" className="rounded-lg">
                              {module.lessons.length} lessons
                            </Badge>
                          </div>
                          <Progress 
                            value={calculateModuleProgress(module)} 
                            className="h-2 rounded-full"
                          />
                        </div>
                        
                        <div className="space-y-1 p-2">
                          {module.lessons.map((lesson, lessonIndex) => {
                            const isCompleted = completedLessons.has(lesson._id)
                            const isActive = activeLesson?._id === lesson._id
                            
                            return (
                              <div
                                key={lesson._id}
                                className={`p-3 rounded-xl cursor-pointer transition-all ${
                                  isActive
                                    ? 'bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800'
                                    : 'hover:bg-slate-50 dark:hover:bg-slate-800'
                                }`}
                                onClick={() => handleLessonSelect(lesson)}
                              >
                                <div className="flex items-center space-x-3">
                                  <div className="flex-shrink-0">
                                    {isCompleted ? (
                                      <CheckCircle className="w-5 h-5 text-green-500" />
                                    ) : (
                                      <PlayCircle className="w-5 h-5 text-slate-400" />
                                    )}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className={`text-sm font-medium ${
                                      isActive ? 'text-rose-600' : 'text-slate-700 dark:text-slate-300'
                                    }`}>
                                      {lessonIndex + 1}. {lesson.title}
                                    </p>
                                    <div className="flex items-center space-x-2 mt-1">
                                      <Clock className="w-3 h-3 text-slate-400" />
                                      <span className="text-xs text-slate-500">
                                        {formatDuration(lesson.duration)}
                                      </span>
                                      {lesson.isPreview && (
                                        <Badge variant="outline" className="text-xs">
                                          Preview
                                        </Badge>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Main Content - Video Player & Lesson Details */}
            <div className="lg:col-span-3">
              <div className="space-y-6">
                {/* Video Player */}
                <Card className="rounded-2xl overflow-hidden">
                  {activeLesson.video ? (
                    <div className="w-full h-[400px] lg:h-[500px] bg-black flex items-center justify-center">
                      <video
                        src={activeLesson.video.url}
                        controls
                        className="w-full h-full"
                      />
                    </div>
                  ) : (
                    <div className="h-[400px] lg:h-[500px] bg-slate-200 dark:bg-slate-700 flex items-center justify-center">
                      <div className="text-center">
                        <PlayCircle className="w-16 h-16 text-slate-400 mx-auto mb-4" />
                        <p className="text-slate-600 dark:text-slate-400">No video available for this lesson</p>
                      </div>
                    </div>
                  )}
                  
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-2xl mb-2">{activeLesson.title}</CardTitle>
                        <CardDescription className="text-lg">
                          {activeLesson.description}
                        </CardDescription>
                      </div>
                      <div className="flex space-x-2 ml-4">
                        <Button
                          variant={completedLessons.has(activeLesson._id) ? "default" : "outline"}
                          onClick={() => handleLessonComplete(activeLesson._id)}
                          disabled={updatingProgress === activeLesson._id || completedLessons.has(activeLesson._id)}
                          className="rounded-xl"
                        >
                          {updatingProgress === activeLesson._id ? (
                            <Loader2 className="w-4 h-4 animate-spin mr-2" />
                          ) : completedLessons.has(activeLesson._id) ? (
                            <CheckCircle className="w-4 h-4 mr-2" />
                          ) : (
                            <CheckCircle className="w-4 h-4 mr-2" />
                          )}
                          {completedLessons.has(activeLesson._id) ? 'Completed' : 'Mark Complete'}
                        </Button>
                        
                        <Button variant="outline" size="icon" className="rounded-xl">
                          <Bookmark className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-4 text-sm text-slate-600 dark:text-slate-400">
                      <div className="flex items-center space-x-1">
                        <Clock className="w-4 h-4" />
                        <span>{formatDuration(activeLesson.duration)}</span>
                      </div>
                      {activeLesson.isPreview && (
                        <Badge variant="secondary">Preview</Badge>
                      )}
                    </div>
                  </CardHeader>
                </Card>

                {/* Lesson Resources */}
                {activeLesson.resources && activeLesson.resources.length > 0 && (
                  <Card className="rounded-2xl">
                    <CardHeader>
                      <CardTitle className="flex items-center">
                        <Download className="w-5 h-5 mr-2" />
                        Lesson Resources
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {activeLesson.resources.map((resource, index) => (
                          <div
                            key={index}
                            className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800"
                          >
                            <div className="flex items-center space-x-3">
                              <div className="w-8 h-8 bg-rose-100 dark:bg-rose-900/30 rounded-lg flex items-center justify-center">
                                <Download className="w-4 h-4 text-rose-600" />
                              </div>
                              <div>
                                <p className="font-medium">{resource.title}</p>
                                <p className="text-sm text-slate-500 capitalize">{resource.type}</p>
                              </div>
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => window.open(resource.url, '_blank')}
                              className="rounded-lg"
                            >
                              Download
                            </Button>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Navigation */}
                <div className="flex justify-between items-center">
                  <Button
                    variant="outline"
                    onClick={() => navigateToLesson('prev')}
                    disabled={!previousLesson}
                    className="rounded-2xl"
                  >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Previous
                  </Button>

                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      onClick={() => setIsLearningMode(false)}
                      className="rounded-2xl"
                    >
                      <BookOpen className="w-4 h-4 mr-2" />
                      Course Overview
                    </Button>
                    
                    <Button
                      onClick={() => handleLessonComplete(activeLesson._id)}
                      disabled={updatingProgress === activeLesson._id || completedLessons.has(activeLesson._id)}
                      variant={completedLessons.has(activeLesson._id) ? "default" : "default"}
                      className="rounded-2xl bg-rose-600 hover:bg-rose-700"
                    >
                      {completedLessons.has(activeLesson._id) ? (
                        <>
                          <CheckCircle className="w-4 h-4 mr-2" />
                          Completed
                        </>
                      ) : (
                        <>
                          <CheckCircle className="w-4 h-4 mr-2" />
                          Mark Complete
                        </>
                      )}
                    </Button>
                  </div>

                  <Button
                    onClick={() => navigateToLesson('next')}
                    disabled={!nextLesson}
                    variant="default"
                    className="rounded-2xl bg-rose-600 hover:bg-rose-700"
                  >
                    Next Lesson
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      {/* Course Header */}
      <div className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
        <div className="container mx-auto px-6 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Course Info */}
            <div className="lg:col-span-2">
              <div className="flex items-center space-x-2 mb-4">
                <Badge variant="secondary" className="rounded-lg">
                  {course.category}
                </Badge>
                {course.isFeatured && (
                  <Badge variant="default" className="rounded-lg bg-rose-500 text-white">
                    <Crown className="w-3 h-3 mr-1" />
                    Featured
                  </Badge>
                )}
                {course.aiFeatures?.hasAIAssistant && (
                  <Badge variant="secondary" className="rounded-lg bg-blue-500 text-white">
                    <Sparkles className="w-3 h-3 mr-1" />
                    AI Powered
                  </Badge>
                )}
              </div>

              <h1 className="text-4xl font-serif font-bold mb-4">{course.title}</h1>
              <p className="text-xl text-slate-600 dark:text-slate-400 mb-6">
                {course.shortDescription}
              </p>

              {/* Course Stats */}
              <div className="flex flex-wrap items-center gap-6 mb-6">
                <div className="flex items-center space-x-1">
                  <Star className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                  <span className="font-semibold">{course.averageRating.toFixed(1)}</span>
                  <span className="text-slate-500">({course.totalReviews} reviews)</span>
                </div>
                <div className="flex items-center space-x-1">
                  <Users className="w-5 h-5 text-slate-400" />
                  <span>{course.totalStudents} students</span>
                </div>
                <div className="flex items-center space-x-1">
                  <Clock className="w-5 h-5 text-slate-400" />
                  <span>{formatDuration(course.totalDuration)}</span>
                </div>
                <div className="flex items-center space-x-1">
                  <BookOpen className="w-5 h-5 text-slate-400" />
                  <span>{course.totalLessons} lessons</span>
                </div>
              </div>

              {/* Instructor */}
              <div className="flex items-center space-x-3 mb-6">
                <img
                  src={course.instructor.avatar || '/default-avatar.png'}
                  alt={course.instructor.username}
                  className="w-12 h-12 rounded-full"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement
                    target.src = '/default-avatar.png'
                  }}
                />
                <div>
                  <p className="font-semibold">
                    {course.instructor.firstName} {course.instructor.lastName}
                  </p>
                  <p className="text-slate-600 dark:text-slate-400 text-sm">
                    Instructor
                  </p>
                </div>
              </div>
            </div>

            {/* Enrollment Card */}
            <div className="lg:col-span-1">
              <Card className="rounded-2xl sticky top-24">
                <CardContent className="p-6">
                  {/* Course Thumbnail */}
                  <div className="mb-4 rounded-xl overflow-hidden">
                    <img
                      src={course.thumbnail.url}
                      alt={course.title}
                      className="w-full h-48 object-cover"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement
                        target.src = '/default-thumbnail.jpg'
                      }}
                    />
                  </div>

                  {/* Price */}
                  <div className="text-3xl font-bold text-rose-600 mb-4">
                    {course.isFree ? 'Free' : `$${course.price}`}
                  </div>

                  {/* Enrollment Button */}
                  <EnrollmentButton />

                  {/* Progress for enrolled users */}
                  {userProgress && (
                    <div className="mb-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium">Your Progress</span>
                        <span className="text-sm font-bold text-rose-600">
                          {Math.round(userProgress.progress * 100)}%
                        </span>
                      </div>
                      <Progress value={userProgress.progress * 100} className="h-2" />
                    </div>
                  )}

                  {/* Preview Video Section */}
                  {course.previewVideo && (
                    <div className="mb-4">
                      <div className="flex items-center space-x-2 mb-3">
                        <Video className="w-4 h-4 text-rose-500" />
                        <span className="font-semibold text-sm">Preview this course</span>
                      </div>
                      <div className="rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700">
                        <div className="h-32 bg-black flex items-center justify-center">
                          <video
                            src={course.previewVideo.url}
                            controls
                            className="w-full h-full"
                          />
                        </div>
                      </div>
                      <p className="text-xs text-slate-500 mt-2 text-center">
                        Watch a free preview of this course
                      </p>
                    </div>
                  )}

                  {/* Course Stats */}
                  <div className="grid grid-cols-3 gap-4 py-4 border-y border-slate-200 dark:border-slate-700 mb-4">
                    <div className="text-center">
                      <div className="flex items-center justify-center space-x-1 mb-1">
                        <BookOpen className="w-4 h-4 text-slate-400" />
                        <span className="font-bold text-lg">{course.totalLessons}</span>
                      </div>
                      <span className="text-xs text-slate-500">Lessons</span>
                    </div>
                    <div className="text-center">
                      <div className="flex items-center justify-center space-x-1 mb-1">
                        <Clock className="w-4 h-4 text-slate-400" />
                        <span className="font-bold text-lg">{formatDuration(course.totalDuration)}</span>
                      </div>
                      <span className="text-xs text-slate-500">Duration</span>
                    </div>
                    <div className="text-center">
                      <div className="flex items-center justify-center space-x-1 mb-1">
                        <Users className="w-4 h-4 text-slate-400" />
                        <span className="font-bold text-lg">{course.totalStudents}</span>
                      </div>
                      <span className="text-xs text-slate-500">Students</span>
                    </div>
                  </div>

                  {/* Guarantee */}
                  <div className="text-center text-sm text-slate-500 mb-4">
                    <Shield className="w-4 h-4 inline mr-1" />
                    30-day money-back guarantee
                  </div>

                  {/* Quick Actions */}
                  <div className="flex space-x-2 mb-4">
                    <Button variant="outline" className="flex-1 rounded-xl">
                      <Heart className="w-4 h-4 mr-2" />
                      Wishlist
                    </Button>
                    <Button variant="outline" className="flex-1 rounded-xl">
                      <Share2 className="w-4 h-4 mr-2" />
                      Share
                    </Button>
                  </div>

                  {/* Course Features */}
                  <div className="mb-4 p-4 bg-slate-50 dark:bg-slate-800 rounded-xl">
                    <h4 className="font-semibold mb-3 flex items-center">
                      <CheckCircle className="w-4 h-4 mr-2 text-green-500" />
                      This course includes:
                    </h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center">
                        <CheckCircle className="w-3 h-3 text-green-500 mr-2 flex-shrink-0" />
                        <span>Lifetime access</span>
                      </div>
                      <div className="flex items-center">
                        <CheckCircle className="w-3 h-3 text-green-500 mr-2 flex-shrink-0" />
                        <span>Certificate of completion</span>
                      </div>
                      <div className="flex items-center">
                        <CheckCircle className="w-3 h-3 text-green-500 mr-2 flex-shrink-0" />
                        <span>Downloadable resources</span>
                      </div>
                      {course.aiFeatures?.hasAIAssistant && (
                        <div className="flex items-center">
                          <CheckCircle className="w-3 h-3 text-green-500 mr-2 flex-shrink-0" />
                          <span>AI Learning Assistant</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* AI Features */}
                  {course.aiFeatures && (
                    <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-800">
                      <h4 className="font-semibold mb-2 flex items-center">
                        <Sparkles className="w-4 h-4 mr-2 text-blue-500" />
                        AI Enhanced Learning
                      </h4>
                      <div className="space-y-1 text-sm">
                        {course.aiFeatures.hasAIAssistant && (
                          <div className="flex items-center">
                            <div className="w-2 h-2 bg-blue-500 rounded-full mr-2"></div>
                            <span>Smart AI Assistant</span>
                          </div>
                        )}
                        {course.aiFeatures.hasPersonalizedLearning && (
                          <div className="flex items-center">
                            <div className="w-2 h-2 bg-blue-500 rounded-full mr-2"></div>
                            <span>Personalized Learning Path</span>
                          </div>
                        )}
                        {course.aiFeatures.hasProgressTracking && (
                          <div className="flex items-center">
                            <div className="w-2 h-2 bg-blue-500 rounded-full mr-2"></div>
                            <span>Advanced Progress Tracking</span>
                          </div>
                        )}
                        {course.aiFeatures.hasSmartRecommendations && (
                          <div className="flex items-center">
                            <div className="w-2 h-2 bg-blue-500 rounded-full mr-2"></div>
                            <span>Smart Recommendations</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>

      {/* Course Content */}
      <div className="container mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2">
            {/* Navigation Tabs */}
            <div className="flex border-b border-slate-200 dark:border-slate-700 mb-8">
              {['overview', 'curriculum', 'reviews', 'instructor'].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-4 py-2 font-medium capitalize border-b-2 transition-colors ${
                    activeTab === tab
                      ? 'border-rose-500 text-rose-600'
                      : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>

            {/* Tab Content */}
            {activeTab === 'overview' && (
              <div className="space-y-8">
                {/* Course Description */}
                <div>
                  <h3 className="text-2xl font-bold mb-4">About This Course</h3>
                  <p className="text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-line">
                    {course.description}
                  </p>
                </div>

                {/* Learning Outcomes */}
                <div>
                  <h3 className="text-2xl font-bold mb-4">What You'll Learn</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {course.learningOutcomes.map((outcome, index) => (
                      <div key={index} className="flex items-center space-x-3">
                        <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                        <span>{outcome}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Requirements */}
                <div>
                  <h3 className="text-2xl font-bold mb-4">Requirements</h3>
                  <ul className="list-disc list-inside space-y-2 text-slate-700 dark:text-slate-300">
                    {course.requirements.map((requirement, index) => (
                      <li key={index}>{requirement}</li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            {activeTab === 'curriculum' && (
              <div className="space-y-4">
                <h3 className="text-2xl font-bold mb-6">Course Content</h3>
                {course.modules.map((module, moduleIndex) => (
                  <Card key={module._id || moduleIndex} className="rounded-2xl">
                    <CardHeader 
                      className="cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                      onClick={() => toggleModule(moduleIndex)}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle className="flex items-center space-x-3">
                            <span className="w-8 h-8 bg-rose-100 dark:bg-rose-900/30 rounded-lg flex items-center justify-center text-rose-600 font-bold text-sm">
                              {moduleIndex + 1}
                            </span>
                            <span>{module.title}</span>
                          </CardTitle>
                          <CardDescription className="mt-2">
                            {module.description}
                          </CardDescription>
                        </div>
                        <div className="flex items-center space-x-4">
                          <span className="text-sm text-slate-500">
                            {module.lessons.length} lessons • {formatDuration(module.lessons.reduce((total, lesson) => total + lesson.duration, 0))}
                          </span>
                          {expandedModules.has(moduleIndex) ? (
                            <ChevronUp className="w-5 h-5 text-slate-400" />
                          ) : (
                            <ChevronDown className="w-5 h-5 text-slate-400" />
                          )}
                        </div>
                      </div>
                    </CardHeader>
                    {expandedModules.has(moduleIndex) && (
                      <CardContent className="pt-0">
                        <div className="space-y-2">
                          {module.lessons.map((lesson, lessonIndex) => (
                            <div
                              key={lesson._id || lessonIndex}
                              className="flex items-center justify-between p-3 rounded-lg bg-slate-50 dark:bg-slate-800"
                            >
                              <div className="flex items-center space-x-3">
                                <PlayCircle className="w-5 h-5 text-slate-400" />
                                <div>
                                  <p className="font-medium">{lesson.title}</p>
                                  <p className="text-sm text-slate-500">
                                    {formatDuration(lesson.duration)}
                                    {lesson.isPreview && (
                                      <Badge variant="outline" className="ml-2 text-xs">
                                        Preview
                                      </Badge>
                                    )}
                                  </p>
                                </div>
                              </div>
                              {enrolledCourses.has(course._id) && (
                                <div className="flex items-center space-x-2">
                                  {completedLessons.has(lesson._id) && (
                                    <CheckCircle className="w-4 h-4 text-green-500" />
                                  )}
                                  <Button 
                                    variant="outline" 
                                    size="sm" 
                                    className="rounded-lg"
                                    onClick={() => {
                                      setActiveLesson(lesson)
                                      setIsLearningMode(true)
                                      updateProgress(lesson._id, false, true)
                                    }}
                                  >
                                    {completedLessons.has(lesson._id) ? 'Review' : 'Start'}
                                  </Button>
                                </div>
                              )}
                              {lesson.isPreview && lesson.video && !enrolledCourses.has(course._id) && (
                                <Button 
                                  variant="outline" 
                                  size="sm" 
                                  className="rounded-lg"
                                  onClick={() => handlePreviewLesson(lesson)}
                                >
                                  Preview
                                </Button>
                              )}
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    )}
                  </Card>
                ))}
              </div>
            )}

            {activeTab === 'reviews' && (
              <div className="space-y-8">
                {/* Rating Summary */}
                <div className="flex items-start space-x-8">
                  <div className="text-center">
                    <div className="text-5xl font-bold text-rose-600 mb-2">
                      {course.averageRating.toFixed(1)}
                    </div>
                    <div className="flex items-center justify-center mb-1">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          className={`w-5 h-5 ${
                            star <= Math.floor(course.averageRating)
                              ? 'fill-yellow-400 text-yellow-400'
                              : 'text-slate-300'
                          }`}
                        />
                      ))}
                    </div>
                    <p className="text-slate-500">
                      {course.totalReviews} reviews
                    </p>
                  </div>

                  {/* Add Review */}
                  <div className="flex-1">
                    <h4 className="font-semibold mb-4">Add Your Review</h4>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium mb-2">Rating</label>
                        <div className="flex space-x-1">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <button
                              key={star}
                              type="button"
                              onClick={() => setNewRating(prev => ({ ...prev, rating: star }))}
                              className="p-1"
                            >
                              <Star
                                className={`w-6 h-6 ${
                                  star <= newRating.rating
                                    ? 'fill-yellow-400 text-yellow-400'
                                    : 'text-slate-300'
                                }`}
                              />
                            </button>
                          ))}
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-2">Review</label>
                        <Textarea
                          value={newRating.review}
                          onChange={(e) => setNewRating(prev => ({ ...prev, review: e.target.value }))}
                          placeholder="Share your experience with this course..."
                          className="rounded-xl min-h-[100px]"
                        />
                      </div>
                      <Button
                        onClick={submitRating}
                        disabled={isSubmittingRating || !newRating.rating}
                        className="rounded-xl bg-rose-600 hover:bg-rose-700"
                      >
                        {isSubmittingRating ? (
                          <Loader2 className="w-4 h-4 animate-spin mr-2" />
                        ) : (
                          <MessageCircle className="w-4 h-4 mr-2" />
                        )}
                        Submit Review
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Reviews List */}
                <div className="space-y-6">
                  {course.ratings.map((rating) => (
                    <Card key={rating._id} className="rounded-2xl">
                      <CardContent className="p-6">
                        <div className="flex items-start space-x-4">
                          <img
                            src={rating.user.avatar || '/default-avatar.png'}
                            alt={rating.user.username}
                            className="w-10 h-10 rounded-full"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement
                              target.src = '/default-avatar.png'
                            }}
                          />
                          <div className="flex-1">
                            <div className="flex items-center justify-between mb-2">
                              <div>
                                <p className="font-semibold">
                                  {rating.user.firstName} {rating.user.lastName}
                                </p>
                                <div className="flex items-center space-x-1">
                                  {[1, 2, 3, 4, 5].map((star) => (
                                    <Star
                                      key={star}
                                      className={`w-4 h-4 ${
                                        star <= rating.rating
                                          ? 'fill-yellow-400 text-yellow-400'
                                          : 'text-slate-300'
                                      }`}
                                    />
                                  ))}
                                </div>
                              </div>
                              <span className="text-sm text-slate-500">
                                {new Date(rating.createdAt).toLocaleDateString()}
                              </span>
                            </div>
                            {rating.review && (
                              <p className="text-slate-700 dark:text-slate-300">
                                {rating.review}
                              </p>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'instructor' && course.instructor && (
              <div className="space-y-6">
                <div className="flex items-start space-x-6">
                  <img
                    src={course.instructor.avatar || '/default-avatar.png'}
                    alt={course.instructor.username}
                    className="w-20 h-20 rounded-full"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement
                      target.src = '/default-avatar.png'
                    }}
                  />
                  <div>
                    <h3 className="text-2xl font-bold mb-2">
                      {course.instructor.firstName} {course.instructor.lastName}
                    </h3>
                    <p className="text-slate-600 dark:text-slate-400 mb-4">
                      {course.instructor.bio || 'Experienced instructor passionate about teaching.'}
                    </p>
                    <div className="flex items-center space-x-4 text-sm">
                      <div className="flex items-center space-x-1">
                        <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                        <span>{course.instructor.rating?.toFixed(1) || '4.8'}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Users className="w-4 h-4 text-slate-400" />
                        <span>{course.instructor.totalStudents || '1,000+'}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1 space-y-6">
            {/* Course Features */}
            <Card className="rounded-2xl">
              <CardHeader>
                <CardTitle>This Course Includes</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center space-x-3">
                  <Clock className="w-5 h-5 text-rose-500" />
                  <span>{formatDuration(course.totalDuration)} on-demand video</span>
                </div>
                <div className="flex items-center space-x-3">
                  <BookOpen className="w-5 h-5 text-rose-500" />
                  <span>{course.totalLessons} lessons</span>
                </div>
                <div className="flex items-center space-x-3">
                  <Download className="w-5 h-5 text-rose-500" />
                  <span>Downloadable resources</span>
                </div>
                <div className="flex items-center space-x-3">
                  <Award className="w-5 h-5 text-rose-500" />
                  <span>Certificate of completion</span>
                </div>
                <div className="flex items-center space-x-3">
                  <Globe className="w-5 h-5 text-rose-500" />
                  <span>Full lifetime access</span>
                </div>
                {course.aiFeatures?.hasAIAssistant && (
                  <div className="flex items-center space-x-3">
                    <Sparkles className="w-5 h-5 text-rose-500" />
                    <span>AI Learning Assistant</span>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Similar Courses */}
            {course.similarCourses && course.similarCourses.length > 0 && (
              <Card className="rounded-2xl">
                <CardHeader>
                  <CardTitle>Similar Courses</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {course.similarCourses.map((similarCourse) => (
                    <div
                      key={similarCourse._id}
                      className="flex items-center space-x-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                      onClick={() => router.push(`/courses/${similarCourse.slug}`)}
                    >
                      <img
                        src={similarCourse.thumbnail.url}
                        alt={similarCourse.title}
                        className="w-12 h-12 rounded-lg object-cover"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement
                          target.src = '/default-thumbnail.jpg'
                        }}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm line-clamp-2">{similarCourse.title}</p>
                        <p className="text-xs text-slate-500">
                          {similarCourse.instructor.firstName} {similarCourse.instructor.lastName}
                        </p>
                        <div className="flex items-center space-x-2 mt-1">
                          <span className="text-xs font-bold text-rose-600">
                            {similarCourse.isFree ? 'Free' : `$${similarCourse.price}`}
                          </span>
                          <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                          <span className="text-xs">{similarCourse.averageRating.toFixed(1)}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}