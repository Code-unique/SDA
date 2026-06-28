//app/my-courses/page.tsx

'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { PlayCircle, Clock, Users, Star, BookOpen, RefreshCw, AlertCircle } from 'lucide-react'
import { Progress } from '@/components/ui/progress'

interface Instructor {
  username: string
  firstName: string
  lastName: string
  avatar: string
}

interface CourseInfo {
  _id: string
  title: string
  description: string
  thumbnail: string
  instructor: Instructor
  level: string
  duration: number
  totalStudents: number
  averageRating: number
  slug: string
  isFree: boolean
  price: number
}

interface EnrolledCourse {
  _id: string
  course: CourseInfo
  enrolledAt: string
  progress: number
  completed: boolean
  lastAccessed: string
}

export default function MyCoursesPage() {
  const [enrolledCourses, setEnrolledCourses] = useState<EnrolledCourse[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [stats, setStats] = useState({
    total: 0,
    completed: 0,
    inProgress: 0,
    notStarted: 0
  })

  useEffect(() => {
    fetchEnrolledCourses()
  }, [])

  const fetchEnrolledCourses = async () => {
    try {
      setLoading(true)
      setError(null)
      
      console.log('Fetching enrolled courses...')
      const response = await fetch('/api/users/me/courses')
      
      if (!response.ok) {
        const errorText = await response.text()
        console.error('API Error:', response.status, errorText)
        throw new Error(`Failed to fetch courses: ${response.status}`)
      }
      
      const data = await response.json()
      console.log('Enrolled courses data:', data)
      
      setEnrolledCourses(data.enrolledCourses || [])
      setStats(data.stats || {
        total: data.enrolledCourses?.length || 0,
        completed: 0,
        inProgress: 0,
        notStarted: 0
      })
      
    } catch (error: any) {
      console.error('Error fetching enrolled courses:', error)
      setError(error.message || 'Failed to load enrolled courses')
    } finally {
      setLoading(false)
    }
  }

  const testDebugEndpoint = async () => {
    try {
      const response = await fetch('/api/debug-courses')
      const data = await response.json()
      console.log('Debug courses:', data)
      alert(`Debug Info:\n${JSON.stringify(data, null, 2)}`)
    } catch (error) {
      console.error('Debug test failed:', error)
      alert('Debug test failed')
    }
  }

  const calculateDuration = (minutes: number) => {
    if (!minutes || minutes === 0) return '0m'
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`
  }

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString)
      return new Intl.DateTimeFormat('en-US', {
        month: 'short',
        year: 'numeric'
      }).format(date)
    } catch {
      return ''
    }
  }

  const getLevelBadge = (level: string) => {
    const colors = {
      beginner: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
      intermediate: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
      advanced: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
    }
    
    return colors[level as keyof typeof colors] || colors.beginner
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex flex-col items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-rose-600 mb-4"></div>
        <p className="text-slate-600">Loading your courses...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <div className="container mx-auto px-4 py-8">
        {/* Debug button */}
        <button 
          onClick={testDebugEndpoint}
          className="fixed bottom-4 right-4 bg-blue-500 hover:bg-blue-600 text-white p-2 rounded-lg text-xs shadow-lg z-50"
        >
          Debug Courses
        </button>
        
        {/* Header */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-serif font-bold">My Courses</h1>
            <p className="text-slate-600 dark:text-slate-400">
              Continue your fashion learning journey
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              className="rounded-2xl"
              onClick={fetchEnrolledCourses}
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
            <Button className="rounded-2xl">
              <BookOpen className="w-4 h-4 mr-2" />
              Browse Courses
            </Button>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl">
            <div className="flex items-start">
              <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 mt-0.5 mr-2 flex-shrink-0" />
              <div>
                <p className="text-red-600 dark:text-red-400 font-medium">Error: {error}</p>
                <Button 
                  onClick={fetchEnrolledCourses} 
                  variant="outline" 
                  size="sm"
                  className="mt-2"
                >
                  Try Again
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card className="rounded-2xl">
            <CardContent className="p-4 md:p-6 text-center">
              <div className="text-2xl font-bold text-rose-600">{stats.total}</div>
              <div className="text-sm text-slate-600 dark:text-slate-400">Total Courses</div>
            </CardContent>
          </Card>
          <Card className="rounded-2xl">
            <CardContent className="p-4 md:p-6 text-center">
              <div className="text-2xl font-bold text-rose-600">{stats.completed}</div>
              <div className="text-sm text-slate-600 dark:text-slate-400">Completed</div>
            </CardContent>
          </Card>
          <Card className="rounded-2xl">
            <CardContent className="p-4 md:p-6 text-center">
              <div className="text-2xl font-bold text-rose-600">{stats.inProgress}</div>
              <div className="text-sm text-slate-600 dark:text-slate-400">In Progress</div>
            </CardContent>
          </Card>
          <Card className="rounded-2xl">
            <CardContent className="p-4 md:p-6 text-center">
              <div className="text-2xl font-bold text-rose-600">{stats.notStarted}</div>
              <div className="text-sm text-slate-600 dark:text-slate-400">Not Started</div>
            </CardContent>
          </Card>
        </div>

        {enrolledCourses.length === 0 ? (
          <Card className="rounded-2xl max-w-md mx-auto">
            <CardContent className="p-8 text-center">
              <BookOpen className="w-16 h-16 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-slate-600 dark:text-slate-400 mb-2">
                No courses enrolled yet
              </h3>
              <p className="text-slate-500 dark:text-slate-500 mb-6">
                Start your fashion education journey today! Explore our courses and begin learning.
              </p>
              <div className="flex flex-col sm:flex-row gap-2 justify-center">
                <Button className="rounded-2xl">
                  <BookOpen className="w-4 h-4 mr-2" />
                  Browse All Courses
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="mb-6">
              <div className="flex items-center justify-between">
                <div className="text-slate-600 dark:text-slate-400">
                  {enrolledCourses.length} course{enrolledCourses.length !== 1 ? 's' : ''} enrolled
                </div>
                <div className="text-sm text-slate-500">
                  Sorted by recently accessed
                </div>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {enrolledCourses.map((enrollment) => (
                <Card key={enrollment._id} className="rounded-2xl overflow-hidden hover:shadow-xl transition-shadow duration-300 group">
                  <div className="h-48 bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-900 relative overflow-hidden">
                    {enrollment.course.thumbnail ? (
                      <img
                        src={enrollment.course.thumbnail}
                        alt={enrollment.course.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none'
                          const parent = e.currentTarget.parentElement
                          if (parent) {
                            parent.classList.add('bg-gradient-to-br', 'from-rose-100', 'to-pink-100', 'dark:from-rose-900/30', 'dark:to-pink-900/30')
                          }
                        }}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-rose-100 to-pink-100 dark:from-rose-900/30 dark:to-pink-900/30">
                        <BookOpen className="w-12 h-12 text-rose-400" />
                      </div>
                    )}
                    
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                      <PlayCircle className="w-12 h-12 text-white drop-shadow-lg" />
                    </div>
                    
                    <div className="absolute top-2 left-2">
                      <Badge className={`rounded-lg ${getLevelBadge(enrollment.course.level)}`}>
                        {enrollment.course.level.charAt(0).toUpperCase() + enrollment.course.level.slice(1)}
                      </Badge>
                    </div>
                    
                    <div className="absolute top-2 right-2">
                      <Badge 
                        variant={enrollment.completed ? "default" : enrollment.progress > 0 ? "secondary" : "outline"} 
                        className="rounded-lg font-medium"
                      >
                        {enrollment.completed ? '✓ Completed' : enrollment.progress > 0 ? `${enrollment.progress}%` : 'Not Started'}
                      </Badge>
                    </div>
                    
                    {enrollment.course.isFree && (
                      <div className="absolute bottom-2 left-2">
                        <Badge variant="secondary" className="rounded-lg bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300">
                          Free
                        </Badge>
                      </div>
                    )}
                  </div>
                  
                  <CardContent className="p-4">
                    <h3 className="font-semibold text-lg mb-2 line-clamp-2 h-14">
                      {enrollment.course.title}
                    </h3>
                    
                    <div className="flex items-center space-x-2 mb-3">
                      <div className="w-8 h-8 rounded-full overflow-hidden bg-slate-200 dark:bg-slate-700 flex-shrink-0">
                        {enrollment.course.instructor.avatar ? (
                          <img
                            src={enrollment.course.instructor.avatar}
                            alt={enrollment.course.instructor.username}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-xs font-semibold text-slate-500">
                            {enrollment.course.instructor.firstName?.[0] || enrollment.course.instructor.username?.[0] || 'I'}
                          </div>
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
                          {enrollment.course.instructor.firstName} {enrollment.course.instructor.lastName}
                        </div>
                        <div className="text-xs text-slate-500 truncate">
                          Enrolled {formatDate(enrollment.enrolledAt)}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between text-sm text-slate-500 dark:text-slate-400 mb-3">
                      <div className="flex items-center space-x-1">
                        <Clock className="w-3 h-3 flex-shrink-0" />
                        <span className="truncate">{calculateDuration(enrollment.course.duration)}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Users className="w-3 h-3 flex-shrink-0" />
                        <span>{enrollment.course.totalStudents.toLocaleString()}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Star className="w-3 h-3 fill-yellow-400 text-yellow-400 flex-shrink-0" />
                        <span>{enrollment.course.averageRating.toFixed(1)}</span>
                      </div>
                    </div>
                    
                    <div className="mb-4">
                      <div className="flex justify-between text-xs text-slate-500 mb-1">
                        <span>Progress</span>
                        <span>{enrollment.progress}%</span>
                      </div>
                      <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full transition-all duration-500 ${enrollment.completed ? 'bg-green-500' : 'bg-rose-500'}`}
                          style={{ width: `${enrollment.progress}%` }}
                        />
                      </div>
                    </div>
                    
                    <Button 
                      className="w-full rounded-xl"
                      variant={enrollment.completed ? "outline" : "default"}
                    >
                      {enrollment.completed ? 'Review Course' : enrollment.progress > 0 ? 'Continue Learning' : 'Start Learning'}
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}