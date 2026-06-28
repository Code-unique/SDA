'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { useToast } from '@/components/ui/use-toast'
import {
  Search,
  Filter,
  Plus,
  Edit,
  Trash2,
  Eye,
  Users,
  Clock,
  Star,
  Loader2,
  AlertCircle,
  DollarSign,
  Lock,
  Globe,
  RefreshCw
} from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'

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
  slug: string
  totalStudents: number
  averageRating: number
  createdAt: string
  updatedAt: string
}

export default function YouTubeCoursesPage() {
  const router = useRouter()
  const { toast } = useToast()
  
  const [loading, setLoading] = useState(true)
  const [courses, setCourses] = useState<Course[]>([])
  const [filteredCourses, setFilteredCourses] = useState<Course[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [enrollmentFilter, setEnrollmentFilter] = useState('all')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchCourses()
  }, [])

  useEffect(() => {
    filterCourses()
  }, [courses, searchQuery, statusFilter, enrollmentFilter])

  const fetchCourses = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const response = await fetch('/api/admin/youtube-courses')
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to load courses')
      }
      
      const data = await response.json()
      setCourses(data.courses || [])
      
    } catch (error) {
      console.error('Error fetching courses:', error)
      setError(error instanceof Error ? error.message : 'Failed to load courses')
      toast({
        title: 'Error',
        description: 'Failed to load courses',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  const filterCourses = () => {
    let filtered = [...courses]
    
    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(course =>
        course.title.toLowerCase().includes(query) ||
        course.shortDescription.toLowerCase().includes(query) ||
        course.description.toLowerCase().includes(query) ||
        course.category.toLowerCase().includes(query) ||
        course.tags.some(tag => tag.toLowerCase().includes(query))
      )
    }
    
    // Apply status filter
    if (statusFilter !== 'all') {
      if (statusFilter === 'published') {
        filtered = filtered.filter(course => course.isPublished)
      } else if (statusFilter === 'draft') {
        filtered = filtered.filter(course => !course.isPublished)
      } else if (statusFilter === 'featured') {
        filtered = filtered.filter(course => course.isFeatured)
      }
    }
    
    // Apply enrollment filter
    if (enrollmentFilter !== 'all') {
      if (enrollmentFilter === 'manual') {
        filtered = filtered.filter(course => course.manualEnrollmentEnabled)
      } else if (enrollmentFilter === 'auto') {
        filtered = filtered.filter(course => !course.manualEnrollmentEnabled)
      }
    }
    
    setFilteredCourses(filtered)
  }

  const handleDeleteCourse = async (courseId: string, courseTitle: string) => {
    if (!confirm(`Are you sure you want to delete "${courseTitle}"? This action cannot be undone.`)) {
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
          description: `"${courseTitle}" has been deleted successfully`,
          variant: 'default'
        })
        
        // Remove from state
        setCourses(prev => prev.filter(course => course._id !== courseId))
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

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      })
    } catch {
      return 'Invalid date'
    }
  }

  const calculateTotalDuration = (modules: any[]) => {
    let totalMinutes = 0
    modules?.forEach((module: any) => {
      module.chapters?.forEach((chapter: any) => {
        chapter.lessons?.forEach((lesson: any) => {
          totalMinutes += lesson.duration || 0
          lesson.subLessons?.forEach((subLesson: any) => {
            totalMinutes += subLesson.duration || 0
          })
        })
      })
    })
    
    const hours = Math.floor(totalMinutes / 60)
    const minutes = totalMinutes % 60
    
    if (hours > 0) {
      return `${hours}h ${minutes > 0 ? `${minutes}m` : ''}`.trim()
    }
    return `${minutes}m`
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading courses...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription className="space-y-2">
              <p>{error}</p>
              <div className="flex gap-2 mt-4">
                <Button
                  onClick={fetchCourses}
                  variant="outline"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Try Again
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">YouTube Courses</h1>
              <p className="text-gray-600">Manage all your YouTube courses</p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={fetchCourses}
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh
              </Button>
              <Button onClick={() => router.push('/admin/youtube-courses/create')}>
                <Plus className="w-4 h-4 mr-2" />
                Create Course
              </Button>
            </div>
          </div>
        </div>

        {/* Stats Summary */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{courses.length}</div>
                <div className="text-sm text-gray-600">Total Courses</div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {courses.filter(c => c.isPublished).length}
                </div>
                <div className="text-sm text-gray-600">Published</div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">
                  {courses.filter(c => c.isFeatured).length}
                </div>
                <div className="text-sm text-gray-600">Featured</div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">
                  {courses.filter(c => c.manualEnrollmentEnabled).length}
                </div>
                <div className="text-sm text-gray-600">Manual Enrollment</div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">Search</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <Input
                    placeholder="Search courses..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">Status</label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="published">Published</SelectItem>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="featured">Featured</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">Enrollment</label>
                <Select value={enrollmentFilter} onValueChange={setEnrollmentFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Filter by enrollment" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="manual">Manual Approval</SelectItem>
                    <SelectItem value="auto">Auto Enrollment</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex items-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setSearchQuery('')
                    setStatusFilter('all')
                    setEnrollmentFilter('all')
                  }}
                  className="w-full"
                >
                  <Filter className="w-4 h-4 mr-2" />
                  Clear Filters
                </Button>
                <Button
                  variant="outline"
                  onClick={filterCourses}
                  className="w-full"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Apply
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Courses List */}
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold">
              Courses ({filteredCourses.length} of {courses.length})
            </h2>
            <div className="text-sm text-gray-500">
              Sorted by: Newest First
            </div>
          </div>
          
          {filteredCourses.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Search className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No courses found</h3>
                <p className="text-gray-600 mb-4">
                  {courses.length === 0 
                    ? 'No courses have been created yet. Create your first course!'
                    : 'No courses match your current filters.'}
                </p>
                {courses.length === 0 && (
                  <Button onClick={() => router.push('/admin/youtube-courses/create')}>
                    <Plus className="w-4 h-4 mr-2" />
                    Create First Course
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredCourses.map((course) => (
                <Card key={course._id} className="overflow-hidden hover:shadow-lg transition-shadow h-full flex flex-col">
                  {/* Course Image */}
                  <div className="h-48 bg-gray-200 relative group">
                    {course.thumbnail ? (
                      <img
                        src={course.thumbnail}
                        alt={course.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-r from-blue-500 to-purple-500">
                        <Globe className="w-12 h-12 text-white" />
                      </div>
                    )}
                    
                    {/* Status Overlay */}
                    <div className="absolute top-2 left-2 flex flex-col gap-1">
                      {!course.isPublished && (
                        <Badge className="bg-yellow-500 text-white">
                          Draft
                        </Badge>
                      )}
                      {course.isFeatured && (
                        <Badge className="bg-pink-500 text-white">
                          Featured
                        </Badge>
                      )}
                    </div>
                    
                    {/* Enrollment Type */}
                    <div className="absolute top-2 right-2">
                      {course.manualEnrollmentEnabled ? (
                        <Badge className="bg-red-500 text-white">
                          <Lock className="w-3 h-3 mr-1" />
                          Manual
                        </Badge>
                      ) : (
                        <Badge className="bg-green-500 text-white">
                          <Globe className="w-3 h-3 mr-1" />
                          Auto
                        </Badge>
                      )}
                    </div>
                    
                    {/* Price Badge */}
                    <div className="absolute bottom-2 left-2">
                      {course.isFree ? (
                        <Badge className="bg-green-500 text-white">
                          FREE
                        </Badge>
                      ) : (
                        <Badge className="bg-purple-500 text-white">
                          <DollarSign className="w-3 h-3 mr-1" />
                          NPR {course.price}
                        </Badge>
                      )}
                    </div>
                    
                    {/* Action Overlay */}
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                      <Button
                        size="sm"
                        className="bg-white text-gray-900 hover:bg-white/90"
                        onClick={() => router.push(`/admin/youtube-courses/${course._id}`)}
                      >
                        <Eye className="w-4 h-4 mr-2" />
                        View
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="bg-transparent border-white text-white hover:bg-white/10"
                        onClick={() => router.push(`/admin/youtube-courses/${course._id}/edit`)}
                      >
                        <Edit className="w-4 h-4 mr-2" />
                        Edit
                      </Button>
                    </div>
                  </div>
                  
                  {/* Course Info */}
                  <div className="p-4 flex-1 flex flex-col">
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg mb-2 line-clamp-1">
                        {course.title}
                      </h3>
                      
                      <p className="text-gray-600 text-sm mb-3 line-clamp-2">
                        {course.shortDescription}
                      </p>
                      
                      <div className="flex items-center gap-2 mb-3">
                        <Badge variant="outline" className={
                          course.level === 'beginner' ? 'border-green-200 text-green-800' :
                          course.level === 'intermediate' ? 'border-yellow-200 text-yellow-800' :
                          'border-red-200 text-red-800'
                        }>
                          {course.level}
                        </Badge>
                        <Badge variant="outline" className="border-blue-200 text-blue-800">
                          {course.category || 'Uncategorized'}
                        </Badge>
                      </div>
                      
                      <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-1">
                            <Users className="w-4 h-4" />
                            <span>{course.totalStudents}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Star className="w-4 h-4 text-yellow-500" />
                            <span>{course.averageRating.toFixed(1)}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    {/* Actions */}
                    <div className="border-t border-gray-200 pt-4 mt-4">
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-gray-500">
                          {formatDate(course.createdAt)}
                        </span>
                        
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => router.push(`/admin/youtube-courses/${course._id}/enrollments`)}
                          >
                            <Users className="w-4 h-4 mr-2" />
                            Enrollments
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            onClick={() => handleDeleteCourse(course._id, course.title)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}