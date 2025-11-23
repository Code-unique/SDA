//app/my-courses/page.tsx

'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { PlayCircle, Clock, Users, Star, BookOpen } from 'lucide-react'

interface EnrolledCourse {
  _id: string
  course: {
    _id: string
    title: string
    description: string
    thumbnail: string
    instructor: {
      username: string
      firstName: string
      lastName: string
      avatar: string
    }
    level: string
    duration: number
    totalStudents: number
    averageRating: number
  }
  enrolledAt: string
  progress: number
  completed: boolean
  lastAccessed: string
}

export default function MyCoursesPage() {
  const [enrolledCourses, setEnrolledCourses] = useState<EnrolledCourse[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchEnrolledCourses()
  }, [])

  const fetchEnrolledCourses = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/users/me/courses')
      if (response.ok) {
        const data = await response.json()
        setEnrolledCourses(data.enrolledCourses)
      }
    } catch (error) {
      console.error('Error fetching enrolled courses:', error)
    } finally {
      setLoading(false)
    }
  }

  const calculateDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-rose-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <div className="container mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-serif font-bold">My Courses</h1>
            <p className="text-slate-600 dark:text-slate-400">
              Continue your fashion learning journey
            </p>
          </div>
          <Button className="rounded-2xl">
            <BookOpen className="w-4 h-4 mr-2" />
            Browse Courses
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card className="rounded-2xl">
            <CardContent className="p-6 text-center">
              <div className="text-2xl font-bold text-rose-600">{enrolledCourses.length}</div>
              <div className="text-sm text-slate-600 dark:text-slate-400">Total Courses</div>
            </CardContent>
          </Card>
          <Card className="rounded-2xl">
            <CardContent className="p-6 text-center">
              <div className="text-2xl font-bold text-rose-600">
                {enrolledCourses.filter(course => course.completed).length}
              </div>
              <div className="text-sm text-slate-600 dark:text-slate-400">Completed</div>
            </CardContent>
          </Card>
          <Card className="rounded-2xl">
            <CardContent className="p-6 text-center">
              <div className="text-2xl font-bold text-rose-600">
                {enrolledCourses.filter(course => course.progress > 0 && !course.completed).length}
              </div>
              <div className="text-sm text-slate-600 dark:text-slate-400">In Progress</div>
            </CardContent>
          </Card>
          <Card className="rounded-2xl">
            <CardContent className="p-6 text-center">
              <div className="text-2xl font-bold text-rose-600">
                {enrolledCourses.filter(course => course.progress === 0).length}
              </div>
              <div className="text-sm text-slate-600 dark:text-slate-400">Not Started</div>
            </CardContent>
          </Card>
        </div>

        {enrolledCourses.length === 0 ? (
          <Card className="rounded-2xl">
            <CardContent className="p-12 text-center">
              <BookOpen className="w-16 h-16 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-slate-600 dark:text-slate-400 mb-2">
                No courses enrolled yet
              </h3>
              <p className="text-slate-500 dark:text-slate-500 mb-6">
                Start your fashion education journey today!
              </p>
              <Button className="rounded-2xl">
                Browse Courses
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {enrolledCourses.map((enrollment) => (
              <Card key={enrollment._id} className="rounded-2xl overflow-hidden hover:shadow-xl transition-shadow">
                <div className="h-48 bg-slate-200 dark:bg-slate-700 relative">
                  <img
                    src={enrollment.course.thumbnail}
                    alt={enrollment.course.title}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                    <PlayCircle className="w-12 h-12 text-white" />
                  </div>
                  <div className="absolute top-2 right-2">
                    <Badge variant={enrollment.completed ? "default" : "secondary"} className="rounded-lg">
                      {enrollment.completed ? 'Completed' : `${enrollment.progress}%`}
                    </Badge>
                  </div>
                </div>
                <CardContent className="p-4">
                  <h3 className="font-semibold text-lg mb-2 line-clamp-2">
                    {enrollment.course.title}
                  </h3>
                  <div className="flex items-center space-x-2 mb-3">
                    <img
                      src={enrollment.course.instructor.avatar}
                      alt={enrollment.course.instructor.username}
                      className="w-6 h-6 rounded-full"
                    />
                    <span className="text-sm text-slate-600 dark:text-slate-400">
                      {enrollment.course.instructor.firstName} {enrollment.course.instructor.lastName}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm text-slate-500 mb-3">
                    <div className="flex items-center space-x-1">
                      <Clock className="w-3 h-3" />
                      <span>{calculateDuration(enrollment.course.duration)}</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Users className="w-3 h-3" />
                      <span>{enrollment.course.totalStudents}</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                      <span>{enrollment.course.averageRating}</span>
                    </div>
                  </div>
                  <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2 mb-4">
                    <div
                      className="bg-rose-600 h-2 rounded-full transition-all"
                      style={{ width: `${enrollment.progress}%` }}
                    />
                  </div>
                  <Button className="w-full rounded-xl">
                    {enrollment.completed ? 'Review Course' : 'Continue Learning'}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}