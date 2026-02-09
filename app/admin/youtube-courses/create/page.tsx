'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { useToast } from '@/components/ui/use-toast'
import { 
  Plus, 
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
  X
} from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"

interface YouTubeVideo {
  videoId: string
  url: string
  thumbnailUrl: string
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
  youtubeUrl?: string
  duration: number
  isPreview: boolean
  resources: LessonResource[]
}

interface Lesson {
  _id: string
  title: string
  description: string
  content?: string
  youtubeUrl?: string
  duration: number
  isPreview: boolean
  resources: LessonResource[]
  subLessons: SubLesson[]
}

interface Chapter {
  _id: string
  title: string
  description?: string
  lessons: Lesson[]
}

interface Module {
  _id: string
  title: string
  description?: string
  thumbnailUrl?: string
  chapters: Chapter[]
}

export default function CreateYouTubeCoursePage() {
  const router = useRouter()
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [previewMode, setPreviewMode] = useState(false)
  
  // Course basic info
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
    requirements: [] as string[],
    learningOutcomes: [] as string[],
    isPublished: false,
    isFeatured: false,
    manualEnrollmentEnabled: true
  })
  
  // YouTube preview video
  const [previewVideo, setPreviewVideo] = useState<YouTubeVideo | null>(null)
  const [previewVideoUrl, setPreviewVideoUrl] = useState('')
  
  // Modules
  const [modules, setModules] = useState<Module[]>([
    {
      _id: '1',
      title: 'Module 1',
      description: '',
      chapters: [
        {
          _id: '1-1',
          title: 'Chapter 1',
          lessons: [
            {
              _id: '1-1-1',
              title: 'Lesson 1',
              description: '',
              youtubeUrl: '',
              duration: 0,
              isPreview: false,
              resources: [],
              subLessons: []
            }
          ]
        }
      ]
    }
  ])
  
  // Current tag input
  const [tagInput, setTagInput] = useState('')
  const [requirementInput, setRequirementInput] = useState('')
  const [outcomeInput, setOutcomeInput] = useState('')
  
  // Parse YouTube URL
  const parseYouTubeUrl = (url: string): YouTubeVideo | null => {
    if (!url) return null
    
    let videoId = ''
    
    if (url.includes('youtu.be/')) {
      videoId = url.split('youtu.be/')[1]?.split('?')[0] || ''
    } else if (url.includes('youtube.com/watch')) {
      const urlObj = new URL(url)
      videoId = urlObj.searchParams.get('v') || ''
    } else if (url.includes('youtube.com/embed/')) {
      videoId = url.split('youtube.com/embed/')[1]?.split('?')[0] || ''
    } else if (/^[a-zA-Z0-9_-]{11}$/.test(url)) {
      videoId = url
    }
    
    if (!videoId || videoId.length !== 11) {
      toast({
        title: 'Invalid YouTube URL',
        description: 'Please enter a valid YouTube video URL',
        variant: 'destructive'
      })
      return null
    }
    
    return {
      videoId,
      url: `https://www.youtube.com/embed/${videoId}`,
      thumbnailUrl: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`
    }
  }
  
  // Add tag
  const addTag = () => {
    if (tagInput.trim() && courseData.tags.length < 10) {
      setCourseData(prev => ({
        ...prev,
        tags: [...prev.tags, tagInput.trim().substring(0, 30)]
      }))
      setTagInput('')
    }
  }
  
  // Remove tag
  const removeTag = (index: number) => {
    setCourseData(prev => ({
      ...prev,
      tags: prev.tags.filter((_, i) => i !== index)
    }))
  }
  
  // Add requirement
  const addRequirement = () => {
    if (requirementInput.trim() && courseData.requirements.length < 10) {
      setCourseData(prev => ({
        ...prev,
        requirements: [...prev.requirements, requirementInput.trim().substring(0, 200)]
      }))
      setRequirementInput('')
    }
  }
  
  // Remove requirement
  const removeRequirement = (index: number) => {
    setCourseData(prev => ({
      ...prev,
      requirements: prev.requirements.filter((_, i) => i !== index)
    }))
  }
  
  // Add learning outcome
  const addOutcome = () => {
    if (outcomeInput.trim() && courseData.learningOutcomes.length < 10) {
      setCourseData(prev => ({
        ...prev,
        learningOutcomes: [...prev.learningOutcomes, outcomeInput.trim().substring(0, 200)]
      }))
      setOutcomeInput('')
    }
  }
  
  // Remove learning outcome
  const removeOutcome = (index: number) => {
    setCourseData(prev => ({
      ...prev,
      learningOutcomes: prev.learningOutcomes.filter((_, i) => i !== index)
    }))
  }
  
  // Module management
  const addModule = () => {
    const newId = Date.now().toString()
    setModules(prev => [
      ...prev,
      {
        _id: newId,
        title: `Module ${prev.length + 1}`,
        description: '',
        chapters: [
          {
            _id: `${newId}-1`,
            title: 'Chapter 1',
            lessons: [
              {
                _id: `${newId}-1-1`,
                title: 'Lesson 1',
                description: '',
                youtubeUrl: '',
                duration: 0,
                isPreview: false,
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
    ;[newModules[index], newModules[swapIndex]] = [newModules[swapIndex], newModules[index]]
    setModules(newModules)
  }
  
  // Chapter management
  const addChapter = (moduleIndex: number) => {
    const moduleId = modules[moduleIndex]._id
    const newId = `${moduleId}-${modules[moduleIndex].chapters.length + 1}`
    
    setModules(prev => prev.map((module, i) => {
      if (i === moduleIndex) {
        return {
          ...module,
          chapters: [
            ...module.chapters,
            {
              _id: newId,
              title: `Chapter ${module.chapters.length + 1}`,
              lessons: [
                {
                  _id: `${newId}-1`,
                  title: 'Lesson 1',
                  description: '',
                  youtubeUrl: '',
                  duration: 0,
                  isPreview: false,
                  resources: [],
                  subLessons: []
                }
              ]
            }
          ]
        }
      }
      return module
    }))
  }
  
  const updateChapter = (moduleIndex: number, chapterIndex: number, field: keyof Chapter, value: any) => {
    setModules(prev => prev.map((module, i) => {
      if (i === moduleIndex) {
        const updatedChapters = [...module.chapters]
        updatedChapters[chapterIndex] = {
          ...updatedChapters[chapterIndex],
          [field]: value
        }
        return { ...module, chapters: updatedChapters }
      }
      return module
    }))
  }
  
  const removeChapter = (moduleIndex: number, chapterIndex: number) => {
    setModules(prev => prev.map((module, i) => {
      if (i === moduleIndex && module.chapters.length > 1) {
        return {
          ...module,
          chapters: module.chapters.filter((_, j) => j !== chapterIndex)
        }
      }
      return module
    }))
  }
  
  // Lesson management
  const addLesson = (moduleIndex: number, chapterIndex: number) => {
    setModules(prev => prev.map((module, i) => {
      if (i === moduleIndex) {
        const updatedChapters = [...module.chapters]
        const chapter = updatedChapters[chapterIndex]
        const newId = `${chapter._id}-${chapter.lessons.length + 1}`
        
        updatedChapters[chapterIndex] = {
          ...chapter,
          lessons: [
            ...chapter.lessons,
            {
              _id: newId,
              title: `Lesson ${chapter.lessons.length + 1}`,
              description: '',
              youtubeUrl: '',
              duration: 0,
              isPreview: false,
              resources: [],
              subLessons: []
            }
          ]
        }
        return { ...module, chapters: updatedChapters }
      }
      return module
    }))
  }
  
  const updateLesson = (
    moduleIndex: number, 
    chapterIndex: number, 
    lessonIndex: number, 
    field: keyof Lesson, 
    value: any
  ) => {
    setModules(prev => prev.map((module, i) => {
      if (i === moduleIndex) {
        const updatedChapters = [...module.chapters]
        const updatedLessons = [...updatedChapters[chapterIndex].lessons]
        updatedLessons[lessonIndex] = {
          ...updatedLessons[lessonIndex],
          [field]: value
        }
        updatedChapters[chapterIndex] = {
          ...updatedChapters[chapterIndex],
          lessons: updatedLessons
        }
        return { ...module, chapters: updatedChapters }
      }
      return module
    }))
  }
  
  const removeLesson = (moduleIndex: number, chapterIndex: number, lessonIndex: number) => {
    setModules(prev => prev.map((module, i) => {
      if (i === moduleIndex) {
        const updatedChapters = [...module.chapters]
        const updatedLessons = updatedChapters[chapterIndex].lessons.filter((_, j) => j !== lessonIndex)
        
        if (updatedLessons.length === 0) {
          // Add a default lesson if all are removed
          updatedLessons.push({
            _id: `${updatedChapters[chapterIndex]._id}-1`,
            title: 'Lesson 1',
            description: '',
            youtubeUrl: '',
            duration: 0,
            isPreview: false,
            resources: [],
            subLessons: []
          })
        }
        
        updatedChapters[chapterIndex] = {
          ...updatedChapters[chapterIndex],
          lessons: updatedLessons
        }
        return { ...module, chapters: updatedChapters }
      }
      return module
    }))
  }
  
  // Sub-lesson management
  const addSubLesson = (moduleIndex: number, chapterIndex: number, lessonIndex: number) => {
    setModules(prev => prev.map((module, i) => {
      if (i === moduleIndex) {
        const updatedChapters = [...module.chapters]
        const updatedLessons = [...updatedChapters[chapterIndex].lessons]
        const lesson = updatedLessons[lessonIndex]
        const newId = `${lesson._id}-${lesson.subLessons.length + 1}`
        
        updatedLessons[lessonIndex] = {
          ...lesson,
          subLessons: [
            ...lesson.subLessons,
            {
              _id: newId,
              title: `Sub-lesson ${lesson.subLessons.length + 1}`,
              description: '',
              youtubeUrl: '',
              duration: 0,
              isPreview: false,
              resources: []
            }
          ]
        }
        updatedChapters[chapterIndex] = {
          ...updatedChapters[chapterIndex],
          lessons: updatedLessons
        }
        return { ...module, chapters: updatedChapters }
      }
      return module
    }))
  }
  
  const updateSubLesson = (
    moduleIndex: number, 
    chapterIndex: number, 
    lessonIndex: number, 
    subLessonIndex: number, 
    field: keyof SubLesson, 
    value: any
  ) => {
    setModules(prev => prev.map((module, i) => {
      if (i === moduleIndex) {
        const updatedChapters = [...module.chapters]
        const updatedLessons = [...updatedChapters[chapterIndex].lessons]
        const updatedSubLessons = [...updatedLessons[lessonIndex].subLessons]
        
        updatedSubLessons[subLessonIndex] = {
          ...updatedSubLessons[subLessonIndex],
          [field]: value
        }
        
        updatedLessons[lessonIndex] = {
          ...updatedLessons[lessonIndex],
          subLessons: updatedSubLessons
        }
        updatedChapters[chapterIndex] = {
          ...updatedChapters[chapterIndex],
          lessons: updatedLessons
        }
        return { ...module, chapters: updatedChapters }
      }
      return module
    }))
  }
  
  const removeSubLesson = (
    moduleIndex: number, 
    chapterIndex: number, 
    lessonIndex: number, 
    subLessonIndex: number
  ) => {
    setModules(prev => prev.map((module, i) => {
      if (i === moduleIndex) {
        const updatedChapters = [...module.chapters]
        const updatedLessons = [...updatedChapters[chapterIndex].lessons]
        const updatedSubLessons = updatedLessons[lessonIndex].subLessons.filter((_, j) => j !== subLessonIndex)
        
        updatedLessons[lessonIndex] = {
          ...updatedLessons[lessonIndex],
          subLessons: updatedSubLessons
        }
        updatedChapters[chapterIndex] = {
          ...updatedChapters[chapterIndex],
          lessons: updatedLessons
        }
        return { ...module, chapters: updatedChapters }
      }
      return module
    }))
  }
  
  // Resource management
  const addResource = (
    moduleIndex: number, 
    chapterIndex: number, 
    lessonIndex: number, 
    subLessonIndex?: number
  ) => {
    setModules(prev => prev.map((module, i) => {
      if (i === moduleIndex) {
        const updatedChapters = [...module.chapters]
        const updatedLessons = [...updatedChapters[chapterIndex].lessons]
        
        if (subLessonIndex !== undefined) {
          const updatedSubLessons = [...updatedLessons[lessonIndex].subLessons]
          const subLesson = updatedSubLessons[subLessonIndex]
          
          updatedSubLessons[subLessonIndex] = {
            ...subLesson,
            resources: [
              ...subLesson.resources,
              {
                _id: Date.now().toString(),
                title: `Resource ${subLesson.resources.length + 1}`,
                url: '',
                type: 'link'
              }
            ]
          }
          
          updatedLessons[lessonIndex] = {
            ...updatedLessons[lessonIndex],
            subLessons: updatedSubLessons
          }
        } else {
          const lesson = updatedLessons[lessonIndex]
          updatedLessons[lessonIndex] = {
            ...lesson,
            resources: [
              ...lesson.resources,
              {
                _id: Date.now().toString(),
                title: `Resource ${lesson.resources.length + 1}`,
                url: '',
                type: 'link'
              }
            ]
          }
        }
        
        updatedChapters[chapterIndex] = {
          ...updatedChapters[chapterIndex],
          lessons: updatedLessons
        }
        return { ...module, chapters: updatedChapters }
      }
      return module
    }))
  }
  
  const updateResource = (
    moduleIndex: number, 
    chapterIndex: number, 
    lessonIndex: number, 
    resourceIndex: number, 
    field: keyof LessonResource, 
    value: any,
    subLessonIndex?: number
  ) => {
    setModules(prev => prev.map((module, i) => {
      if (i === moduleIndex) {
        const updatedChapters = [...module.chapters]
        const updatedLessons = [...updatedChapters[chapterIndex].lessons]
        
        if (subLessonIndex !== undefined) {
          const updatedSubLessons = [...updatedLessons[lessonIndex].subLessons]
          const updatedResources = [...updatedSubLessons[subLessonIndex].resources]
          
          updatedResources[resourceIndex] = {
            ...updatedResources[resourceIndex],
            [field]: value
          }
          
          updatedSubLessons[subLessonIndex] = {
            ...updatedSubLessons[subLessonIndex],
            resources: updatedResources
          }
          
          updatedLessons[lessonIndex] = {
            ...updatedLessons[lessonIndex],
            subLessons: updatedSubLessons
          }
        } else {
          const updatedResources = [...updatedLessons[lessonIndex].resources]
          updatedResources[resourceIndex] = {
            ...updatedResources[resourceIndex],
            [field]: value
          }
          
          updatedLessons[lessonIndex] = {
            ...updatedLessons[lessonIndex],
            resources: updatedResources
          }
        }
        
        updatedChapters[chapterIndex] = {
          ...updatedChapters[chapterIndex],
          lessons: updatedLessons
        }
        return { ...module, chapters: updatedChapters }
      }
      return module
    }))
  }
  
  const removeResource = (
    moduleIndex: number, 
    chapterIndex: number, 
    lessonIndex: number, 
    resourceIndex: number,
    subLessonIndex?: number
  ) => {
    setModules(prev => prev.map((module, i) => {
      if (i === moduleIndex) {
        const updatedChapters = [...module.chapters]
        const updatedLessons = [...updatedChapters[chapterIndex].lessons]
        
        if (subLessonIndex !== undefined) {
          const updatedSubLessons = [...updatedLessons[lessonIndex].subLessons]
          const updatedResources = updatedSubLessons[subLessonIndex].resources.filter((_, j) => j !== resourceIndex)
          
          updatedSubLessons[subLessonIndex] = {
            ...updatedSubLessons[subLessonIndex],
            resources: updatedResources
          }
          
          updatedLessons[lessonIndex] = {
            ...updatedLessons[lessonIndex],
            subLessons: updatedSubLessons
          }
        } else {
          const updatedResources = updatedLessons[lessonIndex].resources.filter((_, j) => j !== resourceIndex)
          updatedLessons[lessonIndex] = {
            ...updatedLessons[lessonIndex],
            resources: updatedResources
          }
        }
        
        updatedChapters[chapterIndex] = {
          ...updatedChapters[chapterIndex],
          lessons: updatedLessons
        }
        return { ...module, chapters: updatedChapters }
      }
      return module
    }))
  }
  
  // Validate course data
  const validateCourse = (): string[] => {
    const errors: string[] = []
    
    if (!courseData.title.trim()) errors.push('Title is required')
    if (!courseData.description.trim()) errors.push('Description is required')
    if (!courseData.shortDescription.trim()) errors.push('Short description is required')
    if (!courseData.thumbnail.trim()) errors.push('Thumbnail URL is required')
    if (courseData.price < 0) errors.push('Price cannot be negative')
    
    // Validate YouTube URLs
    modules.forEach((module, moduleIndex) => {
      module.chapters.forEach((chapter, chapterIndex) => {
        chapter.lessons.forEach((lesson, lessonIndex) => {
          if (lesson.youtubeUrl && parseYouTubeUrl(lesson.youtubeUrl) === null) {
            errors.push(`Invalid YouTube URL in Module ${moduleIndex + 1}, Chapter ${chapterIndex + 1}, Lesson ${lessonIndex + 1}`)
          }
          
          lesson.subLessons.forEach((subLesson, subLessonIndex) => {
            if (subLesson.youtubeUrl && parseYouTubeUrl(subLesson.youtubeUrl) === null) {
              errors.push(`Invalid YouTube URL in Module ${moduleIndex + 1}, Chapter ${chapterIndex + 1}, Lesson ${lessonIndex + 1}, Sub-lesson ${subLessonIndex + 1}`)
            }
          })
        })
      })
    })
    
    return errors
  }
  
  // Calculate total duration
  const calculateTotalDuration = () => {
    let totalMinutes = 0
    
    modules.forEach(module => {
      module.chapters.forEach(chapter => {
        chapter.lessons.forEach(lesson => {
          totalMinutes += lesson.duration || 0
          lesson.subLessons.forEach(subLesson => {
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
  
  // Calculate total lessons
  const calculateTotalLessons = () => {
    let total = 0
    
    modules.forEach(module => {
      module.chapters.forEach(chapter => {
        total += chapter.lessons.length
        chapter.lessons.forEach(lesson => {
          total += lesson.subLessons.length
        })
      })
    })
    
    return total
  }
  
  // Submit course
  const handleSubmit = async () => {
    const errors = validateCourse()
    if (errors.length > 0) {
      toast({
        title: 'Validation Error',
        description: errors.join('\n'),
        variant: 'destructive'
      })
      return
    }
    
    setLoading(true)
    
    try {
      // Transform modules with proper YouTube data
      const transformedModules = modules.map((module, moduleIndex) => ({
        title: module.title,
        description: module.description,
        thumbnailUrl: module.thumbnailUrl,
        order: moduleIndex,
        chapters: module.chapters.map((chapter, chapterIndex) => ({
          title: chapter.title,
          description: chapter.description,
          order: chapterIndex,
          lessons: chapter.lessons.map((lesson, lessonIndex) => {
            const lessonVideoSource = lesson.youtubeUrl ? parseYouTubeUrl(lesson.youtubeUrl) : undefined
            
            return {
              title: lesson.title,
              description: lesson.description,
              content: lesson.content,
              videoSource: lessonVideoSource ? {
                type: 'youtube' as const,
                videoId: lessonVideoSource.videoId,
                url: lessonVideoSource.url,
                thumbnailUrl: lessonVideoSource.thumbnailUrl,
                duration: lesson.duration
              } : undefined,
              duration: lesson.duration,
              isPreview: lesson.isPreview,
              resources: lesson.resources.map(resource => ({
                title: resource.title,
                url: resource.url,
                type: resource.type,
                description: resource.description
              })),
              order: lessonIndex,
              subLessons: lesson.subLessons.map((subLesson, subLessonIndex) => {
                const subLessonVideoSource = subLesson.youtubeUrl ? parseYouTubeUrl(subLesson.youtubeUrl) : undefined
                
                return {
                  title: subLesson.title,
                  description: subLesson.description,
                  content: subLesson.content,
                  videoSource: subLessonVideoSource ? {
                    type: 'youtube' as const,
                    videoId: subLessonVideoSource.videoId,
                    url: subLessonVideoSource.url,
                    thumbnailUrl: subLessonVideoSource.thumbnailUrl,
                    duration: subLesson.duration
                  } : undefined,
                  duration: subLesson.duration,
                  isPreview: subLesson.isPreview,
                  resources: subLesson.resources.map(resource => ({
                    title: resource.title,
                    url: resource.url,
                    type: resource.type,
                    description: resource.description
                  })),
                  order: subLessonIndex
                }
              })
            }
          })
        }))
      }))
      
      const coursePayload = {
        ...courseData,
        previewVideo: previewVideo ? {
          type: 'youtube' as const,
          videoId: previewVideo.videoId,
          url: previewVideo.url,
          thumbnailUrl: previewVideo.thumbnailUrl
        } : undefined,
        modules: transformedModules
      }
      
      const response = await fetch('/api/admin/youtube-courses', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(coursePayload)
      })
      
      const data = await response.json()
      
      if (response.ok) {
        toast({
          title: 'Course Created!',
          description: 'YouTube course has been created successfully',
          variant: 'default'
        })
        
        router.push(`/admin/youtube-courses/${data._id}`)
      } else {
        throw new Error(data.error || 'Failed to create course')
      }
      
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create course',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }
  
  // Preview YouTube video
  const handlePreviewYouTube = () => {
    const video = parseYouTubeUrl(previewVideoUrl)
    if (video) {
      setPreviewVideo(video)
    } else {
      setPreviewVideo(null)
    }
  }
  
  if (previewMode) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-6xl mx-auto">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-3xl font-bold">Course Preview</h1>
            <div className="flex gap-2">
              <Button onClick={() => setPreviewMode(false)} variant="outline">
                <EyeOff className="w-4 h-4 mr-2" />
                Exit Preview
              </Button>
            </div>
          </div>
          
          <Card>
            <CardContent className="p-6">
              {/* Course Header */}
              <div className="mb-8">
                <div className="flex gap-4 mb-4">
                  <Badge className="bg-blue-500">{courseData.category}</Badge>
                  <Badge className={
                    courseData.level === 'beginner' ? 'bg-green-500' :
                    courseData.level === 'intermediate' ? 'bg-yellow-500' :
                    'bg-red-500'
                  }>
                    {courseData.level}
                  </Badge>
                  {courseData.isFree ? (
                    <Badge className="bg-green-500">FREE</Badge>
                  ) : (
                    <Badge className="bg-purple-500">NPR {courseData.price}</Badge>
                  )}
                </div>
                
                <h2 className="text-2xl font-bold mb-4">{courseData.title}</h2>
                <p className="text-gray-600 mb-6">{courseData.shortDescription}</p>
                
                {/* Preview Video */}
                {previewVideo && (
                  <div className="mb-6">
                    <h3 className="text-lg font-semibold mb-2">Preview Video</h3>
                    <div className="aspect-video rounded-lg overflow-hidden">
                      <iframe
                        src={previewVideo.url}
                        title="YouTube video player"
                        className="w-full h-full"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                      />
                    </div>
                  </div>
                )}
              </div>
              
              {/* Course Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                <div className="bg-gray-100 p-4 rounded-lg text-center">
                  <div className="text-2xl font-bold">{calculateTotalDuration()}</div>
                  <div className="text-sm text-gray-600">Duration</div>
                </div>
                <div className="bg-gray-100 p-4 rounded-lg text-center">
                  <div className="text-2xl font-bold">{calculateTotalLessons()}</div>
                  <div className="text-sm text-gray-600">Content Items</div>
                </div>
                <div className="bg-gray-100 p-4 rounded-lg text-center">
                  <div className="text-2xl font-bold">{modules.length}</div>
                  <div className="text-sm text-gray-600">Modules</div>
                </div>
                <div className="bg-gray-100 p-4 rounded-lg text-center">
                  <div className="text-2xl font-bold">
                    {courseData.manualEnrollmentEnabled ? 'Manual' : 'Auto'}
                  </div>
                  <div className="text-sm text-gray-600">Enrollment</div>
                </div>
              </div>
              
              {/* Course Content */}
              <div>
                <h3 className="text-xl font-bold mb-4">Course Content</h3>
                <div className="space-y-4">
                  {modules.map((module, moduleIndex) => (
                    <div key={module._id} className="border rounded-lg">
                      <div className="p-4 bg-gray-50">
                        <h4 className="font-semibold">Module {moduleIndex + 1}: {module.title}</h4>
                        {module.description && (
                          <p className="text-sm text-gray-600 mt-1">{module.description}</p>
                        )}
                      </div>
                      
                      <div className="p-4">
                        {module.chapters.map((chapter, chapterIndex) => (
                          <div key={chapter._id} className="ml-4 mb-4 last:mb-0">
                            <h5 className="font-medium">Chapter {chapterIndex + 1}: {chapter.title}</h5>
                            {chapter.description && (
                              <p className="text-sm text-gray-600 mb-2">{chapter.description}</p>
                            )}
                            
                            <div className="ml-4 space-y-2">
                              {chapter.lessons.map((lesson, lessonIndex) => (
                                <div key={lesson._id} className="border-l-2 border-blue-200 pl-4">
                                  <h6 className="font-medium">Lesson {lessonIndex + 1}: {lesson.title}</h6>
                                  {lesson.description && (
                                    <p className="text-sm text-gray-600 mb-1">{lesson.description}</p>
                                  )}
                                  {lesson.youtubeUrl && (
                                    <div className="flex items-center text-sm text-gray-500 mb-1">
                                      <Video className="w-4 h-4 mr-1" />
                                      YouTube Video: {parseYouTubeUrl(lesson.youtubeUrl)?.videoId}
                                    </div>
                                  )}
                                  {lesson.duration > 0 && (
                                    <div className="text-sm text-gray-500">
                                      Duration: {lesson.duration} minutes
                                    </div>
                                  )}
                                  
                                  {/* Sub-lessons */}
                                  {lesson.subLessons.length > 0 && (
                                    <div className="ml-4 mt-2 space-y-2">
                                      {lesson.subLessons.map((subLesson, subLessonIndex) => (
                                        <div key={subLesson._id} className="border-l-2 border-green-200 pl-4">
                                          <h6 className="text-sm font-medium">
                                            Sub-lesson {subLessonIndex + 1}: {subLesson.title}
                                          </h6>
                                          {subLesson.description && (
                                            <p className="text-xs text-gray-600">{subLesson.description}</p>
                                          )}
                                          {subLesson.youtubeUrl && (
                                            <div className="flex items-center text-xs text-gray-500">
                                              <Video className="w-3 h-3 mr-1" />
                                              YouTube Video
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
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }
  
  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">Create YouTube Course</h1>
          <div className="flex gap-2">
            <Button onClick={() => setPreviewMode(true)} variant="outline">
              <Eye className="w-4 h-4 mr-2" />
              Preview
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
                      setCourseData(prev => ({ ...prev, isFree: checked, price: checked ? 0 : prev.price }))
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
                            value={module.description}
                            onChange={(e) => updateModule(moduleIndex, 'description', e.target.value)}
                            placeholder="Brief module description"
                            rows={2}
                          />
                        </div>
                        
                        {/* Chapters */}
                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <h4 className="font-medium">Chapters</h4>
                            <Button
                              size="sm"
                              onClick={() => addChapter(moduleIndex)}
                            >
                              <Plus className="w-4 h-4 mr-1" />
                              Add Chapter
                            </Button>
                          </div>
                          
                          {module.chapters.map((chapter, chapterIndex) => (
                            <div key={chapter._id} className="border-l-2 border-blue-200 pl-4">
                              <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2">
                                  <h5 className="font-medium">Chapter {chapterIndex + 1}</h5>
                                </div>
                                <div className="flex gap-2">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => removeChapter(moduleIndex, chapterIndex)}
                                    disabled={module.chapters.length <= 1}
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </div>
                              </div>
                              
                              <div className="space-y-4">
                                <div className="space-y-2">
                                  <Label>Chapter Title</Label>
                                  <Input
                                    value={chapter.title}
                                    onChange={(e) => updateChapter(moduleIndex, chapterIndex, 'title', e.target.value)}
                                    placeholder="Chapter title"
                                  />
                                </div>
                                
                                <div className="space-y-2">
                                  <Label>Chapter Description (Optional)</Label>
                                  <Textarea
                                    value={chapter.description}
                                    onChange={(e) => updateChapter(moduleIndex, chapterIndex, 'description', e.target.value)}
                                    placeholder="Brief chapter description"
                                    rows={2}
                                  />
                                </div>
                                
                                {/* Lessons */}
                                <div className="space-y-4">
                                  <div className="flex items-center justify-between">
                                    <h6 className="font-medium">Lessons</h6>
                                    <Button
                                      size="sm"
                                      onClick={() => addLesson(moduleIndex, chapterIndex)}
                                    >
                                      <Plus className="w-4 h-4 mr-1" />
                                      Add Lesson
                                    </Button>
                                  </div>
                                  
                                  {chapter.lessons.map((lesson, lessonIndex) => (
                                    <div key={lesson._id} className="border-l-2 border-green-200 pl-4">
                                      <div className="flex items-center justify-between mb-2">
                                        <div className="flex items-center gap-2">
                                          <h6 className="font-medium">Lesson {lessonIndex + 1}</h6>
                                        </div>
                                        <div className="flex gap-2">
                                          <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => removeLesson(moduleIndex, chapterIndex, lessonIndex)}
                                          >
                                            <Trash2 className="w-4 h-4" />
                                          </Button>
                                        </div>
                                      </div>
                                      
                                      <div className="space-y-4">
                                        <div className="space-y-2">
                                          <Label>Lesson Title</Label>
                                          <Input
                                            value={lesson.title}
                                            onChange={(e) => updateLesson(moduleIndex, chapterIndex, lessonIndex, 'title', e.target.value)}
                                            placeholder="Lesson title"
                                          />
                                        </div>
                                        
                                        <div className="space-y-2">
                                          <Label>Lesson Description</Label>
                                          <Textarea
                                            value={lesson.description}
                                            onChange={(e) => updateLesson(moduleIndex, chapterIndex, lessonIndex, 'description', e.target.value)}
                                            placeholder="Lesson description"
                                            rows={2}
                                          />
                                        </div>
                                        
                                        <div className="space-y-2">
                                          <Label>YouTube URL (Optional)</Label>
                                          <div className="flex gap-2">
                                            <Input
                                              value={lesson.youtubeUrl}
                                              onChange={(e) => updateLesson(moduleIndex, chapterIndex, lessonIndex, 'youtubeUrl', e.target.value)}
                                              placeholder="https://youtube.com/watch?v=..."
                                            />
                                            {lesson.youtubeUrl && (
                                              <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => {
                                                  const video = parseYouTubeUrl(lesson.youtubeUrl!)
                                                  if (video) {
                                                    toast({
                                                      title: 'Valid YouTube URL',
                                                      description: `Video ID: ${video.videoId}`,
                                                    })
                                                  }
                                                }}
                                              >
                                                <Check className="w-4 h-4" />
                                              </Button>
                                            )}
                                          </div>
                                        </div>
                                        
                                        <div className="grid grid-cols-2 gap-4">
                                          <div className="space-y-2">
                                            <Label>Duration (minutes)</Label>
                                            <Input
                                              type="number"
                                              value={lesson.duration}
                                              onChange={(e) => updateLesson(moduleIndex, chapterIndex, lessonIndex, 'duration', parseInt(e.target.value) || 0)}
                                              placeholder="0"
                                              min="0"
                                            />
                                          </div>
                                          
                                          <div className="space-y-2">
                                            <Label>Preview Lesson</Label>
                                            <div className="flex items-center gap-2">
                                              <Switch
                                                checked={lesson.isPreview}
                                                onCheckedChange={(checked) => 
                                                  updateLesson(moduleIndex, chapterIndex, lessonIndex, 'isPreview', checked)
                                                }
                                              />
                                              <span className="text-sm text-gray-500">
                                                Allow preview without enrollment
                                              </span>
                                            </div>
                                          </div>
                                        </div>
                                        
                                        {/* Resources for Lesson */}
                                        <div className="space-y-4">
                                          <div className="flex items-center justify-between">
                                            <h6 className="font-medium">Lesson Resources</h6>
                                            <Button
                                              size="sm"
                                              onClick={() => addResource(moduleIndex, chapterIndex, lessonIndex)}
                                            >
                                              <Plus className="w-4 h-4 mr-1" />
                                              Add Resource
                                            </Button>
                                          </div>
                                          
                                          {lesson.resources.map((resource, resourceIndex) => (
                                            <div key={resource._id} className="space-y-2 border p-3 rounded">
                                              <div className="flex justify-between">
                                                <Label>Resource {resourceIndex + 1}</Label>
                                                <Button
                                                  size="sm"
                                                  variant="ghost"
                                                  onClick={() => removeResource(moduleIndex, chapterIndex, lessonIndex, resourceIndex)}
                                                >
                                                  <Trash2 className="w-4 h-4" />
                                                </Button>
                                              </div>
                                              <Input
                                                value={resource.title}
                                                onChange={(e) => updateResource(moduleIndex, chapterIndex, lessonIndex, resourceIndex, 'title', e.target.value)}
                                                placeholder="Resource title"
                                              />
                                              <Input
                                                value={resource.url}
                                                onChange={(e) => updateResource(moduleIndex, chapterIndex, lessonIndex, resourceIndex, 'url', e.target.value)}
                                                placeholder="Resource URL"
                                              />
                                              <Select
                                                value={resource.type}
                                                onValueChange={(value: 'pdf' | 'document' | 'link' | 'youtube') => 
                                                  updateResource(moduleIndex, chapterIndex, lessonIndex, resourceIndex, 'type', value)
                                                }
                                              >
                                                <SelectTrigger>
                                                  <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                  <SelectItem value="pdf">PDF</SelectItem>
                                                  <SelectItem value="document">Document</SelectItem>
                                                  <SelectItem value="link">Link</SelectItem>
                                                  <SelectItem value="youtube">YouTube</SelectItem>
                                                </SelectContent>
                                              </Select>
                                            </div>
                                          ))}
                                        </div>
                                        
                                        {/* Sub-lessons */}
                                        <div className="space-y-4">
                                          <div className="flex items-center justify-between">
                                            <h6 className="font-medium">Sub-lessons</h6>
                                            <Button
                                              size="sm"
                                              onClick={() => addSubLesson(moduleIndex, chapterIndex, lessonIndex)}
                                            >
                                              <Plus className="w-4 h-4 mr-1" />
                                              Add Sub-lesson
                                            </Button>
                                          </div>
                                          
                                          {lesson.subLessons.map((subLesson, subLessonIndex) => (
                                            <div key={subLesson._id} className="border-l-2 border-yellow-200 pl-4">
                                              <div className="flex items-center justify-between mb-2">
                                                <h6 className="font-medium">Sub-lesson {subLessonIndex + 1}</h6>
                                                <Button
                                                  size="sm"
                                                  variant="outline"
                                                  onClick={() => removeSubLesson(moduleIndex, chapterIndex, lessonIndex, subLessonIndex)}
                                                >
                                                  <Trash2 className="w-4 h-4" />
                                                </Button>
                                              </div>
                                              
                                              <div className="space-y-4">
                                                <div className="space-y-2">
                                                  <Label>Sub-lesson Title</Label>
                                                  <Input
                                                    value={subLesson.title}
                                                    onChange={(e) => updateSubLesson(moduleIndex, chapterIndex, lessonIndex, subLessonIndex, 'title', e.target.value)}
                                                    placeholder="Sub-lesson title"
                                                  />
                                                </div>
                                                
                                                <div className="space-y-2">
                                                  <Label>Sub-lesson Description</Label>
                                                  <Textarea
                                                    value={subLesson.description}
                                                    onChange={(e) => updateSubLesson(moduleIndex, chapterIndex, lessonIndex, subLessonIndex, 'description', e.target.value)}
                                                    placeholder="Sub-lesson description"
                                                    rows={2}
                                                  />
                                                </div>
                                                
                                                <div className="space-y-2">
                                                  <Label>YouTube URL (Optional)</Label>
                                                  <div className="flex gap-2">
                                                    <Input
                                                      value={subLesson.youtubeUrl}
                                                      onChange={(e) => updateSubLesson(moduleIndex, chapterIndex, lessonIndex, subLessonIndex, 'youtubeUrl', e.target.value)}
                                                      placeholder="https://youtube.com/watch?v=..."
                                                    />
                                                    {subLesson.youtubeUrl && (
                                                      <Button
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={() => {
                                                          const video = parseYouTubeUrl(subLesson.youtubeUrl!)
                                                          if (video) {
                                                            toast({
                                                              title: 'Valid YouTube URL',
                                                              description: `Video ID: ${video.videoId}`,
                                                            })
                                                          }
                                                        }}
                                                      >
                                                        <Check className="w-4 h-4" />
                                                      </Button>
                                                    )}
                                                  </div>
                                                </div>
                                                
                                                <div className="grid grid-cols-2 gap-4">
                                                  <div className="space-y-2">
                                                    <Label>Duration (minutes)</Label>
                                                    <Input
                                                      type="number"
                                                      value={subLesson.duration}
                                                      onChange={(e) => updateSubLesson(moduleIndex, chapterIndex, lessonIndex, subLessonIndex, 'duration', parseInt(e.target.value) || 0)}
                                                      placeholder="0"
                                                      min="0"
                                                    />
                                                  </div>
                                                  
                                                  <div className="space-y-2">
                                                    <Label>Preview Sub-lesson</Label>
                                                    <div className="flex items-center gap-2">
                                                      <Switch
                                                        checked={subLesson.isPreview}
                                                        onCheckedChange={(checked) => 
                                                          updateSubLesson(moduleIndex, chapterIndex, lessonIndex, subLessonIndex, 'isPreview', checked)
                                                        }
                                                      />
                                                      <span className="text-sm text-gray-500">
                                                        Allow preview
                                                      </span>
                                                    </div>
                                                  </div>
                                                </div>
                                                
                                                {/* Resources for Sub-lesson */}
                                                <div className="space-y-4">
                                                  <div className="flex items-center justify-between">
                                                    <h6 className="font-medium">Sub-lesson Resources</h6>
                                                    <Button
                                                      size="sm"
                                                      onClick={() => addResource(moduleIndex, chapterIndex, lessonIndex, subLessonIndex)}
                                                    >
                                                      <Plus className="w-4 h-4 mr-1" />
                                                      Add Resource
                                                    </Button>
                                                  </div>
                                                  
                                                  {subLesson.resources.map((resource, resourceIndex) => (
                                                    <div key={resource._id} className="space-y-2 border p-3 rounded">
                                                      <div className="flex justify-between">
                                                        <Label>Resource {resourceIndex + 1}</Label>
                                                        <Button
                                                          size="sm"
                                                          variant="ghost"
                                                          onClick={() => removeResource(moduleIndex, chapterIndex, lessonIndex, resourceIndex, subLessonIndex)}
                                                        >
                                                          <Trash2 className="w-4 h-4" />
                                                        </Button>
                                                      </div>
                                                      <Input
                                                        value={resource.title}
                                                        onChange={(e) => updateResource(moduleIndex, chapterIndex, lessonIndex, resourceIndex, 'title', e.target.value, subLessonIndex)}
                                                        placeholder="Resource title"
                                                      />
                                                      <Input
                                                        value={resource.url}
                                                        onChange={(e) => updateResource(moduleIndex, chapterIndex, lessonIndex, resourceIndex, 'url', e.target.value, subLessonIndex)}
                                                        placeholder="Resource URL"
                                                      />
                                                      <Select
                                                        value={resource.type}
                                                        onValueChange={(value: 'pdf' | 'document' | 'link' | 'youtube') => 
                                                          updateResource(moduleIndex, chapterIndex, lessonIndex, resourceIndex, 'type', value, subLessonIndex)
                                                        }
                                                      >
                                                        <SelectTrigger>
                                                          <SelectValue />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                          <SelectItem value="pdf">PDF</SelectItem>
                                                          <SelectItem value="document">Document</SelectItem>
                                                          <SelectItem value="link">Link</SelectItem>
                                                          <SelectItem value="youtube">YouTube</SelectItem>
                                                        </SelectContent>
                                                      </Select>
                                                    </div>
                                                  ))}
                                                </div>
                                              </div>
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
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
          
          {/* Right Column - Settings & Actions */}
          <div className="space-y-6">
            {/* Preview Video */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Video className="w-5 h-5" />
                  Preview Video
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>YouTube URL for Preview</Label>
                  <div className="flex gap-2">
                    <Input
                      value={previewVideoUrl}
                      onChange={(e) => setPreviewVideoUrl(e.target.value)}
                      placeholder="https://youtube.com/watch?v=..."
                    />
                    <Button onClick={handlePreviewYouTube}>
                      <Check className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
                
                {previewVideo && (
                  <div className="space-y-2">
                    <Label>Preview</Label>
                    <div className="aspect-video rounded-lg overflow-hidden">
                      <iframe
                        src={previewVideo.url}
                        title="YouTube preview"
                        className="w-full h-full"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                      />
                    </div>
                    <p className="text-sm text-gray-500">Video ID: {previewVideo.videoId}</p>
                  </div>
                )}
              </CardContent>
            </Card>
            
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
            
            {/* Course Stats */}
            <Card>
              <CardHeader>
                <CardTitle>Course Stats</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Modules</span>
                  <span className="font-semibold">{modules.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Content Items</span>
                  <span className="font-semibold">{calculateTotalLessons()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Total Duration</span>
                  <span className="font-semibold">{calculateTotalDuration()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Requirements</span>
                  <span className="font-semibold">{courseData.requirements.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Learning Outcomes</span>
                  <span className="font-semibold">{courseData.learningOutcomes.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Tags</span>
                  <span className="font-semibold">{courseData.tags.length}</span>
                </div>
              </CardContent>
            </Card>
            
            {/* Submit Button */}
            <Button
              onClick={handleSubmit}
              disabled={loading}
              className="w-full"
              size="lg"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating Course...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4 mr-2" />
                  Create YouTube Course
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}