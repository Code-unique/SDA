'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from "@/components/ui/separator"

import { Badge } from '@/components/ui/badge'
import { useToast } from '@/components/ui/use-toast'
import { 
  Plus, 
  Trash2, 
  Upload, 
  ChevronUp, 
  ChevronDown, 
  Eye, 
  EyeOff,
  Video,
  BookOpen,
  Users,
  Target,
  Zap,
  Award,
  Loader2,
  Check,
  X,
  Image as ImageIcon,
  Link,
  FileText,
  Youtube,
  Clock
} from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"

// Interfaces
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

// Helper functions
const generateId = () => `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

const extractYouTubeVideoId = (url: string): string | null => {
  if (!url) return null
  
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/
  const match = url.match(regExp)
  return match && match[2].length === 11 ? match[2] : null
}

const getYouTubeThumbnail = (videoId: string, quality: 'default' | 'mqdefault' | 'hqdefault' | 'sddefault' | 'maxresdefault' = 'maxresdefault'): string => {
  return `https://img.youtube.com/vi/${videoId}/${quality}.jpg`
}

// Fallback image component
const FallbackImage = ({ className, alt }: { className?: string; alt: string }) => {
  return (
    <div className={`bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center ${className}`}>
      <div className="text-center">
        <ImageIcon className="w-12 h-12 text-gray-400 mx-auto mb-2" />
        <p className="text-sm text-gray-500">{alt || 'No image available'}</p>
      </div>
    </div>
  )
}

// Image component with error handling
const CourseImage = ({ src, alt, className }: { src: string; alt: string; className?: string }) => {
  const [error, setError] = useState(false)
  const [loading, setLoading] = useState(true)

  if (!src || error) {
    return <FallbackImage className={className} alt={alt} />
  }

  return (
    <div className="relative">
      {loading && (
        <div className="absolute inset-0 bg-gray-100 animate-pulse flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
        </div>
      )}
      <img
        src={src}
        alt={alt}
        className={className}
        onError={() => setError(true)}
        onLoad={() => setLoading(false)}
        style={loading ? { opacity: 0 } : { opacity: 1 }}
      />
    </div>
  )
}

// Drag handle component
const DragHandle = ({ onMoveUp, onMoveDown, canMoveUp = true, canMoveDown = true }: {
  onMoveUp: () => void
  onMoveDown: () => void
  canMoveUp?: boolean
  canMoveDown?: boolean
}) => {
  return (
    <div className="flex items-center gap-1">
      <Button
        type="button"
        size="sm"
        variant="ghost"
        onClick={onMoveUp}
        disabled={!canMoveUp}
        className="h-6 w-6 p-0"
      >
        <ChevronUp className="w-3 h-3" />
      </Button>
      <Button
        type="button"
        size="sm"
        variant="ghost"
        onClick={onMoveDown}
        disabled={!canMoveDown}
        className="h-6 w-6 p-0"
      >
        <ChevronDown className="w-3 h-3" />
      </Button>
    </div>
  )
}

