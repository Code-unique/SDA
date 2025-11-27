// app/courses/page.tsx
'use client'

import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
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
  Play,
  Palette,
  Code,
  Music,
  Camera,
  Target as TargetIcon,
  Gauge,
  BatteryCharging,
  Zap as Lightning,
  Calendar,
  ThumbsUp,
  Medal,
  Clock4,
  ShieldCheck,
  X,
  SlidersHorizontal
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
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false)
  const observerTarget = useRef<HTMLDivElement>(null)
  const streamController = useRef<AbortController | null>(null)
  const filtersRef = useRef<HTMLDivElement>(null)

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

  // Enhanced filter options with icons
  const filterOptions = {
    categories: [
      { name: 'Fashion Design', icon: Palette },
      { name: 'Pattern Making', icon: TargetIcon },
      { name: 'Sewing', icon: Medal },
      { name: 'Textiles', icon: Gauge },
      { name: 'Fashion Business', icon: TrendingUp },
      { name: 'Sustainability', icon: Globe },
      { name: 'Digital Fashion', icon: Code },
      { name: '3D Design', icon: Camera },
      { name: 'Fashion Marketing', icon: Zap }
    ],
    levels: [
      { name: 'beginner', icon: Rocket, color: 'from-green-500 to-emerald-500' },
      { name: 'intermediate', icon: Target, color: 'from-yellow-500 to-orange-500' },
      { name: 'advanced', icon: Lightning, color: 'from-red-500 to-pink-500' }
    ],
    durations: ['0-2 hours', '2-5 hours', '5-10 hours', '10-20 hours', '20+ hours'],
    features: [
      { name: 'AI Assistant', icon: Brain },
      { name: 'Personalized Learning', icon: Target },
      { name: 'Certification', icon: Award },
      { name: 'Live Sessions', icon: Video },
      { name: 'Community Access', icon: Users },
      { name: 'Lifetime Access', icon: Clock4 },
      { name: 'Project Based', icon: Palette },
      { name: 'Mentor Support', icon: ShieldCheck }
    ]
  }

  // Close mobile filters when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (filtersRef.current && !filtersRef.current.contains(event.target as Node)) {
        setMobileFiltersOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Memoized filtered courses for better performance
  const filteredCourses = useMemo(() => {
    return courses.filter(course => {
      // Search filter
      if (searchQuery && !course.title.toLowerCase().includes(searchQuery.toLowerCase()) &&
          !course.shortDescription.toLowerCase().includes(searchQuery.toLowerCase()) &&
          !course.instructor.firstName.toLowerCase().includes(searchQuery.toLowerCase()) &&
          !course.instructor.lastName.toLowerCase().includes(searchQuery.toLowerCase())) {
        return false
      }

      // Category filter
      if (filters.category.length > 0 && !filters.category.includes(course.category)) {
        return false
      }

      // Level filter
      if (filters.level.length > 0 && !filters.level.includes(course.level)) {
        return false
      }

      // Price filter
      if (filters.price === 'free' && !course.isFree) return false
      if (filters.price === 'paid' && course.isFree) return false

      // Rating filter
      if (filters.rating > 0 && course.averageRating < filters.rating) {
        return false
      }

      // Features filter
      if (filters.features.length > 0) {
        const hasFeature = filters.features.some(feature => {
          switch (feature) {
            case 'AI Assistant':
              return course.aiFeatures?.hasAIAssistant
            case 'Personalized Learning':
              return course.aiFeatures?.hasPersonalizedLearning
            case 'Certification':
              return true // Assuming all courses have certification
            case 'Live Sessions':
              return false // You might want to add this field to your Course interface
            default:
              return false
          }
        })
        if (!hasFeature) return false
      }

      return true
    })
  }, [courses, searchQuery, filters])

  // Apply sorting to filtered courses
  const sortedCourses = useMemo(() => {
    const sorted = [...filteredCourses]
    
    switch (filters.sort) {
      case 'popular':
        return sorted.sort((a, b) => b.totalStudents - a.totalStudents)
      case 'trending':
        return sorted.sort((a, b) => (b.enrollmentCount || 0) - (a.enrollmentCount || 0))
      case 'newest':
        return sorted.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      case 'rating':
        return sorted.sort((a, b) => b.averageRating - a.averageRating)
      case 'duration':
        return sorted.sort((a, b) => b.totalDuration - a.totalDuration)
      case 'price-low':
        return sorted.sort((a, b) => (a.isFree ? 0 : a.price) - (b.isFree ? 0 : b.price))
      case 'price-high':
        return sorted.sort((a, b) => (b.isFree ? 0 : b.price) - (a.isFree ? 0 : a.price))
      default:
        return sorted
    }
  }, [filteredCourses, filters.sort])

  // Active filters count for badge
  const activeFiltersCount = useMemo(() => {
    return (
      (filters.category.length) +
      (filters.level.length) +
      (filters.price !== 'all' ? 1 : 0) +
      (filters.duration.length) +
      (filters.features.length) +
      (filters.rating > 0 ? 1 : 0)
    )
  }, [filters])

  // Fetch progress for a specific course
  const fetchCourseProgress = async (courseId: string) => {
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
            enrolled: true
          }
        }))
      } else if (response.status === 403) {
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

  // Batch fetch progress for courses
  const fetchAllCoursesProgress = async (courseIds: string[]) => {
    // Use Promise.all for parallel fetching with limited concurrency
    const batchSize = 5
    for (let i = 0; i < courseIds.length; i += batchSize) {
      const batch = courseIds.slice(i, i + batchSize)
      await Promise.all(batch.map(courseId => fetchCourseProgress(courseId)))
    }
  }

  // Enhanced quick enroll function
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
        setCourses(prev => prev.map(course => 
          course._id === courseId 
            ? { 
                ...course, 
                totalStudents: result.course?.totalStudents || course.totalStudents + 1,
                instructor: result.course?.instructor || course.instructor
              }
            : course
        ))
        
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
        
        toast({
          title: result.alreadyEnrolled ? 'Already Enrolled!' : 'Successfully Enrolled!',
          description: result.alreadyEnrolled 
            ? 'You are already enrolled in this course' 
            : 'You can now start learning immediately',
        })

        if (courseSlug && !result.alreadyEnrolled) {
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

  // Enhanced enrollment button with better styling
  const getEnrollmentButton = (course: Course) => {
    const progress = userProgress[course._id]
    const isEnrolled = isUserEnrolled(course._id)
    const isLoading = progressLoading.has(course._id)
    
    if (isLoading) {
      return (
        <Button 
          variant="outline"
          size="sm" 
          className="rounded-xl border-slate-200 dark:border-slate-700"
          disabled
        >
          <Loader2 className="w-3 h-3 animate-spin mr-1" />
          Loading...
        </Button>
      )
    }

    if (!isEnrolled) {
      return (
        <Button 
          variant="default"
          size="sm" 
          className="rounded-xl bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-700 hover:to-pink-700 shadow-lg shadow-rose-500/25 transition-all duration-200 transform hover:scale-105"
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
      return (
        <div className="flex flex-col space-y-2">
          <div className="flex items-center space-x-1 text-xs text-green-600 bg-green-50 dark:bg-green-900/20 px-2 py-1 rounded-full">
            <CheckCircle className="w-3 h-3" />
            <span>Completed</span>
          </div>
          <Button 
            variant="outline"
            size="sm" 
            className="rounded-xl border-green-200 text-green-700 hover:bg-green-50 dark:hover:bg-green-900/20 transition-all duration-200"
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
      return (
        <div className="flex flex-col space-y-2 w-full">
          <div className="flex justify-between items-center text-xs">
            <span className="text-slate-600 dark:text-slate-400">{Math.round(progress.progress * 100)}% complete</span>
            <span className="text-rose-600 font-medium bg-rose-50 dark:bg-rose-900/20 px-2 py-1 rounded-full">In Progress</span>
          </div>
          <div className="relative">
            <Progress value={progress.progress * 100} className="h-2 bg-slate-200 dark:bg-slate-700" />
            <div className="absolute inset-0 bg-gradient-to-r from-rose-600 to-pink-600 rounded-full opacity-20"></div>
          </div>
          <Button 
            variant="default"
            size="sm" 
            className="rounded-xl bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-700 hover:to-pink-700 shadow-lg shadow-rose-500/25 transition-all duration-200 transform hover:scale-105"
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

    return (
      <Button 
        variant="default"
        size="sm" 
        className="rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 shadow-lg shadow-blue-500/25 transition-all duration-200 transform hover:scale-105"
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

  // Enhanced favorite toggle with animation
  const toggleFavorite = (courseId: string) => {
    setFavoriteCourses(prev => {
      const newFavorites = new Set(prev)
      if (newFavorites.has(courseId)) {
        newFavorites.delete(courseId)
        toast({
          title: 'Removed from favorites',
          description: 'Course removed from your favorites',
        })
      } else {
        newFavorites.add(courseId)
        toast({
          title: 'Added to favorites',
          description: 'Course added to your favorites',
        })
      }
      return newFavorites
    })
  }

  // Enhanced share course
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
      navigator.clipboard.writeText(`${window.location.origin}/courses/${course.slug}`)
      toast({
        title: 'Link copied to clipboard!',
        description: 'Share this course with your friends',
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
        setUserProgress({})
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

  // Enhanced Course Skeleton with better design
  const CourseSkeleton = () => (
    <Card className="rounded-2xl overflow-hidden animate-pulse border-0 bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-900 shadow-lg">
      <div className="h-48 bg-gradient-to-br from-slate-200 to-slate-300 dark:from-slate-700 dark:to-slate-600 relative">
        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent"></div>
      </div>
      <CardHeader className="pb-3">
        <div className="h-6 bg-slate-200 dark:bg-slate-700 rounded-lg mb-3 w-4/5"></div>
        <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-3/4"></div>
      </CardHeader>
      <CardContent className="pb-6">
        <div className="flex justify-between mb-4">
          <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-16"></div>
          <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-20"></div>
          <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-12"></div>
        </div>
        <div className="flex justify-between items-center">
          <div className="h-6 bg-slate-200 dark:bg-slate-700 rounded w-20"></div>
          <div className="h-8 bg-slate-200 dark:bg-slate-700 rounded-xl w-24"></div>
        </div>
      </CardContent>
    </Card>
  )

  // Enhanced Quick View Modal
  const QuickViewModal = ({ course, onClose }: { course: Course, onClose: () => void }) => {
    const progress = userProgress[course._id]
    const isEnrolled = isUserEnrolled(course._id)
    const isLoading = progressLoading.has(course._id)
    
    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div className="bg-white dark:bg-slate-800 rounded-3xl max-w-4xl w-full max-h-[90vh] overflow-y-auto border border-slate-200/50 dark:border-slate-700/50 shadow-2xl">
          <div className="relative">
            <img
              src={course.thumbnail.url}
              alt={course.title}
              className="w-full h-64 object-cover rounded-t-3xl"
            />
            <button
              onClick={onClose}
              className="absolute top-4 right-4 bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm rounded-full p-2 hover:bg-white dark:hover:bg-slate-700 transition-all duration-200 shadow-lg hover:shadow-xl"
            >
              <X className="w-5 h-5" />
            </button>
            
            {/* Enhanced Badges */}
            <div className="absolute top-4 left-4 flex flex-wrap gap-2">
              {course.isFeatured && (
                <Badge className="rounded-full bg-gradient-to-r from-amber-500 to-orange-500 text-white backdrop-blur-sm border-0 shadow-lg">
                  <Crown className="w-3 h-3 mr-1" />
                  Featured
                </Badge>
              )}
              {course.isFree && (
                <Badge className="rounded-full bg-gradient-to-r from-green-500 to-emerald-500 text-white backdrop-blur-sm border-0 shadow-lg">
                  Free
                </Badge>
              )}
              {course.aiFeatures && (
                <Badge className="rounded-full bg-gradient-to-r from-blue-500 to-cyan-500 text-white backdrop-blur-sm border-0 shadow-lg">
                  <Sparkles className="w-3 h-3 mr-1" />
                  AI Enhanced
                </Badge>
              )}
              {isEnrolled && !isLoading && (
                <Badge className={`rounded-full backdrop-blur-sm border-0 shadow-lg ${
                  progress?.completed 
                    ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-white'
                    : 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white'
                }`}>
                  {progress?.completed ? 'Completed' : 'Enrolled'}
                </Badge>
              )}
            </div>
          </div>
          
          <div className="p-8">
            <div className="flex items-start justify-between mb-6">
              <div className="flex-1">
                <h2 className="text-3xl font-bold mb-3 bg-gradient-to-r from-slate-900 to-slate-700 dark:from-white dark:to-slate-300 bg-clip-text text-transparent">
                  {course.title}
                </h2>
                <p className="text-slate-600 dark:text-slate-400 text-lg leading-relaxed">{course.shortDescription}</p>
              </div>
              <span className="text-4xl font-bold bg-gradient-to-r from-rose-600 to-pink-600 bg-clip-text text-transparent ml-6">
                {course.isFree ? 'Free' : `$${course.price}`}
              </span>
            </div>

            {/* Enhanced Enrollment Status */}
            {isEnrolled && !isLoading && (
              <div className="mb-6 p-6 bg-gradient-to-r from-slate-50 to-blue-50/30 dark:from-slate-800/50 dark:to-blue-900/20 rounded-2xl border border-slate-200/50 dark:border-slate-700/50">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-semibold flex items-center text-lg">
                      {progress?.completed ? (
                        <>
                          <CheckCircle className="w-6 h-6 text-green-500 mr-3" />
                          <span className="bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                            Course Completed
                          </span>
                        </>
                      ) : progress?.progress && progress.progress > 0 ? (
                        <>
                          <TrendingUp className="w-6 h-6 text-blue-500 mr-3" />
                          <span className="bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
                            In Progress - {Math.round(progress.progress * 100)}% Complete
                          </span>
                        </>
                      ) : (
                        <>
                          <BookCheck className="w-6 h-6 text-blue-500 mr-3" />
                          <span className="bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
                            Enrolled - Ready to Start
                          </span>
                        </>
                      )}
                    </h4>
                    {progress?.lastAccessed && (
                      <p className="text-sm text-slate-600 dark:text-slate-400 mt-2">
                        Last accessed: {new Date(progress.lastAccessed).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                  {progress?.progress && progress.progress > 0 && !progress.completed && (
                    <div className="w-40">
                      <div className="relative">
                        <Progress value={progress.progress * 100} className="h-3 bg-slate-200 dark:bg-slate-700" />
                        <div className="absolute inset-0 bg-gradient-to-r from-rose-600 to-pink-600 rounded-full opacity-20"></div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Enhanced Instructor Info */}
            <div className="flex items-center space-x-4 mb-6 p-5 bg-gradient-to-r from-slate-50 to-rose-50/30 dark:from-slate-800/50 dark:to-rose-900/20 rounded-2xl border border-slate-200/50 dark:border-slate-700/50">
              <img
                src={course.instructor.avatar || '/default-avatar.png'}
                alt={course.instructor.username}
                className="w-14 h-14 rounded-2xl border-4 border-white dark:border-slate-700 shadow-lg"
                onError={(e) => {
                  const target = e.target as HTMLImageElement
                  target.src = '/default-avatar.png'
                }}
              />
              <div>
                <p className="font-bold text-lg">
                  {course.instructor.firstName} {course.instructor.lastName}
                </p>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Expert Instructor • {course.instructor.totalStudents || 0}+ students
                </p>
              </div>
            </div>

            {/* Enhanced Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              {[
                { icon: Clock, value: formatDuration(course.totalDuration), label: 'Duration' },
                { icon: BookOpen, value: course.totalLessons, label: 'Lessons' },
                { icon: Users, value: course.totalStudents, label: 'Students' },
                { icon: Star, value: course.averageRating || 'New', label: 'Rating' }
              ].map((stat, index) => (
                <div key={index} className="text-center p-4 bg-gradient-to-br from-slate-50 to-blue-50/30 dark:from-slate-800/50 dark:to-blue-900/20 rounded-2xl border border-slate-200/50 dark:border-slate-700/50 group hover:shadow-lg transition-all duration-200">
                  <stat.icon className="w-8 h-8 text-rose-500 mx-auto mb-3 group-hover:scale-110 transition-transform" />
                  <div className="text-lg font-bold text-slate-900 dark:text-slate-100">{stat.value}</div>
                  <div className="text-sm text-slate-500">{stat.label}</div>
                </div>
              ))}
            </div>

            {/* Enhanced AI Features */}
            {course.aiFeatures && (
              <div className="mb-8 p-6 bg-gradient-to-br from-blue-50 to-cyan-50/30 dark:from-blue-900/20 dark:to-cyan-900/10 rounded-2xl border border-blue-200/50 dark:border-blue-800/50">
                <h4 className="font-semibold mb-4 flex items-center text-xl">
                  <Sparkles className="w-5 h-5 mr-3 text-blue-500" />
                  <span className="bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
                    AI Enhanced Features
                  </span>
                </h4>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  {Object.entries(course.aiFeatures).map(([key, value]) => 
                    value && (
                      <div key={key} className="flex items-center space-x-3 p-2 rounded-xl bg-white/50 dark:bg-slate-800/50">
                        <div className="w-3 h-3 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full"></div>
                        <span className="text-slate-700 dark:text-slate-300 capitalize">
                          {key.replace('has', '').replace(/([A-Z])/g, ' $1').trim()}
                        </span>
                      </div>
                    )
                  )}
                </div>
              </div>
            )}

            {/* Enhanced Action Buttons */}
            <div className="flex gap-4">
              {isLoading ? (
                <Button 
                  variant="outline" 
                  className="rounded-2xl border-slate-200 dark:border-slate-700"
                  size="lg"
                  disabled
                >
                  <Loader2 className="w-5 h-5 animate-spin mr-2" />
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
                      className="rounded-2xl border-slate-200 dark:border-slate-700 hover:border-rose-300 dark:hover:border-rose-700"
                      size="lg"
                    >
                      <BookOpen className="w-5 h-5 mr-2" />
                      View Course
                    </Button>
                    <Button 
                      onClick={() => {
                        onClose()
                        viewCourseDetails(course)
                      }}
                      variant="default" 
                      className="rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 shadow-lg shadow-amber-500/25"
                      size="lg"
                    >
                      <Award className="w-5 h-5 mr-2" />
                      View Certificate
                    </Button>
                  </>
                ) : (
                  <Button 
                    onClick={() => {
                      onClose()
                      continueLearning(course)
                    }}
                    variant="default" 
                    className="rounded-2xl bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-700 hover:to-pink-700 shadow-lg shadow-rose-500/25 transition-all duration-200 transform hover:scale-105"
                    size="lg"
                  >
                    <Play className="w-5 h-5 mr-2" />
                    {progress?.progress && progress.progress > 0 ? 'Continue Learning' : 'Start Learning'}
                  </Button>
                )
              ) : (
                <>
                  <Button 
                    variant="default"
                    size="lg" 
                    className="rounded-2xl bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-700 hover:to-pink-700 shadow-lg shadow-rose-500/25 transition-all duration-200 transform hover:scale-105"
                    onClick={() => quickEnroll(course._id, course.slug)}
                    disabled={isEnrolling === course._id}
                  >
                    {isEnrolling === course._id ? (
                      <Loader2 className="w-5 h-5 animate-spin mr-2" />
                    ) : (
                      <BookCheck className="w-5 h-5 mr-2" />
                    )}
                    {isEnrolling === course._id ? 'Enrolling...' : 'Enroll Now'}
                  </Button>
                  <Button 
                    onClick={() => {
                      onClose()
                      viewCourseDetails(course)
                    }}
                    variant="outline" 
                    className="rounded-2xl border-slate-200 dark:border-slate-700 hover:border-rose-300 dark:hover:border-rose-700"
                    size="lg"
                  >
                    <ArrowRight className="w-5 h-5 mr-2" />
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

  // Enhanced Filters Sidebar Component
  const FiltersSidebar = () => (
    <Card className="rounded-3xl border border-slate-200/50 dark:border-slate-700/50 shadow-2xl bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl lg:sticky lg:top-24">
      <CardHeader className="pb-6">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center text-xl">
            <Filter className="w-6 h-6 mr-3 text-rose-500" />
            Filters
            {activeFiltersCount > 0 && (
              <Badge className="ml-2 bg-rose-500 text-white rounded-full px-2 py-1 text-xs">
                {activeFiltersCount}
              </Badge>
            )}
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={clearFilters}
              className="rounded-2xl hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-900/20 transition-all duration-200"
            >
              Clear All
            </Button>
            {/* Mobile close button */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setMobileFiltersOpen(false)}
              className="rounded-2xl lg:hidden"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-8 max-h-[calc(100vh-200px)] overflow-y-auto custom-scrollbar">
        {/* Sort Filter */}
        <div>
          <h4 className="font-medium mb-4 flex items-center text-slate-700 dark:text-slate-300">
            <TrendingUp className="w-5 h-5 mr-3 text-slate-400" />
            Sort By
          </h4>
          <select
            value={filters.sort}
            onChange={(e) => setFilters(prev => ({ ...prev, sort: e.target.value as any }))}
            className="w-full rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-3 text-base focus:ring-2 focus:ring-rose-500 focus:border-transparent transition-all duration-200"
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
          <h4 className="font-medium mb-4 flex items-center text-slate-700 dark:text-slate-300">
            <Award className="w-5 h-5 mr-3 text-slate-400" />
            Price
          </h4>
          <div className="space-y-3">
            {[
              { value: 'all', label: 'All Courses' },
              { value: 'free', label: 'Free Only' },
              { value: 'paid', label: 'Paid Only' }
            ].map((price) => (
              <label key={price.value} className="flex items-center space-x-4 cursor-pointer group p-2 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-all duration-200">
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                  filters.price === price.value 
                    ? 'border-rose-500 bg-rose-500 shadow-lg shadow-rose-500/25' 
                    : 'border-slate-300 group-hover:border-rose-300 dark:border-slate-600'
                }`}>
                  {filters.price === price.value && (
                    <div className="w-2 h-2 bg-white rounded-full"></div>
                  )}
                </div>
                <span className="group-hover:text-rose-600 transition-colors font-medium">{price.label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Level Filter */}
        <div>
          <h4 className="font-medium mb-4 flex items-center text-slate-700 dark:text-slate-300">
            <Target className="w-5 h-5 mr-3 text-slate-400" />
            Level
          </h4>
          <div className="space-y-3">
            {filterOptions.levels.map((level) => (
              <label key={level.name} className="flex items-center space-x-4 cursor-pointer group p-2 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-all duration-200">
                <input
                  type="checkbox"
                  checked={filters.level.includes(level.name)}
                  onChange={() => toggleFilter('level', level.name)}
                  className="w-5 h-5 text-rose-500 rounded focus:ring-rose-500 transition-all duration-200"
                />
                <div className={`px-3 py-1 rounded-full text-xs font-medium bg-gradient-to-r ${level.color} text-white`}>
                  {level.name}
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* Category Filter */}
        <div>
          <h4 className="font-medium mb-4 flex items-center text-slate-700 dark:text-slate-300">
            <BookOpen className="w-5 h-5 mr-3 text-slate-400" />
            Category
          </h4>
          <div className="space-y-3">
            {filterOptions.categories.map((category) => (
              <label key={category.name} className="flex items-center space-x-4 cursor-pointer group p-2 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-all duration-200">
                <input
                  type="checkbox"
                  checked={filters.category.includes(category.name)}
                  onChange={() => toggleFilter('category', category.name)}
                  className="w-5 h-5 text-rose-500 rounded focus:ring-rose-500 transition-all duration-200"
                />
                <div className="flex items-center space-x-2">
                  <category.icon className="w-4 h-4 text-slate-400 group-hover:text-rose-500 transition-colors" />
                  <span className="group-hover:text-rose-600 transition-colors font-medium">{category.name}</span>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* Features Filter */}
        <div>
          <h4 className="font-medium mb-4 flex items-center text-slate-700 dark:text-slate-300">
            <Sparkles className="w-5 h-5 mr-3 text-slate-400" />
            Features
          </h4>
          <div className="space-y-3">
            {filterOptions.features.map((feature) => (
              <label key={feature.name} className="flex items-center space-x-4 cursor-pointer group p-2 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-all duration-200">
                <input
                  type="checkbox"
                  checked={filters.features.includes(feature.name)}
                  onChange={() => toggleFilter('features', feature.name)}
                  className="w-5 h-5 text-rose-500 rounded focus:ring-rose-500 transition-all duration-200"
                />
                <div className="flex items-center space-x-2">
                  <feature.icon className="w-4 h-4 text-slate-400 group-hover:text-rose-500 transition-colors" />
                  <span className="group-hover:text-rose-600 transition-colors font-medium">{feature.name}</span>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* Rating Filter */}
        <div>
          <h4 className="font-medium mb-4 flex items-center text-slate-700 dark:text-slate-300">
            <Star className="w-5 h-5 mr-3 text-slate-400" />
            Minimum Rating
          </h4>
          <div className="flex flex-wrap gap-2">
            {[4, 3, 2, 1, 0].map((rating) => (
              <button
                key={rating}
                onClick={() => setFilters(prev => ({ ...prev, rating }))}
                className={`flex items-center space-x-2 px-4 py-3 rounded-2xl transition-all duration-200 ${
                  filters.rating === rating 
                    ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-lg shadow-amber-500/25' 
                    : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-900/20'
                }`}
              >
                <Star className={`w-5 h-5 ${filters.rating === rating ? 'fill-white' : 'fill-yellow-400 text-yellow-400'}`} />
                <span className="font-medium">{rating === 0 ? 'All' : `${rating}+`}</span>
              </button>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  )

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-rose-50/30 dark:from-slate-900 dark:via-blue-900/10 dark:to-rose-900/10">
      {/* Enhanced Header with Animated Gradient */}
      <div className="bg-gradient-to-br from-rose-500 via-purple-600 to-blue-600 text-white relative overflow-hidden">
        {/* Animated Background Elements */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-10 left-10 w-20 h-20 bg-white rounded-full blur-xl animate-pulse"></div>
          <div className="absolute top-40 right-20 w-32 h-32 bg-purple-300 rounded-full blur-2xl animate-bounce"></div>
          <div className="absolute bottom-20 left-1/3 w-24 h-24 bg-blue-300 rounded-full blur-xl animate-pulse delay-1000"></div>
        </div>
        
        <div className="container mx-auto px-6 py-20 relative">
          <div className="text-center max-w-4xl mx-auto">
            <div className="flex items-center justify-center mb-6">
              <Sparkles className="w-10 h-10 mr-4 animate-pulse text-rose-200" />
              <h1 className="text-6xl font-serif font-bold bg-gradient-to-r from-white to-rose-100 bg-clip-text text-transparent">
                Master Fashion Design
              </h1>
              <Zap className="w-10 h-10 ml-4 animate-pulse text-rose-200" />
            </div>
            <p className="text-xl opacity-90 mb-10 max-w-2xl mx-auto leading-relaxed">
              Learn from world-class instructors with AI-powered personalized learning experiences. Transform your creativity into career success.
            </p>
            
            {/* Enhanced Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
              {[
                { value: stats.totalCourses, label: 'Courses', icon: BookOpen },
                { value: stats.featuredCourses, label: 'Featured', icon: Crown },
                { value: stats.freeCourses, label: 'Free', icon: Award },
                { value: stats.totalEnrollments, label: 'Enrollments', icon: Users }
              ].map((stat, index) => (
                <div key={index} className="text-center backdrop-blur-sm bg-white/10 rounded-3xl p-6 border border-white/20 hover:bg-white/20 transition-all duration-300 hover:scale-105">
                  <stat.icon className="w-10 h-10 mx-auto mb-3 opacity-90" />
                  <div className="text-4xl font-bold">{stat.value}+</div>
                  <div className="text-rose-100 text-sm font-medium">{stat.label}</div>
                </div>
              ))}
            </div>

            {/* Enhanced Search Bar */}
            <div className="max-w-3xl mx-auto">
              <div className="relative">
                <Search className="absolute left-6 top-1/2 transform -translate-y-1/2 text-slate-300 w-6 h-6" />
                <Input
                  type="text"
                  placeholder="Search for courses, instructors, or topics..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-16 pr-40 py-6 rounded-3xl border-0 bg-white/20 backdrop-blur-sm text-white placeholder-slate-200 text-xl focus:bg-white/30 transition-all duration-300 shadow-2xl"
                />
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2 flex space-x-3">
                  <Button 
                    variant="secondary" 
                    size="lg" 
                    className="rounded-2xl bg-white/20 backdrop-blur-sm text-white hover:bg-white/30 border-0 font-semibold relative"
                    onClick={() => setMobileFiltersOpen(!mobileFiltersOpen)}
                  >
                    <SlidersHorizontal className="w-5 h-5 mr-2" />
                    Filters
                    {activeFiltersCount > 0 && (
                      <span className="absolute -top-2 -right-2 bg-rose-500 text-white rounded-full w-6 h-6 text-xs flex items-center justify-center">
                        {activeFiltersCount}
                      </span>
                    )}
                  </Button>
                  <Button 
                    variant="default" 
                    size="lg" 
                    className="rounded-2xl bg-white text-rose-600 hover:bg-rose-50 font-semibold shadow-2xl shadow-rose-500/25"
                  >
                    <Sparkles className="w-5 h-5 mr-2" />
                    AI Search
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-6 py-12">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Enhanced Filters Sidebar - Desktop */}
          <div className="hidden lg:block lg:w-80 space-y-8">
            <FiltersSidebar />
            
            {/* Enhanced AI Recommendations */}
            {recommendations.length > 0 && (
              <Card className="rounded-3xl border border-blue-200/50 dark:border-blue-800/50 shadow-2xl bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 backdrop-blur-xl">
                <CardHeader>
                  <CardTitle className="flex items-center text-blue-600 dark:text-blue-400 text-xl">
                    <Brain className="w-6 h-6 mr-3" />
                    AI Picks For You
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {recommendations.slice(0, 3).map((course) => (
                    <div 
                      key={course._id}
                      className="flex items-center space-x-4 p-4 rounded-2xl bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm cursor-pointer hover:bg-white dark:hover:bg-slate-700 transition-all duration-300 hover:scale-105 border border-white/20 shadow-lg"
                      onClick={() => setSelectedCourse(course)}
                    >
                      <img
                        src={course.thumbnail.url}
                        alt={course.title}
                        className="w-14 h-14 rounded-xl object-cover border-2 border-white shadow-md"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm line-clamp-2 text-slate-800 dark:text-slate-200">{course.title}</p>
                        <div className="flex items-center space-x-2 mt-2">
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

            {/* Enhanced Trending Courses */}
            {trendingCourses.length > 0 && (
              <Card className="rounded-3xl border border-rose-200/50 dark:border-rose-800/50 shadow-2xl bg-gradient-to-br from-rose-50 to-orange-50 dark:from-rose-900/20 dark:to-orange-900/20 backdrop-blur-xl">
                <CardHeader>
                  <CardTitle className="flex items-center text-rose-600 dark:text-rose-400 text-xl">
                    <Flame className="w-6 h-6 mr-3" />
                    Trending Now
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {trendingCourses.slice(0, 3).map((course) => (
                    <div 
                      key={course._id}
                      className="flex items-center space-x-4 p-4 rounded-2xl bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm cursor-pointer hover:bg-white dark:hover:bg-slate-700 transition-all duration-300 hover:scale-105 border border-white/20 shadow-lg"
                      onClick={() => setSelectedCourse(course)}
                    >
                      <img
                        src={course.thumbnail.url}
                        alt={course.title}
                        className="w-14 h-14 rounded-xl object-cover border-2 border-white shadow-md"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm line-clamp-2 text-slate-800 dark:text-slate-200">{course.title}</p>
                        <div className="flex items-center space-x-2 mt-2">
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

          {/* Mobile Filters Overlay */}
          {mobileFiltersOpen && (
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 lg:hidden">
              <div 
                ref={filtersRef}
                className="absolute left-0 top-0 h-full w-80 max-w-[90vw] bg-white dark:bg-slate-800 shadow-2xl overflow-y-auto"
              >
                <FiltersSidebar />
              </div>
            </div>
          )}

          {/* Enhanced Courses Grid */}
          <div className="flex-1">
            {/* Enhanced Controls */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 mb-10">
              <div>
                <h2 className="text-4xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 dark:from-white dark:to-slate-300 bg-clip-text text-transparent mb-2">
                  {searchQuery ? `Search Results for "${searchQuery}"` : 'All Courses'}
                </h2>
                <p className="text-slate-600 dark:text-slate-400 flex items-center text-lg">
                  <span>{sortedCourses.length} courses found</span>
                  {streaming && (
                    <span className="flex items-center ml-3 text-rose-500 bg-rose-50 dark:bg-rose-900/20 px-3 py-1 rounded-full">
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      Loading more...
                    </span>
                  )}
                </p>
              </div>
              
              <div className="flex items-center space-x-4">
                {/* View Toggle */}
                <div className="flex bg-slate-100 dark:bg-slate-800 rounded-2xl p-1 border border-slate-200 dark:border-slate-700">
                  <Button
                    variant={viewMode === 'grid' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setViewMode('grid')}
                    className="rounded-xl"
                  >
                    <Grid className="w-5 h-5" />
                  </Button>
                  <Button
                    variant={viewMode === 'list' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setViewMode('list')}
                    className="rounded-xl"
                  >
                    <List className="w-5 h-5" />
                  </Button>
                </div>

                {/* Mobile Filters Button */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setMobileFiltersOpen(true)}
                  className="rounded-2xl border-slate-200 dark:border-slate-700 hover:border-rose-300 dark:hover:border-rose-700 lg:hidden relative"
                >
                  <Filter className="w-4 h-4 mr-2" />
                  Filters
                  {activeFiltersCount > 0 && (
                    <span className="absolute -top-2 -right-2 bg-rose-500 text-white rounded-full w-5 h-5 text-xs flex items-center justify-center">
                      {activeFiltersCount}
                    </span>
                  )}
                </Button>

                {/* Refresh Button */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fetchCourses(1, false)}
                  disabled={loading}
                  className="rounded-2xl border-slate-200 dark:border-slate-700 hover:border-rose-300 dark:hover:border-rose-700"
                >
                  <RotateCw className={`w-5 h-5 mr-2 ${loading ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
              </div>
            </div>

            {/* Active Filters Display */}
            {activeFiltersCount > 0 && (
              <div className="flex flex-wrap gap-2 mb-6">
                {filters.category.map(category => (
                  <Badge key={category} variant="secondary" className="rounded-full">
                    {category}
                    <button 
                      onClick={() => toggleFilter('category', category)}
                      className="ml-1 hover:text-rose-500"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                ))}
                {filters.level.map(level => (
                  <Badge key={level} variant="secondary" className="rounded-full">
                    {level}
                    <button 
                      onClick={() => toggleFilter('level', level)}
                      className="ml-1 hover:text-rose-500"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                ))}
                {filters.features.map(feature => (
                  <Badge key={feature} variant="secondary" className="rounded-full">
                    {feature}
                    <button 
                      onClick={() => toggleFilter('features', feature)}
                      className="ml-1 hover:text-rose-500"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                ))}
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={clearFilters}
                  className="rounded-full text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                >
                  Clear All
                </Button>
              </div>
            )}

            {/* Enhanced Courses Grid/List */}
            {loading && courses.length === 0 ? (
              <div className={`grid gap-8 ${
                viewMode === 'grid' 
                  ? 'grid-cols-1 md:grid-cols-2 xl:grid-cols-3' 
                  : 'grid-cols-1'
              }`}>
                {Array.from({ length: 6 }).map((_, index) => (
                  <CourseSkeleton key={index} />
                ))}
              </div>
            ) : sortedCourses.length === 0 ? (
              <div className="text-center py-20">
                <div className="relative inline-block mb-6">
                  <BookOpen className="w-24 h-24 text-slate-300 dark:text-slate-600 mx-auto" />
                  <div className="absolute inset-0 bg-gradient-to-r from-rose-600 to-pink-600 blur-xl opacity-10 rounded-full"></div>
                </div>
                <h3 className="text-2xl font-semibold text-slate-600 dark:text-slate-400 mb-4">
                  No courses found
                </h3>
                <p className="text-slate-500 dark:text-slate-500 text-lg mb-6 max-w-md mx-auto">
                  Try adjusting your search criteria or explore our featured courses below.
                </p>
                <Button onClick={clearFilters} variant="default" className="rounded-2xl bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-700 hover:to-pink-700 shadow-lg shadow-rose-500/25">
                  Clear Filters
                </Button>
              </div>
            ) : (
              <>
                <div className={`grid gap-8 ${
                  viewMode === 'grid' 
                    ? 'grid-cols-1 md:grid-cols-2 xl:grid-cols-3' 
                    : 'grid-cols-1'
                }`}>
                  {sortedCourses.map((course) => {
                    const progress = userProgress[course._id]
                    const isEnrolled = isUserEnrolled(course._id)
                    const isLoading = progressLoading.has(course._id)
                    
                    return (
                      <Card 
                        key={course._id} 
                        className="rounded-3xl overflow-hidden hover:shadow-2xl transition-all duration-500 hover:scale-[1.02] group cursor-pointer border border-slate-200/50 dark:border-slate-700/50 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm shadow-xl"
                        onClick={() => setSelectedCourse(course)}
                      >
                        {/* Enhanced Course Thumbnail */}
                        <div className="h-52 relative bg-slate-200 dark:bg-slate-700 overflow-hidden">
                          <img
                            src={course.thumbnail.url}
                            alt={course.title}
                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                          
                          {/* Enhanced Badges */}
                          <div className="absolute top-4 left-4 flex flex-wrap gap-2">
                            {course.isFeatured && (
                              <Badge className="rounded-full bg-gradient-to-r from-amber-500 to-orange-500 text-white backdrop-blur-sm border-0 shadow-lg">
                                <Crown className="w-3 h-3 mr-1" />
                                Featured
                              </Badge>
                            )}
                            {course.isFree && (
                              <Badge className="rounded-full bg-gradient-to-r from-green-500 to-emerald-500 text-white backdrop-blur-sm border-0 shadow-lg">
                                Free
                              </Badge>
                            )}
                            {course.aiFeatures && (
                              <Badge className="rounded-full bg-gradient-to-r from-blue-500 to-cyan-500 text-white backdrop-blur-sm border-0 shadow-lg">
                                <Sparkles className="w-3 h-3 mr-1" />
                                AI Powered
                              </Badge>
                            )}
                            {isEnrolled && !isLoading && (
                              <Badge className={`rounded-full backdrop-blur-sm border-0 shadow-lg ${
                                progress?.completed 
                                  ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-white'
                                  : progress?.progress && progress.progress > 0
                                  ? 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white'
                                  : 'bg-gradient-to-r from-slate-500 to-slate-600 text-white'
                              }`}>
                                {progress?.completed ? 'Completed' : progress?.progress && progress.progress > 0 ? 'In Progress' : 'Enrolled'}
                              </Badge>
                            )}
                          </div>

                          {/* Enhanced Quick Actions */}
                          <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-all duration-500 transform translate-y-2 group-hover:translate-y-0">
                            <div className="flex space-x-2">
                              <Button 
                                variant="secondary" 
                                size="icon" 
                                className="rounded-xl bg-white/90 backdrop-blur-sm hover:bg-white border-0 shadow-lg hover:shadow-xl transition-all duration-200"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  toggleFavorite(course._id)
                                }}
                              >
                                <Heart className={`w-4 h-4 transition-all duration-200 ${
                                  favoriteCourses.has(course._id) 
                                    ? 'fill-rose-500 text-rose-500 scale-110' 
                                    : 'hover:fill-rose-500 hover:text-rose-500'
                                }`} />
                              </Button>
                              <Button 
                                variant="secondary" 
                                size="icon" 
                                className="rounded-xl bg-white/90 backdrop-blur-sm hover:bg-white border-0 shadow-lg hover:shadow-xl transition-all duration-200"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  shareCourse(course)
                                }}
                              >
                                <Share2 className="w-4 h-4 hover:text-blue-500 transition-colors" />
                              </Button>
                            </div>
                          </div>

                          {/* Play Button */}
                          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-500">
                            <div className="bg-white/20 backdrop-blur-sm rounded-full p-5 transform scale-75 group-hover:scale-100 transition-transform duration-300 shadow-2xl">
                              <PlayCircle className="w-10 h-10 text-white" />
                            </div>
                          </div>

                          {/* Level Indicator */}
                          <div className={`absolute bottom-4 left-4 bg-gradient-to-r ${getLevelColor(course.level)} text-white px-4 py-2 rounded-full text-sm font-semibold backdrop-blur-sm border-0 shadow-lg`}>
                            {course.level}
                          </div>

                          {/* Progress Indicator */}
                          {progress?.progress && progress.progress > 0 && !progress.completed && (
                            <div className="absolute bottom-4 right-4 left-4 bg-black/50 backdrop-blur-sm rounded-full overflow-hidden shadow-lg">
                              <div 
                                className="h-2 bg-gradient-to-r from-rose-500 to-purple-500 transition-all duration-1000"
                                style={{ width: `${progress.progress * 100}%` }}
                              />
                            </div>
                          )}

                          {/* AI Features Indicator */}
                          {course.aiFeatures && (
                            <div className="absolute bottom-4 right-4 flex space-x-2">
                              {Object.entries(course.aiFeatures).slice(0, 2).map(([key, value]) => 
                                value && (
                                  <div key={key} className="bg-black/50 backdrop-blur-sm rounded-xl p-2 shadow-lg">
                                    {getAIFeatureIcon(key)}
                                  </div>
                                )
                              )}
                            </div>
                          )}
                        </div>
                        
                        <CardHeader className="pb-4">
                          <div className="flex items-start justify-between mb-3">
                            <CardTitle className="text-xl line-clamp-2 group-hover:text-rose-600 transition-colors duration-300 pr-4 leading-tight">
                              {course.title}
                            </CardTitle>
                            <span className="text-2xl font-bold bg-gradient-to-r from-rose-600 to-pink-600 bg-clip-text text-transparent flex-shrink-0">
                              {course.isFree ? 'Free' : `$${course.price}`}
                            </span>
                          </div>
                          <CardDescription className="line-clamp-2 text-slate-600 dark:text-slate-400 text-base leading-relaxed">
                            {course.shortDescription}
                          </CardDescription>
                        </CardHeader>
                        
                        <CardContent className="pb-6">
                          {/* Instructor */}
                          <div className="flex items-center space-x-3 mb-4">
                            <img
                              src={course.instructor.avatar || '/default-avatar.png'}
                              alt={course.instructor.username}
                              className="w-8 h-8 rounded-xl border-2 border-slate-200 dark:border-slate-600 shadow-sm"
                              onError={(e) => {
                                const target = e.target as HTMLImageElement
                                target.src = '/default-avatar.png'
                              }}
                            />
                            <span className="text-sm text-slate-600 dark:text-slate-400 font-medium">
                              {course.instructor.firstName} {course.instructor.lastName}
                            </span>
                          </div>

                          {/* Enhanced Stats */}
                          <div className="flex items-center justify-between text-sm text-muted-foreground mb-5">
                            <div className="flex items-center space-x-2">
                              <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                              <span className="font-semibold">{course.averageRating > 0 ? course.averageRating.toFixed(1) : 'New'}</span>
                              <span className="text-slate-400">({course.totalReviews || 0})</span>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Users className="w-4 h-4 text-slate-400" />
                              <span>{course.totalStudents}</span>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Clock className="w-4 h-4 text-slate-400" />
                              <span>{formatDuration(course.totalDuration)}</span>
                            </div>
                          </div>
                          
                          {/* Enrollment Button with Status */}
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                              <span className="text-sm text-slate-500 font-medium">{course.totalLessons} lessons</span>
                              {progress?.progress && progress.progress > 0 && (
                                <div className="flex items-center space-x-2 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 px-3 py-1 rounded-full">
                                  <TrendingUp className="w-3 h-3" />
                                  <span className="text-xs font-medium">{Math.round(progress.progress * 100)}%</span>
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
                  <div ref={observerTarget} className="flex justify-center mt-12">
                    {streaming ? (
                      <div className="flex items-center space-x-3 text-slate-500 bg-slate-100 dark:bg-slate-800 rounded-3xl px-8 py-4 shadow-lg">
                        <Loader2 className="w-5 h-5 animate-spin text-rose-500" />
                        <span className="font-medium">Loading more courses...</span>
                      </div>
                    ) : (
                      <Button 
                        onClick={loadMoreCourses}
                        variant="outline"
                        className="rounded-2xl border-2 border-slate-200 dark:border-slate-700 hover:border-rose-500 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-900/20 transition-all duration-300 px-8 py-6 text-lg font-semibold"
                      >
                        <DownloadCloud className="w-5 h-5 mr-3" />
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

      {/* Custom CSS for enhanced scrollbar */}
      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #e5e7eb;
          border-radius: 3px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #d1d5db;
        }
        .dark .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #4b5563;
        }
        .dark .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #6b7280;
        }
      `}</style>
    </div>
  )
}