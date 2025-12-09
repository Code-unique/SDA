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
  SlidersHorizontal,
  CreditCard,
  Smartphone
} from 'lucide-react'
import { PaymentModal } from '@/components/payment/PaymentModal'

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
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [enrollingCourse, setEnrollingCourse] = useState<Course | null>(null)
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
      { name: 'beginner', icon: Rocket, color: 'bg-green-100 text-green-800 border-green-200' },
      { name: 'intermediate', icon: Target, color: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
      { name: 'advanced', icon: Lightning, color: 'bg-red-100 text-red-800 border-red-200' }
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

  // Enhanced enrollment function with proper payment handling
const enrollInCourse = async (course: Course) => {
  if (isEnrolling) return
  
  setIsEnrolling(course._id)
  setError(null)
  
  try {
    const response = await fetch(`/api/courses/${course._id}/enroll`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      }
    })

    const result = await response.json()

    // Handle payment required - this is NOT an error, it's a normal flow
    if (response.status === 402 && result.requiresPayment) {
      // Show payment modal for paid courses
      setEnrollingCourse(course)
      setShowPaymentModal(true)
      setIsEnrolling(null)
      return // Exit early - this is not an error
    }

    // Handle other successful responses (200 status)
    if (response.ok) {
      if (result.enrolled) {
        // Handle successful enrollment for free courses
        setCourses(prev => prev.map(c => 
          c._id === course._id 
            ? { 
                ...c, 
                totalStudents: result.course?.totalStudents || c.totalStudents + 1,
                instructor: result.course?.instructor || c.instructor
              }
            : c
        ))
        
        setUserProgress(prev => ({
          ...prev,
          [course._id]: {
            _id: `temp-${course._id}`,
            courseId: course._id,
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
          title: 'Successfully Enrolled!',
          description: 'You can now start learning immediately',
        })

        if (course.slug) {
          setTimeout(() => {
            router.push(`/courses/${course.slug}`)
          }, 1500)
        }
      } 
      // Handle already enrolled case
      else if (result.alreadyEnrolled) {
        toast({
          title: 'Already Enrolled!',
          description: 'You are already enrolled in this course',
        })
        
        // Update UI to show enrolled status
        setUserProgress(prev => ({
          ...prev,
          [course._id]: {
            _id: `temp-${course._id}`,
            courseId: course._id,
            userId: 'current-user',
            enrolled: true,
            progress: result.progress?.progress || 0,
            completed: result.progress?.completed || false,
            completedLessons: result.progress?.completedLessons || [],
            lastAccessed: new Date(),
            timeSpent: result.progress?.timeSpent || 0
          }
        }))
      }
      else {
        throw new Error('Unexpected response from server')
      }
    } else {
      // Handle actual errors (not 402 payment required)
      throw new Error(result.error || `Failed to enroll (${response.status})`)
    }

  } catch (err: any) {
    console.error('Error enrolling:', err)
    
    // Only show error toast for actual errors (not payment flow)
    if (err.message && !err.message.includes('402')) {
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
    }
  } finally {
    setIsEnrolling(null)
  }
}

  // Handle payment success
  const handlePaymentSuccess = (courseId: string) => {
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
    
    setShowPaymentModal(false)
    setEnrollingCourse(null)
    
    // Refresh course data
    fetchCourses(1, false)
    
    toast({
      title: '🎉 Enrollment Successful!',
      description: 'You have been successfully enrolled in the course',
      variant: 'default',
    })
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
    const isLoading = progressLoading.has(course._id) || isEnrolling === course._id
    
    if (isLoading) {
      return (
        <div className="flex items-center justify-center px-4 py-2 rounded-lg bg-gray-100 dark:bg-gray-800">
          <Loader2 className="w-4 h-4 animate-spin text-gray-500" />
        </div>
      )
    }

    if (!isEnrolled) {
      return (
        <Button 
          size="sm" 
          className="rounded-lg bg-black hover:bg-gray-800 text-white dark:bg-white dark:text-black dark:hover:bg-gray-100 transition-all shadow-sm hover:shadow"
          onClick={(e) => {
            e.stopPropagation()
            enrollInCourse(course)
          }}
          disabled={isEnrolling === course._id}
        >
          {isEnrolling === course._id ? (
            <Loader2 className="w-4 h-4 animate-spin mr-2" />
          ) : null}
          {course.isFree ? 'Enroll Free' : `Enroll $${course.price}`}
        </Button>
      )
    }

    if (progress?.completed) {
      return (
        <div className="flex items-center space-x-2 px-4 py-2 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
          <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400" />
          <span className="text-sm font-medium text-green-700 dark:text-green-300">Completed</span>
        </div>
      )
    }

    if (progress?.progress && progress.progress > 0) {
      return (
        <div className="w-full">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-sm text-gray-600 dark:text-gray-400">{Math.round(progress.progress * 100)}%</span>
          </div>
          <div className="relative h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden mb-2">
            <div 
              className="absolute h-full bg-black dark:bg-white rounded-full transition-all duration-500"
              style={{ width: `${progress.progress * 100}%` }}
            />
          </div>
          <Button 
            size="sm" 
            className="rounded-lg bg-black hover:bg-gray-800 text-white dark:bg-white dark:text-black dark:hover:bg-gray-100 w-full transition-all shadow-sm hover:shadow"
            onClick={(e) => {
              e.stopPropagation()
              continueLearning(course)
            }}
          >
            <Play className="w-4 h-4 mr-2" />
            Continue
          </Button>
        </div>
      )
    }

    return (
      <Button 
        size="sm" 
        className="rounded-lg bg-black hover:bg-gray-800 text-white dark:bg-white dark:text-black dark:hover:bg-gray-100 transition-all shadow-sm hover:shadow w-full"
        onClick={(e) => {
          e.stopPropagation()
          continueLearning(course)
        }}
      >
        <Play className="w-4 h-4 mr-2" />
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
        return 'bg-green-100 text-green-800 border-green-200'
      case 'intermediate':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'advanced':
        return 'bg-red-100 text-red-800 border-red-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  // Course Skeleton
  const CourseSkeleton = () => (
    <Card className="rounded-xl overflow-hidden animate-pulse border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
      <div className="h-44 bg-gray-200 dark:bg-gray-800"></div>
      <CardHeader className="pb-4 px-5">
        <div className="h-5 bg-gray-200 dark:bg-gray-800 rounded mb-3 w-4/5"></div>
        <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded w-3/4"></div>
      </CardHeader>
      <CardContent className="pb-5 px-5">
        <div className="flex justify-between items-center">
          <div className="h-6 bg-gray-200 dark:bg-gray-800 rounded w-20"></div>
          <div className="h-9 bg-gray-200 dark:bg-gray-800 rounded-lg w-24"></div>
        </div>
      </CardContent>
    </Card>
  )

  // Quick View Modal
  const QuickViewModal = ({ course, onClose }: { course: Course, onClose: () => void }) => {
    const progress = userProgress[course._id]
    const isEnrolled = isUserEnrolled(course._id)
    const isLoading = progressLoading.has(course._id)
    
    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div className="bg-white dark:bg-gray-900 rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-gray-200 dark:border-gray-800 shadow-2xl">
          <div className="relative">
            <img
              src={course.thumbnail.url}
              alt={course.title}
              className="w-full h-56 object-cover rounded-t-xl"
            />
            <button
              onClick={onClose}
              className="absolute top-4 right-4 bg-white dark:bg-gray-900 rounded-lg p-2 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors shadow-lg"
            >
              <X className="w-5 h-5" />
            </button>
            
            {/* Badges */}
            <div className="absolute top-4 left-4 flex flex-wrap gap-2">
              <Badge className={`rounded-lg ${getLevelColor(course.level)} border`}>
                {course.level}
              </Badge>
              {course.isFree && (
                <Badge className="rounded-lg bg-green-500 text-white border-0">
                  Free
                </Badge>
              )}
            </div>
          </div>
          
          <div className="p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <h2 className="text-2xl font-bold mb-3">
                  {course.title}
                </h2>
                <p className="text-gray-600 dark:text-gray-400">{course.shortDescription}</p>
              </div>
              <span className="text-2xl font-bold text-black dark:text-white ml-4">
                {course.isFree ? 'Free' : `$${course.price}`}
              </span>
            </div>

            {/* Instructor Info */}
            <div className="flex items-center space-x-3 mb-6 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
              <img
                src={course.instructor.avatar || '/default-avatar.png'}
                alt={course.instructor.username}
                className="w-10 h-10 rounded-lg"
                onError={(e) => {
                  const target = e.target as HTMLImageElement
                  target.src = '/default-avatar.png'
                }}
              />
              <div>
                <p className="font-medium">
                  {course.instructor.firstName} {course.instructor.lastName}
                </p>
                <p className="text-sm text-gray-500">
                  {course.instructor.totalStudents || 0}+ students
                </p>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="text-center p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                <div className="text-lg font-bold text-black dark:text-white">{course.totalLessons}</div>
                <div className="text-sm text-gray-500">Lessons</div>
              </div>
              <div className="text-center p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                <div className="flex items-center justify-center text-lg font-bold text-black dark:text-white">
                  <Star className="w-4 h-4 fill-yellow-400 text-yellow-400 mr-1" />
                  {course.averageRating > 0 ? course.averageRating.toFixed(1) : 'New'}
                </div>
                <div className="text-sm text-gray-500">Rating</div>
              </div>
              <div className="text-center p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                <div className="text-lg font-bold text-black dark:text-white">{formatDuration(course.totalDuration)}</div>
                <div className="text-sm text-gray-500">Duration</div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-3">
              {isLoading ? (
                <div className="flex items-center justify-center px-4 py-3 rounded-lg bg-gray-100 dark:bg-gray-800">
                  <Loader2 className="w-5 h-5 animate-spin text-gray-500" />
                </div>
              ) : isEnrolled ? (
                progress?.completed ? (
                  <div className="flex items-center justify-center space-x-2 px-4 py-3 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
                    <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
                    <span className="font-medium text-green-700 dark:text-green-300">Course Completed</span>
                  </div>
                ) : (
                  <Button 
                    onClick={() => {
                      onClose()
                      continueLearning(course)
                    }}
                    className="w-full rounded-lg bg-black hover:bg-gray-800 text-white dark:bg-white dark:text-black dark:hover:bg-gray-100 py-3 text-base"
                  >
                    <Play className="w-5 h-5 mr-2" />
                    {progress?.progress && progress.progress > 0 ? 'Continue Learning' : 'Start Learning'}
                  </Button>
                )
              ) : (
                <Button 
                  className="w-full rounded-lg bg-black hover:bg-gray-800 text-white dark:bg-white dark:text-black dark:hover:bg-gray-100 py-3 text-base"
                  onClick={() => enrollInCourse(course)}
                  disabled={isEnrolling === course._id}
                >
                  {isEnrolling === course._id ? (
                    <Loader2 className="w-5 h-5 animate-spin mr-2" />
                  ) : (
                    <BookCheck className="w-5 h-5 mr-2" />
                  )}
                  {isEnrolling === course._id ? 'Enrolling...' : course.isFree ? 'Enroll Free' : `Enroll for $${course.price}`}
                </Button>
              )}
              <Button 
                onClick={() => {
                  onClose()
                  viewCourseDetails(course)
                }}
                variant="outline" 
                className="w-full rounded-lg border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 py-3 text-base"
              >
                <BookOpen className="w-5 h-5 mr-2" />
                View Full Details
              </Button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Filters Sidebar Component
  const FiltersSidebar = () => (
    <Card className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 lg:sticky lg:top-6">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center text-lg">
            <Filter className="w-5 h-5 mr-2 text-gray-600 dark:text-gray-400" />
            Filters
            {activeFiltersCount > 0 && (
              <Badge className="ml-2 bg-black text-white dark:bg-white dark:text-black rounded-full px-2 py-0.5 text-xs">
                {activeFiltersCount}
              </Badge>
            )}
          </CardTitle>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={clearFilters}
            className="rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-sm"
          >
            Clear all
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Sort Filter */}
        <div>
          <h4 className="font-medium mb-3 text-sm text-gray-700 dark:text-gray-300">
            Sort by
          </h4>
          <select
            value={filters.sort}
            onChange={(e) => setFilters(prev => ({ ...prev, sort: e.target.value as any }))}
            className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm focus:ring-2 focus:ring-black dark:focus:ring-white focus:border-transparent"
          >
            <option value="popular">Most Popular</option>
            <option value="newest">Newest</option>
            <option value="rating">Highest Rated</option>
            <option value="price-low">Price: Low to High</option>
            <option value="price-high">Price: High to Low</option>
          </select>
        </div>

        {/* Price Filter */}
        <div>
          <h4 className="font-medium mb-3 text-sm text-gray-700 dark:text-gray-300">
            Price
          </h4>
          <div className="space-y-2">
            {[
              { value: 'all', label: 'All Courses' },
              { value: 'free', label: 'Free Only' },
              { value: 'paid', label: 'Paid Only' }
            ].map((price) => (
              <label key={price.value} className="flex items-center space-x-3 cursor-pointer group">
                <input
                  type="radio"
                  name="price"
                  value={price.value}
                  checked={filters.price === price.value}
                  onChange={() => setFilters(prev => ({ ...prev, price: price.value as any }))}
                  className="w-4 h-4 text-black dark:text-white border-gray-300 dark:border-gray-600"
                />
                <span className="text-sm">{price.label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Level Filter */}
        <div>
          <h4 className="font-medium mb-3 text-sm text-gray-700 dark:text-gray-300">
            Level
          </h4>
          <div className="space-y-2">
            {filterOptions.levels.map((level) => (
              <label key={level.name} className="flex items-center space-x-3 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={filters.level.includes(level.name)}
                  onChange={() => toggleFilter('level', level.name)}
                  className="w-4 h-4 text-black dark:text-white rounded border-gray-300 dark:border-gray-600"
                />
                <span className={`px-3 py-1.5 rounded text-xs font-medium ${level.color} border`}>
                  {level.name.charAt(0).toUpperCase() + level.name.slice(1)}
                </span>
              </label>
            ))}
          </div>
        </div>

        {/* Category Filter */}
        <div>
          <h4 className="font-medium mb-3 text-sm text-gray-700 dark:text-gray-300">
            Category
          </h4>
          <div className="space-y-2">
            {filterOptions.categories.slice(0, 5).map((category) => (
              <label key={category.name} className="flex items-center space-x-3 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={filters.category.includes(category.name)}
                  onChange={() => toggleFilter('category', category.name)}
                  className="w-4 h-4 text-black dark:text-white rounded border-gray-300 dark:border-gray-600"
                />
                <span className="text-sm">{category.name}</span>
              </label>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  )

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-black">
      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        {/* Header Section */}
        <div className="mb-10">
          <div className="text-center mb-8">
            <h1 className="text-3xl md:text-4xl font-bold mb-3">
              Fashion Design Courses
            </h1>
            <p className="text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
              Master your craft with expert-led courses in fashion design, pattern making, and more
            </p>
          </div>
          
          {/* Search Bar */}
          <div className="max-w-2xl mx-auto">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <Input
                type="text"
                placeholder="Search for courses, topics, or instructors..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-12 pr-4 py-3 rounded-xl border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-base shadow-sm focus:shadow-md transition-shadow"
              />
            </div>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-8">
          {/* Filters Sidebar - Desktop */}
          <div className="hidden lg:block lg:w-64 space-y-6">
            <FiltersSidebar />
          </div>

          {/* Mobile Filters Overlay */}
          {mobileFiltersOpen && (
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 lg:hidden">
              <div 
                ref={filtersRef}
                className="absolute left-0 top-0 h-full w-80 max-w-[90vw] bg-white dark:bg-gray-900 shadow-xl overflow-y-auto"
              >
                <FiltersSidebar />
              </div>
            </div>
          )}

          {/* Courses Grid */}
          <div className="flex-1">
            {/* Controls */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
              <div>
                <h2 className="text-xl font-semibold mb-1">
                  {searchQuery ? `Search results for "${searchQuery}"` : 'All Courses'}
                </h2>
                <p className="text-gray-500 text-sm">
                  {sortedCourses.length} courses
                </p>
              </div>
              
              <div className="flex items-center space-x-3">
                {/* Mobile Filters Button */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setMobileFiltersOpen(true)}
                  className="rounded-lg border-gray-300 dark:border-gray-700 lg:hidden"
                >
                  <Filter className="w-4 h-4 mr-2" />
                  Filters
                  {activeFiltersCount > 0 && (
                    <span className="ml-2 bg-black text-white dark:bg-white dark:text-black rounded-full w-5 h-5 text-xs flex items-center justify-center">
                      {activeFiltersCount}
                    </span>
                  )}
                </Button>

                {/* View Toggle */}
                <div className="flex bg-gray-100 dark:bg-gray-900 rounded-lg p-1">
                  <Button
                    variant={viewMode === 'grid' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setViewMode('grid')}
                    className="rounded-md h-9 px-3"
                  >
                    <Grid className="w-4 h-4" />
                  </Button>
                  <Button
                    variant={viewMode === 'list' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setViewMode('list')}
                    className="rounded-md h-9 px-3"
                  >
                    <List className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>

            {/* Courses Grid */}
            {loading && courses.length === 0 ? (
              <div className={`grid gap-6 ${
                viewMode === 'grid' 
                  ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3' 
                  : 'grid-cols-1'
              }`}>
                {Array.from({ length: 6 }).map((_, index) => (
                  <CourseSkeleton key={index} />
                ))}
              </div>
            ) : sortedCourses.length === 0 ? (
              <div className="text-center py-16">
                <div className="inline-block p-6 bg-gray-100 dark:bg-gray-900 rounded-2xl mb-6">
                  <BookOpen className="w-12 h-12 text-gray-400" />
                </div>
                <h3 className="text-xl font-semibold mb-2">No courses found</h3>
                <p className="text-gray-500 mb-6 max-w-sm mx-auto">
                  Try adjusting your search or filters
                </p>
                <Button onClick={clearFilters} variant="outline" className="rounded-lg">
                  Clear filters
                </Button>
              </div>
            ) : (
              <>
                <div className={`grid gap-6 ${
                  viewMode === 'grid' 
                    ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3' 
                    : 'grid-cols-1'
                }`}>
                  {sortedCourses.map((course) => {
                    const progress = userProgress[course._id]
                    const isEnrolled = isUserEnrolled(course._id)
                    
                    return (
                      <Card 
                        key={course._id} 
                        className="group rounded-xl overflow-hidden hover:shadow-lg transition-shadow border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 cursor-pointer"
                        onClick={() => setSelectedCourse(course)}
                      >
                        {/* Course Thumbnail */}
                        <div className="relative h-44 bg-gray-200 dark:bg-gray-800 overflow-hidden">
                          <img
                            src={course.thumbnail.url}
                            alt={course.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                          <div className="absolute top-3 left-3">
                            <Badge className={`rounded-lg ${getLevelColor(course.level)} border shadow-sm`}>
                              {course.level}
                            </Badge>
                          </div>
                          {course.isFree && (
                            <div className="absolute top-3 right-3">
                              <Badge className="rounded-lg bg-green-500 text-white border-0 shadow-sm">
                                Free
                              </Badge>
                            </div>
                          )}
                        </div>
                        
                        <CardHeader className="pb-4 px-5 pt-5">
                          <CardTitle className="text-lg font-semibold mb-2 line-clamp-2 group-hover:text-gray-700 dark:group-hover:text-gray-300 transition-colors">
                            {course.title}
                          </CardTitle>
                          <CardDescription className="line-clamp-2 text-gray-600 dark:text-gray-400 text-sm">
                            {course.shortDescription}
                          </CardDescription>
                        </CardHeader>
                        
                        <CardContent className="pb-5 px-5">
                          {/* Instructor and Rating */}
                          <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center space-x-2">
                              <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-800 flex items-center justify-center overflow-hidden">
                                <img
                                  src={course.instructor.avatar || '/default-avatar.png'}
                                  alt={course.instructor.username}
                                  className="w-full h-full object-cover"
                                  onError={(e) => {
                                    const target = e.target as HTMLImageElement
                                    target.src = '/default-avatar.png'
                                  }}
                                />
                              </div>
                              <span className="text-sm font-medium">
                                {course.instructor.firstName}
                              </span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                              <span className="text-sm font-medium">{course.averageRating > 0 ? course.averageRating.toFixed(1) : 'New'}</span>
                            </div>
                          </div>
                          
                          {/* Enrollment Button */}
                          {getEnrollmentButton(course)}
                        </CardContent>
                      </Card>
                    )
                  })}
                </div>

                {/* Load More */}
                {!loading && (
                  <div ref={observerTarget} className="flex justify-center mt-12">
                    {streaming ? (
                      <div className="flex items-center space-x-3 px-6 py-3 rounded-lg bg-gray-100 dark:bg-gray-900">
                        <Loader2 className="w-5 h-5 animate-spin text-gray-500" />
                        <span className="text-sm text-gray-500">Loading more courses...</span>
                      </div>
                    ) : (
                      <Button 
                        onClick={loadMoreCourses}
                        variant="outline"
                        className="rounded-lg border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-900 px-8 py-3"
                      >
                        <DownloadCloud className="w-5 h-5 mr-2" />
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

      {/* Payment Modal */}
      {enrollingCourse && (
        <PaymentModal
          course={enrollingCourse}
          isOpen={showPaymentModal}
          onClose={() => {
            setShowPaymentModal(false)
            setEnrollingCourse(null)
          }}
          onSuccess={handlePaymentSuccess}
        />
      )}
    </div>
  )
}