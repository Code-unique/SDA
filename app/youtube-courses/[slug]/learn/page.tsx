'use client'

import { useState, useEffect, useCallback, useMemo, Suspense } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { useToast } from '@/components/ui/use-toast'
import { Separator } from '@/components/ui/separator'
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize2,
  Minimize2,
  ChevronLeft,
  ChevronRight,
  BookOpen,
  CheckCircle,
  Clock,
  FileText,
  Download,
  Home,
  Menu,
  X,
  Youtube,
  Loader2,
  AlertCircle,
  Lock,
  RefreshCw
} from 'lucide-react'
import Link from 'next/link'

interface YouTubeVideo {
  type: 'youtube'
  videoId: string
  url: string
  thumbnailUrl?: string
  duration?: number
  title?: string
  channel?: string
}

interface LessonResource {
  _id: string
  title: string
  url: string
  type: 'pdf' | 'document' | 'link' | 'youtube'
  description?: string
}

interface SubLesson {
  _id: string
  title: string
  description: string
  content?: string
  videoSource?: YouTubeVideo
  duration: number
  isPreview: boolean
  resources: LessonResource[]
  order: number
}

interface Lesson {
  _id: string
  title: string
  description: string
  content?: string
  videoSource?: YouTubeVideo
  duration: number
  isPreview: boolean
  resources: LessonResource[]
  subLessons: SubLesson[]
  order: number
}

interface Chapter {
  _id: string
  title: string
  description?: string
  lessons: Lesson[]
  order: number
}

interface Module {
  _id: string
  title: string
  description?: string
  thumbnailUrl?: string
  chapters: Chapter[]
  order: number
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
  }
  modules: Module[]
  totalDuration: number
  totalLessons: number
  isFree: boolean
  manualEnrollmentEnabled: boolean
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

interface ContentItem {
  id: string
  title: string
  type: 'lesson' | 'sublesson'
  lesson: Lesson | SubLesson
  moduleIndex: number
  chapterIndex: number
  lessonIndex: number
  subLessonIndex?: number
  duration: number
}

// Helper to decode URL parameter
function decodeParam(param: string | string[]): string {
  if (Array.isArray(param)) {
    return param[0] || ''
  }
  return param || ''
}

export default function YouTubeCourseLearningPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    }>
      <YouTubeCourseLearningContent />
    </Suspense>
  )
}

