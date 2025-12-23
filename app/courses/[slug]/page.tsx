'use client'

import { useState, useEffect, useMemo, useCallback, memo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
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
  ArrowLeft,
  ArrowRight,
  Video,
  Play,
  Users,
  Check,
  FileText,
  Menu,
  X,
  Bookmark,
  GraduationCap,
  Target,
  Zap,
  Shield,
  TrendingUp,
  Eye,
  ChevronRight,
  ExternalLink,
  UserCheck,
  Crown,
  Rocket,
  Sparkles,
  BarChart3,
  Brain,
  Globe2,
  Users2,
  ShieldCheck,
  CheckSquare,
  BookmarkCheck,
  ThumbsUp,
  Sparkle,
  Heart as HeartIcon,
  TrendingUp as TrendingUpIcon,
  Zap as ZapIcon,
  BookCheck,
  Calendar,
  MessageCircle,
  Globe,
  Lock,
  Palette,
  Gem,
  Feather,
  Layers,
  Target as TargetIcon,
  Brain as BrainIcon,
  Trophy,
  Briefcase,
  Lightbulb,
  Cpu,
  Network,
  Infinity as InfinityIcon,
  Shield as ShieldIcon,
  DownloadCloud,
  Headphones,
  HelpCircle,
  ThumbsUp as ThumbsUpIcon,
  Send,
  MoreVertical,
  Copy,
  Facebook,
  Twitter,
  Linkedin,
  Link as LinkIcon,
  Mail,
  Check as CheckIcon,
  AlertCircle,
  RefreshCw
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { useToast } from "@/components/ui/use-toast"
import { Textarea } from '@/components/ui/textarea'
import { PaymentModal } from '@/components/payment/PaymentModal'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Separator } from '@/components/ui/separator'
import { Input } from '@/components/ui/input'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

// ==================== TYPES ====================
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
  content?: string
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

// ==================== MEMOIZED COMPONENTS ====================
const SectionHeader = memo(({ 
  title, 
  description, 
  icon: Icon,
  color = 'from-emerald-500 to-teal-500'
}: { 
  title: string
  description: string
  icon: React.ElementType
  color?: string
}) => (
  <div className="flex items-center gap-3 mb-4">
    <div className={`p-2.5 rounded-xl bg-gradient-to-r ${color} text-white shadow-lg`}>
      <Icon className="w-5 h-5" />
    </div>
    <div>
      <h2 className="text-lg font-bold text-slate-900 dark:text-white">{title}</h2>
      <p className="text-sm text-slate-600 dark:text-slate-400">{description}</p>
    </div>
  </div>
))
SectionHeader.displayName = 'SectionHeader'

