'use client'

import { useState, useEffect, Suspense } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { useToast } from '@/components/ui/use-toast'
import { 
  Save, 
  Trash2, 
  Upload, 
  ChevronUp, 
  ChevronDown, 
  Eye, 
  EyeOff,
  Link,
  Video,
  FileText,
  BookOpen,
  Users,
  Target,
  Zap,
  Award,
  Loader2,
  Check,
  X,
  ArrowLeft,
  Plus,
  AlertCircle,
  RefreshCw
} from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'

interface YouTubeVideo {
  type: 'youtube'
  videoId: string
  url: string
  thumbnailUrl: string
  duration?: number
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
  price: number
  isFree: boolean
  level: 'beginner' | 'intermediate' | 'advanced'
  category: string
  tags: string[]
  thumbnail: string
  previewVideo?: YouTubeVideo
  requirements: string[]
  learningOutcomes: string[]
  isPublished: boolean
  isFeatured: boolean
  manualEnrollmentEnabled: boolean
  modules: Module[]
  slug: string
  createdAt: string
  updatedAt: string
}

// Helper to decode URL parameter
function decodeParam(param: string | string[]): string {
  if (Array.isArray(param)) {
    return param[0] || ''
  }
  return param || ''
}

export default function EditYouTubeCoursePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    }>
      <EditYouTubeCourseContent />
    </Suspense>
  )
}

