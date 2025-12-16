'use client'

import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { useToast } from "@/components/ui/use-toast"
import { 
  Star, 
  Play, 
  BookOpen, 
  Search,
  Filter,
  Grid,
  List,
  Award,
  Globe,
  DownloadCloud,
  CheckCircle,
  X,
  Loader2,
  Palette,
  Code,
  Camera,
  TrendingUp,
  Zap,
  Target,
  Rocket,
  CloudLightning,
  Medal,
  Gauge,
  ShieldCheck,
  Clock4,
  Brain,
  AlertCircle,
  Lock,
  TrendingUp as TrendingIcon,
  Calendar,
  Clock,
  BarChart,
  Users,
  Bookmark
} from 'lucide-react'
import { PaymentModal } from '@/components/payment/PaymentModal'

// Define interfaces
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
    chapters: Array<{  // Changed from lessons to chapters
      _id: string
      title: string
      description: string
      order: number
      lessons: Array<{  // Lessons are now inside chapters
        _id: string
        title: string
        description: string
        duration: number
        isPreview: boolean
        order: number
      }>
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
}

interface UserProgress {
  _id: string
  courseId: string
  userId: string
  enrolled: boolean
  progress: number
  completed: boolean
  currentLesson?: string
  lastAccessed?: string
  timeSpent?: number
  completedLessons: string[]
}

interface FilterState {
  category: string[]
  level: string[]
  price: 'all' | 'free' | 'paid'
  rating: number
  sort: 'popular' | 'newest' | 'rating' | 'price-low' | 'price-high' | 'trending'
}

