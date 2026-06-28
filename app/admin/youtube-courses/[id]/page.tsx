'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { useToast } from '@/components/ui/use-toast'
import { Separator } from '@/components/ui/separator'
import {
  Edit,
  Trash2,
  Users,
  Clock,
  ChevronRight ,
  Star,
  BookOpen,
  DollarSign,
  Lock,
  Globe,
  Eye,
  BarChart3,
  FileText,
  Download,
  Loader2,
  AlertCircle,
  ArrowLeft,
  Calendar
} from 'lucide-react'
import Link from 'next/link'

interface Course {
  _id: string
  title: string
  description: string
  shortDescription: string
  price: number
  isFree: boolean
  isPublished: boolean
  isFeatured: boolean
  manualEnrollmentEnabled: boolean
  level: 'beginner' | 'intermediate' | 'advanced'
  category: string
  tags: string[]
  thumbnail: string
  previewVideo?: {
    type: 'youtube'
    videoId: string
    url: string
    thumbnailUrl: string
  }
  modules: any[]
  requirements: string[]
  learningOutcomes: string[]
  totalStudents: number
  averageRating: number
  ratings: any[]
  createdAt: string
  updatedAt: string
  instructor?: {
    _id: string
    username: string
    firstName: string
    lastName: string
    avatar?: string
  }
}

interface EnrollmentStats {
  total: number
  pending: number
  approved: number
  rejected: number
}

