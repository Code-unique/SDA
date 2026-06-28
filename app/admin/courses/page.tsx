// app/admin/courses/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { 
  Search, 
  Filter, 
  Plus, 
  Edit, 
  Trash2, 
  Eye, 
  EyeOff, 
  Users, 
  Star, 
  Calendar,
  DollarSign,
  Tag,
  Loader2
} from 'lucide-react'
import Link from 'next/link'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'

interface Course {
  _id: string
  title: string
  description: string
  instructor: {
    username: string
    firstName: string
    lastName: string
    avatar: string
  }
  price: number
  isFree: boolean
  level: 'beginner' | 'intermediate' | 'advanced'
  category: string
  totalStudents: number
  averageRating: number
  isPublished: boolean
  createdAt: string
  thumbnail?: string
}

export default function AdminCoursesPage() {
  const [courses, setCourses] = useState<Course[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [levelFilter, setLevelFilter] = useState<string>('all')
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [publishingId, setPublishingId] = useState<string | null>(null)

  useEffect(() => {
    loadCourses()
  }, [])

  const loadCourses = async () => {
    try {
      const response = await fetch('/api/admin/courses')
      const data = await response.json()
      if (response.ok) {
        setCourses(data.courses)
      }
    } catch (error) {
      console.error('Error loading courses:', error)
    } finally {
      setLoading(false)
    }
  }

  const toggleCoursePublish = async (courseId: string, currentStatus: boolean) => {
    setPublishingId(courseId)
    try {
      const response = await fetch(`/api/admin/courses/${courseId}/publish`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ isPublished: !currentStatus }),
      })

      if (response.ok) {
        setCourses(courses.map(course => 
          course._id === courseId ? { ...course, isPublished: !currentStatus } : course
        ))
      }
    } catch (error) {
      console.error('Error updating course publish status:', error)
    } finally {
      setPublishingId(null)
    }
  }

  const deleteCourse = async (courseId: string) => {
    if (!confirm('Are you sure you want to delete this course? This action cannot be undone.')) return
    
    setDeletingId(courseId)
    try {
      const response = await fetch(`/api/admin/courses/${courseId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        setCourses(courses.filter(course => course._id !== courseId))
      }
    } catch (error) {
      console.error('Error deleting course:', error)
    } finally {
      setDeletingId(null)
    }
  }

  const filteredCourses = courses.filter(course => {
    const matchesSearch = 
      course.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      course.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      course.instructor.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
      course.category.toLowerCase().includes(searchQuery.toLowerCase())
    
    const matchesStatus = statusFilter === 'all' || 
      (statusFilter === 'published' && course.isPublished) ||
      (statusFilter === 'draft' && !course.isPublished)
    
    const matchesLevel = levelFilter === 'all' || course.level === levelFilter
    
    return matchesSearch && matchesStatus && matchesLevel
  })

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  // Stats
  const stats = {
    total: courses.length,
    published: courses.filter(c => c.isPublished).length,
    draft: courses.filter(c => !c.isPublished).length,
    free: courses.filter(c => c.isFree).length,
    paid: courses.filter(c => !c.isFree).length,
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">Course Management</h1>
            <p className="text-sm md:text-base text-gray-600 dark:text-gray-400 mt-1">
              Manage and monitor all platform courses
            </p>
          </div>
          <Link href="/admin/courses/create" className="w-full sm:w-auto">
            <Button className="w-full sm:w-auto bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg">
              <Plus className="w-4 h-4 mr-2" />
              Create Course
            </Button>
          </Link>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="bg-white dark:bg-gray-800 shadow-sm border border-gray-200 dark:border-gray-700">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Total Courses</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{stats.total}</p>
                </div>
                <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                  <Tag className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white dark:bg-gray-800 shadow-sm border border-gray-200 dark:border-gray-700">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Published</p>
                  <p className="text-2xl font-bold text-green-600 dark:text-green-400 mt-1">{stats.published}</p>
                </div>
                <div className="w-10 h-10 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                  <Eye className="w-5 h-5 text-green-600 dark:text-green-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white dark:bg-gray-800 shadow-sm border border-gray-200 dark:border-gray-700">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Draft</p>
                  <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400 mt-1">{stats.draft}</p>
                </div>
                <div className="w-10 h-10 rounded-lg bg-yellow-100 dark:bg-yellow-900/30 flex items-center justify-center">
                  <EyeOff className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white dark:bg-gray-800 shadow-sm border border-gray-200 dark:border-gray-700">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Free Courses</p>
                  <p className="text-2xl font-bold text-purple-600 dark:text-purple-400 mt-1">{stats.free}</p>
                </div>
                <div className="w-10 h-10 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                  <DollarSign className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search and Filter Section */}
        <Card className="bg-white dark:bg-gray-800 shadow-sm border border-gray-200 dark:border-gray-700">
          <CardContent className="p-4 md:p-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  type="text"
                  placeholder="Search courses by title, instructor, or category..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 bg-gray-50 dark:bg-gray-900 border-gray-300 dark:border-gray-700"
                />
              </div>
              
              <div className="flex flex-col sm:flex-row gap-3">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-full sm:w-[140px] bg-gray-50 dark:bg-gray-900 border-gray-300 dark:border-gray-700">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="published">Published</SelectItem>
                    <SelectItem value="draft">Draft</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={levelFilter} onValueChange={setLevelFilter}>
                  <SelectTrigger className="w-full sm:w-[140px] bg-gray-50 dark:bg-gray-900 border-gray-300 dark:border-gray-700">
                    <SelectValue placeholder="Level" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Levels</SelectItem>
                    <SelectItem value="beginner">Beginner</SelectItem>
                    <SelectItem value="intermediate">Intermediate</SelectItem>
                    <SelectItem value="advanced">Advanced</SelectItem>
                  </SelectContent>
                </Select>

                <Button variant="outline" className="bg-gray-50 dark:bg-gray-900 border-gray-300 dark:border-gray-700">
                  <Filter className="w-4 h-4 mr-2" />
                  More Filters
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Results Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Courses ({filteredCourses.length})
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Showing {filteredCourses.length} of {courses.length} total courses
            </p>
          </div>
          <Button 
            variant="outline" 
            className="text-sm"
            onClick={loadCourses}
            disabled={loading}
          >
            {loading ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : null}
            Refresh
          </Button>
        </div>

        {/* Courses List */}
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                <CardContent className="p-6">
                  <div className="flex items-start space-x-4">
                    <Skeleton className="w-20 h-20 rounded-lg" />
                    <div className="flex-1 space-y-3">
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-4 w-1/2" />
                      <div className="flex gap-2">
                        <Skeleton className="h-6 w-20 rounded-full" />
                        <Skeleton className="h-6 w-20 rounded-full" />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filteredCourses.length === 0 ? (
          <Card className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
            <CardContent className="p-12 text-center">
              <div className="w-16 h-16 mx-auto rounded-full bg-gray-100 dark:bg-gray-900 flex items-center justify-center mb-4">
                <Search className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                No courses found
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-md mx-auto">
                {searchQuery || statusFilter !== 'all' || levelFilter !== 'all' 
                  ? 'Try adjusting your search or filters'
                  : 'No courses have been created yet'}
              </p>
              {(!searchQuery && statusFilter === 'all' && levelFilter === 'all') && (
                <Link href="/admin/courses/create">
                  <Button className="bg-gradient-to-r from-blue-600 to-purple-600">
                    <Plus className="w-4 h-4 mr-2" />
                    Create Your First Course
                  </Button>
                </Link>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {filteredCourses.map((course) => (
              <Card 
                key={course._id} 
                className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow duration-200"
              >
                <CardContent className="p-4 md:p-6">
                  <div className="flex flex-col md:flex-row md:items-start gap-4">
                    {/* Course Thumbnail */}
                    <div className="w-full md:w-48 lg:w-64 h-48 md:h-40 rounded-lg overflow-hidden bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center">
                      {course.thumbnail ? (
                        <img 
                          src={course.thumbnail} 
                          alt={course.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="text-center p-4">
                          <Tag className="w-12 h-12 text-white/80 mx-auto mb-2" />
                          <span className="text-white/90 font-medium text-sm">No Thumbnail</span>
                        </div>
                      )}
                    </div>

                    {/* Course Details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-3 mb-3">
                        <div className="flex-1">
                          <div className="flex items-center flex-wrap gap-2 mb-2">
                            <h3 className="text-lg md:text-xl font-semibold text-gray-900 dark:text-white">
                              {course.title}
                            </h3>
                            <Badge 
                              variant={course.level === 'beginner' ? 'success' : 
                                      course.level === 'intermediate' ? 'warning' : 'destructive'}
                              className="text-xs"
                            >
                              {course.level}
                            </Badge>
                            <Badge 
                              variant={course.isPublished ? 'default' : 'secondary'}
                              className="text-xs"
                            >
                              {course.isPublished ? 'Published' : 'Draft'}
                            </Badge>
                          </div>
                          
                          <p className="text-gray-600 dark:text-gray-400 text-sm mb-4 line-clamp-2">
                            {course.description}
                          </p>
                        </div>

                        <div className="flex items-center space-x-2">
                          <span className="text-xl font-bold text-gray-900 dark:text-white">
                            {course.isFree ? (
                              <span className="text-green-600 dark:text-green-400">Free</span>
                            ) : (
                              `$${course.price}`
                            )}
                          </span>
                        </div>
                      </div>

                      {/* Course Meta */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                        <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                          <div className="flex items-center gap-2">
                            <img
                              src={course.instructor.avatar || '/default-avatar.png'}
                              alt={course.instructor.username}
                              className="w-6 h-6 rounded-full"
                            />
                            <span>{course.instructor.firstName} {course.instructor.lastName}</span>
                          </div>
                          
                          <div className="hidden sm:flex items-center gap-2">
                            <span className="w-1 h-1 rounded-full bg-gray-300"></span>
                            <span className="px-2 py-1 bg-gray-100 dark:bg-gray-900 rounded-md text-xs">
                              {course.category}
                            </span>
                          </div>

                          <div className="flex items-center gap-2">
                            <span className="w-1 h-1 rounded-full bg-gray-300 hidden sm:inline"></span>
                            <Calendar className="w-4 h-4" />
                            <span>{formatDate(course.createdAt)}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-4 text-sm">
                          <div className="flex items-center gap-4">
                            <div className="flex items-center gap-1">
                              <Users className="w-4 h-4 text-gray-500" />
                              <span className="font-medium">{course.totalStudents}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                              <span className="font-medium">{course.averageRating?.toFixed(1) || 'N/A'}</span>
                            </div>
                          </div>

                          {/* Actions */}
                          <div className="flex items-center gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => toggleCoursePublish(course._id, course.isPublished)}
                              disabled={publishingId === course._id}
                              className="h-8 w-8 p-0"
                              title={course.isPublished ? 'Unpublish' : 'Publish'}
                            >
                              {publishingId === course._id ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : course.isPublished ? (
                                <EyeOff className="w-4 h-4" />
                              ) : (
                                <Eye className="w-4 h-4" />
                              )}
                            </Button>

                            <Link href={`/admin/courses/edit/${course._id}`}>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-8 w-8 p-0"
                                title="Edit"
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                            </Link>

                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-8 w-8 p-0"
                                  title="More actions"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                                  </svg>
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-48">
                                <DropdownMenuItem asChild>
                                  <Link href={`/admin/courses/${course._id}`}>
                                    View Details
                                  </Link>
                                </DropdownMenuItem>
                                <DropdownMenuItem asChild>
                                  <Link href={`/admin/courses/edit/${course._id}`}>
                                    <Edit className="w-4 h-4 mr-2" />
                                    Edit Course
                                  </Link>
                                </DropdownMenuItem>
                                <DropdownMenuItem 
                                  onClick={() => toggleCoursePublish(course._id, course.isPublished)}
                                  disabled={publishingId === course._id}
                                >
                                  {publishingId === course._id ? (
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                  ) : course.isPublished ? (
                                    <EyeOff className="w-4 h-4 mr-2" />
                                  ) : (
                                    <Eye className="w-4 h-4 mr-2" />
                                  )}
                                  {course.isPublished ? 'Unpublish' : 'Publish'}
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem 
                                  className="text-red-600 dark:text-red-400"
                                  onClick={() => deleteCourse(course._id)}
                                  disabled={deletingId === course._id}
                                >
                                  {deletingId === course._id ? (
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                  ) : (
                                    <Trash2 className="w-4 h-4 mr-2" />
                                  )}
                                  Delete Course
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}