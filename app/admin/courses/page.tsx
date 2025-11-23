// app/admin/courses/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Search, Filter, Plus, Edit, Trash2, Eye, EyeOff, Users, Star } from 'lucide-react'
import Link from 'next/link'

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
  level: string
  category: string
  totalStudents: number
  averageRating: number
  isPublished: boolean
  createdAt: string
}

export default function AdminCoursesPage() {
  const [courses, setCourses] = useState<Course[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')

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
    }
  }

  const deleteCourse = async (courseId: string) => {
    if (!confirm('Are you sure you want to delete this course?')) return

    try {
      const response = await fetch(`/api/admin/courses/${courseId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        setCourses(courses.filter(course => course._id !== courseId))
      }
    } catch (error) {
      console.error('Error deleting course:', error)
    }
  }

  const filteredCourses = courses.filter(course =>
    course.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    course.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
    course.instructor.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
    course.category.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-serif font-bold">Course Management</h1>
          <p className="text-slate-600 dark:text-slate-400">
            Manage and moderate platform courses
          </p>
        </div>
        <Link href="/admin/courses/create">
          <Button variant="premium" className="rounded-2xl">
            <Plus className="w-4 h-4 mr-2" />
            Create Course
          </Button>
        </Link>
      </div>

      {/* Search and Filters */}
      <Card className="rounded-2xl">
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
              <Input
                type="text"
                placeholder="Search courses by title, description, or instructor..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 rounded-2xl"
              />
            </div>
            <Button variant="outline" className="rounded-2xl">
              <Filter className="w-4 h-4 mr-2" />
              Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Courses Table */}
      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle>Courses ({filteredCourses.length})</CardTitle>
          <CardDescription>
            All courses on the platform
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredCourses.map((course) => (
              <div key={course._id} className="flex items-start justify-between p-4 rounded-xl bg-slate-50 dark:bg-slate-800">
                <div className="flex items-start space-x-4 flex-1">
                  <div className="w-16 h-16 rounded-xl bg-gradient-to-r from-rose-500 to-pink-500 flex items-center justify-center flex-shrink-0">
                    <Users className="w-6 h-6 text-white" />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2 mb-2">
                      <h3 className="font-semibold text-lg">{course.title}</h3>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        course.level === 'beginner' 
                          ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                          : course.level === 'intermediate'
                          ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300'
                          : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
                      }`}>
                        {course.level}
                      </span>
                    </div>
                    
                    <p className="text-sm text-slate-600 dark:text-slate-400 mb-2 line-clamp-2">
                      {course.description}
                    </p>
                    
                    <div className="flex items-center space-x-4 text-xs text-slate-500">
                      <div className="flex items-center space-x-1">
                        <img
                          src={course.instructor.avatar || '/default-avatar.png'}
                          alt={course.instructor.username}
                          className="w-4 h-4 rounded-full"
                        />
                        <span>by {course.instructor.firstName} {course.instructor.lastName}</span>
                      </div>
                      <span>•</span>
                      <span>{course.category}</span>
                      <span>•</span>
                      <div className="flex items-center space-x-1">
                        <Users className="w-3 h-3" />
                        <span>{course.totalStudents} students</span>
                      </div>
                      <span>•</span>
                      <div className="flex items-center space-x-1">
                        <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                        <span>{course.averageRating || 'No ratings'}</span>
                      </div>
                      <span>•</span>
                      <span className={`px-2 py-1 rounded-full ${
                        course.isPublished 
                          ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                          : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300'
                      }`}>
                        {course.isPublished ? 'Published' : 'Draft'}
                      </span>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  <span className="text-lg font-bold text-rose-600">
                    {course.isFree ? 'Free' : `$${course.price}`}
                  </span>
                  
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => toggleCoursePublish(course._id, course.isPublished)}
                    className="rounded-xl"
                    title={course.isPublished ? 'Unpublish course' : 'Publish course'}
                  >
                    {course.isPublished ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </Button>
                  
                  <Link href={`/admin/courses/edit/${course._id}`}>
                    <Button variant="ghost" size="icon" className="rounded-xl">
                      <Edit className="w-4 h-4" />
                    </Button>
                  </Link>
                  
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => deleteCourse(course._id)}
                    className="rounded-xl text-red-500 hover:text-red-600"
                    title="Delete course"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}