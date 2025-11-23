// app/courses/page.tsx
'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { useToast } from "@/components/ui/use-toast"
import { 
  Star, 
  Users, 
  Clock, 
  PlayCircle, 
  BookOpen, 
  Search,
  Filter,
  Grid,
  List,
  Sparkles,
  Zap,
  Crown,
  TrendingUp,
  Award,
  Shield,
  Globe,
  Download,
  Share2,
  Heart,
  Bookmark,
  Eye,
  ChevronDown,
  ChevronUp,
  Loader2,
  RotateCw,
  Brain,
  Rocket,
  Target,
  BarChart3,
  Video,
  DownloadCloud,
  CheckCircle,
  ArrowRight,
  CrownIcon,
  Flame,
  BookCheck,
  Play
} from 'lucide-react'

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
  thumbnail: {
    secure_url: string
    public_id: string
  }
  previewVideo?: {
    secure_url: string
    public_id: string
  }
  totalStudents: number
  averageRating: number
  totalReviews: number
  modules: Array<{
    _id: string
    title: string
    description: string
    order: number
    lessons: Array<{
      _id: string
      title: string
      description: string
      duration: number
      isPreview: boolean
      order: number
    }>
  }>
  totalDuration: number
  totalLessons: number
  isPublished: boolean
  isFeatured: boolean
  requirements: string[]
  learningOutcomes: string[]
  createdAt: string
  updatedAt: string
  enrollmentCount?: number
  completionRate?: number
  aiFeatures?: {
    hasAIAssistant: boolean
    hasPersonalizedLearning: boolean
    hasSmartRecommendations: boolean
    hasProgressTracking: boolean
    hasPersonalizedFeedback: boolean
  }
  students?: Array<{
    user: string
    enrolledAt: Date
    completed?: boolean
  }>
}

interface UserProgress {
  _id: string
  courseId: string
  userId: string
  enrolled: boolean
  progress: number
  completed: boolean
  currentLesson?: string
  lastAccessed?: Date
  timeSpent?: number
  completedLessons: string[]
}

interface FilterState {
  category: string[]
  level: string[]
  price: 'all' | 'free' | 'paid'
  duration: string[]
  features: string[]
  rating: number
  sort: 'popular' | 'newest' | 'rating' | 'duration' | 'price-low' | 'price-high' | 'trending'
}