export default function YouTubeCourseDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { toast } = useToast()
  
  const [loading, setLoading] = useState(true)
  const [course, setCourse] = useState<Course | null>(null)
  const [enrollmentStats, setEnrollmentStats] = useState<EnrollmentStats>({
    total: 0,
    pending: 0,
    approved: 0,
    rejected: 0
  })

  const courseId = params.id as string

  useEffect(() => {
    if (courseId) {
      fetchCourse()
      fetchEnrollmentStats()
    }
  }, [courseId])

  const fetchCourse = async () => {
    try {
      setLoading(true)
      
      const response = await fetch(`/api/admin/youtube-courses/${courseId}`)
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to load course')
      }
      
      const data = await response.json()
      setCourse(data)
      
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to load course',
        variant: 'destructive'
      })
      router.push('/admin/youtube-courses')
    } finally {
      setLoading(false)
    }
  }

  const fetchEnrollmentStats = async () => {
    try {
      const response = await fetch(`/api/admin/youtube-courses/${courseId}/enrollments`)
      
      if (response.ok) {
        const data = await response.json()
        
        // Calculate stats
        const enrollments = data.enrollments || []
        const pending = enrollments.filter((e: any) => e.status === 'pending').length
        const approved = enrollments.filter((e: any) => e.status === 'approved').length
        const rejected = enrollments.filter((e: any) => e.status === 'rejected').length
        
        setEnrollmentStats({
          total: enrollments.length,
          pending,
          approved,
          rejected
        })
      }
    } catch (error) {
      console.error('Error fetching enrollment stats:', error)
    }
  }

  const handleDeleteCourse = async () => {
    if (!course) return
    
    if (!confirm('Are you sure you want to delete this course? This action cannot be undone.')) {
      return
    }
    
    try {
      const response = await fetch(`/api/admin/youtube-courses/${courseId}`, {
        method: 'DELETE'
      })
      
      const data = await response.json()
      
      if (response.ok) {
        toast({
          title: 'Course Deleted',
          description: 'Course has been deleted successfully',
          variant: 'default'
        })
        router.push('/admin/youtube-courses')
      } else {
        throw new Error(data.error || 'Failed to delete course')
      }
      
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete course',
        variant: 'destructive'
      })
    }
  }

  const calculateTotalDuration = () => {
    if (!course) return 0
    
    let totalMinutes = 0
    
    course.modules.forEach((module: any) => {
      module.chapters.forEach((chapter: any) => {
        chapter.lessons.forEach((lesson: any) => {
          totalMinutes += lesson.duration || 0
          lesson.subLessons.forEach((subLesson: any) => {
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
    
    course.modules.forEach((module: any) => {
      module.chapters.forEach((chapter: any) => {
        total += chapter.lessons.length
        chapter.lessons.forEach((lesson: any) => {
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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
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
          <Button onClick={() => router.push('/admin/youtube-courses')}>
            Go Back
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                onClick={() => router.push('/admin/youtube-courses')}
                className="mr-2"
              >
                <ArrowLeft className="w-4 h-4" />
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{course.title}</h1>
                <p className="text-gray-600">{course.shortDescription}</p>
              </div>
            </div>
            
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => router.push(`/youtube-courses/${course._id}`)}
              >
                <Eye className="w-4 h-4 mr-2" />
                View Public Page
              </Button>
              <Button
                onClick={() => router.push(`/admin/youtube-courses/${courseId}/edit`)}
              >
                <Edit className="w-4 h-4 mr-2" />
                Edit Course
              </Button>
              <Button
                variant="destructive"
                onClick={handleDeleteCourse}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete
              </Button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column */}
          <div className="lg:col-span-2 space-y-6">
            {/* Course Stats */}
            <Card>
              <CardContent className="p-6">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-blue-600">
                      {course.totalStudents}
                    </div>
                    <div className="text-sm text-gray-600">Students</div>
                  </div>
                  
                  <div className="text-center">
                    <div className="text-3xl font-bold text-purple-600">
                      {calculateTotalLessons()}
                    </div>
                    <div className="text-sm text-gray-600">Content Items</div>
                  </div>
                  
                  <div className="text-center">
                    <div className="text-3xl font-bold text-green-600">
                      {formatDuration(calculateTotalDuration())}
                    </div>
                    <div className="text-sm text-gray-600">Duration</div>
                  </div>
                  
                  <div className="text-center">
                    <div className="text-3xl font-bold text-yellow-600">
                      {course.averageRating.toFixed(1)}
                    </div>
                    <div className="text-sm text-gray-600">Rating</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Enrollment Stats */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  Enrollment Requests
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  <div className="bg-yellow-50 p-4 rounded-lg text-center">
                    <div className="text-2xl font-bold text-yellow-600">
                      {enrollmentStats.pending}
                    </div>
                    <div className="text-sm text-yellow-800">Pending</div>
                  </div>
                  
                  <div className="bg-green-50 p-4 rounded-lg text-center">
                    <div className="text-2xl font-bold text-green-600">
                      {enrollmentStats.approved}
                    </div>
                    <div className="text-sm text-green-800">Approved</div>
                  </div>
                  
                  <div className="bg-red-50 p-4 rounded-lg text-center">
                    <div className="text-2xl font-bold text-red-600">
                      {enrollmentStats.rejected}
                    </div>
                    <div className="text-sm text-red-800">Rejected</div>
                  </div>
                  
                  <div className="bg-blue-50 p-4 rounded-lg text-center">
                    <div className="text-2xl font-bold text-blue-600">
                      {enrollmentStats.total}
                    </div>
                    <div className="text-sm text-blue-800">Total Requests</div>
                  </div>
                </div>
                
                <Button
                  className="w-full"
                  onClick={() => router.push(`/admin/youtube-courses/${courseId}/enrollments`)}
                >
                  <BarChart3 className="w-4 h-4 mr-2" />
                  Manage Enrollments ({enrollmentStats.total})
                </Button>
              </CardContent>
            </Card>

            {/* Course Info */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BookOpen className="w-5 h-5" />
                  Course Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h3 className="font-semibold mb-2">Description</h3>
                  <p className="text-gray-600 whitespace-pre-line">{course.description}</p>
                </div>
                
                <Separator />
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h3 className="font-semibold mb-2">Category</h3>
                    <Badge variant="outline">{course.category}</Badge>
                  </div>
                  
                  <div>
                    <h3 className="font-semibold mb-2">Level</h3>
                    <Badge variant="outline" className={
                      course.level === 'beginner' ? 'bg-green-100 text-green-800' :
                      course.level === 'intermediate' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }>
                      {course.level}
                    </Badge>
                  </div>
                </div>
                
                <Separator />
                
                <div>
                  <h3 className="font-semibold mb-2">Tags</h3>
                  <div className="flex flex-wrap gap-2">
                    {course.tags.map((tag, index) => (
                      <Badge key={index} variant="secondary">{tag}</Badge>
                    ))}
                    {course.tags.length === 0 && (
                      <span className="text-gray-500">No tags</span>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Modules */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Course Content ({course.modules.length} modules)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {course.modules.map((module: any, moduleIndex: number) => (
                    <div key={module._id} className="border rounded-lg p-4">
                      <h3 className="font-semibold mb-2">
                        Module {moduleIndex + 1}: {module.title}
                      </h3>
                      {module.description && (
                        <p className="text-gray-600 mb-3">{module.description}</p>
                      )}
                      
                      <div className="space-y-3">
                        {module.chapters.map((chapter: any, chapterIndex: number) => (
                          <div key={chapter._id} className="ml-4">
                            <h4 className="font-medium mb-1">
                              Chapter {chapterIndex + 1}: {chapter.title}
                            </h4>
                            
                            <div className="ml-4 space-y-2">
                              {chapter.lessons.map((lesson: any, lessonIndex: number) => (
                                <div key={lesson._id} className="text-sm">
                                  <div className="flex items-center gap-2">
                                    <BookOpen className="w-4 h-4 text-gray-400" />
                                    <span>Lesson {lessonIndex + 1}: {lesson.title}</span>
                                    {lesson.duration > 0 && (
                                      <span className="text-gray-500 text-xs">
                                        ({formatDuration(lesson.duration)})
                                      </span>
                                    )}
                                  </div>
                                  
                                  {lesson.subLessons.length > 0 && (
                                    <div className="ml-6 mt-1 space-y-1">
                                      {lesson.subLessons.map((subLesson: any) => (
                                        <div key={subLesson._id} className="flex items-center gap-2 text-xs text-gray-600">
                                          <ChevronRight className="w-3 h-3" />
                                          <span>{subLesson.title}</span>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            {/* Status & Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Course Status</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Published</span>
                    <Badge className={
                      course.isPublished ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                    }>
                      {course.isPublished ? 'Published' : 'Draft'}
                    </Badge>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Featured</span>
                    <Badge className={
                      course.isFeatured ? 'bg-pink-100 text-pink-800' : 'bg-gray-100 text-gray-800'
                    }>
                      {course.isFeatured ? 'Featured' : 'Regular'}
                    </Badge>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Enrollment</span>
                    <Badge className={
                      course.manualEnrollmentEnabled ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
                    }>
                      {course.manualEnrollmentEnabled ? 'Manual Approval' : 'Auto Enrollment'}
                    </Badge>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Price</span>
                    <div className="font-semibold">
                      {course.isFree ? (
                        <span className="text-green-600">Free</span>
                      ) : (
                        <span>NPR {course.price}</span>
                      )}
                    </div>
                  </div>
                </div>
                
                <Separator />
                
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Created</span>
                    <span className="text-sm">{formatDate(course.createdAt)}</span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Updated</span>
                    <span className="text-sm">{formatDate(course.updatedAt)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Requirements */}
            <Card>
              <CardHeader>
                <CardTitle>Requirements</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {course.requirements.map((req, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <div className="w-2 h-2 bg-gray-300 rounded-full mt-2"></div>
                      <span className="text-sm">{req}</span>
                    </li>
                  ))}
                  {course.requirements.length === 0 && (
                    <p className="text-gray-500 text-sm">No requirements specified</p>
                  )}
                </ul>
              </CardContent>
            </Card>

            {/* Learning Outcomes */}
            <Card>
              <CardHeader>
                <CardTitle>Learning Outcomes</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {course.learningOutcomes.map((outcome, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
                      <span className="text-sm">{outcome}</span>
                    </li>
                  ))}
                  {course.learningOutcomes.length === 0 && (
                    <p className="text-gray-500 text-sm">No learning outcomes specified</p>
                  )}
                </ul>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => router.push(`/admin/youtube-courses/${courseId}/enrollments`)}
                >
                  <Users className="w-4 h-4 mr-2" />
                  View Enrollments
                </Button>
                
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => router.push(`/admin/youtube-courses/${courseId}/edit`)}
                >
                  <Edit className="w-4 h-4 mr-2" />
                  Edit Course
                </Button>
                
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => router.push(`/youtube-courses/${course._id}`)}
                >
                  <Eye className="w-4 h-4 mr-2" />
                  View Public Page
                </Button>
                
                <Button
                  variant="destructive"
                  className="w-full justify-start"
                  onClick={handleDeleteCourse}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete Course
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}