export default function CreateYouTubeCoursePage() {
  const router = useRouter()
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [previewMode, setPreviewMode] = useState(false)
  
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
  
  const [previewVideo, setPreviewVideo] = useState<YouTubeVideo | null>(null)
  const [previewVideoUrl, setPreviewVideoUrl] = useState('')
  
  const [modules, setModules] = useState<Module[]>([
    {
      _id: generateId(),
      title: 'Module 1',
      description: '',
      order: 0,
      chapters: [
        {
          _id: generateId(),
          title: 'Chapter 1',
          description: '',
          order: 0,
          lessons: [
            {
              _id: generateId(),
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
  
  const [tagInput, setTagInput] = useState('')
  const [requirementInput, setRequirementInput] = useState('')
  const [outcomeInput, setOutcomeInput] = useState('')
  const [expandedModules, setExpandedModules] = useState<string[]>([])
  const [expandedChapters, setExpandedChapters] = useState<string[]>([])
  const [expandedLessons, setExpandedLessons] = useState<string[]>([])

  const fetchYouTubeInfo = async (videoId: string) => {
    return {
      type: 'youtube' as const,
      videoId,
      url: `https://www.youtube.com/watch?v=${videoId}`,
      thumbnailUrl: getYouTubeThumbnail(videoId, 'maxresdefault'),
      duration: 0
    }
  }

  const handlePreviewYouTube = async () => {
    const videoId = extractYouTubeVideoId(previewVideoUrl)
    if (!videoId) {
      toast({
        title: 'Invalid YouTube URL',
        description: 'Please enter a valid YouTube video URL',
        variant: 'destructive'
      })
      return
    }
    
    const video = await fetchYouTubeInfo(videoId)
    setPreviewVideo(video)
    
    if (!courseData.thumbnail.trim()) {
      setCourseData(prev => ({
        ...prev,
        thumbnail: video.thumbnailUrl
      }))
      toast({
        title: 'Thumbnail Auto-filled',
        description: 'YouTube thumbnail has been set as course thumbnail',
        variant: 'default'
      })
    }
  }

  const handleLessonYouTubeVideo = async (
    moduleIndex: number, 
    chapterIndex: number, 
    lessonIndex: number, 
    url: string
  ) => {
    const videoId = extractYouTubeVideoId(url)
    if (!videoId) {
      toast({
        title: 'Invalid YouTube URL',
        description: 'Please enter a valid YouTube video URL',
        variant: 'destructive'
      })
      return
    }
    
    const videoInfo = await fetchYouTubeInfo(videoId)
    updateLesson(moduleIndex, chapterIndex, lessonIndex, 'videoSource', videoInfo)
  }

  const handleSubLessonYouTubeVideo = async (
    moduleIndex: number, 
    chapterIndex: number, 
    lessonIndex: number, 
    subLessonIndex: number,
    url: string
  ) => {
    const videoId = extractYouTubeVideoId(url)
    if (!videoId) {
      toast({
        title: 'Invalid YouTube URL',
        description: 'Please enter a valid YouTube video URL',
        variant: 'destructive'
      })
      return
    }
    
    const videoInfo = await fetchYouTubeInfo(videoId)
    updateSubLesson(moduleIndex, chapterIndex, lessonIndex, subLessonIndex, 'videoSource', videoInfo)
  }

  const autoFillThumbnailFromYouTube = (url: string) => {
    const videoId = extractYouTubeVideoId(url)
    if (videoId && !courseData.thumbnail.trim()) {
      const thumbnailUrl = getYouTubeThumbnail(videoId, 'maxresdefault')
      setCourseData(prev => ({
        ...prev,
        thumbnail: thumbnailUrl
      }))
      toast({
        title: 'Thumbnail Auto-filled',
        description: 'YouTube thumbnail has been set as course thumbnail',
        variant: 'default'
      })
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
    const newModule: Module = {
      _id: generateId(),
      title: `Module ${modules.length + 1}`,
      description: '',
      order: modules.length,
      chapters: [
        {
          _id: generateId(),
          title: 'Chapter 1',
          description: '',
          order: 0,
          lessons: [
            {
              _id: generateId(),
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
    
    setModules(prev => [...prev, newModule])
    setExpandedModules(prev => [...prev, newModule._id])
  }

  const updateModule = (moduleIndex: number, field: keyof Module, value: any) => {
    setModules(prev => prev.map((module, i) => 
      i === moduleIndex ? { ...module, [field]: value } : module
    ))
  }

  const removeModule = (moduleIndex: number) => {
    if (modules.length > 1) {
      setModules(prev => prev.filter((_, i) => i !== moduleIndex))
      setExpandedModules(prev => prev.filter(id => id !== modules[moduleIndex]._id))
    } else {
      toast({
        title: 'Cannot Remove',
        description: 'Course must have at least one module',
        variant: 'destructive'
      })
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
    
    const tempOrder = newModules[index].order
    newModules[index].order = newModules[swapIndex].order
    newModules[swapIndex].order = tempOrder
    
    ;[newModules[index], newModules[swapIndex]] = [newModules[swapIndex], newModules[index]]
    
    newModules.sort((a, b) => a.order - b.order)
    
    setModules(newModules)
  }

  const addChapter = (moduleIndex: number) => {
    const newChapter: Chapter = {
      _id: generateId(),
      title: `Chapter ${modules[moduleIndex].chapters.length + 1}`,
      description: '',
      order: modules[moduleIndex].chapters.length,
      lessons: [
        {
          _id: generateId(),
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
    
    setModules(prev => prev.map((module, i) => 
      i === moduleIndex 
        ? { ...module, chapters: [...module.chapters, newChapter] }
        : module
    ))
  }

  const updateChapter = (moduleIndex: number, chapterIndex: number, field: keyof Chapter, value: any) => {
    setModules(prev => prev.map((module, i) => 
      i === moduleIndex 
        ? {
            ...module,
            chapters: module.chapters.map((chapter, j) => 
              j === chapterIndex ? { ...chapter, [field]: value } : chapter
            )
          }
        : module
    ))
  }

  const removeChapter = (moduleIndex: number, chapterIndex: number) => {
    if (modules[moduleIndex].chapters.length > 1) {
      setModules(prev => prev.map((module, i) => 
        i === moduleIndex 
          ? { ...module, chapters: module.chapters.filter((_, j) => j !== chapterIndex) }
          : module
      ))
    } else {
      toast({
        title: 'Cannot Remove',
        description: 'Module must have at least one chapter',
        variant: 'destructive'
      })
    }
  }

  const moveChapter = (moduleIndex: number, chapterIndex: number, direction: 'up' | 'down') => {
    const chapters = modules[moduleIndex].chapters
    
    if (
      (direction === 'up' && chapterIndex === 0) ||
      (direction === 'down' && chapterIndex === chapters.length - 1)
    ) {
      return
    }
    
    setModules(prev => prev.map((module, i) => {
      if (i !== moduleIndex) return module
      
      const newChapters = [...chapters]
      const swapIndex = direction === 'up' ? chapterIndex - 1 : chapterIndex + 1
      
      const tempOrder = newChapters[chapterIndex].order
      newChapters[chapterIndex].order = newChapters[swapIndex].order
      newChapters[swapIndex].order = tempOrder
      
      ;[newChapters[chapterIndex], newChapters[swapIndex]] = [newChapters[swapIndex], newChapters[chapterIndex]]
      
      newChapters.sort((a, b) => a.order - b.order)
      
      return { ...module, chapters: newChapters }
    }))
  }

  const addLesson = (moduleIndex: number, chapterIndex: number) => {
    const newLesson: Lesson = {
      _id: generateId(),
      title: `Lesson ${modules[moduleIndex].chapters[chapterIndex].lessons.length + 1}`,
      description: '',
      duration: 0,
      isPreview: false,
      order: modules[moduleIndex].chapters[chapterIndex].lessons.length,
      resources: [],
      subLessons: []
    }
    
    setModules(prev => prev.map((module, i) => {
      if (i !== moduleIndex) return module
      
      return {
        ...module,
        chapters: module.chapters.map((chapter, j) => {
          if (j !== chapterIndex) return chapter
          
          return {
            ...chapter,
            lessons: [...chapter.lessons, newLesson]
          }
        })
      }
    }))
  }

  const updateLesson = (moduleIndex: number, chapterIndex: number, lessonIndex: number, field: keyof Lesson, value: any) => {
    setModules(prev => prev.map((module, i) => {
      if (i !== moduleIndex) return module
      
      return {
        ...module,
        chapters: module.chapters.map((chapter, j) => {
          if (j !== chapterIndex) return chapter
          
          return {
            ...chapter,
            lessons: chapter.lessons.map((lesson, k) => 
              k === lessonIndex ? { ...lesson, [field]: value } : lesson
            )
          }
        })
      }
    }))
  }

  const removeLesson = (moduleIndex: number, chapterIndex: number, lessonIndex: number) => {
    if (modules[moduleIndex].chapters[chapterIndex].lessons.length > 1) {
      setModules(prev => prev.map((module, i) => {
        if (i !== moduleIndex) return module
        
        return {
          ...module,
          chapters: module.chapters.map((chapter, j) => {
            if (j !== chapterIndex) return chapter
            
            return {
              ...chapter,
              lessons: chapter.lessons.filter((_, k) => k !== lessonIndex)
            }
          })
        }
      }))
    } else {
      toast({
        title: 'Cannot Remove',
        description: 'Chapter must have at least one lesson',
        variant: 'destructive'
      })
    }
  }

  const moveLesson = (moduleIndex: number, chapterIndex: number, lessonIndex: number, direction: 'up' | 'down') => {
    const lessons = modules[moduleIndex].chapters[chapterIndex].lessons
    
    if (
      (direction === 'up' && lessonIndex === 0) ||
      (direction === 'down' && lessonIndex === lessons.length - 1)
    ) {
      return
    }
    
    setModules(prev => prev.map((module, i) => {
      if (i !== moduleIndex) return module
      
      return {
        ...module,
        chapters: module.chapters.map((chapter, j) => {
          if (j !== chapterIndex) return chapter
          
          const newLessons = [...lessons]
          const swapIndex = direction === 'up' ? lessonIndex - 1 : lessonIndex + 1
          
          const tempOrder = newLessons[lessonIndex].order
          newLessons[lessonIndex].order = newLessons[swapIndex].order
          newLessons[swapIndex].order = tempOrder
          
          ;[newLessons[lessonIndex], newLessons[swapIndex]] = [newLessons[swapIndex], newLessons[lessonIndex]]
          
          newLessons.sort((a, b) => a.order - b.order)
          
          return { ...chapter, lessons: newLessons }
        })
      }
    }))
  }

  const addSubLesson = (moduleIndex: number, chapterIndex: number, lessonIndex: number) => {
    const newSubLesson: SubLesson = {
      _id: generateId(),
      title: `Sub-lesson ${modules[moduleIndex].chapters[chapterIndex].lessons[lessonIndex].subLessons.length + 1}`,
      description: '',
      duration: 0,
      isPreview: false,
      order: modules[moduleIndex].chapters[chapterIndex].lessons[lessonIndex].subLessons.length,
      resources: []
    }
    
    setModules(prev => prev.map((module, i) => {
      if (i !== moduleIndex) return module
      
      return {
        ...module,
        chapters: module.chapters.map((chapter, j) => {
          if (j !== chapterIndex) return chapter
          
          return {
            ...chapter,
            lessons: chapter.lessons.map((lesson, k) => {
              if (k !== lessonIndex) return lesson
              
              return {
                ...lesson,
                subLessons: [...lesson.subLessons, newSubLesson]
              }
            })
          }
        })
      }
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
      if (i !== moduleIndex) return module
      
      return {
        ...module,
        chapters: module.chapters.map((chapter, j) => {
          if (j !== chapterIndex) return chapter
          
          return {
            ...chapter,
            lessons: chapter.lessons.map((lesson, k) => {
              if (k !== lessonIndex) return lesson
              
              return {
                ...lesson,
                subLessons: lesson.subLessons.map((sub, s) => 
                  s === subLessonIndex ? { ...sub, [field]: value } : sub
                )
              }
            })
          }
        })
      }
    }))
  }

  const removeSubLesson = (
    moduleIndex: number, 
    chapterIndex: number, 
    lessonIndex: number, 
    subLessonIndex: number
  ) => {
    setModules(prev => prev.map((module, i) => {
      if (i !== moduleIndex) return module
      
      return {
        ...module,
        chapters: module.chapters.map((chapter, j) => {
          if (j !== chapterIndex) return chapter
          
          return {
            ...chapter,
            lessons: chapter.lessons.map((lesson, k) => {
              if (k !== lessonIndex) return lesson
              
              return {
                ...lesson,
                subLessons: lesson.subLessons.filter((_, s) => s !== subLessonIndex)
              }
            })
          }
        })
      }
    }))
  }

  const addResource = (
    moduleIndex: number, 
    chapterIndex: number, 
    lessonIndex: number, 
    subLessonIndex?: number
  ) => {
    const newResource: LessonResource = {
      _id: generateId(),
      title: 'New Resource',
      url: '',
      type: 'link'
    }

    setModules(prev => prev.map((module, i) => {
      if (i !== moduleIndex) return module
      
      return {
        ...module,
        chapters: module.chapters.map((chapter, j) => {
          if (j !== chapterIndex) return chapter
          
          if (subLessonIndex !== undefined) {
            return {
              ...chapter,
              lessons: chapter.lessons.map((lesson, k) => {
                if (k !== lessonIndex) return lesson
                
                return {
                  ...lesson,
                  subLessons: lesson.subLessons.map((sub, s) => {
                    if (s !== subLessonIndex) return sub
                    return {
                      ...sub,
                      resources: [...sub.resources, newResource]
                    }
                  })
                }
              })
            }
          } else {
            return {
              ...chapter,
              lessons: chapter.lessons.map((lesson, k) => {
                if (k !== lessonIndex) return lesson
                return {
                  ...lesson,
                  resources: [...lesson.resources, newResource]
                }
              })
            }
          }
        })
      }
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
      if (i !== moduleIndex) return module
      
      return {
        ...module,
        chapters: module.chapters.map((chapter, j) => {
          if (j !== chapterIndex) return chapter
          
          if (subLessonIndex !== undefined) {
            return {
              ...chapter,
              lessons: chapter.lessons.map((lesson, k) => {
                if (k !== lessonIndex) return lesson
                
                return {
                  ...lesson,
                  subLessons: lesson.subLessons.map((sub, s) => {
                    if (s !== subLessonIndex) return sub
                    return {
                      ...sub,
                      resources: sub.resources.map((res, r) => 
                        r === resourceIndex ? { ...res, [field]: value } : res
                      )
                    }
                  })
                }
              })
            }
          } else {
            return {
              ...chapter,
              lessons: chapter.lessons.map((lesson, k) => {
                if (k !== lessonIndex) return lesson
                return {
                  ...lesson,
                  resources: lesson.resources.map((res, r) => 
                    r === resourceIndex ? { ...res, [field]: value } : res
                  )
                }
              })
            }
          }
        })
      }
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
      if (i !== moduleIndex) return module
      
      return {
        ...module,
        chapters: module.chapters.map((chapter, j) => {
          if (j !== chapterIndex) return chapter
          
          if (subLessonIndex !== undefined) {
            return {
              ...chapter,
              lessons: chapter.lessons.map((lesson, k) => {
                if (k !== lessonIndex) return lesson
                
                return {
                  ...lesson,
                  subLessons: lesson.subLessons.map((sub, s) => {
                    if (s !== subLessonIndex) return sub
                    return {
                      ...sub,
                      resources: sub.resources.filter((_, r) => r !== resourceIndex)
                    }
                  })
                }
              })
            }
          } else {
            return {
              ...chapter,
              lessons: chapter.lessons.map((lesson, k) => {
                if (k !== lessonIndex) return lesson
                return {
                  ...lesson,
                  resources: lesson.resources.filter((_, r) => r !== resourceIndex)
                }
              })
            }
          }
        })
      }
    }))
  }

  const validateCourse = (): string[] => {
    const errors: string[] = []
    
    if (!courseData.title.trim()) errors.push('Title is required')
    if (!courseData.description.trim()) errors.push('Description is required')
    if (!courseData.shortDescription.trim()) errors.push('Short description is required')
    if (!courseData.thumbnail.trim()) errors.push('Thumbnail URL is required')
    if (courseData.price < 0) errors.push('Price cannot be negative')
    
    return errors
  }

  const calculateTotalDuration = () => {
    let totalMinutes = 0
    
    modules.forEach(module => {
      module.chapters.forEach(chapter => {
        chapter.lessons.forEach(lesson => {
          totalMinutes += Math.round(lesson.duration / 60)
          lesson.subLessons.forEach(subLesson => {
            totalMinutes += Math.round(subLesson.duration / 60)
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
      const coursePayload = {
        ...courseData,
        previewVideo: previewVideo ? {
          type: 'youtube' as const,
          videoId: previewVideo.videoId,
          url: previewVideo.url,
          thumbnailUrl: previewVideo.thumbnailUrl
        } : undefined,
        modules: modules
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

  if (previewMode) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-6xl mx-auto">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-3xl font-bold">Course Preview</h1>
            <Button onClick={() => setPreviewMode(false)} variant="outline">
              <EyeOff className="w-4 h-4 mr-2" />
              Exit Preview
            </Button>
          </div>
          
          <Card>
            <CardContent className="p-6">
              {/* Course Header */}
              <div className="mb-8">
                <div className="flex gap-4 mb-4">
                  <Badge className="bg-blue-500">{courseData.category || 'Uncategorized'}</Badge>
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
                
                <h2 className="text-2xl font-bold mb-4">{courseData.title || 'Untitled Course'}</h2>
                <p className="text-gray-600 mb-6">{courseData.shortDescription || 'No description provided'}</p>
                
                {courseData.thumbnail && (
                  <div className="mb-4">
                    <div className="aspect-video rounded-lg overflow-hidden">
                      <CourseImage 
                        src={courseData.thumbnail} 
                        alt={courseData.title} 
                        className="w-full h-full object-cover"
                      />
                    </div>
                  </div>
                )}
                
                {previewVideo && (
                  <div className="mb-6">
                    <h3 className="text-lg font-semibold mb-2">Preview Video</h3>
                    <div className="aspect-video rounded-lg overflow-hidden">
                      <iframe
                        src={`https://www.youtube.com/embed/${previewVideo.videoId}`}
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
                                  {lesson.videoSource && (
                                    <div className="flex items-center text-sm text-gray-500 mb-1">
                                      <Youtube className="w-4 h-4 mr-1 text-red-600" />
                                      YouTube Video: {lesson.videoSource.videoId}
                                    </div>
                                  )}
                                  {lesson.duration > 0 && (
                                    <div className="text-sm text-gray-500">
                                      Duration: {Math.round(lesson.duration / 60)} minutes
                                    </div>
                                  )}
                                  
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
                                          {subLesson.videoSource && (
                                            <div className="flex items-center text-xs text-gray-500">
                                              <Youtube className="w-3 h-3 mr-1 text-red-600" />
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
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">Create YouTube Course</h1>
          <div className="flex gap-2">
            <Button onClick={() => setPreviewMode(true)} variant="outline">
              <Eye className="w-4 h-4 mr-2" />
              Preview
            </Button>
          </div>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Main Content - 3 columns */}
          <div className="lg:col-span-3 space-y-6">
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
                  <Label htmlFor="shortDescription">Short Description *</Label>
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
                  <div className="flex gap-2">
                    <Input
                      id="thumbnail"
                      value={courseData.thumbnail}
                      onChange={(e) => setCourseData(prev => ({ ...prev, thumbnail: e.target.value }))}
                      placeholder="https://example.com/image.jpg"
                    />
                  </div>
                  {courseData.thumbnail && (
                    <div className="mt-2">
                      <Label className="text-sm text-gray-500 mb-2">Thumbnail Preview:</Label>
                      <CourseImage 
                        src={courseData.thumbnail} 
                        alt="Thumbnail preview" 
                        className="h-40 w-full object-cover rounded border"
                      />
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
            
            {/* Course Preview Video */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Youtube className="w-5 h-5" />
                  Course Preview Video (Optional)
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {previewVideo ? (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Youtube className="w-5 h-5 text-red-600" />
                        <span className="font-medium">{previewVideo.videoId}</span>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setPreviewVideo(null)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                    <div className="aspect-video rounded-lg overflow-hidden border">
                      <iframe
                        src={`https://www.youtube.com/embed/${previewVideo.videoId}`}
                        className="w-full h-full"
                        allowFullScreen
                      />
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Label>YouTube URL for Preview</Label>
                    <div className="flex gap-2">
                      <Input
                        value={previewVideoUrl}
                        onChange={(e) => setPreviewVideoUrl(e.target.value)}
                        placeholder="https://www.youtube.com/watch?v=..."
                      />
                      <Button
                        type="button"
                        onClick={handlePreviewYouTube}
                      >
                        <Plus className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
            
            {/* Thumbnail Helper */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ImageIcon className="w-5 h-5" />
                  Thumbnail Helper
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Auto-fill from YouTube</Label>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Paste YouTube URL to auto-fill thumbnail"
                      onBlur={(e) => autoFillThumbnailFromYouTube(e.target.value)}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          autoFillThumbnailFromYouTube(e.currentTarget.value)
                        }
                      }}
                    />
                  </div>
                  <p className="text-xs text-gray-500">
                    Enter any YouTube URL to automatically set the course thumbnail
                  </p>
                </div>
              </CardContent>
            </Card>
            
            {/* Course Content Modules */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Video className="w-5 h-5" />
                  Course Content
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {modules.map((module, moduleIndex) => (
                    <div key={module._id} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                          <DragHandle
                            onMoveUp={() => moveModule(moduleIndex, 'up')}
                            onMoveDown={() => moveModule(moduleIndex, 'down')}
                            canMoveUp={moduleIndex > 0}
                            canMoveDown={moduleIndex < modules.length - 1}
                          />
                          <h3 className="font-semibold">Module {moduleIndex + 1}</h3>
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
                          <Label>Module Title *</Label>
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
                        
                        <Separator />
                        
                        {/* Chapters */}
                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <h4 className="font-medium">Chapters</h4>
                            <Button
                              size="sm"
                              onClick={() => addChapter(moduleIndex)}
                              variant="outline"
                            >
                              <Plus className="w-4 h-4 mr-2" />
                              Add Chapter
                            </Button>
                          </div>
                          
                          {module.chapters.map((chapter, chapterIndex) => (
                            <div key={chapter._id} className="border-l-2 border-blue-200 pl-4">
                              <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2">
                                  <DragHandle
                                    onMoveUp={() => moveChapter(moduleIndex, chapterIndex, 'up')}
                                    onMoveDown={() => moveChapter(moduleIndex, chapterIndex, 'down')}
                                    canMoveUp={chapterIndex > 0}
                                    canMoveDown={chapterIndex < module.chapters.length - 1}
                                  />
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
                                  <Label>Chapter Title *</Label>
                                  <Input
                                    value={chapter.title}
                                    onChange={(e) => updateChapter(moduleIndex, chapterIndex, 'title', e.target.value)}
                                    placeholder="Chapter title"
                                  />
                                </div>
                                
                                <div className="space-y-2">
                                  <Label>Chapter Description (Optional)</Label>
                                  <Textarea
                                    value={chapter.description || ''}
                                    onChange={(e) => updateChapter(moduleIndex, chapterIndex, 'description', e.target.value)}
                                    placeholder="Brief chapter description"
                                    rows={2}
                                  />
                                </div>
                                
                                <Separator />
                                
                                {/* Lessons */}
                                <div className="space-y-4">
                                  <div className="flex items-center justify-between">
                                    <h5 className="font-medium">Lessons</h5>
                                    <Button
                                      size="sm"
                                      onClick={() => addLesson(moduleIndex, chapterIndex)}
                                      variant="outline"
                                    >
                                      <Plus className="w-4 h-4 mr-2" />
                                      Add Lesson
                                    </Button>
                                  </div>
                                  
                                  {chapter.lessons.map((lesson, lessonIndex) => (
                                    <div key={lesson._id} className="border-l-2 border-green-200 pl-4">
                                      <div className="flex items-center justify-between mb-2">
                                        <div className="flex items-center gap-2">
                                          <DragHandle
                                            onMoveUp={() => moveLesson(moduleIndex, chapterIndex, lessonIndex, 'up')}
                                            onMoveDown={() => moveLesson(moduleIndex, chapterIndex, lessonIndex, 'down')}
                                            canMoveUp={lessonIndex > 0}
                                            canMoveDown={lessonIndex < chapter.lessons.length - 1}
                                          />
                                          <h6 className="font-medium">Lesson {lessonIndex + 1}</h6>
                                          {lesson.isPreview && (
                                            <Badge variant="outline" className="text-xs">Preview</Badge>
                                          )}
                                        </div>
                                        <div className="flex gap-2">
                                          <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => removeLesson(moduleIndex, chapterIndex, lessonIndex)}
                                            disabled={chapter.lessons.length <= 1}
                                          >
                                            <Trash2 className="w-4 h-4" />
                                          </Button>
                                        </div>
                                      </div>
                                      
                                      <div className="space-y-4">
                                        <div className="space-y-2">
                                          <Label>Lesson Title *</Label>
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
                                          <Label>YouTube Video (Optional)</Label>
                                          <div className="flex gap-2">
                                            <Input
                                              value={lesson.videoSource?.videoId || ''}
                                              onChange={(e) => handleLessonYouTubeVideo(moduleIndex, chapterIndex, lessonIndex, e.target.value)}
                                              placeholder="https://youtube.com/watch?v=..."
                                            />
                                            {lesson.videoSource && (
                                              <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => updateLesson(moduleIndex, chapterIndex, lessonIndex, 'videoSource', undefined)}
                                              >
                                                <Trash2 className="w-4 h-4" />
                                              </Button>
                                            )}
                                          </div>
                                        </div>
                                        
                                        <div className="grid grid-cols-2 gap-4">
                                          <div className="space-y-2">
                                            <Label>Duration (minutes)</Label>
                                            <Input
                                              type="number"
                                              value={Math.round(lesson.duration / 60)}
                                              onChange={(e) => updateLesson(moduleIndex, chapterIndex, lessonIndex, 'duration', (parseInt(e.target.value) || 0) * 60)}
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
                                                Allow preview
                                              </span>
                                            </div>
                                          </div>
                                        </div>
                                        
                                        {/* Content */}
                                        <div className="space-y-2">
                                          <Label>Content (HTML/Markdown)</Label>
                                          <Textarea
                                            value={lesson.content || ''}
                                            onChange={(e) => updateLesson(moduleIndex, chapterIndex, lessonIndex, 'content', e.target.value)}
                                            placeholder="Additional lesson content"
                                            rows={3}
                                          />
                                        </div>
                                        
                                        {/* Resources */}
                                        <div className="space-y-3">
                                          <div className="flex items-center justify-between">
                                            <Label>Resources</Label>
                                            <Button
                                              type="button"
                                              size="sm"
                                              variant="outline"
                                              onClick={() => addResource(moduleIndex, chapterIndex, lessonIndex)}
                                            >
                                              <Plus className="w-4 h-4 mr-2" />
                                              Add Resource
                                            </Button>
                                          </div>
                                          
                                          {lesson.resources.map((resource, resourceIndex) => (
                                            <div key={resource._id} className="space-y-2 border p-3 rounded">
                                              <div className="flex justify-between">
                                                <Label className="text-sm">Resource {resourceIndex + 1}</Label>
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
                                        <div className="space-y-3">
                                          <div className="flex items-center justify-between">
                                            <Label>Sub-lessons</Label>
                                            <Button
                                              type="button"
                                              size="sm"
                                              variant="outline"
                                              onClick={() => addSubLesson(moduleIndex, chapterIndex, lessonIndex)}
                                            >
                                              <Plus className="w-4 h-4 mr-2" />
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
                                                  <Label>YouTube Video (Optional)</Label>
                                                  <div className="flex gap-2">
                                                    <Input
                                                      value={subLesson.videoSource?.videoId || ''}
                                                      onChange={(e) => handleSubLessonYouTubeVideo(moduleIndex, chapterIndex, lessonIndex, subLessonIndex, e.target.value)}
                                                      placeholder="https://youtube.com/watch?v=..."
                                                    />
                                                    {subLesson.videoSource && (
                                                      <Button
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={() => updateSubLesson(moduleIndex, chapterIndex, lessonIndex, subLessonIndex, 'videoSource', undefined)}
                                                      >
                                                        <Trash2 className="w-4 h-4" />
                                                      </Button>
                                                    )}
                                                  </div>
                                                </div>
                                                
                                                <div className="grid grid-cols-2 gap-4">
                                                  <div className="space-y-2">
                                                    <Label>Duration (minutes)</Label>
                                                    <Input
                                                      type="number"
                                                      value={Math.round(subLesson.duration / 60)}
                                                      onChange={(e) => updateSubLesson(moduleIndex, chapterIndex, lessonIndex, subLessonIndex, 'duration', (parseInt(e.target.value) || 0) * 60)}
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
                                                <div className="space-y-3">
                                                  <div className="flex items-center justify-between">
                                                    <Label>Resources</Label>
                                                    <Button
                                                      size="sm"
                                                      variant="outline"
                                                      onClick={() => addResource(moduleIndex, chapterIndex, lessonIndex, subLessonIndex)}
                                                    >
                                                      <Plus className="w-4 h-4 mr-2" />
                                                      Add Resource
                                                    </Button>
                                                  </div>
                                                  
                                                  {subLesson.resources.map((resource, resourceIndex) => (
                                                    <div key={resource._id} className="space-y-2 border p-3 rounded">
                                                      <div className="flex justify-between">
                                                        <Label className="text-sm">Resource {resourceIndex + 1}</Label>
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
          
          {/* Sidebar - 1 column */}
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
                    <Button type="button" onClick={addTag}>
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
                
                <div className="flex flex-wrap gap-2">
                  {courseData.tags.map((tag, index) => (
                    <Badge key={index} className="flex items-center gap-1">
                      {tag}
                      <button
                        type="button"
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
                    <Button type="button" onClick={addRequirement}>
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
                
                <div className="space-y-2">
                  {courseData.requirements.map((req, index) => (
                    <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                      <span className="text-sm">{req}</span>
                      <button
                        type="button"
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
                    <Button type="button" onClick={addOutcome}>
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
                
                <div className="space-y-2">
                  {courseData.learningOutcomes.map((outcome, index) => (
                    <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                      <span className="text-sm">{outcome}</span>
                      <button
                        type="button"
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
                    <p className="text-sm text-gray-500">Make course visible</p>
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
                    <p className="text-sm text-gray-500">Highlight on homepage</p>
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
                  <span className="text-gray-600">Chapters</span>
                  <span className="font-semibold">
                    {modules.reduce((acc, m) => acc + m.chapters.length, 0)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Lessons</span>
                  <span className="font-semibold">
                    {modules.reduce((acc, m) => 
                      acc + m.chapters.reduce((acc2, c) => acc2 + c.lessons.length, 0), 0
                    )}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Sub-lessons</span>
                  <span className="font-semibold">
                    {modules.reduce((acc, m) => 
                      acc + m.chapters.reduce((acc2, c) => 
                        acc2 + c.lessons.reduce((acc3, l) => acc3 + l.subLessons.length, 0), 0
                      ), 0
                    )}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Total Duration</span>
                  <span className="font-semibold">{calculateTotalDuration()}</span>
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