export default function CoursesPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [courses, setCourses] = useState<Course[]>([])
  const [recommendations, setRecommendations] = useState<Course[]>([])
  const [trendingCourses, setTrendingCourses] = useState<Course[]>([])
  const [loading, setLoading] = useState(true)
  const [streaming, setStreaming] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [showFilters, setShowFilters] = useState(false)
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null)
  const [isEnrolling, setIsEnrolling] = useState<string | null>(null)
  const [favoriteCourses, setFavoriteCourses] = useState<Set<string>>(new Set())
  const observerTarget = useRef<HTMLDivElement>(null)
  const streamController = useRef<AbortController | null>(null)

  // User progress state
  const [userProgress, setUserProgress] = useState<{[courseId: string]: UserProgress}>({})
  const [progressLoading, setProgressLoading] = useState<Set<string>>(new Set())

  const [filters, setFilters] = useState<FilterState>({
    category: [],
    level: [],
    price: 'all',
    duration: [],
    features: [],
    rating: 0,
    sort: 'popular'
  })

  const [stats, setStats] = useState({
    totalCourses: 0,
    featuredCourses: 0,
    freeCourses: 0,
    totalEnrollments: 0
  })

  // Advanced filter options
  const filterOptions = {
    categories: ['Fashion Design', 'Pattern Making', 'Sewing', 'Textiles', 'Fashion Business', 'Sustainability', 'Digital Fashion', '3D Design', 'Fashion Marketing'],
    levels: ['beginner', 'intermediate', 'advanced'],
    durations: ['0-2 hours', '2-5 hours', '5-10 hours', '10-20 hours', '20+ hours'],
    features: ['AI Assistant', 'Personalized Learning', 'Certification', 'Live Sessions', 'Community Access', 'Lifetime Access', 'Project Based', 'Mentor Support']
  }

  // Fetch progress for a specific course
  const fetchCourseProgress = async (courseId: string) => {
    // Don't fetch if already loading
    if (progressLoading.has(courseId)) return
    
    setProgressLoading(prev => new Set([...prev, courseId]))
    
    try {
      const response = await fetch(`/api/courses/${courseId}/progress`)
      
      if (response.ok) {
        const progress = await response.json()
        setUserProgress(prev => ({
          ...prev,
          [courseId]: {
            ...progress,
            enrolled: true // If we get progress, user is enrolled
          }
        }))
      } else if (response.status === 403) {
        // User is not enrolled in this course - that's fine
        setUserProgress(prev => ({
          ...prev,
          [courseId]: {
            _id: `temp-${courseId}`,
            courseId,
            userId: 'current-user',
            enrolled: false,
            progress: 0,
            completed: false,
            completedLessons: [],
            lastAccessed: new Date(),
            timeSpent: 0
          }
        }))
      } else {
        // Some other error - mark as not enrolled
        console.error(`Error fetching progress for course ${courseId}:`, response.status)
        setUserProgress(prev => ({
          ...prev,
          [courseId]: {
            _id: `temp-${courseId}`,
            courseId,
            userId: 'current-user',
            enrolled: false,
            progress: 0,
            completed: false,
            completedLessons: [],
            lastAccessed: new Date(),
            timeSpent: 0
          }
        }))
      }
    } catch (error) {
      console.error(`Error fetching progress for course ${courseId}:`, error)
      // On error, assume not enrolled
      setUserProgress(prev => ({
        ...prev,
        [courseId]: {
          _id: `temp-${courseId}`,
          courseId,
          userId: 'current-user',
          enrolled: false,
          progress: 0,
          completed: false,
          completedLessons: [],
          lastAccessed: new Date(),
          timeSpent: 0
        }
      }))
    } finally {
      setProgressLoading(prev => {
        const newSet = new Set(prev)
        newSet.delete(courseId)
        return newSet
      })
    }
  }

  // Fetch progress for all courses (batch)
  const fetchAllCoursesProgress = async (courseIds: string[]) => {
    // Fetch progress for each course with a small delay to avoid overwhelming the API
    for (const courseId of courseIds) {
      await fetchCourseProgress(courseId)
      // Small delay between requests
      await new Promise(resolve => setTimeout(resolve, 100))
    }
  }

  // Enhanced quick enroll function with progress tracking
  const quickEnroll = async (courseId: string, courseSlug?: string) => {
    if (isEnrolling) return
    
    setIsEnrolling(courseId)
    try {
      const response = await fetch(`/api/courses/${courseId}/enroll`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      })

      const result = await response.json()

      if (response.ok) {
        // Update local state with real data
        setCourses(prev => prev.map(course => 
          course._id === courseId 
            ? { 
                ...course, 
                totalStudents: result.course?.totalStudents || course.totalStudents + 1,
                instructor: result.course?.instructor || course.instructor
              }
            : course
        ))
        
        // Update progress for this course - user is now enrolled
        setUserProgress(prev => ({
          ...prev,
          [courseId]: {
            _id: `temp-${courseId}`,
            courseId,
            userId: 'current-user',
            enrolled: true,
            progress: 0,
            completed: false,
            completedLessons: [],
            lastAccessed: new Date(),
            timeSpent: 0
          }
        }))
        
        // Show appropriate message
        toast({
          title: result.alreadyEnrolled ? 'Already Enrolled!' : 'Successfully Enrolled!',
          description: result.alreadyEnrolled 
            ? 'You are already enrolled in this course' 
            : 'You can now start learning immediately',
          variant: 'success',
        })

        // Redirect to course detail page after enrollment
        if (courseSlug) {
          setTimeout(() => {
            router.push(`/courses/${courseSlug}`)
          }, 1500)
        }
      } else {
        throw new Error(result.error || `Failed to enroll (${response.status})`)
      }
    } catch (err: any) {
      console.error('Error enrolling:', err)
      
      if (err.message.includes('Unauthorized')) {
        toast({
          title: 'Login Required',
          description: 'Please log in to enroll in courses',
          variant: 'destructive',
        })
      } else if (err.message.includes('not found')) {
        toast({
          title: 'Course Not Available',
          description: 'This course is no longer available',
          variant: 'destructive',
        })
      } else {
        toast({
          title: 'Enrollment Failed',
          description: err.message || 'Failed to enroll in course. Please try again.',
          variant: 'destructive',
        })
      }
    } finally {
      setIsEnrolling(null)
    }
  }

  // Continue learning - redirect to course detail page
  const continueLearning = (course: Course) => {
    // Always redirect to course detail page
    router.push(`/courses/${course.slug}`)
  }

  // View course details
  const viewCourseDetails = (course: Course) => {
    router.push(`/courses/${course.slug}`)
  }

  // Check if user is enrolled in a course
  const isUserEnrolled = (courseId: string) => {
    return userProgress[courseId]?.enrolled || false
  }

  // Get enrollment button based on user progress
  const getEnrollmentButton = (course: Course) => {
    const progress = userProgress[course._id]
    const isEnrolled = isUserEnrolled(course._id)
    const isLoading = progressLoading.has(course._id)
    
    if (isLoading) {
      // Still loading progress data
      return (
        <Button 
          variant="outline"
          size="sm" 
          className="rounded-xl"
          disabled
        >
          <Loader2 className="w-3 h-3 animate-spin mr-1" />
          Loading...
        </Button>
      )
    }

    if (!isEnrolled) {
      // Not enrolled - show enroll button
      return (
        <Button 
          variant="premium"
          size="sm" 
          className="rounded-xl shadow-lg hover:shadow-xl transition-all"
          onClick={(e) => {
            e.stopPropagation()
            quickEnroll(course._id, course.slug)
          }}
          disabled={isEnrolling === course._id}
        >
          {isEnrolling === course._id ? (
            <Loader2 className="w-3 h-3 animate-spin mr-1" />
          ) : (
            <BookCheck className="w-3 h-3 mr-1" />
          )}
          {isEnrolling === course._id ? 'Enrolling...' : 'Enroll Now'}
        </Button>
      )
    }

    if (progress?.completed) {
      // Course completed
      return (
        <div className="flex flex-col space-y-2">
          <div className="flex items-center space-x-1 text-xs text-green-600">
            <CheckCircle className="w-3 h-3" />
            <span>Completed</span>
          </div>
          <Button 
            variant="outline"
            size="sm" 
            className="rounded-xl border-green-200 text-green-700 hover:bg-green-50"
            onClick={(e) => {
              e.stopPropagation()
              viewCourseDetails(course)
            }}
          >
            <BookOpen className="w-3 h-3 mr-1" />
            View Course
          </Button>
        </div>
      )
    }

    if (progress?.progress && progress.progress > 0) {
      // In progress - show continue button with progress
      return (
        <div className="flex flex-col space-y-2 w-full">
          <div className="flex justify-between items-center text-xs">
            <span className="text-slate-600">{Math.round(progress.progress * 100)}% complete</span>
            <span className="text-rose-600 font-medium">In Progress</span>
          </div>
          <Progress value={progress.progress * 100} className="h-2" />
          <Button 
            variant="default"
            size="sm" 
            className="rounded-xl bg-rose-600 hover:bg-rose-700 text-white"
            onClick={(e) => {
              e.stopPropagation()
              continueLearning(course)
            }}
          >
            <Play className="w-3 h-3 mr-1" />
            Continue
          </Button>
        </div>
      )
    }

    // Enrolled but not started
    return (
      <Button 
        variant="default"
        size="sm" 
        className="rounded-xl bg-blue-600 hover:bg-blue-700 text-white"
        onClick={(e) => {
          e.stopPropagation()
          continueLearning(course)
        }}
      >
        <Play className="w-3 h-3 mr-1" />
        Start Learning
      </Button>
    )
  }

  // Toggle favorite
  const toggleFavorite = (courseId: string) => {
    setFavoriteCourses(prev => {
      const newFavorites = new Set(prev)
      if (newFavorites.has(courseId)) {
        newFavorites.delete(courseId)
        toast({
          title: 'Removed from favorites',
          variant: 'default',
        })
      } else {
        newFavorites.add(courseId)
        toast({
          title: 'Added to favorites',
          variant: 'success',
        })
      }
      return newFavorites
    })
  }

  // Share course
  const shareCourse = async (course: Course) => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: course.title,
          text: course.shortDescription,
          url: `${window.location.origin}/courses/${course.slug}`,
        })
      } catch (err) {
        console.log('Share cancelled')
      }
    } else {
      // Fallback: copy to clipboard
      navigator.clipboard.writeText(`${window.location.origin}/courses/${course.slug}`)
      toast({
        title: 'Link copied to clipboard!',
        variant: 'success',
      })
    }
  }

  // Fetch courses with enhanced streaming
  const fetchCourses = useCallback(async (page = 1, isLoadMore = false) => {
    if (streamController.current) {
      streamController.current.abort()
    }

    streamController.current = new AbortController()

    try {
      if (!isLoadMore) {
        setLoading(true)
        setStreaming(true)
        setCourses([])
        setRecommendations([])
        setTrendingCourses([])
        setUserProgress({}) // Reset progress when fetching new courses
      }
      
      setError(null)

      const params = new URLSearchParams({
        page: page.toString(),
        limit: '12',
        search: searchQuery,
        sort: filters.sort,
        ...(filters.category.length > 0 && { category: filters.category.join(',') }),
        ...(filters.level.length > 0 && { level: filters.level.join(',') }),
        price: filters.price,
        ...(filters.features.length > 0 && { features: filters.features.join(',') }),
        rating: filters.rating.toString()
      })

      const response = await fetch(`/api/courses/stream?${params}`, {
        signal: streamController.current.signal,
        headers: {
          'Accept': 'text/event-stream'
        }
      })

      if (!response.ok) {
        throw new Error(`Failed to fetch courses: ${response.status}`)
      }

      if (response.headers.get('content-type')?.includes('text/event-stream')) {
        const reader = response.body?.getReader()
        if (!reader) throw new Error('Response body is not readable')

        let buffer = ''
        const seenCourseIds = new Set<string>()
        
        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          const chunk = new TextDecoder().decode(value)
          buffer += chunk

          const lines = buffer.split('\n')
          buffer = lines.pop() || ''

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.slice(6))
                
                switch (data.type) {
                  case 'stats':
                    setStats(data.stats)
                    break
                  case 'course':
                    if (!seenCourseIds.has(data.course._id)) {
                      seenCourseIds.add(data.course._id)
                      if (isLoadMore) {
                        setCourses(prev => {
                          const existingIds = new Set(prev.map(c => c._id))
                          return existingIds.has(data.course._id) 
                            ? prev 
                            : [...prev, data.course]
                        })
                      } else {
                        setCourses(prev => [...prev, data.course])
                      }
                    }
                    break
                  case 'recommendation':
                    setRecommendations(prev => {
                      const existingIds = new Set(prev.map(c => c._id))
                      return existingIds.has(data.course._id) 
                        ? prev 
                        : [...prev, data.course]
                    })
                    break
                  case 'trending':
                    setTrendingCourses(prev => {
                      const existingIds = new Set(prev.map(c => c._id))
                      return existingIds.has(data.course._id) 
                        ? prev 
                        : [...prev, data.course]
                    })
                    break
                  case 'complete':
                    setStreaming(false)
                    break
                  case 'error':
                    console.error('Stream error:', data.message)
                    break
                }
              } catch (e) {
                console.warn('Failed to parse stream data:', e)
              }
            }
          }
        }
      }
    } catch (err: any) {
      if (err.name === 'AbortError') return
      console.error('Error fetching courses:', err)
      setError(err.message || 'Failed to load courses')
    } finally {
      setLoading(false)
      setStreaming(false)
    }
  }, [searchQuery, filters])

  // Load more courses
  const loadMoreCourses = useCallback(async () => {
    if (!streaming && courses.length > 0) {
      const currentPage = Math.ceil(courses.length / 12)
      await fetchCourses(currentPage + 1, true)
    }
  }, [streaming, courses.length, fetchCourses])

  // Intersection Observer for infinite scroll
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !streaming && !loading) {
          loadMoreCourses()
        }
      },
      { threshold: 0.1 }
    )

    if (observerTarget.current) {
      observer.observe(observerTarget.current)
    }

    return () => {
      if (observerTarget.current) {
        observer.unobserve(observerTarget.current)
      }
    }
  }, [streaming, loading, loadMoreCourses])

  // Initial load and filter changes
  useEffect(() => {
    fetchCourses(1, false)
  }, [searchQuery, filters, fetchCourses])

  // Fetch progress for courses when they are loaded
  useEffect(() => {
    if (courses.length > 0) {
      const courseIds = courses.map(course => course._id)
      fetchAllCoursesProgress(courseIds)
    }
  }, [courses.length])

  // Toggle filters
  const toggleFilter = (type: keyof FilterState, value: string) => {
    setFilters(prev => {
      const currentArray = prev[type] as string[]
      if (Array.isArray(currentArray)) {
        return {
          ...prev,
          [type]: currentArray.includes(value)
            ? currentArray.filter(item => item !== value)
            : [...currentArray, value]
        }
      }
      return prev
    })
  }

  // Clear all filters
  const clearFilters = () => {
    setFilters({
      category: [],
      level: [],
      price: 'all',
      duration: [],
      features: [],
      rating: 0,
      sort: 'popular'
    })
  }

  // Format duration
  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    if (hours > 0) {
      return `${hours}h ${mins > 0 ? `${mins}m` : ''}`.trim()
    }
    return `${mins}m`
  }

  // Get level color
  const getLevelColor = (level: string) => {
    switch (level) {
      case 'beginner':
        return 'from-green-500 to-emerald-500'
      case 'intermediate':
        return 'from-yellow-500 to-orange-500'
      case 'advanced':
        return 'from-red-500 to-pink-500'
      default:
        return 'from-slate-500 to-slate-600'
    }
  }

  // Get AI feature icon
  const getAIFeatureIcon = (feature: string) => {
    switch (feature) {
      case 'hasAIAssistant':
        return <Brain className="w-3 h-3" />
      case 'hasPersonalizedLearning':
        return <Target className="w-3 h-3" />
      case 'hasSmartRecommendations':
        return <Sparkles className="w-3 h-3" />
      case 'hasProgressTracking':
        return <BarChart3 className="w-3 h-3" />
      default:
        return <Sparkles className="w-3 h-3" />
    }
  }

  // Course card skeleton
  const CourseSkeleton = () => (
    <Card className="rounded-2xl overflow-hidden animate-pulse">
      <div className="h-48 bg-slate-200 dark:bg-slate-700"></div>
      <CardHeader className="pb-3">
        <div className="h-6 bg-slate-200 dark:bg-slate-700 rounded mb-2"></div>
        <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-3/4"></div>
      </CardHeader>
      <CardContent className="pb-6">
        <div className="flex justify-between mb-4">
          <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-16"></div>
          <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-20"></div>
          <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-12"></div>
        </div>
        <div className="flex justify-between">
          <div className="h-6 bg-slate-200 dark:bg-slate-700 rounded w-20"></div>
          <div className="h-8 bg-slate-200 dark:bg-slate-700 rounded w-24"></div>
        </div>
      </CardContent>
    </Card>
  )

  // Enhanced Quick View Modal with enrollment status
  const QuickViewModal = ({ course, onClose }: { course: Course, onClose: () => void }) => {
    const progress = userProgress[course._id]
    const isEnrolled = isUserEnrolled(course._id)
    const isLoading = progressLoading.has(course._id)
    
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
          <div className="relative">
            <img
              src={course.thumbnail.secure_url}
              alt={course.title}
              className="w-full h-64 object-cover rounded-t-2xl"
            />
            <button
              onClick={onClose}
              className="absolute top-4 right-4 bg-white/90 dark:bg-slate-800/90 rounded-full p-2 hover:bg-white dark:hover:bg-slate-700 transition-colors"
            >
              <Eye className="w-5 h-5" />
            </button>
            
            {/* Enhanced Badges */}
            <div className="absolute top-4 left-4 flex flex-wrap gap-2">
              {course.isFeatured && (
                <Badge variant="premium" className="rounded-lg backdrop-blur-sm">
                  <Crown className="w-3 h-3 mr-1" />
                  Featured
                </Badge>
              )}
              {course.isFree && (
                <Badge variant="success" className="rounded-lg backdrop-blur-sm">
                  Free
                </Badge>
              )}
              {course.aiFeatures && (
                <Badge variant="secondary" className="rounded-lg bg-blue-500 text-white backdrop-blur-sm">
                  <Sparkles className="w-3 h-3 mr-1" />
                  AI Enhanced
                </Badge>
              )}
              {isEnrolled && !isLoading && (
                <Badge variant={progress?.completed ? "success" : "default"} className="rounded-lg backdrop-blur-sm">
                  {progress?.completed ? 'Completed' : 'Enrolled'}
                </Badge>
              )}
            </div>
          </div>
          
          <div className="p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <h2 className="text-2xl font-bold mb-2">{course.title}</h2>
                <p className="text-slate-600 dark:text-slate-400 mb-4">{course.shortDescription}</p>
              </div>
              <span className="text-3xl font-bold text-rose-600 ml-4">
                {course.isFree ? 'Free' : `$${course.price}`}
              </span>
            </div>

            {/* Enrollment Status */}
            {isEnrolled && !isLoading && (
              <div className="mb-6 p-4 bg-slate-50 dark:bg-slate-700/30 rounded-xl">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-semibold flex items-center">
                      {progress?.completed ? (
                        <>
                          <CheckCircle className="w-5 h-5 text-green-500 mr-2" />
                          Course Completed
                        </>
                      ) : progress?.progress && progress.progress > 0 ? (
                        <>
                          <TrendingUp className="w-5 h-5 text-blue-500 mr-2" />
                          In Progress - {Math.round(progress.progress * 100)}% Complete
                        </>
                      ) : (
                        <>
                          <BookCheck className="w-5 h-5 text-blue-500 mr-2" />
                          Enrolled - Ready to Start
                        </>
                      )}
                    </h4>
                    {progress?.lastAccessed && (
                      <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                        Last accessed: {new Date(progress.lastAccessed).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                  {progress?.progress && progress.progress > 0 && !progress.completed && (
                    <Progress value={progress.progress * 100} className="w-32" />
                  )}
                </div>
              </div>
            )}

            {/* Instructor Info */}
            <div className="flex items-center space-x-3 mb-6 p-4 bg-slate-50 dark:bg-slate-700/30 rounded-xl">
              <img
                src={course.instructor.avatar || '/default-avatar.png'}
                alt={course.instructor.username}
                className="w-12 h-12 rounded-full"
              />
              <div>
                <p className="font-semibold">
                  {course.instructor.firstName} {course.instructor.lastName}
                </p>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Instructor • {course.instructor.totalStudents || 0}+ students
                </p>
              </div>
            </div>

            {/* Enhanced Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="text-center p-3 bg-slate-50 dark:bg-slate-700/30 rounded-xl">
                <Clock className="w-6 h-6 text-rose-500 mx-auto mb-2" />
                <div className="text-sm font-medium">{formatDuration(course.totalDuration)}</div>
                <div className="text-xs text-slate-500">Duration</div>
              </div>
              <div className="text-center p-3 bg-slate-50 dark:bg-slate-700/30 rounded-xl">
                <BookOpen className="w-6 h-6 text-rose-500 mx-auto mb-2" />
                <div className="text-sm font-medium">{course.totalLessons}</div>
                <div className="text-xs text-slate-500">Lessons</div>
              </div>
              <div className="text-center p-3 bg-slate-50 dark:bg-slate-700/30 rounded-xl">
                <Users className="w-6 h-6 text-rose-500 mx-auto mb-2" />
                <div className="text-sm font-medium">{course.totalStudents}</div>
                <div className="text-xs text-slate-500">Students</div>
              </div>
              <div className="text-center p-3 bg-slate-50 dark:bg-slate-700/30 rounded-xl">
                <Star className="w-6 h-6 text-rose-500 mx-auto mb-2" />
                <div className="text-sm font-medium">{course.averageRating || 'New'}</div>
                <div className="text-xs text-slate-500">Rating</div>
              </div>
            </div>

            {/* AI Features */}
            {course.aiFeatures && (
              <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-800">
                <h4 className="font-semibold mb-3 flex items-center">
                  <Sparkles className="w-4 h-4 mr-2 text-blue-500" />
                  AI Enhanced Features
                </h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  {Object.entries(course.aiFeatures).map(([key, value]) => 
                    value && (
                      <div key={key} className="flex items-center space-x-2">
                        <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                        <span className="capitalize">
                          {key.replace('has', '').replace(/([A-Z])/g, ' $1').trim()}
                        </span>
                      </div>
                    )
                  )}
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-3">
              {isLoading ? (
                <Button 
                  variant="outline" 
                  className="rounded-2xl"
                  size="lg"
                  disabled
                >
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Loading...
                </Button>
              ) : isEnrolled ? (
                progress?.completed ? (
                  <>
                    <Button 
                      onClick={() => {
                        onClose()
                        viewCourseDetails(course)
                      }}
                      variant="outline" 
                      className="rounded-2xl"
                      size="lg"
                    >
                      <BookOpen className="w-4 h-4 mr-2" />
                      View Course
                    </Button>
                    <Button 
                      onClick={() => {
                        onClose()
                        viewCourseDetails(course)
                      }}
                      variant="premium" 
                      className="rounded-2xl"
                      size="lg"
                    >
                      <Award className="w-4 h-4 mr-2" />
                      View Certificate
                    </Button>
                  </>
                ) : (
                  <Button 
                    onClick={() => {
                      onClose()
                      continueLearning(course)
                    }}
                    variant="premium" 
                    className="rounded-2xl"
                    size="lg"
                  >
                    <Play className="w-4 h-4 mr-2" />
                    {progress?.progress && progress.progress > 0 ? 'Continue Learning' : 'Start Learning'}
                  </Button>
                )
              ) : (
                <>
                  <Button 
                    variant="premium"
                    size="lg" 
                    className="rounded-2xl shadow-lg hover:shadow-xl transition-all"
                    onClick={() => quickEnroll(course._id, course.slug)}
                    disabled={isEnrolling === course._id}
                  >
                    {isEnrolling === course._id ? (
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    ) : (
                      <BookCheck className="w-4 h-4 mr-2" />
                    )}
                    {isEnrolling === course._id ? 'Enrolling...' : 'Enroll Now'}
                  </Button>
                  <Button 
                    onClick={() => {
                      onClose()
                      viewCourseDetails(course)
                    }}
                    variant="outline" 
                    className="rounded-2xl"
                    size="lg"
                  >
                    <ArrowRight className="w-4 h-4 mr-2" />
                    View Details
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      {/* Enhanced Header with Gradient */}
      <div className="bg-gradient-to-br from-rose-500 via-purple-600 to-blue-600 text-white relative overflow-hidden">
        {/* Animated Background */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-10 left-10 w-20 h-20 bg-white rounded-full blur-xl"></div>
          <div className="absolute top-40 right-20 w-32 h-32 bg-purple-300 rounded-full blur-2xl"></div>
          <div className="absolute bottom-20 left-1/3 w-24 h-24 bg-blue-300 rounded-full blur-xl"></div>
        </div>
        
        <div className="container mx-auto px-6 py-16 relative">
          <div className="text-center max-w-4xl mx-auto">
            <div className="flex items-center justify-center mb-4">
              <Sparkles className="w-8 h-8 mr-3 animate-pulse" />
              <h1 className="text-5xl font-serif font-bold bg-gradient-to-r from-white to-rose-100 bg-clip-text text-transparent">
                Master Fashion Design
              </h1>
              <Zap className="w-8 h-8 ml-3 animate-pulse" />
            </div>
            <p className="text-xl opacity-90 mb-8">
              Learn from world-class instructors with AI-powered personalized learning experiences
            </p>
            
            {/* Enhanced Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-8">
              {[
                { value: stats.totalCourses, label: 'Courses', icon: BookOpen },
                { value: stats.featuredCourses, label: 'Featured', icon: CrownIcon },
                { value: stats.freeCourses, label: 'Free', icon: Award },
                { value: stats.totalEnrollments, label: 'Enrollments', icon: Users }
              ].map((stat, index) => (
                <div key={index} className="text-center backdrop-blur-sm bg-white/10 rounded-2xl p-4">
                  <stat.icon className="w-8 h-8 mx-auto mb-2 opacity-90" />
                  <div className="text-3xl font-bold">{stat.value}+</div>
                  <div className="text-rose-100 text-sm">{stat.label}</div>
                </div>
              ))}
            </div>

            {/* Enhanced Search Bar */}
            <div className="max-w-2xl mx-auto">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-300 w-5 h-5" />
                <Input
                  type="text"
                  placeholder="Search for courses, instructors, or topics..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-12 pr-32 py-4 rounded-2xl border-0 bg-white/20 backdrop-blur-sm text-white placeholder-slate-200 text-lg focus:bg-white/30 transition-all"
                />
                <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex space-x-2">
                  <Button 
                    variant="premium" 
                    size="sm" 
                    className="rounded-xl bg-white text-rose-600 hover:bg-rose-50 font-semibold"
                  >
                    <Sparkles className="w-4 h-4 mr-2" />
                    AI Search
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-6 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Enhanced Filters Sidebar */}
          <div className="lg:w-80 space-y-6">
            <Card className="rounded-2xl sticky top-24 border-0 shadow-xl">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center">
                    <Filter className="w-5 h-5 mr-2 text-rose-500" />
                    Filters
                  </CardTitle>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={clearFilters}
                    className="text-xs rounded-xl hover:bg-rose-50 hover:text-rose-600"
                  >
                    Clear All
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Sort Filter */}
                <div>
                  <h4 className="font-medium mb-3 flex items-center">
                    <TrendingUp className="w-4 h-4 mr-2 text-slate-400" />
                    Sort By
                  </h4>
                  <select
                    value={filters.sort}
                    onChange={(e) => setFilters(prev => ({ ...prev, sort: e.target.value as any }))}
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm focus:ring-2 focus:ring-rose-500 focus:border-transparent"
                  >
                    <option value="popular">Most Popular</option>
                    <option value="trending">Trending</option>
                    <option value="newest">Newest</option>
                    <option value="rating">Highest Rated</option>
                    <option value="duration">Longest</option>
                    <option value="price-low">Price: Low to High</option>
                    <option value="price-high">Price: High to Low</option>
                  </select>
                </div>

                {/* Price Filter */}
                <div>
                  <h4 className="font-medium mb-3 flex items-center">
                    <Award className="w-4 h-4 mr-2 text-slate-400" />
                    Price
                  </h4>
                  <div className="space-y-2">
                    {['all', 'free', 'paid'].map((price) => (
                      <label key={price} className="flex items-center space-x-3 cursor-pointer group">
                        <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all ${
                          filters.price === price 
                            ? 'border-rose-500 bg-rose-500' 
                            : 'border-slate-300 group-hover:border-rose-300'
                        }`}>
                          {filters.price === price && (
                            <div className="w-2 h-2 bg-white rounded-full"></div>
                          )}
                        </div>
                        <span className="capitalize group-hover:text-rose-600 transition-colors">{price}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Level Filter */}
                <div>
                  <h4 className="font-medium mb-3 flex items-center">
                    <Target className="w-4 h-4 mr-2 text-slate-400" />
                    Level
                  </h4>
                  <div className="space-y-2">
                    {filterOptions.levels.map((level) => (
                      <label key={level} className="flex items-center space-x-3 cursor-pointer group">
                        <input
                          type="checkbox"
                          checked={filters.level.includes(level)}
                          onChange={() => toggleFilter('level', level)}
                          className="w-4 h-4 text-rose-500 rounded focus:ring-rose-500"
                        />
                        <span className="capitalize group-hover:text-rose-600 transition-colors">{level}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Features Filter */}
                <div>
                  <h4 className="font-medium mb-3 flex items-center">
                    <Sparkles className="w-4 h-4 mr-2 text-slate-400" />
                    Features
                  </h4>
                  <div className="space-y-2">
                    {filterOptions.features.map((feature) => (
                      <label key={feature} className="flex items-center space-x-3 cursor-pointer group">
                        <input
                          type="checkbox"
                          checked={filters.features.includes(feature)}
                          onChange={() => toggleFilter('features', feature)}
                          className="w-4 h-4 text-rose-500 rounded focus:ring-rose-500"
                        />
                        <span className="group-hover:text-rose-600 transition-colors">{feature}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Rating Filter */}
                <div>
                  <h4 className="font-medium mb-3 flex items-center">
                    <Star className="w-4 h-4 mr-2 text-slate-400" />
                    Minimum Rating
                  </h4>
                  <div className="flex items-center space-x-2">
                    {[4, 3, 2, 1, 0].map((rating) => (
                      <button
                        key={rating}
                        onClick={() => setFilters(prev => ({ ...prev, rating }))}
                        className={`flex items-center space-x-1 px-3 py-2 rounded-xl transition-all ${
                          filters.rating === rating 
                            ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/25' 
                            : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 hover:bg-rose-50 hover:text-rose-600'
                        }`}
                      >
                        <Star className={`w-4 h-4 ${filters.rating === rating ? 'fill-white' : 'fill-yellow-400 text-yellow-400'}`} />
                        <span className="text-sm font-medium">{rating === 0 ? 'All' : `${rating}+`}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* AI Recommendations */}
            {recommendations.length > 0 && (
              <Card className="rounded-2xl border-0 shadow-xl bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20">
                <CardHeader>
                  <CardTitle className="flex items-center text-blue-600 dark:text-blue-400">
                    <Brain className="w-5 h-5 mr-2" />
                    AI Picks For You
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {recommendations.slice(0, 3).map((course) => (
                    <div 
                      key={course._id}
                      className="flex items-center space-x-3 p-3 rounded-xl bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm cursor-pointer hover:bg-white dark:hover:bg-slate-700 transition-all hover:scale-105 border border-white/20"
                      onClick={() => setSelectedCourse(course)}
                    >
                      <img
                        src={course.thumbnail.secure_url}
                        alt={course.title}
                        className="w-12 h-12 rounded-lg object-cover border-2 border-white shadow-sm"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm line-clamp-2">{course.title}</p>
                        <div className="flex items-center space-x-2 mt-1">
                          <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                          <span className="text-xs text-slate-600 dark:text-slate-400">
                            {course.averageRating || 'New'}
                          </span>
                          <span className="text-xs text-slate-500">•</span>
                          <span className="text-xs text-slate-500">{formatDuration(course.totalDuration)}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* Trending Courses */}
            {trendingCourses.length > 0 && (
              <Card className="rounded-2xl border-0 shadow-xl bg-gradient-to-br from-rose-50 to-orange-50 dark:from-rose-900/20 dark:to-orange-900/20">
                <CardHeader>
                  <CardTitle className="flex items-center text-rose-600 dark:text-rose-400">
                    <Flame className="w-5 h-5 mr-2" />
                    Trending Now
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {trendingCourses.slice(0, 3).map((course) => (
                    <div 
                      key={course._id}
                      className="flex items-center space-x-3 p-3 rounded-xl bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm cursor-pointer hover:bg-white dark:hover:bg-slate-700 transition-all hover:scale-105 border border-white/20"
                      onClick={() => setSelectedCourse(course)}
                    >
                      <img
                        src={course.thumbnail.secure_url}
                        alt={course.title}
                        className="w-12 h-12 rounded-lg object-cover border-2 border-white shadow-sm"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm line-clamp-2">{course.title}</p>
                        <div className="flex items-center space-x-2 mt-1">
                          <Users className="w-3 h-3 text-rose-500" />
                          <span className="text-xs text-slate-600 dark:text-slate-400">
                            {course.totalStudents} enrolled
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
          </div>

          {/* Enhanced Courses Grid */}
          <div className="flex-1">
            {/* Enhanced Controls */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
              <div>
                <h2 className="text-2xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 dark:from-white dark:to-slate-300 bg-clip-text text-transparent">
                  {searchQuery ? `Search Results for "${searchQuery}"` : 'All Courses'}
                </h2>
                <p className="text-slate-600 dark:text-slate-400 flex items-center">
                  <span>{courses.length} courses found</span>
                  {streaming && (
                    <span className="flex items-center ml-2 text-rose-500">
                      <Loader2 className="w-3 h-3 animate-spin mr-1" />
                      Loading more...
                    </span>
                  )}
                </p>
              </div>
              
              <div className="flex items-center space-x-3">
                {/* View Toggle */}
                <div className="flex bg-slate-100 dark:bg-slate-800 rounded-xl p-1">
                  <Button
                    variant={viewMode === 'grid' ? 'premium' : 'ghost'}
                    size="sm"
                    onClick={() => setViewMode('grid')}
                    className="rounded-lg"
                  >
                    <Grid className="w-4 h-4" />
                  </Button>
                  <Button
                    variant={viewMode === 'list' ? 'premium' : 'ghost'}
                    size="sm"
                    onClick={() => setViewMode('list')}
                    className="rounded-lg"
                  >
                    <List className="w-4 h-4" />
                  </Button>
                </div>

                {/* Refresh Button */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fetchCourses(1, false)}
                  disabled={loading}
                  className="rounded-xl"
                >
                  <RotateCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
              </div>
            </div>

            {/* Enhanced Courses Grid/List */}
            {loading && courses.length === 0 ? (
              <div className={`grid gap-6 ${
                viewMode === 'grid' 
                  ? 'grid-cols-1 md:grid-cols-2 xl:grid-cols-3' 
                  : 'grid-cols-1'
              }`}>
                {Array.from({ length: 6 }).map((_, index) => (
                  <CourseSkeleton key={index} />
                ))}
              </div>
            ) : courses.length === 0 ? (
              <div className="text-center py-12">
                <BookOpen className="w-16 h-16 text-slate-300 dark:bg-slate-600 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-slate-600 dark:text-slate-400 mb-2">
                  No courses found
                </h3>
                <p className="text-slate-500 dark:text-slate-500 mb-4">
                  Try adjusting your search or filters
                </p>
                <Button onClick={clearFilters} variant="premium" className="rounded-2xl">
                  Clear Filters
                </Button>
              </div>
            ) : (
              <>
                <div className={`grid gap-6 ${
                  viewMode === 'grid' 
                    ? 'grid-cols-1 md:grid-cols-2 xl:grid-cols-3' 
                    : 'grid-cols-1'
                }`}>
                  {courses.map((course) => {
                    const progress = userProgress[course._id]
                    const isEnrolled = isUserEnrolled(course._id)
                    const isLoading = progressLoading.has(course._id)
                    
                    return (
                      <Card 
                        key={course._id} 
                        className="rounded-2xl overflow-hidden hover:shadow-2xl transition-all duration-300 hover:scale-[1.02] group cursor-pointer border-0 bg-gradient-to-br from-white to-slate-50 dark:from-slate-800 dark:to-slate-900 shadow-lg"
                        onClick={() => setSelectedCourse(course)}
                      >
                        {/* Enhanced Course Thumbnail */}
                        <div className="h-48 relative bg-slate-200 dark:bg-slate-700 overflow-hidden">
                          <img
                            src={course.thumbnail.secure_url}
                            alt={course.title}
                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                          
                          {/* Enhanced Badges */}
                          <div className="absolute top-3 left-3 flex flex-wrap gap-2">
                            {course.isFeatured && (
                              <Badge variant="premium" className="rounded-lg backdrop-blur-sm border-0">
                                <Crown className="w-3 h-3 mr-1" />
                                Featured
                              </Badge>
                            )}
                            {course.isFree && (
                              <Badge variant="success" className="rounded-lg backdrop-blur-sm border-0">
                                Free
                              </Badge>
                            )}
                            {course.aiFeatures && (
                              <Badge variant="secondary" className="rounded-lg bg-blue-500 text-white backdrop-blur-sm border-0">
                                <Sparkles className="w-3 h-3 mr-1" />
                                AI Powered
                              </Badge>
                            )}
                            {isEnrolled && !isLoading && (
                              <Badge variant={progress?.completed ? "success" : "default"} className="rounded-lg backdrop-blur-sm border-0">
                                {progress?.completed ? 'Completed' : progress?.progress && progress.progress > 0 ? 'In Progress' : 'Enrolled'}
                              </Badge>
                            )}
                          </div>

                          {/* Enhanced Quick Actions */}
                          <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-y-2 group-hover:translate-y-0">
                            <div className="flex space-x-1">
                              <Button 
                                variant="secondary" 
                                size="icon" 
                                className="rounded-lg bg-white/90 backdrop-blur-sm hover:bg-white border-0 shadow-lg"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  toggleFavorite(course._id)
                                }}
                              >
                                <Heart className={`w-4 h-4 ${
                                  favoriteCourses.has(course._id) 
                                    ? 'fill-rose-500 text-rose-500' 
                                    : ''
                                }`} />
                              </Button>
                              <Button 
                                variant="secondary" 
                                size="icon" 
                                className="rounded-lg bg-white/90 backdrop-blur-sm hover:bg-white border-0 shadow-lg"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  shareCourse(course)
                                }}
                              >
                                <Share2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>

                          {/* Play Button */}
                          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300">
                            <div className="bg-white/20 backdrop-blur-sm rounded-full p-4 transform scale-75 group-hover:scale-100 transition-transform">
                              <PlayCircle className="w-8 h-8 text-white" />
                            </div>
                          </div>

                          {/* Level Indicator */}
                          <div className={`absolute bottom-3 left-3 bg-gradient-to-r ${getLevelColor(course.level)} text-white px-3 py-1 rounded-full text-xs font-medium backdrop-blur-sm border-0`}>
                            {course.level}
                          </div>

                          {/* Progress Indicator */}
                          {progress?.progress && progress.progress > 0 && !progress.completed && (
                            <div className="absolute bottom-3 right-3 left-3 bg-black/50 backdrop-blur-sm rounded-full overflow-hidden">
                              <div 
                                className="h-2 bg-gradient-to-r from-rose-500 to-purple-500 transition-all duration-500"
                                style={{ width: `${progress.progress * 100}%` }}
                              />
                            </div>
                          )}

                          {/* AI Features Indicator */}
                          {course.aiFeatures && (
                            <div className="absolute bottom-3 right-3 flex space-x-1">
                              {Object.entries(course.aiFeatures).slice(0, 2).map(([key, value]) => 
                                value && (
                                  <div key={key} className="bg-black/50 backdrop-blur-sm rounded-full p-1">
                                    {getAIFeatureIcon(key)}
                                  </div>
                                )
                              )}
                            </div>
                          )}
                        </div>
                        
                        <CardHeader className="pb-3">
                          <div className="flex items-start justify-between mb-2">
                            <CardTitle className="text-xl line-clamp-2 group-hover:text-rose-600 transition-colors pr-4">
                              {course.title}
                            </CardTitle>
                            <span className="text-2xl font-bold text-rose-600 flex-shrink-0">
                              {course.isFree ? 'Free' : `$${course.price}`}
                            </span>
                          </div>
                          <CardDescription className="line-clamp-2 text-slate-600 dark:text-slate-400">
                            {course.shortDescription}
                          </CardDescription>
                        </CardHeader>
                        
                        <CardContent className="pb-6">
                          {/* Instructor */}
                          <div className="flex items-center space-x-2 mb-3">
                            <img
                              src={course.instructor.avatar || '/default-avatar.png'}
                              alt={course.instructor.username}
                              className="w-6 h-6 rounded-full border-2 border-slate-200 dark:border-slate-600"
                            />
                            <span className="text-sm text-slate-600 dark:text-slate-400">
                              {course.instructor.firstName} {course.instructor.lastName}
                            </span>
                          </div>

                          {/* Enhanced Stats */}
                          <div className="flex items-center justify-between text-sm text-muted-foreground mb-4">
                            <div className="flex items-center space-x-1">
                              <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                              <span>{course.averageRating > 0 ? course.averageRating.toFixed(1) : 'New'}</span>
                              <span className="text-slate-400">({course.totalReviews || 0})</span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <Users className="w-4 h-4 text-slate-400" />
                              <span>{course.totalStudents}</span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <Clock className="w-4 h-4 text-slate-400" />
                              <span>{formatDuration(course.totalDuration)}</span>
                            </div>
                          </div>
                          
                          {/* Enrollment Button with Status */}
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                              <span className="text-xs text-slate-500">{course.totalLessons} lessons</span>
                              {progress?.progress && progress.progress > 0 && (
                                <div className="flex items-center space-x-1">
                                  <TrendingUp className="w-3 h-3 text-green-500" />
                                  <span className="text-xs text-green-600">{Math.round(progress.progress * 100)}%</span>
                                </div>
                              )}
                            </div>
                            {getEnrollmentButton(course)}
                          </div>
                        </CardContent>
                      </Card>
                    )
                  })}
                </div>

                {/* Enhanced Load More */}
                {!loading && (
                  <div ref={observerTarget} className="flex justify-center mt-8">
                    {streaming ? (
                      <div className="flex items-center space-x-2 text-slate-500 bg-slate-100 dark:bg-slate-800 rounded-2xl px-6 py-3">
                        <Loader2 className="w-4 h-4 animate-spin text-rose-500" />
                        <span>Loading more courses...</span>
                      </div>
                    ) : (
                      <Button 
                        onClick={loadMoreCourses}
                        variant="outline"
                        className="rounded-2xl border-2 hover:border-rose-500 hover:bg-rose-50 hover:text-rose-600 transition-all"
                      >
                        <DownloadCloud className="w-4 h-4 mr-2" />
                        Load More Courses
                      </Button>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Quick View Modal */}
      {selectedCourse && (
        <QuickViewModal 
          course={selectedCourse} 
          onClose={() => setSelectedCourse(null)} 
        />
      )}
    </div>
  )
}