function EditYouTubeCourseContent() {
  const params = useParams()
  const router = useRouter()
  const { toast } = useToast()
  
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [course, setCourse] = useState<Course | null>(null)
  const [error, setError] = useState<string | null>(null)
  
  const [courseData, setCourseData] = useState({
    title: '',
    description: '',
    shortDescription: '',
    price: 0,
    isFree: false,
    level: 'beginner' as 'beginner' | 'intermediate' | 'advanced',
    category: '',
    tags: [] as string[],
    thumbnail: '',
    previewVideo: undefined as YouTubeVideo | undefined,
    requirements: [] as string[],
    learningOutcomes: [] as string[],
    isPublished: false,
    isFeatured: false,
    manualEnrollmentEnabled: true
  })
  
  const [modules, setModules] = useState<Module[]>([])
  const [tagInput, setTagInput] = useState('')
  const [requirementInput, setRequirementInput] = useState('')
  const [outcomeInput, setOutcomeInput] = useState('')
  
  // Get courseId from params
  const rawCourseId = params.id
const courseId = typeof rawCourseId === 'string' ? decodeParam(rawCourseId) : ''


  useEffect(() => {
    if (courseId) {
      fetchCourse()
    } else {
      setError('Course ID is missing from URL')
      setLoading(false)
    }
  }, [courseId])

  const fetchCourse = async () => {
    try {
      setLoading(true)
      setError(null)
      
      console.log('Fetching course with ID:', courseId)
      
      if (!courseId || courseId.trim() === '') {
        throw new Error('Course ID is required')
      }
      
      const response = await fetch(`/api/admin/youtube-courses/${encodeURIComponent(courseId)}`)
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || `Failed to load course (HTTP ${response.status})`)
      }
      
      const data = await response.json()
      console.log('Course data loaded:', data)
      
      if (!data._id) {
        throw new Error('Invalid course data received')
      }
      
      setCourse(data)
      
      // Set course data
      setCourseData({
        title: data.title || '',
        description: data.description || '',
        shortDescription: data.shortDescription || '',
        price: data.price || 0,
        isFree: data.isFree || false,
        level: data.level || 'beginner',
        category: data.category || '',
        tags: data.tags || [],
        thumbnail: data.thumbnail || '',
        previewVideo: data.previewVideo,
        requirements: data.requirements || [],
        learningOutcomes: data.learningOutcomes || [],
        isPublished: data.isPublished || false,
        isFeatured: data.isFeatured || false,
        manualEnrollmentEnabled: data.manualEnrollmentEnabled !== false
      })
      
      // Set modules
      setModules(data.modules || [])
      
    } catch (error) {
      console.error('Error fetching course:', error)
      setError(error instanceof Error ? error.message : 'Failed to load course')
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to load course',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async () => {
    if (!course) return
    
    console.log('Submitting course update...')
    
    // Validate required fields
    if (!courseData.title.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Course title is required',
        variant: 'destructive'
      })
      return
    }
    
    if (!courseData.description.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Course description is required',
        variant: 'destructive'
      })
      return
    }
    
    if (!courseData.shortDescription.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Short description is required',
        variant: 'destructive'
      })
      return
    }
    
    if (!courseData.thumbnail.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Thumbnail URL is required',
        variant: 'destructive'
      })
      return
    }
    
    setSaving(true)
    
    try {
      const response = await fetch(`/api/admin/youtube-courses/${course._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...courseData,
          modules
        })
      })
      
      const data = await response.json()
      console.log('Update response:', data)
      
      if (response.ok) {
        toast({
          title: 'Course Updated',
          description: 'Course has been updated successfully',
          variant: 'default'
        })
        router.push(`/admin/youtube-courses/${course._id}`)
      } else {
        throw new Error(data.error || 'Failed to update course')
      }
      
    } catch (error: any) {
      console.error('Error updating course:', error)
      toast({
        title: 'Error',
        description: error.message || 'Failed to update course',
        variant: 'destructive'
      })
    } finally {
      setSaving(false)
    }
  }

  const addTag = () => {
    if (tagInput.trim() && courseData.tags.length < 10) {
      setCourseData(prev => ({
        ...prev,
        tags: [...prev.tags, tagInput.trim().substring(0, 30)]
      }))
      setTagInput('')
    }
  }

  const removeTag = (index: number) => {
    setCourseData(prev => ({
      ...prev,
      tags: prev.tags.filter((_, i) => i !== index)
    }))
  }

  const addRequirement = () => {
    if (requirementInput.trim() && courseData.requirements.length < 10) {
      setCourseData(prev => ({
        ...prev,
        requirements: [...prev.requirements, requirementInput.trim().substring(0, 200)]
      }))
      setRequirementInput('')
    }
  }

  const removeRequirement = (index: number) => {
    setCourseData(prev => ({
      ...prev,
      requirements: prev.requirements.filter((_, i) => i !== index)
    }))
  }

  const addOutcome = () => {
    if (outcomeInput.trim() && courseData.learningOutcomes.length < 10) {
      setCourseData(prev => ({
        ...prev,
        learningOutcomes: [...prev.learningOutcomes, outcomeInput.trim().substring(0, 200)]
      }))
      setOutcomeInput('')
    }
  }

  const removeOutcome = (index: number) => {
    setCourseData(prev => ({
      ...prev,
      learningOutcomes: prev.learningOutcomes.filter((_, i) => i !== index)
    }))
  }

  const addModule = () => {
    const newId = Date.now().toString()
    setModules(prev => [
      ...prev,
      {
        _id: newId,
        title: `Module ${prev.length + 1}`,
        description: '',
        order: prev.length,
        chapters: [
          {
            _id: `${newId}-1`,
            title: 'Chapter 1',
            order: 0,
            lessons: [
              {
                _id: `${newId}-1-1`,
                title: 'Lesson 1',
                description: '',
                duration: 0,
                isPreview: false,
                order: 0,
                resources: [],
                subLessons: []
              }
            ]
          }
        ]
      }
    ])
  }

  const updateModule = (index: number, field: keyof Module, value: any) => {
    setModules(prev => prev.map((module, i) => 
      i === index ? { ...module, [field]: value } : module
    ))
  }

  const removeModule = (index: number) => {
    if (modules.length > 1) {
      setModules(prev => prev.filter((_, i) => i !== index))
    }
  }

  const moveModule = (index: number, direction: 'up' | 'down') => {
    if (
      (direction === 'up' && index === 0) ||
      (direction === 'down' && index === modules.length - 1)
    ) {
      return
    }
    
    const newModules = [...modules]
    const swapIndex = direction === 'up' ? index - 1 : index + 1
    
    // Update orders
    newModules[index].order = direction === 'up' ? index - 1 : index + 1
    newModules[swapIndex].order = direction === 'up' ? index : index - 1
    
    // Swap positions
    ;[newModules[index], newModules[swapIndex]] = [newModules[swapIndex], newModules[index]]
    
    // Sort by order
    newModules.sort((a, b) => a.order - b.order)
    
    setModules(newModules)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading course...</p>
          {courseId && (
            <p className="text-sm text-gray-500">Course ID: {courseId}</p>
          )}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-6xl mx-auto">
          <Button
            variant="ghost"
            onClick={() => router.push('/admin/youtube-courses')}
            className="mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Courses
          </Button>
          
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription className="space-y-2">
              <p>{error}</p>
              <div className="mt-4 p-3 bg-gray-100 rounded">
                <p className="text-sm font-medium mb-1">Debug Information:</p>
                <p className="text-sm">Course ID from URL: <code className="bg-gray-200 px-2 py-1 rounded">{courseId}</code></p>
              </div>
              <div className="flex gap-2 mt-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => router.push('/admin/youtube-courses')}
                >
                  View All Courses
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={fetchCourse}
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Try Again
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    // Test the API directly
                    fetch(`/api/admin/youtube-courses/${courseId}`)
                      .then(res => res.json())
                      .then(data => {
                        console.log('Direct API test result:', data)
                        alert(`API Response: ${JSON.stringify(data, null, 2)}`)
                      })
                      .catch(err => {
                        console.error('Direct API test error:', err)
                        alert(`API Error: ${err.message}`)
                      })
                  }}
                >
                  Test API
                </Button>
              </div>
            </AlertDescription>
          </Alert>
          
          <Card>
            <CardContent className="p-6 text-center">
              <p className="text-gray-600 mb-4">Cannot edit course. The course may not exist or you may not have permission.</p>
              <Button onClick={() => router.push('/admin/youtube-courses')}>
                Go to Courses List
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  if (!course) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">Course Not Found</h2>
          <p className="text-gray-600 mb-4">The requested course could not be found.</p>
          <Button onClick={() => router.push('/admin/youtube-courses')}>
            Go Back
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              onClick={() => router.push(`/admin/youtube-courses/${course._id}`)}
              className="mr-2"
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <h1 className="text-3xl font-bold">Edit Course</h1>
          </div>
          
          <div className="flex gap-2">
            <Button
              onClick={() => router.push(`/admin/youtube-courses/${course._id}`)}
              variant="outline"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={saving}
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Save Changes
                </>
              )}
            </Button>
          </div>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Course Details */}
          <div className="lg:col-span-2 space-y-6">
            {/* Basic Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BookOpen className="w-5 h-5" />
                  Course Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Course Title *</Label>
                  <Input
                    id="title"
                    value={courseData.title}
                    onChange={(e) => setCourseData(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="Enter course title"
                    maxLength={100}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="shortDescription">Short Description * (max 200 chars)</Label>
                  <Textarea
                    id="shortDescription"
                    value={courseData.shortDescription}
                    onChange={(e) => setCourseData(prev => ({ ...prev, shortDescription: e.target.value }))}
                    placeholder="Brief description shown in course cards"
                    maxLength={200}
                    rows={2}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="description">Full Description *</Label>
                  <Textarea
                    id="description"
                    value={courseData.description}
                    onChange={(e) => setCourseData(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Detailed course description"
                    rows={6}
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="category">Category</Label>
                    <Input
                      id="category"
                      value={courseData.category}
                      onChange={(e) => setCourseData(prev => ({ ...prev, category: e.target.value }))}
                      placeholder="e.g., Fashion Design"
                      maxLength={50}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="level">Level</Label>
                    <Select
                      value={courseData.level}
                      onValueChange={(value: 'beginner' | 'intermediate' | 'advanced') => 
                        setCourseData(prev => ({ ...prev, level: value }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="beginner">Beginner</SelectItem>
                        <SelectItem value="intermediate">Intermediate</SelectItem>
                        <SelectItem value="advanced">Advanced</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="thumbnail">Thumbnail URL *</Label>
                  <Input
                    id="thumbnail"
                    value={courseData.thumbnail}
                    onChange={(e) => setCourseData(prev => ({ ...prev, thumbnail: e.target.value }))}
                    placeholder="https://example.com/image.jpg"
                  />
                  {courseData.thumbnail && (
                    <div className="mt-2">
                      <img 
                        src={courseData.thumbnail} 
                        alt="Thumbnail preview" 
                        className="h-40 object-cover rounded"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = 'https://via.placeholder.com/400x225?text=Invalid+Image+URL'
                        }}
                      />
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
            
            {/* Pricing */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  Pricing & Enrollment
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Free Course</Label>
                    <p className="text-sm text-gray-500">Make this course free for all users</p>
                  </div>
                  <Switch
                    checked={courseData.isFree}
                    onCheckedChange={(checked) => 
                      setCourseData(prev => ({ 
                        ...prev, 
                        isFree: checked, 
                        price: checked ? 0 : prev.price 
                      }))
                    }
                  />
                </div>
                
                {!courseData.isFree && (
                  <div className="space-y-2">
                    <Label htmlFor="price">Price (NPR)</Label>
                    <Input
                      id="price"
                      type="number"
                      value={courseData.price}
                      onChange={(e) => setCourseData(prev => ({ 
                        ...prev, 
                        price: Math.max(0, parseInt(e.target.value) || 0)
                      }))}
                      placeholder="0"
                      min="0"
                    />
                  </div>
                )}
                
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Manual Enrollment</Label>
                    <p className="text-sm text-gray-500">Require admin approval for access</p>
                  </div>
                  <Switch
                    checked={courseData.manualEnrollmentEnabled}
                    onCheckedChange={(checked) => 
                      setCourseData(prev => ({ ...prev, manualEnrollmentEnabled: checked }))
                    }
                  />
                </div>
              </CardContent>
            </Card>
            
            {/* Course Content */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Video className="w-5 h-5" />
                  Course Content
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {modules.map((module, moduleIndex) => (
                    <div key={module._id} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold">Module {moduleIndex + 1}</h3>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => moveModule(moduleIndex, 'up')}
                            disabled={moduleIndex === 0}
                          >
                            <ChevronUp className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => moveModule(moduleIndex, 'down')}
                            disabled={moduleIndex === modules.length - 1}
                          >
                            <ChevronDown className="w-4 h-4" />
                          </Button>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => removeModule(moduleIndex)}
                            disabled={modules.length <= 1}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                      
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label>Module Title</Label>
                          <Input
                            value={module.title}
                            onChange={(e) => updateModule(moduleIndex, 'title', e.target.value)}
                            placeholder="Module title"
                          />
                        </div>
                        
                        <div className="space-y-2">
                          <Label>Module Description (Optional)</Label>
                          <Textarea
                            value={module.description || ''}
                            onChange={(e) => updateModule(moduleIndex, 'description', e.target.value)}
                            placeholder="Brief module description"
                            rows={2}
                          />
                        </div>
                        
                        {/* Simple module display - for now just show that content exists */}
                        <div className="bg-gray-50 p-3 rounded">
                          <p className="text-sm text-gray-600">
                            This module contains {module.chapters?.length || 0} chapters
                          </p>
                          {module.chapters?.map((chapter, chapterIndex) => (
                            <div key={chapter._id} className="ml-4 mt-2">
                              <p className="text-sm">
                                Chapter {chapterIndex + 1}: {chapter.title}
                              </p>
                              <p className="text-xs text-gray-500">
                                {chapter.lessons?.length || 0} lessons
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  <Button
                    onClick={addModule}
                    variant="outline"
                    className="w-full"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Module
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
          
          {/* Right Column - Settings */}
          <div className="space-y-6">
            {/* Tags */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Award className="w-5 h-5" />
                  Tags
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Add Tags</Label>
                  <div className="flex gap-2">
                    <Input
                      value={tagInput}
                      onChange={(e) => setTagInput(e.target.value)}
                      placeholder="e.g., fashion, design, sewing"
                      onKeyPress={(e) => e.key === 'Enter' && addTag()}
                    />
                    <Button onClick={addTag}>
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
                
                <div className="flex flex-wrap gap-2">
                  {courseData.tags.map((tag, index) => (
                    <Badge key={index} className="flex items-center gap-1">
                      {tag}
                      <button
                        onClick={() => removeTag(index)}
                        className="hover:text-red-500"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </Badge>
                  ))}
                  {courseData.tags.length === 0 && (
                    <p className="text-sm text-gray-500">No tags added</p>
                  )}
                </div>
              </CardContent>
            </Card>
            
            {/* Requirements */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="w-5 h-5" />
                  Requirements
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Add Requirement</Label>
                  <div className="flex gap-2">
                    <Input
                      value={requirementInput}
                      onChange={(e) => setRequirementInput(e.target.value)}
                      placeholder="e.g., Basic sewing knowledge"
                      onKeyPress={(e) => e.key === 'Enter' && addRequirement()}
                    />
                    <Button onClick={addRequirement}>
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
                
                <div className="space-y-2">
                  {courseData.requirements.map((req, index) => (
                    <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                      <span className="text-sm">{req}</span>
                      <button
                        onClick={() => removeRequirement(index)}
                        className="text-red-500 hover:text-red-700"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                  {courseData.requirements.length === 0 && (
                    <p className="text-sm text-gray-500">No requirements specified</p>
                  )}
                </div>
              </CardContent>
            </Card>
            
            {/* Learning Outcomes */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="w-5 h-5" />
                  Learning Outcomes
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Add Learning Outcome</Label>
                  <div className="flex gap-2">
                    <Input
                      value={outcomeInput}
                      onChange={(e) => setOutcomeInput(e.target.value)}
                      placeholder="e.g., Create custom patterns"
                      onKeyPress={(e) => e.key === 'Enter' && addOutcome()}
                    />
                    <Button onClick={addOutcome}>
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
                
                <div className="space-y-2">
                  {courseData.learningOutcomes.map((outcome, index) => (
                    <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                      <span className="text-sm">{outcome}</span>
                      <button
                        onClick={() => removeOutcome(index)}
                        className="text-red-500 hover:text-red-700"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                  {courseData.learningOutcomes.length === 0 && (
                    <p className="text-sm text-gray-500">No learning outcomes specified</p>
                  )}
                </div>
              </CardContent>
            </Card>
            
            {/* Publish Settings */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Upload className="w-5 h-5" />
                  Publish Settings
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Published</Label>
                    <p className="text-sm text-gray-500">Make course visible to users</p>
                  </div>
                  <Switch
                    checked={courseData.isPublished}
                    onCheckedChange={(checked) => 
                      setCourseData(prev => ({ ...prev, isPublished: checked }))
                    }
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Featured</Label>
                    <p className="text-sm text-gray-500">Highlight this course</p>
                  </div>
                  <Switch
                    checked={courseData.isFeatured}
                    onCheckedChange={(checked) => 
                      setCourseData(prev => ({ ...prev, isFeatured: checked }))
                    }
                  />
                </div>
              </CardContent>
            </Card>
            
            {/* Course Info */}
            <Card>
              <CardHeader>
                <CardTitle>Course Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Course ID</span>
                  <code className="text-xs bg-gray-100 px-2 py-1 rounded">
                    {course._id.substring(0, 8)}...
                  </code>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Slug</span>
                  <span className="font-mono text-sm">{course.slug}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Created</span>
                  <span className="text-sm">
                    {new Date(course.createdAt).toLocaleDateString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Last Updated</span>
                  <span className="text-sm">
                    {new Date(course.updatedAt).toLocaleDateString()}
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}