function YouTubeCourseLearningContent() {
  const params = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const { toast } = useToast()
  
  const [course, setCourse] = useState<Course | null>(null)
  const [userProgress, setUserProgress] = useState<UserProgress | null>(null)
  const [enrollmentStatus, setEnrollmentStatus] = useState<{
    enrolled: boolean
    status?: 'pending' | 'approved' | 'rejected'
  } | null>(null)
  const [loading, setLoading] = useState(true)
  const [updatingProgress, setUpdatingProgress] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const [currentItem, setCurrentItem] = useState<ContentItem | null>(null)
  const [showSidebar, setShowSidebar] = useState(true)
  const [showResources, setShowResources] = useState(false)
  const [expandedModules, setExpandedModules] = useState<Set<number>>(new Set())
  const [expandedChapters, setExpandedChapters] = useState<Set<string>>(new Set())
  
  const rawSlug = params.slug
  const slug = typeof rawSlug === 'string' ? decodeParam(rawSlug) : ''

  const lessonParam = searchParams.get('lesson')

  console.log('Learning page params:', { rawSlug, slug, lessonParam })

  const fetchCourseData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      
      console.log('Fetching course data for slug:', slug)
      
      // Fetch course
      const courseResponse = await fetch(`/api/youtube-courses/${encodeURIComponent(slug)}`)
      
      if (!courseResponse.ok) {
        const errorData = await courseResponse.json()
        console.error('Course fetch error:', errorData)
        throw new Error(errorData.error || 'Course not found')
      }
      
      const courseData = await courseResponse.json()
      console.log('Course data loaded:', courseData)
      setCourse(courseData)
      
      // Check enrollment status
      const enrollmentResponse = await fetch(`/api/youtube-courses/${encodeURIComponent(slug)}/enrollment-status`)
      if (enrollmentResponse.ok) {
        const enrollmentData = await enrollmentResponse.json()
        console.log('Enrollment status:', enrollmentData)
        setEnrollmentStatus(enrollmentData)
      }
      
      // Fetch progress
      const progressResponse = await fetch(`/api/youtube-courses/${encodeURIComponent(slug)}/progress`)
      if (progressResponse.ok) {
        const progressData = await progressResponse.json()
        console.log('Progress data:', progressData)
        setUserProgress(progressData)
        
        // If user is not enrolled but should be (based on enrollment status), force enroll
        if (!progressData.enrolled && enrollmentStatus?.enrolled) {
          console.log('User is enrolled but no progress, creating progress...')
          await createUserProgress(courseData._id)
        }
      } else if (enrollmentStatus?.enrolled) {
        // If enrolled but no progress, create it
        console.log('No progress found but user is enrolled, creating progress...')
        await createUserProgress(courseData._id)
      }
      
    } catch (error) {
      console.error('Error fetching course data:', error)
      setError(error instanceof Error ? error.message : 'Failed to load course data')
      toast({
        title: 'Error',
        description: 'Failed to load course data',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }, [slug, toast])

  const createUserProgress = async (courseId: string) => {
    try {
      const response = await fetch(`/api/youtube-courses/${slug}/progress`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          lessonId: null,
          completed: false,
          current: false
        })
      })
      
      if (response.ok) {
        const progressData = await response.json()
        console.log('Created user progress:', progressData)
        setUserProgress(progressData)
      }
    } catch (error) {
      console.error('Error creating user progress:', error)
    }
  }

  useEffect(() => {
    if (slug) {
      fetchCourseData()
    }
  }, [slug, fetchCourseData])

  useEffect(() => {
    if (course && userProgress) {
      const allItems = getAllContentItems()
      let itemToShow = allItems[0]
      
      // Try to find the lesson from URL param
      if (lessonParam) {
        const found = allItems.find(item => item.id === lessonParam)
        if (found) itemToShow = found
      }
      // Otherwise, find the current lesson from progress
      else if (userProgress.currentLesson) {
        const found = allItems.find(item => item.id === userProgress.currentLesson)
        if (found) itemToShow = found
      }
      
      setCurrentItem(itemToShow)
      
      // Expand the module and chapter containing this item
      if (itemToShow) {
        setExpandedModules(prev => new Set([...prev, itemToShow.moduleIndex]))
        setExpandedChapters(prev => new Set([...prev, course.modules[itemToShow.moduleIndex].chapters[itemToShow.chapterIndex]._id]))
      }
    }
  }, [course, userProgress, lessonParam])

  const getAllContentItems = useCallback((): ContentItem[] => {
    if (!course) return []
    
    const items: ContentItem[] = []
    
    course.modules.forEach((module, moduleIndex) => {
      module.chapters.forEach((chapter, chapterIndex) => {
        chapter.lessons.forEach((lesson, lessonIndex) => {
          // Add main lesson
          items.push({
            id: lesson._id,
            title: lesson.title,
            type: 'lesson',
            lesson,
            moduleIndex,
            chapterIndex,
            lessonIndex,
            duration: lesson.duration
          })
          
          // Add sub-lessons
          lesson.subLessons.forEach((subLesson, subLessonIndex) => {
            items.push({
              id: subLesson._id,
              title: subLesson.title,
              type: 'sublesson',
              lesson: subLesson,
              moduleIndex,
              chapterIndex,
              lessonIndex,
              subLessonIndex,
              duration: subLesson.duration
            })
          })
        })
      })
    })
    
    return items
  }, [course])

  const updateProgress = async (lessonId: string, completed: boolean = false, isCurrent: boolean = true) => {
    if (!course || !userProgress?.enrolled) return
    
    setUpdatingProgress(true)
    
    try {
      const response = await fetch(`/api/youtube-courses/${slug}/progress`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
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
        
        if (completed) {
          toast({
            title: 'Great work!',
            description: 'Progress updated successfully',
            variant: 'default'
          })
        }
      }
    } catch (error) {
      console.error('Error updating progress:', error)
    } finally {
      setUpdatingProgress(false)
    }
  }

  const handleItemSelect = (item: ContentItem) => {
    setCurrentItem(item)
    setShowSidebar(false)
    updateProgress(item.id, false, true)
  }

  const handleNext = () => {
    const allItems = getAllContentItems()
    if (!currentItem) return
    
    const currentIndex = allItems.findIndex(item => item.id === currentItem.id)
    if (currentIndex < allItems.length - 1) {
      const nextItem = allItems[currentIndex + 1]
      handleItemSelect(nextItem)
    } else {
      // Course completed
      toast({
        title: 'Congratulations!',
        description: 'You have completed the course!',
        variant: 'default'
      })
    }
  }

  const handlePrevious = () => {
    const allItems = getAllContentItems()
    if (!currentItem) return
    
    const currentIndex = allItems.findIndex(item => item.id === currentItem.id)
    if (currentIndex > 0) {
      const prevItem = allItems[currentIndex - 1]
      handleItemSelect(prevItem)
    }
  }

  const markAsComplete = async () => {
    if (!currentItem) return
    await updateProgress(currentItem.id, true, false)
  }

  const isItemCompleted = (itemId: string) => {
    return userProgress?.completedLessons?.includes(itemId) || false
  }

  const toggleModule = (index: number) => {
    setExpandedModules(prev => {
      const newSet = new Set(prev)
      if (newSet.has(index)) {
        newSet.delete(index)
      } else {
        newSet.add(index)
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

  const getYouTubeEmbedUrl = (videoId: string, autoplay: boolean = true) => {
    return `https://www.youtube.com/embed/${videoId}?autoplay=${autoplay ? 1 : 0}&rel=0&modestbranding=1`
  }

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    
    if (hours > 0) {
      return `${hours}h ${mins > 0 ? `${mins}m` : ''}`.trim()
    }
    return `${mins}m`
  }

  const getTotalCompleted = () => {
    const allItems = getAllContentItems()
    return userProgress?.completedLessons?.length || 0
  }

  const getTotalItems = () => {
    return getAllContentItems().length
  }

  const handleEnroll = async () => {
    try {
      const response = await fetch(`/api/youtube-courses/${slug}/enroll`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      })
      
      const data = await response.json()
      
      if (response.ok) {
        if (data.requiresApproval) {
          toast({
            title: 'Enrollment Request Submitted',
            description: 'Your request has been sent for admin approval',
            variant: 'default'
          })
          setEnrollmentStatus({
            enrolled: false,
            status: 'pending'
          })
        } else if (data.enrolled) {
          toast({
            title: 'Successfully Enrolled!',
            description: 'You can now access the course content',
            variant: 'default'
          })
          setEnrollmentStatus({
            enrolled: true,
            status: 'approved'
          })
          fetchCourseData()
        }
      } else {
        throw new Error(data.error || 'Failed to enroll')
      }
      
    } catch (error: any) {
      toast({
        title: 'Enrollment Failed',
        description: error.message || 'Please try again',
        variant: 'destructive'
      })
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    )
  }

  if (error || !course) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">Course Not Found</h2>
          <p className="text-gray-600 mb-4">{error || 'The course could not be loaded.'}</p>
          <div className="space-y-2">
            <Button onClick={() => router.push(`/youtube-courses`)} className="w-full">
              Browse Courses
            </Button>
            <Button onClick={fetchCourseData} variant="outline" className="w-full">
              <RefreshCw className="w-4 h-4 mr-2" />
              Try Again
            </Button>
          </div>
        </div>
      </div>
    )
  }

  // Check if user should have access
  const isEnrolled = enrollmentStatus?.enrolled || userProgress?.enrolled
  const isPending = enrollmentStatus?.status === 'pending'
  const isRejected = enrollmentStatus?.status === 'rejected'
  const isFreeWithAutoEnroll = course.isFree && !course.manualEnrollmentEnabled
  
  // If course is free and has auto enrollment, user should have access
  if (isFreeWithAutoEnroll && !isEnrolled && !isPending && !isRejected) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6">
          <Lock className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">Free Course Access</h2>
          <p className="text-gray-600 mb-4">This course is free! Click below to enroll and start learning.</p>
          <div className="space-y-2">
            <Button onClick={handleEnroll} className="w-full">
              Enroll for Free
            </Button>
            <Button 
              onClick={() => router.push(`/youtube-courses/${slug}`)} 
              variant="outline" 
              className="w-full"
            >
              Back to Course Details
            </Button>
          </div>
        </div>
      </div>
    )
  }

  if (!isEnrolled && !isFreeWithAutoEnroll) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6">
          {isPending ? (
            <>
              <Loader2 className="w-12 h-12 text-yellow-500 mx-auto mb-4 animate-spin" />
              <h2 className="text-xl font-semibold mb-2">Enrollment Pending</h2>
              <p className="text-gray-600 mb-4">Your enrollment request is pending admin approval.</p>
            </>
          ) : isRejected ? (
            <>
              <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-2">Enrollment Rejected</h2>
              <p className="text-gray-600 mb-4">Your enrollment request has been rejected.</p>
            </>
          ) : (
            <>
              <Lock className="w-12 h-12 text-red-500 mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-2">Access Required</h2>
              <p className="text-gray-600 mb-4">You need to enroll in this course first.</p>
            </>
          )}
          <div className="space-y-2">
            <Button 
              onClick={() => router.push(`/youtube-courses/${slug}`)} 
              className="w-full"
            >
              Go to Course Page
            </Button>
            {!isPending && !isRejected && (
              <Button onClick={handleEnroll} variant="outline" className="w-full">
                {course.isFree ? 'Enroll for Free' : 'Request Access'}
              </Button>
            )}
          </div>
        </div>
      </div>
    )
  }

  const currentVideoSource = currentItem?.type === 'lesson' 
    ? (currentItem.lesson as Lesson).videoSource
    : (currentItem?.lesson as SubLesson)?.videoSource

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Top Navigation */}
      <div className="bg-gray-800 border-b border-gray-700 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push(`/youtube-courses/${slug}`)}
              className="text-gray-300 hover:text-white"
            >
              <ChevronLeft className="w-5 h-5 mr-2" />
              Back to Course
            </Button>
            
            <div className="hidden md:block">
              <h1 className="font-semibold truncate max-w-md">{course.title}</h1>
              <p className="text-sm text-gray-400">
                {currentItem ? `${currentItem.type === 'lesson' ? 'Lesson' : 'Sub-lesson'}: ${currentItem.title}` : 'Loading...'}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowSidebar(!showSidebar)}
              className="text-gray-300 hover:text-white"
            >
              {showSidebar ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </Button>
          </div>
        </div>
      </div>
      
      <div className="flex h-[calc(100vh-73px)]">
        {/* Main Content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Video Player */}
          <div className="flex-1 bg-black relative">
            {currentVideoSource ? (
              <div className="w-full h-full">
                <iframe
                  src={getYouTubeEmbedUrl(currentVideoSource.videoId, true)}
                  title="YouTube video player"
                  className="w-full h-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                  onLoad={() => {
                    // Mark as started watching
                    if (currentItem) {
                      updateProgress(currentItem.id, false, true)
                    }
                  }}
                />
              </div>
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <div className="text-center">
                  <BookOpen className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Text Content</h3>
                  <p className="text-gray-400">This lesson contains text content only</p>
                </div>
              </div>
            )}
          </div>
          
          {/* Lesson Content */}
          <div className="bg-gray-800 border-t border-gray-700 p-6 overflow-y-auto max-h-96">
            <div className="max-w-4xl mx-auto">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-xl font-bold mb-2">
                    {currentItem?.title}
                  </h2>
                  <div className="flex items-center gap-4 text-sm text-gray-400">
                    <div className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      <span>{formatDuration(currentItem?.duration || 0)}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <BookOpen className="w-4 h-4" />
                      <span>
                        {getTotalCompleted()} of {getTotalItems()} completed
                      </span>
                    </div>
                  </div>
                </div>
                
                <div className="flex gap-2">
                  {currentItem && !isItemCompleted(currentItem.id) && (
                    <Button
                      onClick={markAsComplete}
                      disabled={updatingProgress}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      {updatingProgress ? (
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      ) : (
                        <CheckCircle className="w-4 h-4 mr-2" />
                      )}
                      Mark Complete
                    </Button>
                  )}
                  
                  {currentItem && isItemCompleted(currentItem.id) && (
                    <Badge className="bg-green-900 text-green-200">
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Completed
                    </Badge>
                  )}
                </div>
              </div>
              
              <Separator className="my-4 bg-gray-700" />
              
              {/* Lesson Description */}
              <div className="mb-6">
                <p className="text-gray-300 whitespace-pre-line">
                  {currentItem?.type === 'lesson'
                    ? (currentItem.lesson as Lesson).description || 'No description available.'
                    : (currentItem?.lesson as SubLesson)?.description || 'No description available.'
                  }
                </p>
              </div>
              
              {/* Resources */}
              {(currentItem?.type === 'lesson' && (currentItem.lesson as Lesson).resources.length > 0) ||
               (currentItem?.type === 'sublesson' && (currentItem.lesson as SubLesson).resources.length > 0) ? (
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold flex items-center gap-2">
                      <FileText className="w-5 h-5" />
                      Resources
                    </h3>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowResources(!showResources)}
                    >
                      {showResources ? 'Hide' : 'Show'} Resources
                    </Button>
                  </div>
                  
                  {showResources && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {currentItem?.type === 'lesson'
                        ? (currentItem.lesson as Lesson).resources.map((resource, index) => (
                            <Card key={index} className="bg-gray-700 border-gray-600">
                              <CardContent className="p-4">
                                <div className="flex items-center justify-between">
                                  <div>
                                    <h4 className="font-medium mb-1">{resource.title}</h4>
                                    <p className="text-sm text-gray-400">{resource.type.toUpperCase()}</p>
                                  </div>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => window.open(resource.url, '_blank')}
                                  >
                                    <Download className="w-4 h-4 mr-2" />
                                    Download
                                  </Button>
                                </div>
                              </CardContent>
                            </Card>
                          ))
                        : (currentItem?.lesson as SubLesson)?.resources.map((resource, index) => (
                            <Card key={index} className="bg-gray-700 border-gray-600">
                              <CardContent className="p-4">
                                <div className="flex items-center justify-between">
                                  <div>
                                    <h4 className="font-medium mb-1">{resource.title}</h4>
                                    <p className="text-sm text-gray-400">{resource.type.toUpperCase()}</p>
                                  </div>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => window.open(resource.url, '_blank')}
                                  >
                                    <Download className="w-4 h-4 mr-2" />
                                    Download
                                  </Button>
                                </div>
                              </CardContent>
                            </Card>
                          ))
                      }
                    </div>
                  )}
                </div>
              ) : null}
              
              {/* Navigation */}
              <div className="flex justify-between">
                <Button
                  variant="outline"
                  onClick={handlePrevious}
                  disabled={!currentItem || getAllContentItems().findIndex(item => item.id === currentItem.id) === 0}
                >
                  <ChevronLeft className="w-5 h-5 mr-2" />
                  Previous
                </Button>
                
                <div className="text-center">
                  <div className="text-sm text-gray-400 mb-1">
                    {currentItem ? (
                      `Item ${getAllContentItems().findIndex(item => item.id === currentItem.id) + 1} of ${getTotalItems()}`
                    ) : 'Loading...'}
                  </div>
                  <Progress 
                    value={userProgress?.progress ? userProgress.progress * 100 : 0} 
                    className="w-64 h-2 bg-gray-700"
                  />
                </div>
                
                <Button
                  variant="default"
                  onClick={handleNext}
                  disabled={!currentItem || getAllContentItems().findIndex(item => item.id === currentItem.id) === getTotalItems() - 1}
                >
                  Next
                  <ChevronRight className="w-5 h-5 ml-2" />
                </Button>
              </div>
            </div>
          </div>
        </div>
        
        {/* Sidebar */}
        {showSidebar && (
          <div className="w-80 bg-gray-800 border-l border-gray-700 overflow-y-auto">
            <div className="p-4">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold">Course Content</h2>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowSidebar(false)}
                  className="text-gray-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </Button>
              </div>
              
              {/* Progress */}
              <div className="mb-6 p-4 bg-gray-900 rounded-lg">
                <div className="flex justify-between mb-2">
                  <span className="text-sm text-gray-400">Your Progress</span>
                  <span className="font-semibold">{Math.round((userProgress?.progress || 0) * 100)}%</span>
                </div>
                <Progress value={(userProgress?.progress || 0) * 100} className="h-2 bg-gray-700" />
                <div className="text-sm text-gray-400 mt-2">
                  {getTotalCompleted()} of {getTotalItems()} items completed
                </div>
              </div>
              
              {/* Course Outline */}
              <div className="space-y-4">
                {course.modules.map((module, moduleIndex) => (
                  <div key={module._id} className="border border-gray-700 rounded-lg overflow-hidden">
                    <div 
                      className="p-4 bg-gray-900 hover:bg-gray-850 cursor-pointer"
                      onClick={() => toggleModule(moduleIndex)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-red-600 rounded-lg flex items-center justify-center text-white font-semibold">
                            {moduleIndex + 1}
                          </div>
                          <div>
                            <h3 className="font-semibold">{module.title}</h3>
                            <p className="text-sm text-gray-400">
                              {module.chapters.reduce((total, chapter) => 
                                total + chapter.lessons.reduce((lessonTotal, lesson) => 
                                  lessonTotal + 1 + lesson.subLessons.length, 0
                                ), 0
                              )} items
                            </p>
                          </div>
                        </div>
                        <ChevronRight className={`w-5 h-5 text-gray-400 transition-transform ${
                          expandedModules.has(moduleIndex) ? 'rotate-90' : ''
                        }`} />
                      </div>
                    </div>
                    
                    {expandedModules.has(moduleIndex) && (
                      <div className="p-4 border-t border-gray-700">
                        {module.chapters.map((chapter, chapterIndex) => (
                          <div key={chapter._id} className="mb-4 last:mb-0">
                            <div 
                              className="p-3 bg-gray-850 rounded-lg cursor-pointer mb-2"
                              onClick={() => toggleChapter(chapter._id)}
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <h4 className="font-medium">
                                    Chapter {chapterIndex + 1}: {chapter.title}
                                  </h4>
                                </div>
                                <ChevronRight className={`w-4 h-4 text-gray-400 transition-transform ${
                                  expandedChapters.has(chapter._id) ? 'rotate-90' : ''
                                }`} />
                              </div>
                            </div>
                            
                            {expandedChapters.has(chapter._id) && (
                              <div className="ml-4 space-y-2">
                                {chapter.lessons.map((lesson, lessonIndex) => {
                                  const isLessonCompleted = isItemCompleted(lesson._id)
                                  const isCurrentLesson = currentItem?.id === lesson._id
                                  
                                  return (
                                    <div key={lesson._id}>
                                      {/* Main Lesson */}
                                      <div
                                        className={`p-3 rounded-lg cursor-pointer transition-colors ${
                                          isCurrentLesson
                                            ? 'bg-red-900/30 border border-red-700'
                                            : isLessonCompleted
                                            ? 'bg-green-900/20 hover:bg-green-900/30'
                                            : 'bg-gray-850 hover:bg-gray-800'
                                        }`}
                                        onClick={() => handleItemSelect({
                                          id: lesson._id,
                                          title: lesson.title,
                                          type: 'lesson',
                                          lesson,
                                          moduleIndex,
                                          chapterIndex,
                                          lessonIndex,
                                          duration: lesson.duration
                                        })}
                                      >
                                        <div className="flex items-center justify-between">
                                          <div className="flex items-center gap-2">
                                            {isLessonCompleted ? (
                                              <CheckCircle className="w-4 h-4 text-green-500" />
                                            ) : (
                                              <div className="w-4 h-4 rounded-full border border-gray-500" />
                                            )}
                                            <span className={`font-medium ${
                                              isCurrentLesson ? 'text-red-300' : ''
                                            }`}>
                                              {lesson.title}
                                            </span>
                                          </div>
                                          {lesson.videoSource && (
                                            <Youtube className="w-4 h-4 text-red-500" />
                                          )}
                                        </div>
                                        <div className="flex items-center gap-4 mt-2 text-xs text-gray-400">
                                          <div className="flex items-center gap-1">
                                            <Clock className="w-3 h-3" />
                                            {formatDuration(lesson.duration)}
                                          </div>
                                          {isLessonCompleted && (
                                            <Badge className="bg-green-900 text-green-200 text-xs">
                                              Completed
                                            </Badge>
                                          )}
                                        </div>
                                      </div>
                                      
                                      {/* Sub-lessons */}
{lesson.subLessons.length > 0 && (
  <div className="ml-4 mt-2 space-y-2">
    {lesson.subLessons.map((subLesson, subLessonIndex) => {
      const isSubLessonCompleted = isItemCompleted(subLesson._id)
      const isCurrentSubLesson = currentItem?.id === subLesson._id
      
      return (
        <div
          key={subLesson._id || subLessonIndex}
          className={`p-2 rounded-lg cursor-pointer transition-colors ${
            isCurrentSubLesson
              ? 'bg-red-900/20 border border-red-700'
              : isSubLessonCompleted
              ? 'bg-green-900/10 hover:bg-green-900/20'
              : 'bg-gray-900 hover:bg-gray-800'
          }`}
          onClick={() => handleItemSelect({
            id: subLesson._id,
            title: subLesson.title,
            type: 'sublesson',
            lesson: subLesson,
            moduleIndex,
            chapterIndex,
            lessonIndex,
            subLessonIndex,
            duration: subLesson.duration
          })}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {isSubLessonCompleted ? (
                <CheckCircle className="w-3 h-3 text-green-500" />
              ) : (
                <div className="w-3 h-3 rounded-full border border-gray-500" />
              )}
              <span className={`text-sm ${isCurrentSubLesson ? 'text-red-300' : ''}`}>
                • {subLesson.title}
              </span>
            </div>
            {subLesson.videoSource && (
              <Youtube className="w-3 h-3 text-red-500" />
            )}
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
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}