export default function CoursesPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [courses, setCourses] = useState<Course[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [isEnrolling, setIsEnrolling] = useState<string | null>(null)
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false)
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [enrollingCourse, setEnrollingCourse] = useState<Course | null>(null)
  const [favoriteCourses, setFavoriteCourses] = useState<Set<string>>(new Set())
  
  const observerTarget = useRef<HTMLDivElement>(null)
  const filtersRef = useRef<HTMLDivElement>(null)
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const abortControllerRef = useRef<AbortController | null>(null)

  // Pagination
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 12,
    total: 0,
    totalPages: 1,
    hasMore: true
  })

  // User progress state - with better initialization
  const [userProgress, setUserProgress] = useState<Record<string, UserProgress>>({})
  const [progressLoading, setProgressLoading] = useState<Set<string>>(new Set())

  const [filters, setFilters] = useState<FilterState>({
    category: [],
    level: [],
    price: 'all',
    rating: 0,
    sort: 'popular'
  })

  // Helper function to get course URL
  const getCourseUrl = useCallback((course: Course): string => {
    if (course.slug && typeof course.slug === 'string' && course.slug.trim() !== '') {
      return `/courses/${course.slug}`
    }
    console.warn('Invalid or missing slug for course:', course._id, 'Using ID instead')
    return `/courses/id/${course._id}`
  }, [])

  // Helper function to safely navigate to course
  const navigateToCourse = useCallback((course: Course) => {
    const url = getCourseUrl(course)
    router.push(url)
  }, [getCourseUrl, router])

  // Debug course data
  useEffect(() => {
    if (courses.length > 0) {
      const invalidSlugs = courses.filter(c => 
        !c.slug || typeof c.slug !== 'string' || c.slug.includes('object')
      )
      if (invalidSlugs.length > 0) {
        console.warn('Courses with invalid slugs:', invalidSlugs.map(c => ({ id: c._id, slug: c.slug })))
      }
    }
  }, [courses])

  // Debounce search input
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current)
    }
    
    searchTimeoutRef.current = setTimeout(() => {
      setDebouncedSearch(searchQuery)
    }, 500)

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current)
      }
    }
  }, [searchQuery])

  const filterOptions = {
    categories: [
      { name: 'Fashion Design', icon: Palette, color: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300' },
      { name: 'Pattern Making', icon: Target, color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300' },
      { name: 'Sewing', icon: Medal, color: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300' },
      { name: 'Textiles', icon: Gauge, color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' },
      { name: 'Fashion Business', icon: TrendingUp, color: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300' },
      { name: 'Sustainability', icon: Globe, color: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300' },
      { name: 'Digital Fashion', icon: Code, color: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-300' },
      { name: '3D Design', icon: Camera, color: 'bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-300' },
      { name: 'Fashion Marketing', icon: Zap, color: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300' }
    ],
    levels: [
      { name: 'beginner', icon: Rocket, color: 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-800' },
      { name: 'intermediate', icon: Target, color: 'bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-300 dark:border-yellow-800' },
      { name: 'advanced', icon: CloudLightning, color: 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800' }
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
      if (debouncedSearch) {
        const searchLower = debouncedSearch.toLowerCase()
        const matchesSearch = 
          course.title.toLowerCase().includes(searchLower) ||
          course.shortDescription.toLowerCase().includes(searchLower) ||
          course.description.toLowerCase().includes(searchLower) ||
          course.instructor.firstName.toLowerCase().includes(searchLower) ||
          course.instructor.lastName.toLowerCase().includes(searchLower) ||
          course.tags.some(tag => tag.toLowerCase().includes(searchLower))
        
        if (!matchesSearch) return false
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

      return true
    })
  }, [courses, debouncedSearch, filters])

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
      filters.category.length +
      filters.level.length +
      (filters.price !== 'all' ? 1 : 0) +
      (filters.rating > 0 ? 1 : 0)
    )
  }, [filters])

  // Fetch progress for a specific course
  const fetchCourseProgress = async (courseId: string) => {
    if (progressLoading.has(courseId)) return
    
    setProgressLoading(prev => new Set([...prev, courseId]))
    
    try {
      const response = await fetch(`/api/courses/${courseId}/progress`, {
        credentials: 'include'
      })
      
      if (response.ok) {
        const progress = await response.json()
        setUserProgress(prev => ({
          ...prev,
          [courseId]: {
            ...progress,
            enrolled: true
          }
        }))
      } else if (response.status === 403 || response.status === 404) {
        // User is not enrolled
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
            lastAccessed: new Date().toISOString(),
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
          lastAccessed: new Date().toISOString(),
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
        },
        credentials: 'include'
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
                  totalStudents: result.course?.totalStudents || c.totalStudents + 1
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
              lastAccessed: new Date().toISOString(),
              timeSpent: 0
            }
          }))
          
          toast({
            title: 'Successfully Enrolled!',
            description: 'You can now start learning immediately',
          })

          setTimeout(() => {
            navigateToCourse(course)
          }, 1500)
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
              lastAccessed: new Date().toISOString(),
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
        if (err.message.includes('Unauthorized') || err.message.includes('401')) {
          toast({
            title: 'Login Required',
            description: 'Please log in to enroll in courses',
            variant: 'destructive',
          })
          // Redirect to login with return URL
          const currentUrl = encodeURIComponent(window.location.pathname + window.location.search)
          router.push(`/login?redirect=${currentUrl}`)
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
        lastAccessed: new Date().toISOString(),
        timeSpent: 0
      }
    }))
    
    setShowPaymentModal(false)
    setEnrollingCourse(null)
    
    toast({
      title: '🎉 Enrollment Successful!',
      description: 'You have been successfully enrolled in the course',
      variant: 'default',
    })

    // Find the course to redirect
    const enrolledCourse = courses.find(c => c._id === courseId)
    if (enrolledCourse) {
      setTimeout(() => {
        navigateToCourse(enrolledCourse)
      }, 1200)
    }
  }

  // Check if user is enrolled in a course
  const isUserEnrolled = (courseId: string) => {
    return userProgress[courseId]?.enrolled === true
  }

  // Enhanced enrollment button with better styling
  const getEnrollmentButton = (course: Course) => {
    const progress = userProgress[course._id]
    const isEnrolled = isUserEnrolled(course._id)
    const isLoading = progressLoading.has(course._id) || isEnrolling === course._id
    const isFavorite = favoriteCourses.has(course._id)
    
    if (isLoading) {
      return (
        <div className="flex items-center justify-center px-4 py-2 rounded-lg bg-gray-100 dark:bg-gray-800">
          <Loader2 className="w-4 h-4 animate-spin text-gray-500" />
        </div>
      )
    }

    if (!isEnrolled) {
      return (
        <div className="flex gap-2">
          <Button 
            size="sm"
            variant="ghost"
            className="rounded-lg p-2 hover:bg-gray-100 dark:hover:bg-gray-800"
            onClick={(e) => {
              e.stopPropagation()
              setFavoriteCourses(prev => {
                const newSet = new Set(prev)
                if (newSet.has(course._id)) {
                  newSet.delete(course._id)
                  toast({
                    title: 'Removed from favorites',
                    description: 'Course removed from your favorites',
                  })
                } else {
                  newSet.add(course._id)
                  toast({
                    title: 'Added to favorites',
                    description: 'Course added to your favorites',
                  })
                }
                return newSet
              })
            }}
            title={isFavorite ? "Remove from favorites" : "Add to favorites"}
          >
            {isFavorite ? (
              <Bookmark className="w-4 h-4 fill-current text-yellow-500" />
            ) : (
              <Bookmark className="w-4 h-4" />
            )}
          </Button>
          <Button 
            size="sm" 
            className="flex-1 rounded-lg bg-black hover:bg-gray-800 text-white dark:bg-white dark:text-black dark:hover:bg-gray-100 transition-all shadow-sm hover:shadow"
            onClick={(e) => {
              e.stopPropagation()
              enrollInCourse(course)
            }}
            disabled={isEnrolling === course._id}
          >
            {course.isFree ? 'Enroll Free' : `Enroll $${course.price}`}
          </Button>
        </div>
      )
    }

    if (progress?.completed) {
      return (
        <div className="flex items-center justify-center space-x-2 px-4 py-2 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 w-full">
          <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400" />
          <span className="text-sm font-medium text-green-700 dark:text-green-300">Completed</span>
        </div>
      )
    }

    if (progress?.progress && progress.progress > 0) {
      return (
        <div className="w-full">
          <div className="relative h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden mb-2">
            <div 
              className="absolute h-full bg-black dark:bg-white rounded-full transition-all duration-500"
              style={{ width: `${progress.progress * 100}%` }}
            />
          </div>
          <Button 
            size="sm" 
            className="w-full rounded-lg bg-black hover:bg-gray-800 text-white dark:bg-white dark:text-black dark:hover:bg-gray-100 transition-all shadow-sm hover:shadow"
            onClick={(e) => {
              e.stopPropagation()
              navigateToCourse(course)
            }}
          >
            <Play className="w-4 h-4 mr-2" />
            Continue ({Math.round(progress.progress * 100)}%)
          </Button>
        </div>
      )
    }

    return (
      <Button 
        size="sm" 
        className="w-full rounded-lg bg-black hover:bg-gray-800 text-white dark:bg-white dark:text-black dark:hover:bg-gray-100 transition-all shadow-sm hover:shadow"
        onClick={(e) => {
          e.stopPropagation()
          navigateToCourse(course)
        }}
      >
        <Play className="w-4 h-4 mr-2" />
        Start Learning
      </Button>
    )
  }

  // Fetch courses with abort controller and retry logic
  const fetchCourses = useCallback(async (page = 1, isLoadMore = false) => {
    // Abort previous request if exists
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }

    const controller = new AbortController()
    abortControllerRef.current = controller

    if (!isLoadMore) {
      setLoading(true)
      if (page === 1) {
        setCourses([])
      }
    } else {
      setLoadingMore(true)
    }
    
    setError(null)

    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: pagination.limit.toString(),
        sort: filters.sort,
        price: filters.price,
        rating: filters.rating.toString(),
        _t: Date.now().toString() // Cache busting
      })

      if (debouncedSearch) {
        params.append('search', debouncedSearch)
      }
      if (filters.category.length > 0) {
        params.append('categories', filters.category.join(','))
      }
      if (filters.level.length > 0) {
        params.append('levels', filters.level.join(','))
      }

      const response = await fetch(`/api/courses?${params}`, {
        credentials: 'include',
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache',
          'Accept': 'application/json'
        },
        signal: controller.signal
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: Failed to fetch courses`)
      }

      const data = await response.json()
      console.log('API Response:', data) // Debug the response
      
      // Handle different API response formats
      let coursesData: Course[] = []
      let paginationData = {
        page: page,
        total: 0,
        totalPages: 1
      }

      // Helper function to normalize course data
      const normalizeCourse = (course: any): Course => {
        // Ensure slug is a string and not an object
        let slug = course.slug
        if (slug && typeof slug === 'object') {
          console.warn('Course slug is an object, converting to string:', course._id, slug)
          slug = String(slug)
        } else if (!slug || typeof slug !== 'string') {
          console.warn('Course slug is invalid, using ID:', course._id, slug)
          slug = course._id
        }
        
        return {
          ...course,
          slug: slug
        }
      }

      if (Array.isArray(data)) {
        coursesData = data.map(normalizeCourse)
        paginationData.total = data.length
      } else if (data.courses && Array.isArray(data.courses)) {
        coursesData = data.courses.map(normalizeCourse)
        paginationData = {
          page: data.pagination?.page || page,
          total: data.pagination?.total || data.courses.length,
          totalPages: data.pagination?.totalPages || 1
        }
      } else if (data.data && Array.isArray(data.data)) {
        coursesData = data.data.map(normalizeCourse)
        paginationData.total = data.data.length
      } else if (data.items && Array.isArray(data.items)) {
        coursesData = data.items.map(normalizeCourse)
        paginationData.total = data.items.length
      }

      if (isLoadMore) {
        setCourses(prev => {
          const existingIds = new Set(prev.map(c => c._id))
          const newCourses = coursesData.filter(c => !existingIds.has(c._id))
          return [...prev, ...newCourses]
        })
      } else {
        setCourses(coursesData)
      }
      
      setPagination({
        ...pagination,
        page: paginationData.page,
        total: paginationData.total,
        totalPages: paginationData.totalPages,
        hasMore: paginationData.page < paginationData.totalPages
      })

      // Fetch progress for all courses after loading
      if (coursesData.length > 0) {
        fetchAllCoursesProgress(coursesData.map(c => c._id))
      }
      
    } catch (err: any) {
      if (err.name === 'AbortError') {
        console.log('Request aborted')
        return
      }
      
      console.error('Error fetching courses:', err)
      setError(err.message || 'Failed to load courses')
      
      if (!isLoadMore) {
        toast({
          title: 'Error Loading Courses',
          description: 'Please check your connection and try again',
          variant: 'destructive',
        })
      }
    } finally {
      setLoading(false)
      setLoadingMore(false)
      abortControllerRef.current = null
    }
  }, [debouncedSearch, filters, pagination.limit, toast])

  // Load more courses
  const loadMoreCourses = useCallback(async () => {
    if (!pagination.hasMore || loading || loadingMore) return
    
    const nextPage = pagination.page + 1
    await fetchCourses(nextPage, true)
  }, [pagination, loading, loadingMore, fetchCourses])

  // Intersection Observer for infinite scroll
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && pagination.hasMore && !loading && !loadingMore) {
          loadMoreCourses()
        }
      },
      { threshold: 0.3, rootMargin: '200px' }
    )

    const currentTarget = observerTarget.current
    if (currentTarget) {
      observer.observe(currentTarget)
    }

    return () => {
      if (currentTarget) {
        observer.unobserve(currentTarget)
      }
    }
  }, [pagination.hasMore, loading, loadingMore, loadMoreCourses])

  // Initial load on mount
  useEffect(() => {
    fetchCourses(1, false)
  }, [])

  // Fetch courses when search or sort filters change
  useEffect(() => {
    // Reset to page 1 when search or sort changes
    fetchCourses(1, false)
  }, [debouncedSearch, filters.sort, filters.price, filters.rating])

  // Category and level filters with debounce
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      fetchCourses(1, false)
    }, 300)

    return () => clearTimeout(timeoutId)
  }, [filters.category, filters.level])

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
      rating: 0,
      sort: 'popular'
    })
    setSearchQuery('')
  }

  // Get level color
  const getLevelColor = (level: string) => {
    switch (level) {
      case 'beginner':
        return 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-800'
      case 'intermediate':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-300 dark:border-yellow-800'
      case 'advanced':
        return 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-800 dark:text-gray-300'
    }
  }

  // Get category color
  const getCategoryColor = (categoryName: string) => {
    const category = filterOptions.categories.find(c => c.name === categoryName)
    return category?.color || 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300'
  }

  // Course Skeleton
  const CourseSkeleton = () => (
    <Card className="rounded-xl overflow-hidden animate-pulse border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
      <div className="h-44 bg-gradient-to-br from-gray-200 to-gray-300 dark:from-gray-800 dark:to-gray-700"></div>
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

  // Error Display
  const ErrorDisplay = () => (
    <div className="text-center py-12">
      <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/20 mb-4">
        <AlertCircle className="w-8 h-8 text-red-600 dark:text-red-400" />
      </div>
      <h3 className="text-xl font-semibold mb-2">Failed to Load Courses</h3>
      <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-md mx-auto">
        {error || 'There was an error loading the courses. Please check your connection and try again.'}
      </p>
      <div className="flex justify-center gap-3">
        <Button onClick={() => fetchCourses(1, false)} className="rounded-lg">
          <Loader2 className="w-4 h-4 mr-2" />
          Retry
        </Button>
        <Button 
          onClick={clearFilters} 
          variant="outline" 
          className="rounded-lg"
        >
          Clear Filters
        </Button>
      </div>
    </div>
  )

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
            <option value="trending">Trending</option>
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
            {filterOptions.categories.map((category) => (
              <label key={category.name} className="flex items-center space-x-3 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={filters.category.includes(category.name)}
                  onChange={() => toggleFilter('category', category.name)}
                  className="w-4 h-4 text-black dark:text-white rounded border-gray-300 dark:border-gray-600"
                />
                <span className={`px-3 py-1.5 rounded text-xs font-medium ${category.color} border`}>
                  {category.name}
                </span>
              </label>
            ))}
          </div>
        </div>

        {/* Rating Filter */}
        <div>
          <h4 className="font-medium mb-3 text-sm text-gray-700 dark:text-gray-300">
            Minimum Rating
          </h4>
          <div className="flex items-center space-x-2">
            <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
            <select
              value={filters.rating}
              onChange={(e) => setFilters(prev => ({ ...prev, rating: Number(e.target.value) }))}
              className="flex-1 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm focus:ring-2 focus:ring-black dark:focus:ring-white focus:border-transparent"
            >
              <option value="0">Any rating</option>
              <option value="4">4+ stars</option>
              <option value="4.5">4.5+ stars</option>
            </select>
          </div>
        </div>
      </CardContent>
    </Card>
  )

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white dark:from-black dark:to-gray-900">
      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        {/* Header Section */}
        <div className="mb-10">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-purple-100 to-pink-100 dark:from-purple-900/30 dark:to-pink-900/30 mb-4">
              <Palette className="w-8 h-8 text-purple-600 dark:text-purple-400" />
            </div>
            <h1 className="text-3xl md:text-4xl font-bold mb-3 bg-gradient-to-r from-gray-900 to-gray-700 dark:from-white dark:to-gray-300 bg-clip-text text-transparent">
              Master Fashion Design
            </h1>
            <p className="text-gray-600 dark:text-gray-400 max-w-2xl mx-auto text-lg">
              Learn from industry experts with hands-on projects and personalized feedback
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
                className="pl-12 pr-4 py-3 rounded-xl border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-base shadow-sm focus:shadow-md transition-shadow focus:ring-2 focus:ring-purple-500 dark:focus:ring-purple-400"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  <X className="w-5 h-5" />
                </button>
              )}
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
                  {debouncedSearch ? `Search results for "${debouncedSearch}"` : 'All Courses'}
                </h2>
                <p className="text-gray-500 text-sm">
                  {courses.length} of {pagination.total} courses
                  {activeFiltersCount > 0 && ` • ${activeFiltersCount} filter${activeFiltersCount > 1 ? 's' : ''} active`}
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
            {error && !loading ? (
              <ErrorDisplay />
            ) : loading && courses.length === 0 ? (
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
                <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gray-100 dark:bg-gray-900 mb-6">
                  <BookOpen className="w-10 h-10 text-gray-400" />
                </div>
                <h3 className="text-xl font-semibold mb-2">No courses found</h3>
                <p className="text-gray-500 mb-6 max-w-sm mx-auto">
                  Try adjusting your search or filters to find what you're looking for
                </p>
                <div className="flex justify-center gap-3">
                  <Button onClick={clearFilters} variant="outline" className="rounded-lg">
                    Clear filters
                  </Button>
                  <Button onClick={() => setSearchQuery('')} variant="ghost" className="rounded-lg">
                    Clear search
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <div className={`grid gap-6 ${
                  viewMode === 'grid' 
                    ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3' 
                    : 'grid-cols-1'
                }`}>
                  {sortedCourses.map((course) => (
                    <Card 
                      key={course._id} 
                      className="group relative rounded-xl overflow-hidden hover:shadow-xl transition-all duration-300 border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 cursor-pointer hover:border-gray-300 dark:hover:border-gray-700 hover:-translate-y-1"
                      onClick={(e) => {
                        // Don't navigate if clicking on a button or favorite icon
                        const target = e.target as HTMLElement;
                        const isButtonClick = target.closest('button');
                        if (!isButtonClick) {
                          navigateToCourse(course);
                        }
                      }}
                    >
                      {/* Course Thumbnail */}
                      <div className="relative h-48 bg-gradient-to-br from-gray-200 to-gray-300 dark:from-gray-800 dark:to-gray-700 overflow-hidden">
                        <img
                          src={course.thumbnail?.url || '/api/placeholder/400/250'}
                          alt={course.title}
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                          loading="lazy"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement
                            target.src = '/api/placeholder/400/250'
                          }}
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                        
                        {/* Badges */}
                        <div className="absolute top-3 left-3 flex flex-wrap gap-2">
                          <Badge className={`rounded-lg ${getLevelColor(course.level)} border shadow-sm backdrop-blur-sm`}>
                            {course.level}
                          </Badge>
                          <Badge className={`rounded-lg ${getCategoryColor(course.category)} border shadow-sm backdrop-blur-sm`}>
                            {course.category}
                          </Badge>
                        </div>
                        
                        {/* Price Badge */}
                        <div className="absolute top-3 right-3">
                          {course.isFree ? (
                            <Badge className="rounded-lg bg-gradient-to-r from-green-500 to-emerald-500 text-white border-0 shadow-lg backdrop-blur-sm">
                              Free
                            </Badge>
                          ) : (
                            <Badge className="rounded-lg bg-gradient-to-r from-purple-500 to-pink-500 text-white border-0 shadow-lg backdrop-blur-sm">
                              ${course.price}
                            </Badge>
                          )}
                        </div>
                        
                        {/* Featured Badge */}
                        {course.isFeatured && (
                          <div className="absolute bottom-3 left-3">
                            <Badge className="rounded-lg bg-gradient-to-r from-yellow-500 to-amber-500 text-white border-0 shadow-lg backdrop-blur-sm">
                              <TrendingIcon className="w-3 h-3 mr-1" />
                              Featured
                            </Badge>
                          </div>
                        )}
                      </div>
                      
                      <CardHeader className="pb-4 px-5 pt-5">
                        <CardTitle className="text-lg font-bold mb-2 line-clamp-2 group-hover:text-gray-700 dark:group-hover:text-gray-300 transition-colors">
                          {course.title}
                        </CardTitle>
                        <CardDescription className="line-clamp-2 text-gray-600 dark:text-gray-400 text-sm">
                          {course.shortDescription}
                        </CardDescription>
                      </CardHeader>
                      
                      <CardContent className="pb-5 px-5">
                        {/* Instructor Info */}
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center space-x-2">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-200 to-pink-200 dark:from-purple-900 dark:to-pink-900 flex items-center justify-center overflow-hidden ring-2 ring-white dark:ring-gray-800">
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
                            <span className="text-sm font-semibold">
                              {course.instructor.firstName} {course.instructor.lastName.charAt(0)}.
                            </span>
                          </div>
                          
                          {/* Rating */}
                          <div className="flex items-center space-x-1 bg-gray-50 dark:bg-gray-800/50 px-2 py-1 rounded-lg">
                            <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                            <span className="text-sm font-semibold">
                              {course.averageRating > 0 ? course.averageRating.toFixed(1) : 'New'}
                            </span>
                          </div>
                        </div>
                        
                        {/* Enrollment Button */}
                        {getEnrollmentButton(course)}
                      </CardContent>
                    </Card>
                  ))}
                </div>

                {/* Load More */}
                {pagination.hasMore && !error && (
                  <div ref={observerTarget} className="flex justify-center mt-12">
                    {loadingMore ? (
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
                
                {!pagination.hasMore && courses.length > 0 && !error && (
                  <div className="text-center mt-12 py-8 border-t border-gray-200 dark:border-gray-800">
                    <p className="text-gray-500">
                      You've reached the end • {pagination.total} courses
                    </p>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

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