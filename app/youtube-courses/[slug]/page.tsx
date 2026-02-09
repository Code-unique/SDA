'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { useToast } from '@/components/ui/use-toast'
import { Separator } from '@/components/ui/separator'
import {
  Play,
  Clock,
  Users,
  Star,
  BookOpen,
  CheckCircle,
  Lock,
  AlertCircle,
  Loader2,
  ChevronRight,
  Youtube,
  ExternalLink,
  FileText,
  Download,
  Award,
  CreditCard
} from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

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
    bio?: string
  }
  price: number
  isFree: boolean
  level: 'beginner' | 'intermediate' | 'advanced'
  category: string
  tags: string[]
  thumbnail: string
  previewVideo?: YouTubeVideo
  modules: Module[]
  requirements: string[]
  learningOutcomes: string[]
  isPublished: boolean
  isFeatured: boolean
  manualEnrollmentEnabled: boolean
  totalStudents: number
  averageRating: number
  ratings: Array<{
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

interface EnrollmentStatus {
  enrolled: boolean
  status?: 'pending' | 'approved' | 'rejected'
}

export default function YouTubeCourseDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { toast } = useToast()
  
  const [course, setCourse] = useState<Course | null>(null)
  const [userProgress, setUserProgress] = useState<UserProgress | null>(null)
  const [enrollmentStatus, setEnrollmentStatus] = useState<EnrollmentStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [enrolling, setEnrolling] = useState(false)
  const [expandedModules, setExpandedModules] = useState<Set<number>>(new Set([0]))
  const [expandedChapters, setExpandedChapters] = useState<Set<string>>(new Set())
  
  // Payment request state
  const [showPaymentRequest, setShowPaymentRequest] = useState(false)
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('')
  const [transactionId, setTransactionId] = useState('')
  const [notes, setNotes] = useState('')
  
  const slug = params.slug as string

  const fetchCourseData = useCallback(async () => {
    try {
      setLoading(true)
      
      const [courseResponse, progressResponse, enrollmentResponse] = await Promise.all([
        fetch(`/api/youtube-courses/${slug}`),
        fetch(`/api/youtube-courses/${slug}/progress`),
        fetch(`/api/youtube-courses/${slug}/enrollment-status`)
      ])
      
      if (!courseResponse.ok) {
        throw new Error('Failed to load course')
      }
      
      const courseData = await courseResponse.json()
      setCourse(courseData)
      
      if (progressResponse.ok) {
        const progressData = await progressResponse.json()
        setUserProgress(progressData)
      }
      
      if (enrollmentResponse.ok) {
        const enrollmentData = await enrollmentResponse.json()
        setEnrollmentStatus(enrollmentData)
      }
      
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load course details',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }, [slug, toast])

  useEffect(() => {
    fetchCourseData()
  }, [fetchCourseData])

  const handleEnroll = async () => {
    if (!course || enrolling) return
    
    // If manual enrollment is required, show payment request modal
    if (!course.isFree && course.manualEnrollmentEnabled) {
      setShowPaymentRequest(true)
      return
    }
    
    setEnrolling(true)
    
    try {
      const response = await fetch(`/api/youtube-courses/${course.slug}/enroll`, {
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
          fetchCourseData() // Refresh progress
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
    } finally {
      setEnrolling(false)
    }
  }

  const handlePaymentRequestSubmit = async () => {
    if (!selectedPaymentMethod || !course) return
    
    setEnrolling(true)
    
    try {
      const response = await fetch(`/api/youtube-courses/${course.slug}/enroll`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          paymentMethod: selectedPaymentMethod,
          transactionId: transactionId,
          notes: notes
        })
      })
      
      const data = await response.json()
      
      if (response.ok) {
        toast({
          title: 'Payment Request Submitted',
          description: 'Your request has been sent for admin approval',
          variant: 'default'
        })
        setEnrollmentStatus({
          enrolled: false,
          status: 'pending'
        })
        setShowPaymentRequest(false)
        resetPaymentForm()
      } else {
        throw new Error(data.error || 'Failed to submit payment request')
      }
      
    } catch (error: any) {
      toast({
        title: 'Submission Failed',
        description: error.message || 'Please try again',
        variant: 'destructive'
      })
    } finally {
      setEnrolling(false)
    }
  }

  const resetPaymentForm = () => {
    setSelectedPaymentMethod('')
    setTransactionId('')
    setNotes('')
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

  const handlePreview = (videoSource: YouTubeVideo) => {
    window.open(`https://www.youtube.com/watch?v=${videoSource.videoId}`, '_blank')
  }

  const isLessonCompleted = (lessonId: string) => {
    return userProgress?.completedLessons?.includes(lessonId) || false
  }

  const calculateTotalDuration = () => {
    if (!course) return 0
    
    let totalMinutes = 0
    
    course.modules.forEach(module => {
      module.chapters.forEach(chapter => {
        chapter.lessons.forEach(lesson => {
          totalMinutes += lesson.duration || 0
          lesson.subLessons.forEach(subLesson => {
            totalMinutes += subLesson.duration || 0
          })
        })
      })
    })
    
    return totalMinutes
  }

  const calculateTotalLessons = () => {
    if (!course) return 0
    
    let total = 0
    
    course.modules.forEach(module => {
      module.chapters.forEach(chapter => {
        total += chapter.lessons.length
        chapter.lessons.forEach(lesson => {
          total += lesson.subLessons.length
        })
      })
    })
    
    return total
  }

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    
    if (hours > 0) {
      return `${hours}h ${mins > 0 ? `${mins}m` : ''}`.trim()
    }
    return `${mins}m`
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    )
  }

  if (!course) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">Course Not Found</h2>
          <Button onClick={() => router.push('/youtube-courses')}>
            Browse Courses
          </Button>
        </div>
      </div>
    )
  }

  const isEnrolled = enrollmentStatus?.enrolled || userProgress?.enrolled
  const isPending = enrollmentStatus?.status === 'pending'
  const isRejected = enrollmentStatus?.status === 'rejected'

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-red-500 to-orange-500 text-white">
        <div className="container mx-auto px-4 py-12">
          <div className="max-w-4xl">
            <div className="flex flex-wrap gap-2 mb-4">
              <Badge className="bg-white/20 backdrop-blur-sm">{course.category}</Badge>
              <Badge className={
                course.level === 'beginner' ? 'bg-green-500' :
                course.level === 'intermediate' ? 'bg-yellow-500' :
                'bg-red-700'
              }>
                {course.level}
              </Badge>
              {course.isFree ? (
                <Badge className="bg-green-500">FREE</Badge>
              ) : (
                <Badge className="bg-purple-500">NPR {course.price}</Badge>
              )}
              {course.isFeatured && (
                <Badge className="bg-pink-500">Featured</Badge>
              )}
            </div>
            
            <h1 className="text-4xl font-bold mb-4">{course.title}</h1>
            <p className="text-xl opacity-90 mb-6">{course.shortDescription}</p>
            
            <div className="flex flex-wrap items-center gap-6 mb-8">
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5" />
                <span>{formatDuration(calculateTotalDuration())}</span>
              </div>
              <div className="flex items-center gap-2">
                <BookOpen className="w-5 h-5" />
                <span>{calculateTotalLessons()} content items</span>
              </div>
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                <span>{course.totalStudents} students</span>
              </div>
              <div className="flex items-center gap-2">
                <Star className="w-5 h-5" />
                <span>{course.averageRating.toFixed(1)} ({course.ratings?.length || 0})</span>
              </div>
            </div>
            
            {/* Enrollment Button */}
            {isEnrolled ? (
              <Button 
                size="lg" 
                className="bg-white text-red-600 hover:bg-white/90"
                onClick={() => router.push(`/youtube-courses/${course.slug}/learn`)}
              >
                <Play className="w-5 h-5 mr-2" />
                {userProgress?.progress && userProgress.progress > 0 ? 'Continue Learning' : 'Start Learning'}
                {userProgress?.progress && userProgress.progress > 0 && (
                  <span className="ml-2">({Math.round((userProgress.progress || 0) * 100)}%)</span>
                )}
              </Button>
            ) : isPending ? (
              <Button size="lg" variant="outline" className="bg-white/10 border-white/20">
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Enrollment Pending Approval
              </Button>
            ) : isRejected ? (
              <Button size="lg" variant="destructive">
                <AlertCircle className="w-5 h-5 mr-2" />
                Enrollment Rejected
              </Button>
            ) : (
              <Button 
                size="lg" 
                className="bg-white text-red-600 hover:bg-white/90"
                onClick={handleEnroll}
                disabled={enrolling}
              >
                {enrolling ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    {course.isFree && !course.manualEnrollmentEnabled ? 'Enroll Free' : 'Request Access'}
                    <ChevronRight className="w-5 h-5 ml-2" />
                  </>
                )}
              </Button>
            )}
            
            {!isEnrolled && course.manualEnrollmentEnabled && (
              <p className="mt-4 text-sm opacity-80">
                * This course requires admin approval for access
              </p>
            )}
          </div>
        </div>
      </div>
      
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Course Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Preview Video */}
            {course.previewVideo && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Youtube className="w-5 h-5 text-red-500" />
                    Course Preview
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="aspect-video rounded-lg overflow-hidden bg-black">
                    <iframe
                      src={course.previewVideo.url}
                      title="YouTube video player"
                      className="w-full h-full"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  </div>
                  <p className="mt-4 text-sm text-gray-600">
                    Watch this preview to get a taste of what you'll learn in this course
                  </p>
                </CardContent>
              </Card>
            )}
            
            {/* Description */}
            <Card>
              <CardHeader>
                <CardTitle>Course Description</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="prose max-w-none">
                  <p className="text-gray-700 whitespace-pre-line">{course.description}</p>
                </div>
              </CardContent>
            </Card>
            
            {/* What You'll Learn */}
            {course.learningOutcomes && course.learningOutcomes.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>What You'll Learn</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-3">
                    {course.learningOutcomes.map((outcome, index) => (
                      <li key={index} className="flex items-start gap-3">
                        <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                        <span>{outcome}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}
            
            {/* Course Content */}
            <Card>
              <CardHeader>
                <CardTitle>Course Content</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {course.modules.map((module, moduleIndex) => (
                    <div key={module._id} className="border rounded-lg overflow-hidden">
                      <div 
                        className="p-4 bg-gray-50 hover:bg-gray-100 cursor-pointer transition-colors"
                        onClick={() => toggleModule(moduleIndex)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-red-500 rounded-lg flex items-center justify-center text-white font-semibold">
                              {moduleIndex + 1}
                            </div>
                            <div>
                              <h3 className="font-semibold">{module.title}</h3>
                              {module.description && (
                                <p className="text-sm text-gray-600 mt-1">{module.description}</p>
                              )}
                            </div>
                          </div>
                          <ChevronRight className={`w-5 h-5 text-gray-500 transition-transform ${
                            expandedModules.has(moduleIndex) ? 'rotate-90' : ''
                          }`} />
                        </div>
                      </div>
                      
                      {expandedModules.has(moduleIndex) && (
                        <div className="p-4 border-t">
                          {module.chapters.map((chapter, chapterIndex) => (
                            <div key={chapter._id} className="mb-4 last:mb-0">
                              <div 
                                className="p-3 bg-gray-50 rounded-lg cursor-pointer mb-2"
                                onClick={() => toggleChapter(chapter._id)}
                              >
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <h4 className="font-medium">
                                      Chapter {chapterIndex + 1}: {chapter.title}
                                    </h4>
                                  </div>
                                  <ChevronRight className={`w-4 h-4 text-gray-500 transition-transform ${
                                    expandedChapters.has(chapter._id) ? 'rotate-90' : ''
                                  }`} />
                                </div>
                                {chapter.description && (
                                  <p className="text-sm text-gray-600 mt-1">{chapter.description}</p>
                                )}
                              </div>
                              
                              {expandedChapters.has(chapter._id) && (
                                <div className="ml-4 space-y-2">
                                  {chapter.lessons.map((lesson, lessonIndex) => (
                                    <div key={lesson._id} className="border-l-2 border-red-200 pl-4">
                                      <div className="p-3 bg-white rounded-lg">
                                        <div className="flex items-center justify-between">
                                          <div className="flex-1">
                                            <h5 className="font-medium">
                                              Lesson {lessonIndex + 1}: {lesson.title}
                                            </h5>
                                            {lesson.description && (
                                              <p className="text-sm text-gray-600 mt-1">{lesson.description}</p>
                                            )}
                                            
                                            <div className="flex items-center gap-4 mt-2">
                                              {lesson.videoSource && (
                                                <div className="flex items-center gap-1 text-sm text-red-600">
                                                  <Youtube className="w-4 h-4" />
                                                  YouTube Video
                                                </div>
                                              )}
                                              <div className="flex items-center gap-1 text-sm text-gray-600">
                                                <Clock className="w-4 h-4" />
                                                {formatDuration(lesson.duration)}
                                              </div>
                                              {lesson.isPreview && !isEnrolled && (
                                                <Badge className="bg-yellow-100 text-yellow-800">
                                                  Preview Available
                                                </Badge>
                                              )}
                                            </div>
                                          </div>
                                          
                                          {isEnrolled ? (
                                            <Button
                                              size="sm"
                                              variant="outline"
                                              onClick={() => router.push(`/youtube-courses/${course.slug}/learn?lesson=${lesson._id}`)}
                                            >
                                              <Play className="w-4 h-4 mr-2" />
                                              Start
                                            </Button>
                                          ) : lesson.isPreview && lesson.videoSource ? (
                                            <Button
                                              size="sm"
                                              variant="outline"
                                              onClick={() => handlePreview(lesson.videoSource!)}
                                            >
                                              <ExternalLink className="w-4 h-4 mr-2" />
                                              Preview
                                            </Button>
                                          ) : (
                                            <Lock className="w-4 h-4 text-gray-400" />
                                          )}
                                        </div>
                                        
                                        {/* Sub-lessons */}
                                        {lesson.subLessons.length > 0 && (
                                          <div className="ml-4 mt-4 space-y-2">
                                            {lesson.subLessons.map((subLesson, subLessonIndex) => (
                                              <div key={subLesson._id} className="border-l-2 border-gray-200 pl-4 py-2">
                                                <div className="flex items-center justify-between">
                                                  <div className="flex-1">
                                                    <h6 className="text-sm font-medium">
                                                      • {subLesson.title}
                                                    </h6>
                                                    {subLesson.description && (
                                                      <p className="text-xs text-gray-600 mt-1">{subLesson.description}</p>
                                                    )}
                                                    
                                                    <div className="flex items-center gap-4 mt-1">
                                                      {subLesson.videoSource && (
                                                        <div className="flex items-center gap-1 text-xs text-red-600">
                                                          <Youtube className="w-3 h-3" />
                                                          YouTube Video
                                                        </div>
                                                      )}
                                                      <div className="flex items-center gap-1 text-xs text-gray-600">
                                                        <Clock className="w-3 h-3" />
                                                        {formatDuration(subLesson.duration)}
                                                      </div>
                                                    </div>
                                                  </div>
                                                  
                                                  {isEnrolled ? (
                                                    <Button
                                                      size="sm"
                                                      variant="ghost"
                                                      onClick={() => router.push(`/youtube-courses/${course.slug}/learn?lesson=${subLesson._id}`)}
                                                    >
                                                      <Play className="w-3 h-3 mr-1" />
                                                      Start
                                                    </Button>
                                                  ) : subLesson.isPreview && subLesson.videoSource ? (
                                                    <Button
                                                      size="sm"
                                                      variant="ghost"
                                                      onClick={() => handlePreview(subLesson.videoSource!)}
                                                    >
                                                      <ExternalLink className="w-3 h-3 mr-1" />
                                                      Preview
                                                    </Button>
                                                  ) : (
                                                    <Lock className="w-3 h-3 text-gray-400" />
                                                  )}
                                                </div>
                                              </div>
                                            ))}
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
            
            {/* Requirements */}
            {course.requirements && course.requirements.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Requirements</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {course.requirements.map((req, index) => (
                      <li key={index} className="flex items-start gap-3">
                        <div className="w-2 h-2 bg-gray-400 rounded-full mt-2 flex-shrink-0" />
                        <span>{req}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}
          </div>
          
          {/* Right Column - Sidebar */}
          <div className="space-y-6">
            {/* Enrollment Card */}
            <Card>
              <CardContent className="p-6">
                <div className="text-center mb-6">
                  {course.isFree ? (
                    <div className="text-3xl font-bold text-green-600">FREE</div>
                  ) : (
                    <div className="text-3xl font-bold">NPR {course.price}</div>
                  )}
                  {course.manualEnrollmentEnabled && (
                    <div className="text-sm text-gray-600 mt-1">(Manual Approval Required)</div>
                  )}
                </div>
                
                {isEnrolled ? (
                  <>
                    {userProgress && (
                      <div className="mb-4">
                        <div className="flex justify-between text-sm mb-1">
                          <span>Your Progress</span>
                          <span>{Math.round((userProgress.progress || 0) * 100)}%</span>
                        </div>
                        <Progress value={(userProgress.progress || 0) * 100} className="h-2" />
                      </div>
                    )}
                    
                    <Button 
                      className="w-full"
                      onClick={() => router.push(`/youtube-courses/${course.slug}/learn`)}
                    >
                      <Play className="w-5 h-5 mr-2" />
                      {userProgress?.progress && userProgress.progress > 0 ? 'Continue Learning' : 'Start Learning'}
                    </Button>
                    
                    {userProgress?.completed && (
                      <Button 
                        variant="outline" 
                        className="w-full mt-2"
                        onClick={() => router.push(`/certificates/${course._id}`)}
                      >
                        <Award className="w-5 h-5 mr-2" />
                        View Certificate
                      </Button>
                    )}
                  </>
                ) : isPending ? (
                  <div className="text-center p-4 bg-yellow-50 rounded-lg">
                    <Loader2 className="w-8 h-8 animate-spin text-yellow-600 mx-auto mb-2" />
                    <p className="text-yellow-800 font-medium">Enrollment Pending</p>
                    <p className="text-sm text-yellow-600 mt-1">
                      Your request is being reviewed by admin
                    </p>
                  </div>
                ) : isRejected ? (
                  <div className="text-center p-4 bg-red-50 rounded-lg">
                    <AlertCircle className="w-8 h-8 text-red-600 mx-auto mb-2" />
                    <p className="text-red-800 font-medium">Enrollment Rejected</p>
                    <p className="text-sm text-red-600 mt-1">
                      Please contact admin for more information
                    </p>
                  </div>
                ) : (
                  <Button 
                    className="w-full"
                    onClick={handleEnroll}
                    disabled={enrolling}
                  >
                    {enrolling ? (
                      <>
                        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        {course.isFree && !course.manualEnrollmentEnabled ? 'Enroll Free' : 'Request Access'}
                        <ChevronRight className="w-5 h-5 ml-2" />
                      </>
                    )}
                  </Button>
                )}
                
                <div className="mt-4 text-center text-sm text-gray-600">
                  <p>30-day satisfaction guarantee</p>
                </div>
              </CardContent>
            </Card>
            
            {/* Course Stats */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">This Course Includes</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-3">
                  <Youtube className="w-5 h-5 text-red-500" />
                  <span>YouTube video lessons</span>
                </div>
                <div className="flex items-center gap-3">
                  <Clock className="w-5 h-5 text-blue-500" />
                  <span>{formatDuration(calculateTotalDuration())} on-demand video</span>
                </div>
                <div className="flex items-center gap-3">
                  <FileText className="w-5 h-5 text-green-500" />
                  <span>Downloadable resources</span>
                </div>
                <div className="flex items-center gap-3">
                  <Award className="w-5 h-5 text-purple-500" />
                  <span>Certificate of completion</span>
                </div>
                {course.manualEnrollmentEnabled && (
                  <div className="flex items-center gap-3">
                    <Users className="w-5 h-5 text-orange-500" />
                    <span>Personalized feedback available</span>
                  </div>
                )}
              </CardContent>
            </Card>
            
            {/* Instructor */}
            {course.instructor && (
              <Card>
                <CardHeader>
                  <CardTitle>Instructor</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-12 h-12 rounded-full bg-gray-200 overflow-hidden">
                      {course.instructor.avatar ? (
                        <img 
                          src={course.instructor.avatar} 
                          alt={course.instructor.username}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-red-100 text-red-600 font-semibold">
                          {course.instructor.firstName.charAt(0)}
                          {course.instructor.lastName.charAt(0)}
                        </div>
                      )}
                    </div>
                    <div>
                      <h4 className="font-semibold">
                        {course.instructor.firstName} {course.instructor.lastName}
                      </h4>
                      <p className="text-sm text-gray-600">@{course.instructor.username}</p>
                    </div>
                  </div>
                  {course.instructor.bio && (
                    <p className="text-sm text-gray-700">{course.instructor.bio}</p>
                  )}
                </CardContent>
              </Card>
            )}
            
            {/* Tags */}
            {course.tags && course.tags.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Tags</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {course.tags.map((tag, index) => (
                      <Badge key={index} variant="secondary">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>

      {/* Payment Request Modal */}
      {showPaymentRequest && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="w-5 h-5" />
                Payment Request
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="payment-method">Payment Method *</Label>
                <Select value={selectedPaymentMethod} onValueChange={setSelectedPaymentMethod}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select payment method" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                    <SelectItem value="esewa">eSewa</SelectItem>
                    <SelectItem value="khalti">Khalti</SelectItem>
                    <SelectItem value="ime_pay">IME Pay</SelectItem>
                    <SelectItem value="cash">Cash</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="transaction-id">Transaction ID</Label>
                <Input
                  id="transaction-id"
                  placeholder="Enter transaction/reference ID"
                  value={transactionId}
                  onChange={(e) => setTransactionId(e.target.value)}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="notes">Additional Notes (Optional)</Label>
                <Textarea
                  id="notes"
                  placeholder="Any additional information..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                />
              </div>
              
              <div className="p-3 bg-yellow-50 rounded-lg">
                <p className="text-sm text-yellow-800">
                  <strong>Note:</strong> Your enrollment will be approved by admin after verifying your payment.
                  You'll receive an email notification once approved.
                </p>
              </div>
            </CardContent>
            <div className="p-6 pt-0 flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => {
                  setShowPaymentRequest(false)
                  resetPaymentForm()
                }}
                disabled={enrolling}
              >
                Cancel
              </Button>
              <Button
                className="flex-1"
                onClick={handlePaymentRequestSubmit}
                disabled={enrolling || !selectedPaymentMethod}
              >
                {enrolling ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  'Submit Request'
                )}
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}