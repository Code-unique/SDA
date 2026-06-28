'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/components/ui/use-toast'
import {
  Search,
  Grid,
  List,
  Star,
  Clock,
  Users,
  BookOpen,
  Loader2,
  Youtube,
  Sparkles,
  ChevronRight,
  X
} from 'lucide-react'

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
  price: number
  isFree: boolean
  level: 'beginner' | 'intermediate' | 'advanced'
  category: string
  tags: string[]
  thumbnail: string
  previewVideo?: {
    type: 'youtube'
    videoId: string
    thumbnailUrl: string
  }
  totalStudents: number
  averageRating: number
  totalReviews: number
  totalDuration: number
  totalLessons: number
  isFeatured: boolean
  isPublished: boolean
  manualEnrollmentEnabled: boolean
  createdAt: string
}

export default function YouTubeCoursesPage() {
  const router = useRouter()
  const { toast } = useToast()
  
  const [courses, setCourses] = useState<Course[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')

  useEffect(() => {
    fetchCourses()
  }, [])

  const fetchCourses = async () => {
    try {
      setLoading(true)
      
      const params = new URLSearchParams()
      if (searchQuery) params.append('search', searchQuery)
      
      const response = await fetch(`/api/youtube-courses?${params}`)
      
      if (!response.ok) {
        throw new Error('Failed to fetch courses')
      }
      
      const data = await response.json()
      setCourses(data.courses || data)
      
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load courses',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  const filteredCourses = useMemo(() => {
    let filtered = [...courses]
    
    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(course =>
        course.title.toLowerCase().includes(query) ||
        course.shortDescription.toLowerCase().includes(query) ||
        course.category.toLowerCase().includes(query) ||
        course.tags.some(tag => tag.toLowerCase().includes(query))
      )
    }
    
    return filtered
  }, [courses, searchQuery])

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    
    if (hours > 0) {
      return `${hours}h ${mins > 0 ? `${mins}m` : ''}`.trim()
    }
    return `${mins}m`
  }

  const CourseCard = ({ course }: { course: Course }) => (
    <Card 
      className="group overflow-hidden hover:shadow-xl transition-all duration-300 cursor-pointer border-gray-200"
      onClick={() => router.push(`/youtube-courses/${course.slug}`)}
    >
      <div className="relative h-48 overflow-hidden bg-gray-100">
        {course.previewVideo ? (
          <img
            src={course.previewVideo.thumbnailUrl}
            alt={course.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : course.thumbnail ? (
          <img
            src={course.thumbnail}
            alt={course.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-red-100 to-orange-100 flex items-center justify-center">
            <Youtube className="w-12 h-12 text-red-400" />
          </div>
        )}
        
        <div className="absolute top-3 left-3">
          <Badge className={`${
            course.level === 'beginner' ? 'bg-green-500' :
            course.level === 'intermediate' ? 'bg-yellow-500' :
            'bg-red-500'
          } text-white`}>
            {course.level}
          </Badge>
        </div>
        
        <div className="absolute top-3 right-3">
          {course.isFree ? (
            <Badge className="bg-green-500 text-white">FREE</Badge>
          ) : (
            <Badge className="bg-purple-500 text-white">NPR {course.price}</Badge>
          )}
        </div>
        
        {course.isFeatured && (
          <div className="absolute bottom-3 left-3">
            <Badge className="bg-gradient-to-r from-red-500 to-orange-500 text-white">
              <Sparkles className="w-3 h-3 mr-1" />
              Featured
            </Badge>
          </div>
        )}
      </div>
      
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-2">
          <Badge variant="outline" className="text-xs">
            {course.category}
          </Badge>
          
          {course.manualEnrollmentEnabled && (
            <Badge variant="outline" className="text-xs bg-yellow-50 text-yellow-700">
              Manual Approval
            </Badge>
          )}
        </div>
        
        <h3 className="font-bold text-lg mb-2 group-hover:text-red-600 transition-colors line-clamp-2">
          {course.title}
        </h3>
        
        <p className="text-gray-600 text-sm mb-4 line-clamp-2">
          {course.shortDescription}
        </p>
        
        <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1">
              <Clock className="w-4 h-4" />
              <span>{formatDuration(course.totalDuration)}</span>
            </div>
            <div className="flex items-center gap-1">
              <BookOpen className="w-4 h-4" />
              <span>{course.totalLessons} items</span>
            </div>
          </div>
          
          <div className="flex items-center gap-1">
            <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
            <span>{course.averageRating.toFixed(1)}</span>
            <span className="text-gray-400">({course.totalReviews})</span>
          </div>
        </div>
        
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-gray-200 overflow-hidden">
              {course.instructor.avatar ? (
                <img 
                  src={course.instructor.avatar} 
                  alt={course.instructor.username}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-red-100 text-red-600 font-semibold text-sm">
                  {course.instructor.firstName.charAt(0)}
                  {course.instructor.lastName.charAt(0)}
                </div>
              )}
            </div>
            <span className="text-sm font-medium">
              {course.instructor.firstName} {course.instructor.lastName}
            </span>
          </div>
          
          <Button size="sm" variant="ghost" className="text-red-600 hover:text-red-700 hover:bg-red-50">
            View Course
            <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
      </CardContent>
    </Card>
  )

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        {/* Header with Search */}
        <div className="mb-8">
          
          <h1 className="text-gray-600 mb-6">
            Learn fashion design through expertly curated  video lessons
          </h1>
          
          {/* Search Bar */}
          <div className="max-w-2xl">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <Input
                type="text"
                placeholder="Search courses, instructors, or topics..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-12 pr-10 py-3 rounded-xl border-gray-300 bg-white text-gray-900"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Courses Section */}
        <div>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">
                {filteredCourses.length} Courses Found
              </h2>
              <p className="text-gray-600">
                {searchQuery && `Search results for "${searchQuery}"`}
              </p>
            </div>
            
            <div className="flex items-center gap-2">
              <Button
                variant={viewMode === 'grid' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('grid')}
              >
                <Grid className="w-4 h-4" />
              </Button>
              <Button
                variant={viewMode === 'list' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('list')}
              >
                <List className="w-4 h-4" />
              </Button>
            </div>
          </div>
          
          {filteredCourses.length === 0 ? (
            <div className="text-center py-16">
              <Search className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">No courses found</h3>
              <p className="text-gray-600 mb-6">Try adjusting your search terms</p>
              <Button
                onClick={() => setSearchQuery('')}
              >
                Clear Search
              </Button>
            </div>
          ) : viewMode === 'grid' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredCourses.map(course => (
                <CourseCard key={course._id} course={course} />
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              {filteredCourses.map(course => (
                <Card 
                  key={course._id} 
                  className="group hover:shadow-lg transition-shadow cursor-pointer"
                  onClick={() => router.push(`/youtube-courses/${course.slug}`)}
                >
                  <CardContent className="p-6">
                    <div className="flex gap-6">
                      <div className="w-48 h-32 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                        {course.previewVideo ? (
                          <img
                            src={course.previewVideo.thumbnailUrl}
                            alt={course.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          />
                        ) : course.thumbnail ? (
                          <img
                            src={course.thumbnail}
                            alt={course.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-red-100 to-orange-100 flex items-center justify-center">
                            <Youtube className="w-8 h-8 text-red-400" />
                          </div>
                        )}
                      </div>
                      
                      <div className="flex-1">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <h3 className="font-bold text-lg group-hover:text-red-600 transition-colors">
                              {course.title}
                            </h3>
                            <p className="text-gray-600 text-sm line-clamp-2 mb-2">
                              {course.shortDescription}
                            </p>
                          </div>
                          
                          <div className="text-right">
                            {course.isFree ? (
                              <div className="text-green-600 font-bold">FREE</div>
                            ) : (
                              <div className="font-bold">NPR {course.price}</div>
                            )}
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-4 text-sm text-gray-500 mb-3">
                          <div className="flex items-center gap-1">
                            <Badge className={
                              course.level === 'beginner' ? 'bg-green-500' :
                              course.level === 'intermediate' ? 'bg-yellow-500' :
                              'bg-red-500'
                            }>
                              {course.level}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-1">
                            <Clock className="w-4 h-4" />
                            <span>{formatDuration(course.totalDuration)}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <BookOpen className="w-4 h-4" />
                            <span>{course.totalLessons} items</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                            <span>{course.averageRating.toFixed(1)} ({course.totalReviews})</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Users className="w-4 h-4" />
                            <span>{course.totalStudents.toLocaleString()} students</span>
                          </div>
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline">{course.category}</Badge>
                            {course.isFeatured && (
                              <Badge className="bg-gradient-to-r from-red-500 to-orange-500">
                                <Sparkles className="w-3 h-3 mr-1" />
                                Featured
                              </Badge>
                            )}
                            {course.manualEnrollmentEnabled && (
                              <Badge variant="outline" className="bg-yellow-50 text-yellow-700">
                                Manual Approval
                              </Badge>
                            )}
                          </div>
                          
                          <Button size="sm" variant="ghost" className="text-red-600 hover:text-red-700">
                            View Course
                            <ChevronRight className="w-4 h-4 ml-1" />
                          </Button>
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
    </div>
  )
}