const StatCard = memo(({ 
  icon: Icon, 
  value, 
  label, 
  color = 'blue',
  gradient = false
}: {
  icon: React.ElementType
  value: string | number
  label: string
  color?: 'blue' | 'green' | 'purple' | 'orange' | 'pink' | 'emerald' | 'amber'
  gradient?: boolean
}) => {
  const colorConfig = {
    blue: 'from-blue-500 to-cyan-500',
    green: 'from-emerald-500 to-green-500',
    purple: 'from-purple-500 to-pink-500',
    orange: 'from-amber-500 to-orange-500',
    pink: 'from-rose-500 to-pink-500',
    emerald: 'from-emerald-500 to-teal-500',
    amber: 'from-amber-500 to-yellow-500'
  }

  const bgColor = {
    blue: 'bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20',
    green: 'bg-gradient-to-r from-emerald-50 to-green-50 dark:from-emerald-900/20 dark:to-green-900/20',
    purple: 'bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20',
    orange: 'bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20',
    pink: 'bg-gradient-to-r from-rose-50 to-pink-50 dark:from-rose-900/20 dark:to-pink-900/20',
    emerald: 'bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20',
    amber: 'bg-gradient-to-r from-amber-50 to-yellow-50 dark:from-amber-900/20 dark:to-yellow-900/20'
  }

  const iconBg = {
    blue: 'bg-gradient-to-r from-blue-100 to-cyan-100 dark:from-blue-800 dark:to-cyan-800',
    green: 'bg-gradient-to-r from-emerald-100 to-green-100 dark:from-emerald-800 dark:to-green-800',
    purple: 'bg-gradient-to-r from-purple-100 to-pink-100 dark:from-purple-800 dark:to-pink-800',
    orange: 'bg-gradient-to-r from-amber-100 to-orange-100 dark:from-amber-800 dark:to-orange-800',
    pink: 'bg-gradient-to-r from-rose-100 to-pink-100 dark:from-rose-800 dark:to-pink-800',
    emerald: 'bg-gradient-to-r from-emerald-100 to-teal-100 dark:from-emerald-800 dark:to-teal-800',
    amber: 'bg-gradient-to-r from-amber-100 to-yellow-100 dark:from-amber-800 dark:to-yellow-800'
  }

  const iconColor = {
    blue: 'text-blue-600 dark:text-blue-400',
    green: 'text-emerald-600 dark:text-emerald-400',
    purple: 'text-purple-600 dark:text-purple-400',
    orange: 'text-amber-600 dark:text-amber-400',
    pink: 'text-rose-600 dark:text-rose-400',
    emerald: 'text-emerald-600 dark:text-emerald-400',
    amber: 'text-amber-600 dark:text-amber-400'
  }

  return (
    <div className={`p-3 rounded-xl ${bgColor[color]} border border-slate-200/50 dark:border-slate-700/50`}>
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-lg ${iconBg[color]}`}>
          <Icon className={`w-4 h-4 ${iconColor[color]}`} />
        </div>
        <div>
          <p className="text-lg font-bold bg-gradient-to-r from-slate-900 to-slate-700 dark:from-white dark:to-slate-300 bg-clip-text text-transparent">
            {value}
          </p>
          <p className="text-xs text-slate-600 dark:text-slate-400 font-medium">{label}</p>
        </div>
      </div>
    </div>
  )
})
StatCard.displayName = 'StatCard'

const FeatureCard = memo(({ 
  icon: Icon, 
  title, 
  description, 
  color = 'blue' 
}: {
  icon: React.ElementType
  title: string
  description: string
  color?: 'blue' | 'green' | 'purple' | 'amber' | 'emerald'
}) => {
  const colorConfig = {
    blue: {
      bg: 'from-blue-50/80 to-cyan-50/80 dark:from-blue-900/20 dark:to-cyan-900/20',
      border: 'border-blue-200/50 dark:border-blue-800/50',
      iconBg: 'bg-gradient-to-r from-blue-100 to-cyan-100 dark:from-blue-800 dark:to-cyan-800',
      iconColor: 'text-blue-600 dark:text-blue-400'
    },
    green: {
      bg: 'from-green-50/80 to-emerald-50/80 dark:from-green-900/20 dark:to-emerald-900/20',
      border: 'border-green-200/50 dark:border-green-800/50',
      iconBg: 'bg-gradient-to-r from-green-100 to-emerald-100 dark:from-green-800 dark:to-emerald-800',
      iconColor: 'text-green-600 dark:text-green-400'
    },
    purple: {
      bg: 'from-purple-50/80 to-pink-50/80 dark:from-purple-900/20 dark:to-pink-900/20',
      border: 'border-purple-200/50 dark:border-purple-800/50',
      iconBg: 'bg-gradient-to-r from-purple-100 to-pink-100 dark:from-purple-800 dark:to-pink-800',
      iconColor: 'text-purple-600 dark:text-purple-400'
    },
    amber: {
      bg: 'from-amber-50/80 to-orange-50/80 dark:from-amber-900/20 dark:to-orange-900/20',
      border: 'border-amber-200/50 dark:border-amber-800/50',
      iconBg: 'bg-gradient-to-r from-amber-100 to-orange-100 dark:from-amber-800 dark:to-orange-800',
      iconColor: 'text-amber-600 dark:text-amber-400'
    },
    emerald: {
      bg: 'from-emerald-50/80 to-teal-50/80 dark:from-emerald-900/20 dark:to-teal-900/20',
      border: 'border-emerald-200/50 dark:border-emerald-800/50',
      iconBg: 'bg-gradient-to-r from-emerald-100 to-teal-100 dark:from-emerald-800 dark:to-teal-800',
      iconColor: 'text-emerald-600 dark:text-emerald-400'
    }
  }

  const config = colorConfig[color]

  return (
    <div className={`p-4 rounded-xl bg-gradient-to-br ${config.bg} border ${config.border} backdrop-blur-sm hover:scale-[1.02] transition-all duration-300`}>
      <div className="flex items-center gap-3 mb-3">
        <div className={`p-2 rounded-lg ${config.iconBg}`}>
          <Icon className={`w-4 h-4 ${config.iconColor}`} />
        </div>
        <h4 className="font-bold text-slate-900 dark:text-white text-sm">{title}</h4>
      </div>
      <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">{description}</p>
    </div>
  )
})
FeatureCard.displayName = 'FeatureCard'

const LoadingSkeleton = memo(() => (
  <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-emerald-50/30 dark:from-slate-900 dark:via-slate-950 dark:to-emerald-900/10">
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-center items-center min-h-[60vh]">
        <div className="text-center space-y-4">
          <div className="relative">
            <div className="w-16 h-16 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
            <div className="absolute inset-0 bg-gradient-to-r from-emerald-500 to-teal-500 blur-2xl opacity-20"></div>
          </div>
          <div>
            <p className="text-lg font-bold bg-gradient-to-r from-emerald-600 to-teal-500 bg-clip-text text-transparent">Loading Course</p>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">Preparing your learning experience...</p>
          </div>
        </div>
      </div>
    </div>
  </div>
))
LoadingSkeleton.displayName = 'LoadingSkeleton'

const ErrorState = memo(({ error, onRetry }: { error: string, onRetry: () => void }) => (
  <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-emerald-50/30 dark:from-slate-900 dark:via-slate-950 dark:to-emerald-900/10">
    <div className="container mx-auto px-4 py-8">
      <div className="text-center py-12">
        <div className="w-20 h-20 bg-gradient-to-br from-blue-100 to-purple-100 dark:from-blue-900/20 dark:to-purple-900/20 rounded-2xl flex items-center justify-center mx-auto mb-6">
          <BookOpen className="w-10 h-10 text-blue-600 dark:text-blue-400" />
        </div>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-3">
          Course Not Available
        </h2>
        <p className="text-slate-600 dark:text-slate-400 mb-8 max-w-md mx-auto">
          {error}
        </p>
        <div className="flex flex-col gap-3 max-w-xs mx-auto">
          <Button 
            onClick={onRetry} 
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-medium shadow-lg hover:shadow-xl transition-all"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Try Again
          </Button>
          <Button 
            onClick={() => window.location.href = '/courses'}
            variant="outline"
            className="px-6 py-3 rounded-xl font-medium border-slate-300 dark:border-slate-700 hover:border-slate-400 dark:hover:border-slate-600"
          >
            Browse All Courses
          </Button>
        </div>
      </div>
    </div>
  </div>
))
ErrorState.displayName = 'ErrorState'

// ==================== HELPER FUNCTIONS ====================
const formatDuration = (minutes: number): string => {
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  if (hours > 0) {
    return `${hours}h ${mins > 0 ? `${mins}m` : ''}`.trim()
  }
  return `${mins}m`
}

const formatDate = (dateString: string): string => {
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  })
}

// ==================== MAIN COMPONENT ====================
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
  const [isLiked, setIsLiked] = useState(false)
  const [showShareMenu, setShowShareMenu] = useState(false)
  const [copied, setCopied] = useState(false)

  const slug = params.slug as string

  // Fetch course data
  const fetchCourseData = useCallback(async () => {
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
  }, [slug, toast])

  const findLessonById = useCallback((courseData: Course, lessonId: string): Lesson | null => {
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
  }, [])

  useEffect(() => {
    if (slug) {
      fetchCourseData()
    }
  }, [slug, fetchCourseData])

  // Enrollment handler
  const enrollInCourse = useCallback(async () => {
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
        credentials: 'include'
      })

      console.log('📥 Enrollment response status:', response.status);
      const result = await response.json();
      console.log('📥 Enrollment response data:', result);

      if (response.status === 402 && result.requiresPayment) {
        console.log('💳 Payment required, showing payment modal');
        setShowPaymentModal(true);
        setIsEnrolling(null);
        return;
      }

      if (!response.ok) {
        console.error('❌ Server error response:', {
          status: response.status,
          statusText: response.statusText,
          result
        });
        throw new Error(result.error || `Failed to enroll (${response.status})`);
      }

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
  }, [course, isEnrolling, toast])

  // Progress updates
  const updateProgress = useCallback(async (lessonId: string, completed: boolean = false, isCurrent: boolean = true) => {
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
  }, [course, userProgress, toast])

  // Navigation
  const handleLessonSelect = useCallback((lesson: Lesson) => {
    setActiveLesson(lesson)
    updateProgress(lesson._id, false, true)
  }, [updateProgress])

  const handleLessonComplete = useCallback((lessonId: string) => {
    updateProgress(lessonId, true, false)
  }, [updateProgress])

  const getNextLesson = useCallback((): Lesson | null => {
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
  }, [course, activeLesson])

  const getPreviousLesson = useCallback((): Lesson | null => {
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
  }, [course, activeLesson])

  const navigateToLesson = useCallback((direction: 'next' | 'prev') => {
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
  }, [course, activeLesson, handleLessonSelect])

  // Keyboard shortcuts for learning mode
  useEffect(() => {
    if (!isLearningMode) return

    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') {
        navigateToLesson('next')
      } else if (e.key === 'ArrowLeft') {
        navigateToLesson('prev')
      } else if (e.key === 'Escape') {
        setIsLearningMode(false)
      }
    }

    window.addEventListener('keydown', handleKeyPress)
    return () => window.removeEventListener('keydown', handleKeyPress)
  }, [isLearningMode, navigateToLesson])

  // Rating submission
  const submitRating = useCallback(async () => {
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
  }, [course, newRating, isSubmittingRating, toast])

  // UI helpers
  const toggleModule = useCallback((moduleIndex: number) => {
    setExpandedModules(prev => {
      const newSet = new Set(prev)
      if (newSet.has(moduleIndex)) {
        newSet.delete(moduleIndex)
      } else {
        newSet.add(moduleIndex)
      }
      return newSet
    })
  }, [])

  const toggleChapter = useCallback((chapterId: string) => {
    setExpandedChapters(prev => {
      const newSet = new Set(prev)
      if (newSet.has(chapterId)) {
        newSet.delete(chapterId)
      } else {
        newSet.add(chapterId)
      }
      return newSet
    })
  }, [])

  const handlePreviewLesson = useCallback((lesson: Lesson) => {
    if (lesson.video && lesson.isPreview) {
      window.open(lesson.video.url, '_blank')
    }
  }, [])

  const calculateModuleProgress = useCallback((module: Module) => {
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
  }, [userProgress, completedLessons])

  const calculateChapterProgress = useCallback((chapter: Chapter) => {
    if (!userProgress || chapter.lessons.length === 0) return 0
    const completedInChapter = chapter.lessons.filter(lesson => 
      completedLessons.has(lesson._id)
    ).length
    return (completedInChapter / chapter.lessons.length) * 100
  }, [userProgress, completedLessons])

  // Share functionality
  const handleShare = useCallback(async () => {
    const url = window.location.href
    const title = course?.title || 'Check out this course!'
    
    if (navigator.share) {
      try {
        await navigator.share({
          title,
          text: course?.shortDescription,
          url,
        })
      } catch (err) {
        console.log('Share cancelled:', err)
      }
    } else {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      toast({
        title: 'Link Copied!',
        description: 'Course link copied to clipboard',
      })
      setTimeout(() => setCopied(false), 2000)
    }
  }, [course, toast])

  // Payment success handler
  const handlePaymentSuccess = useCallback((courseId: string) => {
    setShowPaymentModal(false)
    
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
    
    fetchCourseData()
  }, [course, fetchCourseData, toast])

  // Memoized components
  const EnrollmentButton = useMemo(() => {
    if (!userProgress || userProgress.enrolled === false) {
      return (
        <Button
          onClick={enrollInCourse}
          disabled={!!isEnrolling}
          className="group w-full h-12 text-sm font-semibold relative overflow-hidden bg-gradient-to-r from-emerald-600 via-teal-500 to-cyan-600 hover:from-emerald-700 hover:via-teal-600 hover:to-cyan-700 text-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02]"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
          
          <div className="relative flex items-center justify-center gap-2">
            {isEnrolling === course?._id ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Enrolling...</span>
              </>
            ) : (
              <>
                <Rocket className="w-4 h-4" />
                <span>{course?.isFree ? 'Start Learning Free' : `Enroll Now - $${course?.price}`}</span>
                {!course?.isFree && <span className="text-xs opacity-80">(Save 50%)</span>}
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
          className="w-full h-12 text-sm font-semibold bg-gradient-to-r from-emerald-500 via-green-500 to-teal-600 hover:from-emerald-600 hover:via-green-600 hover:to-teal-700 text-white rounded-xl shadow-sm hover:shadow-md transition-all duration-300"
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
        className="w-full h-12 text-sm font-semibold bg-gradient-to-r from-emerald-600 via-teal-500 to-cyan-600 hover:from-emerald-700 hover:via-teal-600 hover:to-cyan-700 text-white rounded-xl shadow-sm hover:shadow-md transition-all duration-300"
      >
        <Play className="w-4 h-4 mr-2" />
        {hasProgress ? 'Continue Learning' : 'Start Learning'}
        <Sparkles className="w-3 h-3 ml-2" />
      </Button>
    )
  }, [userProgress, isEnrolling, course, enrollInCourse, router, setIsLearningMode])

  // Learning Mode View
  if (isLearningMode && activeLesson) {
    const nextLesson = getNextLesson()
    const previousLesson = getPreviousLesson()

    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-950">
        {/* Learning Mode Header */}
        <div className="sticky top-0 z-50 bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm border-b border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="px-4 py-3 flex items-center justify-between">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsLearningMode(false)}
              className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div className="flex-1 mx-4 min-w-0">
              <h1 className="text-sm font-semibold text-slate-900 dark:text-white truncate">{course?.title}</h1>
              <div className="flex items-center gap-2 mt-1">
                <div className="flex-1 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 transition-all duration-500"
                    style={{ width: `${Math.round((userProgress?.progress || 0) * 100)}%` }}
                  />
                </div>
                <span className="text-xs font-bold bg-gradient-to-r from-emerald-600 to-teal-500 bg-clip-text text-transparent">
                  {Math.round((userProgress?.progress || 0) * 100)}%
                </span>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowMobileCurriculum(!showMobileCurriculum)}
              className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <Menu className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Main Learning Content */}
        <div className="container px-4 py-6">
          <div className="space-y-6">
            {/* Video Player */}
            <div className="bg-gradient-to-br from-slate-900 to-black rounded-2xl overflow-hidden shadow-2xl">
              {activeLesson.video ? (
                <video
                  src={activeLesson.video.url}
                  controls
                  className="w-full aspect-video"
                  playsInline
                />
              ) : (
                <div className="aspect-video flex items-center justify-center bg-gradient-to-br from-slate-900 to-black">
                  <div className="text-center p-8">
                    <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center mx-auto mb-4 backdrop-blur-sm">
                      <PlayCircle className="w-8 h-8 text-white/80" />
                    </div>
                    <h3 className="text-white text-lg font-semibold mb-2">Video Loading</h3>
                    <p className="text-white/60 text-sm">Preparing your lesson...</p>
                  </div>
                </div>
              )}
            </div>

            {/* Lesson Content */}
            <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm rounded-2xl border border-slate-200/50 dark:border-slate-700/50 shadow-lg overflow-hidden">
              <div className="p-6">
                <div className="mb-6">
                  <div className="flex items-center gap-2 mb-4">
                    <Badge className="bg-gradient-to-r from-emerald-500 to-teal-500 text-white border-0 px-3 py-1 rounded-full">
                      Lesson {(() => {
                        let lessonCount = 0
                        for (const module of course!.modules) {
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
                      <Badge className="bg-gradient-to-r from-amber-500 to-orange-500 text-white border-0 px-3 py-1 rounded-full">
                        <Eye className="w-3 h-3 mr-1" />
                        Preview
                      </Badge>
                    )}
                  </div>
                  
                  <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-3">
                    {activeLesson.title}
                  </h1>
                  
                  <p className="text-slate-700 dark:text-slate-300 leading-relaxed">
                    {activeLesson.description}
                  </p>
                </div>
                
                <Separator className="my-6" />
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4 text-slate-600 dark:text-slate-400">
                    <div className="flex items-center gap-2">
                      <Clock className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                      <span className="font-medium">{formatDuration(activeLesson.duration)}</span>
                    </div>
                  </div>
                  
                  <Button
                    onClick={() => handleLessonComplete(activeLesson._id)}
                    disabled={updatingProgress === activeLesson._id || completedLessons.has(activeLesson._id)}
                    className={`rounded-xl px-6 py-2.5 h-auto font-medium shadow-lg hover:shadow-xl transition-all ${
                      completedLessons.has(activeLesson._id) 
                        ? 'bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white' 
                        : 'bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-700 hover:to-teal-600 text-white'
                    }`}
                  >
                    {updatingProgress === activeLesson._id ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : completedLessons.has(activeLesson._id) ? (
                      <>
                        <CheckCircle className="w-5 h-5 mr-2" />
                        Completed
                      </>
                    ) : (
                      <>
                        <Check className="w-5 h-5 mr-2" />
                        Mark Complete
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>

            {/* Resources */}
            {activeLesson.resources && activeLesson.resources.length > 0 && (
              <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm rounded-2xl border border-slate-200/50 dark:border-slate-700/50 shadow-lg overflow-hidden">
                <div className="p-6">
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                    <div className="p-2 bg-gradient-to-br from-emerald-100 to-teal-100 dark:from-emerald-900/20 dark:to-teal-900/20 rounded-xl">
                      <FileText className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    Lesson Resources
                  </h3>
                  
                  <div className="space-y-3">
                    {activeLesson.resources.map((resource, index) => (
                      <div
                        key={index}
                        className="p-4 bg-gradient-to-br from-slate-50 to-white dark:from-slate-800/50 dark:to-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-emerald-300 dark:hover:border-emerald-600 transition-all duration-300 cursor-pointer group hover:shadow-md"
                        onClick={() => window.open(resource.url, '_blank')}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-gradient-to-br from-emerald-100 to-teal-100 dark:from-emerald-800 dark:to-teal-800 rounded-lg group-hover:scale-110 transition-transform">
                              <Download className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                            </div>
                            <div>
                              <p className="font-semibold text-slate-900 dark:text-white">
                                {resource.title}
                              </p>
                              <p className="text-sm text-slate-500 dark:text-slate-400">
                                {resource.type.toUpperCase()}
                              </p>
                            </div>
                          </div>
                          <ExternalLink className="w-4 h-4 text-slate-400 dark:text-slate-500 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Navigation */}
            <div className="flex gap-4">
              <Button
                variant="outline"
                onClick={() => navigateToLesson('prev')}
                disabled={!previousLesson}
                className="flex-1 rounded-xl text-sm py-3 h-auto border-slate-300 dark:border-slate-700 hover:border-slate-400 dark:hover:border-slate-600"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Previous
              </Button>

              <Button
                onClick={() => navigateToLesson('next')}
                disabled={!nextLesson}
                className="flex-1 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-700 hover:to-teal-600 text-white text-sm py-3 h-auto shadow-lg hover:shadow-xl transition-all"
              >
                Next Lesson
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        </div>

        {/* Mobile Curriculum Sidebar */}
        {showMobileCurriculum && (
          <div className="fixed inset-0 z-50 bg-white dark:bg-slate-950 animate-in slide-in-from-right">
            <div className="sticky top-0 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 p-6 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-gradient-to-br from-emerald-100 to-teal-100 dark:from-emerald-900/20 dark:to-teal-900/20 rounded-xl">
                    <BookOpen className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <h2 className="text-xl font-bold text-slate-900 dark:text-white">Course Content</h2>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowMobileCurriculum(false)}
                  className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  <X className="w-5 h-5" />
                </Button>
              </div>
            </div>
            <div className="h-[calc(100vh-80px)] overflow-y-auto p-6">
              {course?.modules.map((module, moduleIndex) => (
                <div key={module._id} className="mb-4">
                  <div 
                    className="p-4 bg-gradient-to-br from-slate-50 to-white dark:from-slate-800/50 dark:to-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-700 cursor-pointer hover:border-emerald-300 dark:hover:border-emerald-600 transition-all duration-300"
                    onClick={() => toggleModule(moduleIndex)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-lg flex items-center justify-center">
                          <span className="font-bold text-white text-sm">{moduleIndex + 1}</span>
                        </div>
                        <div>
                          <h3 className="font-bold text-slate-900 dark:text-white">{module.title}</h3>
                          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                            {module.chapters.length} chapters • {module.chapters.reduce((acc, ch) => acc + ch.lessons.length, 0)} lessons
                          </p>
                        </div>
                      </div>
                      <ChevronDown className={`w-5 h-5 text-slate-500 dark:text-slate-400 transition-transform ${expandedModules.has(moduleIndex) ? 'rotate-180' : ''}`} />
                    </div>
                  </div>
                  
                  {expandedModules.has(moduleIndex) && (
                    <div className="mt-3 space-y-3 animate-in fade-in">
                      {module.chapters.map((chapter, chapterIndex) => (
                        <div key={chapter._id} className="ml-4">
                          <div 
                            className="p-4 bg-gradient-to-br from-slate-50/50 to-white/50 dark:from-slate-800/30 dark:to-slate-900/30 rounded-xl border border-slate-200 dark:border-slate-700 cursor-pointer hover:border-emerald-300 dark:hover:border-emerald-600 transition-all duration-300"
                            onClick={() => toggleChapter(chapter._id)}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 bg-gradient-to-br from-emerald-400 to-teal-400 rounded-lg flex items-center justify-center">
                                  <span className="font-bold text-white text-xs">{chapterIndex + 1}</span>
                                </div>
                                <div>
                                  <h4 className="font-semibold text-slate-900 dark:text-white">{chapter.title}</h4>
                                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                                    {chapter.lessons.length} lessons
                                  </p>
                                </div>
                              </div>
                              <ChevronDown className={`w-5 h-5 text-slate-500 dark:text-slate-400 transition-transform ${expandedChapters.has(chapter._id) ? 'rotate-180' : ''}`} />
                            </div>
                          </div>
                          
                          {expandedChapters.has(chapter._id) && (
                            <div className="mt-2 ml-4 space-y-2 animate-in fade-in">
                              {chapter.lessons.map((lesson, lessonIndex) => {
                                const isCompleted = completedLessons.has(lesson._id)
                                const isActive = activeLesson?._id === lesson._id
                                
                                return (
                                  <div
                                    key={lesson._id}
                                    className={`p-4 rounded-xl border cursor-pointer transition-all duration-300 ${
                                      isActive 
                                        ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white border-transparent shadow-lg' 
                                        : isCompleted
                                        ? 'bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 border-emerald-200 dark:border-emerald-800'
                                        : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-emerald-300 dark:hover:border-emerald-600 hover:shadow-md'
                                    }`}
                                    onClick={() => {
                                      handleLessonSelect(lesson)
                                      setShowMobileCurriculum(false)
                                    }}
                                  >
                                    <div className="flex items-center justify-between">
                                      <div className="flex items-center gap-3">
                                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                                          isActive ? 'bg-white/20' : isCompleted ? 'bg-emerald-100 dark:bg-emerald-900/30' : 'bg-gradient-to-br from-emerald-100 to-teal-100 dark:from-emerald-900/20 dark:to-teal-900/20'
                                        }`}>
                                          {isCompleted ? (
                                            <Check className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                                          ) : (
                                            <PlayCircle className={`w-5 h-5 ${isActive ? 'text-white' : 'text-emerald-600 dark:text-emerald-400'}`} />
                                          )}
                                        </div>
                                        <div className="flex-1">
                                          <p className={`font-medium ${isActive ? 'text-white' : 'text-slate-900 dark:text-white'}`}>
                                            {lessonIndex + 1}. {lesson.title}
                                          </p>
                                          <div className="flex items-center gap-2 mt-1">
                                            <Clock className={`w-4 h-4 ${isActive ? 'text-white/80' : 'text-slate-400 dark:text-slate-500'}`} />
                                            <span className={`text-sm ${isActive ? 'text-white/80' : 'text-slate-500 dark:text-slate-400'}`}>
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

  // Loading state
  if (loading) {
    return <LoadingSkeleton />
  }

  // Error state
  if (error || !course) {
    return <ErrorState error={error || 'Course not found'} onRetry={fetchCourseData} />
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-emerald-50/30 dark:from-slate-900 dark:via-slate-950 dark:to-emerald-900/10 pb-20">
      {/* Mobile Header */}
      <div className="sticky top-0 z-50 bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm border-b border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="px-4 py-3 flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.back()}
            className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <h1 className="text-sm font-semibold text-slate-900 dark:text-white truncate max-w-[160px] text-center">
            {course.title}
          </h1>
          <div className="flex items-center gap-1">
            <Button 
              variant="ghost" 
              size="sm" 
              className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
              onClick={() => setIsLiked(!isLiked)}
            >
              <Heart className={`w-4 h-4 ${isLiked ? 'fill-rose-500 text-rose-500' : 'text-slate-500 dark:text-slate-400'}`} />
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
              onClick={() => setIsBookmarked(!isBookmarked)}
            >
              <Bookmark className={`w-4 h-4 ${isBookmarked ? 'fill-emerald-500 text-emerald-500' : 'text-slate-500 dark:text-slate-400'}`} />
            </Button>
          </div>
        </div>
      </div>

      {/* Hero Section */}
      <div className="relative overflow-hidden">
        {/* Background Gradient */}
        <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-cyan-500/10" />
        
        <div className="relative px-4 pt-6 pb-8">
          {/* Preview Video */}
          {course.previewVideo && (
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-3">
                <div className="p-1.5 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-lg">
                  <Play className="w-3.5 h-3.5 text-white" />
                </div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">Course Preview</h2>
              </div>
              <div className="relative rounded-2xl overflow-hidden shadow-2xl bg-black">
                <video
                  src={course.previewVideo.url}
                  className="w-full aspect-video"
                  controls
                  playsInline
                />
                <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-black/50 to-transparent" />
              </div>
            </div>
          )}

          {/* Course Header */}
          <div className="space-y-4">
            {/* Badges */}
            <div className="flex flex-wrap gap-2">
              <Badge className="bg-gradient-to-r from-emerald-500 to-teal-500 text-white border-0 px-3 py-1 rounded-full">
                {course.category}
              </Badge>
              <Badge className={`px-3 py-1 rounded-full border-0 ${
                course.level === 'beginner' ? 'bg-gradient-to-r from-emerald-500 to-green-500 text-white' :
                course.level === 'intermediate' ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white' :
                'bg-gradient-to-r from-rose-500 to-pink-500 text-white'
              }`}>
                {course.level.charAt(0).toUpperCase() + course.level.slice(1)} Level
              </Badge>
              {course.isFeatured && (
                <Badge className="bg-gradient-to-r from-purple-500 to-pink-500 text-white border-0 px-3 py-1 rounded-full flex items-center gap-1">
                  <Sparkle className="w-3 h-3" />
                  Featured
                </Badge>
              )}
            </div>

            {/* Title */}
            <h1 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white leading-tight">
              {course.title}
            </h1>
            
            {/* Short Description */}
            <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
              {course.shortDescription}
            </p>

            {/* Instructor Info */}
            <div className="flex items-center gap-3 p-3 bg-gradient-to-r from-emerald-50/50 to-teal-50/50 dark:from-emerald-900/20 dark:to-teal-900/20 rounded-xl border border-slate-200 dark:border-slate-700">
              <div className="relative">
                <div className="w-12 h-12 rounded-xl overflow-hidden bg-gradient-to-br from-emerald-500 to-teal-500 p-0.5">
                  <div className="w-full h-full rounded-lg overflow-hidden bg-white dark:bg-slate-800">
                    <img
                      src={course.instructor.avatar || '/placeholder-avatar.jpg'}
                      alt={course.instructor.username}
                      className="w-full h-full object-cover"
                    />
                  </div>
                </div>
                <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-gradient-to-br from-amber-400 to-orange-500 rounded-full border-2 border-white dark:border-slate-900 flex items-center justify-center">
                  <Crown className="w-2.5 h-2.5 text-white" />
                </div>
              </div>
              <div className="flex-1">
                <p className="font-bold text-slate-900 dark:text-white">
                  {course.instructor.firstName} {course.instructor.lastName}
                </p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <div className="flex items-center">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        className={`w-3 h-3 ${
                          star <= Math.floor(course.instructor.rating || 5)
                            ? 'fill-amber-400 text-amber-400'
                            : 'text-slate-300 dark:text-slate-600'
                        }`}
                      />
                    ))}
                  </div>
                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">{course.instructor.rating?.toFixed(1) || '5.0'}</span>
                  <span className="text-xs text-slate-500 dark:text-slate-400">• Expert Instructor</span>
                </div>
              </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-4 gap-2">
              <div className="text-center p-2 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm rounded-xl border border-slate-200 dark:border-slate-700">
                <div className="flex items-center justify-center gap-1.5 mb-1">
                  <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                  <span className="font-bold text-slate-900 dark:text-white">{course.averageRating.toFixed(1)}</span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Rating</p>
              </div>
              
              <div className="text-center p-2 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm rounded-xl border border-slate-200 dark:border-slate-700">
                <div className="flex items-center justify-center gap-1.5 mb-1">
                  <Users className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span className="font-bold text-slate-900 dark:text-white">{course.totalStudents}</span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Students</p>
              </div>
              
              <div className="text-center p-2 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm rounded-xl border border-slate-200 dark:border-slate-700">
                <div className="flex items-center justify-center gap-1.5 mb-1">
                  <BookOpen className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                  <span className="font-bold text-slate-900 dark:text-white">{course.totalLessons}</span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Lessons</p>
              </div>
              
              <div className="text-center p-2 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm rounded-xl border border-slate-200 dark:border-slate-700">
                <div className="flex items-center justify-center gap-1.5 mb-1">
                  <Clock className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
                  <span className="font-bold text-slate-900 dark:text-white">{formatDuration(course.totalDuration)}</span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Duration</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="sticky top-[60px] z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm border-b border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex overflow-x-auto px-4 -mb-px hide-scrollbar">
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
                className={`flex items-center gap-2 px-4 py-3 font-medium border-b-2 whitespace-nowrap text-sm transition-all ${
                  activeTab === tab.id
                    ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400 bg-gradient-to-r from-emerald-50 to-emerald-50/50 dark:from-emerald-900/20 dark:to-emerald-900/10'
                    : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Main Content */}
      <div className="px-4 py-6">
        <div className="space-y-8">
          {activeTab === 'overview' && (
            <>
              {/* Course Description */}
              <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm rounded-2xl border border-slate-200/50 dark:border-slate-700/50 shadow-lg p-6">
                <SectionHeader 
                  title="Course Description" 
                  description="What you'll learn in this course"
                  icon={BookOpen}
                />
                <div className="prose prose-sm dark:prose-invert max-w-none">
                  <p className="text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-line">
                    {course.description}
                  </p>
                </div>
              </div>

              {/* What You'll Learn */}
              <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm rounded-2xl border border-slate-200/50 dark:border-slate-700/50 shadow-lg p-6">
                <SectionHeader 
                  title="What You'll Learn" 
                  description="Key skills and knowledge you'll gain"
                  icon={Target}
                  color="from-emerald-500 to-green-500"
                />
                <div className="grid grid-cols-1 gap-3">
                  {course.learningOutcomes.map((outcome, index) => (
                    <div key={index} className="flex items-start gap-3 p-3 bg-gradient-to-br from-slate-50 to-white dark:from-slate-800/50 dark:to-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-700">
                      <div className="w-6 h-6 bg-gradient-to-br from-emerald-100 to-green-100 dark:from-emerald-900/30 dark:to-green-900/30 rounded-lg flex items-center justify-center flex-shrink-0">
                        <Check className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                      </div>
                      <span className="font-medium text-slate-900 dark:text-white">{outcome}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Requirements */}
              <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm rounded-2xl border border-slate-200/50 dark:border-slate-700/50 shadow-lg p-6">
                <SectionHeader 
                  title="Requirements" 
                  description="What you need before starting"
                  icon={Zap}
                  color="from-amber-500 to-orange-500"
                />
                <div className="grid grid-cols-1 gap-3">
                  {course.requirements.map((requirement, index) => (
                    <div key={index} className="flex items-center gap-3 p-3 bg-gradient-to-br from-slate-50 to-white dark:from-slate-800/50 dark:to-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-700">
                      <div className="w-8 h-8 bg-gradient-to-br from-emerald-100 to-teal-100 dark:from-emerald-900/20 dark:to-teal-900/20 rounded-lg flex items-center justify-center">
                        <span className="font-bold text-emerald-700 dark:text-emerald-400 text-sm">{index + 1}</span>
                      </div>
                      <span className="font-medium text-slate-900 dark:text-white">{requirement}</span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {activeTab === 'curriculum' && (
            <div className="space-y-6">
              <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm rounded-2xl border border-slate-200/50 dark:border-slate-700/50 shadow-lg p-6">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-gradient-to-br from-purple-100 to-pink-100 dark:from-purple-900/20 dark:to-pink-900/20 rounded-xl">
                      <GraduationCap className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-slate-900 dark:text-white">Course Curriculum</h3>
                      <p className="text-slate-600 dark:text-slate-400 mt-1">
                        {course.totalLessons} lessons • {course.modules.length} modules • {formatDuration(course.totalDuration)} total
                      </p>
                    </div>
                  </div>
                  {userProgress?.enrolled && (
                    <div className="text-right">
                      <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">Your Progress</p>
                      <p className="text-2xl font-bold bg-gradient-to-r from-emerald-600 to-teal-500 bg-clip-text text-transparent">
                        {Math.round(userProgress.progress * 100)}%
                      </p>
                    </div>
                  )}
                </div>

                <div className="space-y-4">
                  {course.modules.map((module, moduleIndex) => {
                    const moduleProgress = calculateModuleProgress(module)
                    
                    return (
                      <div key={module._id} className="bg-gradient-to-br from-slate-50/50 to-white/50 dark:from-slate-800/30 dark:to-slate-900/30 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                        <div 
                          className="p-4 cursor-pointer hover:bg-gradient-to-r hover:from-slate-50 hover:to-slate-50/50 dark:hover:from-slate-800/50 dark:hover:to-slate-800/30 transition-all duration-300"
                          onClick={() => toggleModule(moduleIndex)}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-xl flex items-center justify-center">
                                <span className="font-bold text-white text-base">{moduleIndex + 1}</span>
                              </div>
                              <div className="flex-1">
                                <h4 className="font-bold text-slate-900 dark:text-white">{module.title}</h4>
                                <div className="flex items-center gap-3 text-sm text-slate-500 dark:text-slate-400 mt-1">
                                  <span>{module.chapters.length} chapters</span>
                                  <span>•</span>
                                  <span>{module.chapters.reduce((acc, ch) => acc + ch.lessons.length, 0)} lessons</span>
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              {userProgress?.enrolled && (
                                <div className="text-right hidden sm:block">
                                  <div className="text-xs font-medium text-slate-500 dark:text-slate-400">Progress</div>
                                  <div className="text-sm font-bold text-emerald-600 dark:text-emerald-400">{Math.round(moduleProgress)}%</div>
                                </div>
                              )}
                              <ChevronDown className={`w-5 h-5 text-slate-500 dark:text-slate-400 transition-transform duration-300 ${expandedModules.has(moduleIndex) ? 'rotate-180' : ''}`} />
                            </div>
                          </div>
                        </div>
                        
                        {expandedModules.has(moduleIndex) && (
                          <div className="px-4 pb-4 animate-in fade-in duration-300">
                            <div className="space-y-3">
                              {module.chapters.map((chapter, chapterIndex) => {
                                const chapterProgress = calculateChapterProgress(chapter)
                                
                                return (
                                  <div key={chapter._id} className="ml-4">
                                    <div 
                                      className="p-4 bg-gradient-to-br from-white/50 to-slate-50/30 dark:from-slate-800/20 dark:to-slate-900/10 rounded-xl border border-slate-200 dark:border-slate-700 cursor-pointer hover:border-emerald-300 dark:hover:border-emerald-600 transition-all duration-300"
                                      onClick={() => toggleChapter(chapter._id)}
                                    >
                                      <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                          <div className="w-8 h-8 bg-gradient-to-br from-emerald-400 to-teal-400 rounded-lg flex items-center justify-center">
                                            <span className="font-bold text-white text-sm">{chapterIndex + 1}</span>
                                          </div>
                                          <div className="flex-1">
                                            <h5 className="font-bold text-slate-900 dark:text-white">{chapter.title}</h5>
                                            <div className="flex items-center gap-3 text-sm text-slate-500 dark:text-slate-400 mt-1">
                                              <span>{chapter.lessons.length} lessons</span>
                                            </div>
                                          </div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                          {userProgress?.enrolled && (
                                            <div className="text-right hidden sm:block">
                                              <div className="text-xs font-medium text-slate-500 dark:text-slate-400">Progress</div>
                                              <div className="text-sm font-bold text-emerald-600 dark:text-emerald-400">{Math.round(chapterProgress)}%</div>
                                            </div>
                                          )}
                                          <ChevronDown className={`w-5 h-5 text-slate-500 dark:text-slate-400 transition-transform duration-300 ${expandedChapters.has(chapter._id) ? 'rotate-180' : ''}`} />
                                        </div>
                                      </div>
                                    </div>
                                    
                                    {expandedChapters.has(chapter._id) && (
                                      <div className="mt-2 ml-4 space-y-2 animate-in fade-in duration-300">
                                        {chapter.lessons.map((lesson, lessonIndex) => {
                                          const isCompleted = completedLessons.has(lesson._id)
                                          
                                          return (
                                            <div
                                              key={lesson._id}
                                              className="p-4 bg-gradient-to-br from-white to-slate-50/50 dark:from-slate-800 dark:to-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-700"
                                            >
                                              <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-3">
                                                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                                                    isCompleted 
                                                      ? 'bg-gradient-to-br from-emerald-100 to-teal-100 dark:from-emerald-900/30 dark:to-teal-900/30' 
                                                      : 'bg-gradient-to-br from-emerald-100 to-teal-100 dark:from-emerald-900/20 dark:to-teal-900/20'
                                                  }`}>
                                                    {isCompleted ? (
                                                      <Check className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                                                    ) : (
                                                      <PlayCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                                                    )}
                                                  </div>
                                                  <div className="flex-1 min-w-0">
                                                    <p className="font-semibold text-slate-900 dark:text-white">
                                                      {lessonIndex + 1}. {lesson.title}
                                                    </p>
                                                    <div className="flex items-center gap-3 mt-1">
                                                      <div className="flex items-center gap-1 text-sm text-slate-500 dark:text-slate-400">
                                                        <Clock className="w-3.5 h-3.5" />
                                                        <span>{formatDuration(lesson.duration)}</span>
                                                      </div>
                                                      {lesson.isPreview && (
                                                        <Badge className="bg-gradient-to-r from-amber-100 to-orange-100 dark:from-amber-900/30 dark:to-orange-900/30 text-amber-700 dark:text-amber-300 text-xs px-2 py-0.5 rounded-full">
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
                                                    className={`rounded-lg px-4 py-2 h-auto ${
                                                      isCompleted 
                                                        ? 'bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 hover:bg-gradient-to-r hover:from-emerald-100 hover:to-teal-100 dark:hover:from-emerald-900/30 dark:hover:to-teal-900/30' 
                                                        : 'bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-700 hover:to-teal-600 text-white'
                                                    }`}
                                                  >
                                                    {isCompleted ? 'Review' : 'Start'}
                                                  </Button>
                                                ) : lesson.isPreview && lesson.video ? (
                                                  <Button 
                                                    onClick={() => handlePreviewLesson(lesson)}
                                                    className="rounded-lg bg-gradient-to-r from-amber-100 to-orange-100 dark:from-amber-900/30 dark:to-orange-900/30 text-amber-700 dark:text-amber-300 hover:bg-gradient-to-r hover:from-amber-200 hover:to-orange-200 dark:hover:from-amber-900/40 dark:hover:to-orange-900/40 px-4 py-2 h-auto border border-amber-200 dark:border-amber-800"
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
            </div>
          )}

          {activeTab === 'reviews' && (
            <div className="space-y-6">
              {/* Review Stats */}
              <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm rounded-2xl border border-slate-200/50 dark:border-slate-700/50 shadow-lg p-6">
                <div className="text-center mb-6">
                  <div className="text-4xl font-bold text-slate-900 dark:text-white mb-2">
                    {course.averageRating.toFixed(1)}
                    <span className="text-2xl text-slate-500 dark:text-slate-400">/5</span>
                  </div>
                  <div className="flex items-center justify-center gap-1 mb-3">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        className={`w-5 h-5 ${
                          star <= Math.floor(course.averageRating)
                            ? 'fill-amber-400 text-amber-400'
                            : star <= Math.ceil(course.averageRating)
                            ? 'fill-amber-400/50 text-amber-400/50'
                            : 'text-slate-300 dark:text-slate-600'
                        }`}
                      />
                    ))}
                  </div>
                  <p className="text-slate-600 dark:text-slate-400">
                    Based on {course.totalReviews} {course.totalReviews === 1 ? 'review' : 'reviews'}
                  </p>
                </div>

                {/* Rating Distribution */}
                <div className="space-y-2 mb-6">
                  {[5, 4, 3, 2, 1].map((rating) => {
                    const count = course.ratings.filter(r => r.rating === rating).length
                    const percentage = (count / course.totalReviews) * 100
                    return (
                      <div key={rating} className="flex items-center gap-3">
                        <div className="flex items-center gap-1 w-10">
                          <span className="text-sm text-slate-600 dark:text-slate-400">{rating}</span>
                          <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                        </div>
                        <div className="flex-1 h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-gradient-to-r from-amber-400 to-orange-400 rounded-full"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                        <span className="text-sm text-slate-600 dark:text-slate-400 w-10 text-right">{count}</span>
                      </div>
                    )
                  })}
                </div>

                <Separator className="my-6" />

                {/* Add Review Form */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Your Rating</label>
                    <div className="flex gap-1">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          type="button"
                          onClick={() => setNewRating(prev => ({ ...prev, rating: star }))}
                          className="p-2 hover:scale-110 transition-transform"
                        >
                          <Star
                            className={`w-6 h-6 ${
                              star <= newRating.rating
                                ? 'fill-amber-400 text-amber-400'
                                : 'text-slate-300 dark:text-slate-600 hover:text-amber-300'
                            }`}
                          />
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Your Review</label>
                    <Textarea
                      value={newRating.review}
                      onChange={(e) => setNewRating(prev => ({ ...prev, review: e.target.value }))}
                      placeholder="Share your learning experience..."
                      className="min-h-[100px] rounded-xl text-sm border-slate-300 dark:border-slate-700 focus:border-emerald-500 focus:ring-emerald-500"
                    />
                  </div>
                  <Button
                    onClick={submitRating}
                    disabled={isSubmittingRating || !newRating.rating}
                    className="w-full bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-700 hover:to-teal-600 text-white rounded-xl py-3 font-medium shadow-lg hover:shadow-xl transition-all"
                  >
                    {isSubmittingRating ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                        Submitting Review...
                      </>
                    ) : (
                      'Submit Review'
                    )}
                  </Button>
                </div>
              </div>

              {/* Reviews List */}
              <div className="space-y-4">
                {course.ratings.map((rating) => (
                  <div key={rating._id} className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm rounded-2xl border border-slate-200/50 dark:border-slate-700/50 shadow-lg p-6">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 bg-gradient-to-br from-emerald-100 to-teal-100 dark:from-emerald-900/20 dark:to-teal-900/20 rounded-xl flex items-center justify-center flex-shrink-0">
                        <span className="font-bold text-emerald-700 dark:text-emerald-400 text-lg">
                          {rating.user.firstName.charAt(0)}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-3">
                          <div>
                            <p className="font-bold text-slate-900 dark:text-white">
                              {rating.user.firstName} {rating.user.lastName}
                            </p>
                            <div className="flex items-center gap-1 mt-1">
                              {[1, 2, 3, 4, 5].map((star) => (
                                <Star
                                  key={star}
                                  className={`w-3 h-3 ${
                                    star <= rating.rating
                                      ? 'fill-amber-400 text-amber-400'
                                      : 'text-slate-300 dark:text-slate-600'
                                  }`}
                                />
                              ))}
                            </div>
                          </div>
                          <span className="text-sm text-slate-500 dark:text-slate-400 mt-1 sm:mt-0">
                            {formatDate(rating.createdAt)}
                          </span>
                        </div>
                        {rating.review && (
                          <p className="text-slate-700 dark:text-slate-300 leading-relaxed">{rating.review}</p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'instructor' && course.instructor && (
            <div className="space-y-6">
              {/* Instructor Card */}
              <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm rounded-2xl border border-slate-200/50 dark:border-slate-700/50 shadow-lg p-6">
                <div className="flex items-start gap-4 mb-6">
                  <div className="relative">
                    <div className="w-16 h-16 rounded-xl overflow-hidden bg-gradient-to-br from-emerald-500 to-teal-500 p-0.5">
                      <div className="w-full h-full rounded-lg overflow-hidden bg-white dark:bg-slate-800">
                        <img
                          src={course.instructor.avatar || '/placeholder-avatar.jpg'}
                          alt={course.instructor.username}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    </div>
                    <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-gradient-to-br from-amber-400 to-orange-500 rounded-full border-2 border-white dark:border-slate-900 flex items-center justify-center">
                      <Crown className="w-4 h-4 text-white" />
                    </div>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-1">
                      {course.instructor.firstName} {course.instructor.lastName}
                    </h3>
                    <p className="text-slate-600 dark:text-slate-400 mb-3">
                      Expert Instructor • {course.instructor.expertise?.[0] || 'Industry Leader'}
                    </p>
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-1.5">
                        <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                        <span className="font-bold text-slate-900 dark:text-white">{course.instructor.rating?.toFixed(1) || '5.0'}</span>
                        <span className="text-sm text-slate-500 dark:text-slate-400">Rating</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Users className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                        <span className="font-bold text-slate-900 dark:text-white">{course.instructor.totalStudents?.toLocaleString() || '10K+'}</span>
                        <span className="text-sm text-slate-500 dark:text-slate-400">Students</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="font-bold text-slate-900 dark:text-white mb-3 text-lg">About Instructor</h4>
                  <div className="prose prose-sm dark:prose-invert max-w-none">
                    <p className="text-slate-700 dark:text-slate-300 leading-relaxed">
                      {course.instructor.bio || `${course.instructor.firstName} is an experienced instructor with years of hands-on experience in the field. They are passionate about sharing knowledge and helping students achieve their goals through practical, real-world learning.`}
                    </p>
                  </div>
                </div>
              </div>

              {/* Stats Cards */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-4 bg-gradient-to-br from-emerald-50/50 to-teal-50/50 dark:from-emerald-900/20 dark:to-teal-900/20 rounded-xl border border-slate-200 dark:border-slate-700">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-gradient-to-br from-emerald-100 to-teal-100 dark:from-emerald-800 dark:to-teal-800 rounded-lg">
                      <TrendingUpIcon className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <div>
                      <p className="font-bold text-slate-900 dark:text-white text-lg">
                        {course.instructor.totalStudents?.toLocaleString() || '10K+'}
                      </p>
                      <p className="text-sm text-slate-600 dark:text-slate-400">Total Students</p>
                    </div>
                  </div>
                </div>
                
                <div className="p-4 bg-gradient-to-br from-purple-50/50 to-pink-50/50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-xl border border-slate-200 dark:border-slate-700">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-gradient-to-br from-purple-100 to-pink-100 dark:from-purple-800 dark:to-pink-800 rounded-lg">
                      <Award className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                    </div>
                    <div>
                      <p className="font-bold text-slate-900 dark:text-white text-lg">
                        {course.instructor.rating?.toFixed(1) || '5.0'}
                      </p>
                      <p className="text-sm text-slate-600 dark:text-slate-400">Average Rating</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Expertise */}
              <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm rounded-2xl border border-slate-200/50 dark:border-slate-700/50 shadow-lg p-6">
                <h4 className="font-bold text-slate-900 dark:text-white mb-4 text-lg">Areas of Expertise</h4>
                <div className="flex flex-wrap gap-2">
                  {(course.instructor.expertise || [
                    'Industry Best Practices',
                    'Practical Application',
                    'Career Development',
                    'Advanced Techniques',
                    'Real-World Projects'
                  ]).map((expertise, index) => (
                    <Badge 
                      key={index}
                      className="bg-gradient-to-r from-emerald-100 to-teal-100 dark:from-emerald-900/30 dark:to-teal-900/30 text-emerald-700 dark:text-emerald-400 border-0 px-3 py-1.5 rounded-lg text-sm font-medium"
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
      <div className="px-4 py-8 bg-gradient-to-br from-emerald-50/50 to-teal-50/50 dark:from-emerald-900/10 dark:to-teal-900/10 border-y border-slate-200 dark:border-slate-800">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 mb-3">
              <div className="p-2 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-lg">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-slate-900 dark:text-white">Why Choose This Course?</h3>
            </div>
            <p className="text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
              Experience learning like never before with our comprehensive features designed for your success
            </p>
          </div>
          
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <FeatureCard
              icon={ShieldCheck}
              title="Lifetime Access"
              description="Learn at your own pace with lifetime access to course materials"
              color="emerald"
            />
            
            <FeatureCard
              icon={Award}
              title="Certificate"
              description="Earn a verifiable certificate upon completion"
              color="green"
            />
            
            <FeatureCard
              icon={DownloadCloud}
              title="Downloadable Resources"
              description="Access and download all course resources"
              color="purple"
            />
            
            <FeatureCard
              icon={Users2}
              title="Community Access"
              description="Join our exclusive learning community"
              color="amber"
            />
          </div>
        </div>
      </div>

      {/* Mobile Enrollment Footer */}
      <div className="sticky bottom-0 z-50 bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm border-t border-slate-200 dark:border-slate-800 shadow-2xl">
        <div className="p-4">
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <div className="text-xl font-bold text-slate-900 dark:text-white">
                {userProgress?.enrolled ? 'Continue Learning' : course.isFree ? 'Start Learning Free' : `$${course.price}`}
              </div>
              {!userProgress?.enrolled && !course.isFree && (
                <div className="flex items-center gap-2 mt-1">
                  <p className="text-slate-500 dark:text-slate-400 line-through text-sm">${course.price * 2}</p>
                  <Badge className="bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-xs px-2 py-0.5">
                    50% OFF
                  </Badge>
                </div>
              )}
            </div>
            <div className="flex-shrink-0 w-40">
              {EnrollmentButton}
            </div>
          </div>
        </div>
      </div>

      {/* Success Toast */}
      <AnimatePresence>
        {showEnrollmentSuccess && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-20 left-1/2 transform -translate-x-1/2 z-50"
          >
            <div className="bg-gradient-to-r from-emerald-500 to-teal-500 text-white px-6 py-3 rounded-xl shadow-2xl flex items-center gap-2">
              <CheckCircle className="w-5 h-5" />
              <span className="font-medium">Successfully Enrolled!</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Payment Modal */}
      {course && (
        <PaymentModal
          course={course}
          isOpen={showPaymentModal}
          onClose={() => setShowPaymentModal(false)}
          onSuccess={handlePaymentSuccess}
        />
      )}

      <style jsx global>{`
        .hide-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .hide-scrollbar::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </div>
  )
}