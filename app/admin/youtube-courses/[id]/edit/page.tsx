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
  Clock,
  ExternalLink,
  Youtube,
  FolderOpen,
  Image as ImageIcon
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
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

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

// Helper functions
const decodeParam = (param: string | string[]): string => {
  if (Array.isArray(param)) {
    return param[0] || ''
  }
  return param || ''
}

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

// Add Resource Dialog Component
function AddResourceDialog({ onAdd }: { onAdd: (resource: LessonResource) => void }) {
  const [type, setType] = useState<'pdf' | 'document' | 'link' | 'youtube'>('link')
  const [title, setTitle] = useState('')
  const [url, setUrl] = useState('')
  const [description, setDescription] = useState('')

  const handleSubmit = () => {
    if (!title.trim() || !url.trim()) {
      return
    }

    const resource: LessonResource = {
      _id: `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      title: title.trim(),
      url: url.trim(),
      type,
      description: description.trim() || undefined
    }

    onAdd(resource)
    setTitle('')
    setUrl('')
    setDescription('')
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Resource Type</Label>
        <Select value={type} onValueChange={(value: any) => setType(value)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="pdf">PDF</SelectItem>
            <SelectItem value="document">Document</SelectItem>
            <SelectItem value="link">Link</SelectItem>
            <SelectItem value="youtube">YouTube Video</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label>Title *</Label>
        <Input 
          value={title} 
          onChange={(e) => setTitle(e.target.value)} 
          placeholder="Resource title" 
        />
      </div>
      <div className="space-y-2">
        <Label>URL *</Label>
        <Input 
          value={url} 
          onChange={(e) => setUrl(e.target.value)} 
          placeholder="Resource URL" 
        />
      </div>
      <div className="space-y-2">
        <Label>Description (Optional)</Label>
        <Textarea 
          value={description} 
          onChange={(e) => setDescription(e.target.value)} 
          placeholder="Resource description" 
          rows={2}
        />
      </div>
      <DialogFooter>
        <Button type="button" onClick={handleSubmit}>Add Resource</Button>
      </DialogFooter>
    </div>
  )
}

// Main component
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
  const [thumbnailError, setThumbnailError] = useState(false)
  
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
  
  const [expandedModules, setExpandedModules] = useState<string[]>([])
  const [expandedChapters, setExpandedChapters] = useState<string[]>([])
  const [expandedLessons, setExpandedLessons] = useState<string[]>([])
  
  const [youtubeUrl, setYoutubeUrl] = useState('')
  const [youtubeVideoInfo, setYoutubeVideoInfo] = useState<YouTubeVideo | null>(null)
  const [youtubeLoading, setYoutubeLoading] = useState(false)
  
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
      setThumbnailError(false)
      
      if (!courseId || courseId.trim() === '') {
        throw new Error('Course ID is required')
      }
      
      const response = await fetch(`/api/admin/youtube-courses/${encodeURIComponent(courseId)}`)
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || `Failed to load course (HTTP ${response.status})`)
      }
      
      const data = await response.json()
      
      if (!data._id) {
        throw new Error('Invalid course data received')
      }
      
      setCourse(data)
      
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
      
      setModules(data.modules || [])
      
      if (data.modules && data.modules.length > 0) {
        setExpandedModules([data.modules[0]._id])
      }
      
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

  const generateId = () => `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

  const fetchYouTubeInfo = async (videoId: string) => {
    try {
      setYoutubeLoading(true)
      
      const videoInfo: YouTubeVideo = {
        type: 'youtube',
        videoId,
        url: `https://www.youtube.com/watch?v=${videoId}`,
        thumbnailUrl: getYouTubeThumbnail(videoId, 'maxresdefault'),
        duration: 0
      }
      
      setYoutubeVideoInfo(videoInfo)
      return videoInfo
      
    } catch (error) {
      console.error('Error fetching YouTube info:', error)
      toast({
        title: 'Error',
        description: 'Could not fetch YouTube video information',
        variant: 'destructive'
      })
      return null
    } finally {
      setYoutubeLoading(false)
    }
  }

  const handleYouTubeUrlSubmit = async () => {
    if (!youtubeUrl.trim()) return
    
    const videoId = extractYouTubeVideoId(youtubeUrl)
    if (!videoId) {
      toast({
        title: 'Invalid URL',
        description: 'Please enter a valid YouTube URL',
        variant: 'destructive'
      })
      return
    }
    
    const videoInfo = await fetchYouTubeInfo(videoId)
    if (videoInfo) {
      setCourseData(prev => ({
        ...prev,
        previewVideo: videoInfo
      }))
      setYoutubeUrl('')
      toast({
        title: 'Success',
        description: 'YouTube video added as preview',
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
        title: 'Invalid URL',
        description: 'Please enter a valid YouTube URL',
        variant: 'destructive'
      })
      return null
    }
    
    const videoInfo = await fetchYouTubeInfo(videoId)
    if (videoInfo) {
      updateLesson(moduleIndex, chapterIndex, lessonIndex, 'videoSource', videoInfo)
      return videoInfo
    }
    return null
  }

  const autoFillThumbnailFromYouTube = (url: string) => {
    const videoId = extractYouTubeVideoId(url)
    if (videoId && !courseData.thumbnail.trim()) {
      const thumbnailUrl = getYouTubeThumbnail(videoId, 'maxresdefault')
      setCourseData(prev => ({
        ...prev,
        thumbnail: thumbnailUrl
      }))
      setThumbnailError(false)
      toast({
        title: 'Thumbnail Auto-filled',
        description: 'YouTube thumbnail has been set as course thumbnail',
        variant: 'default'
      })
    }
  }

  const handleSubmit = async () => {
    if (!course) return
    
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
    
    if (modules.length === 0) {
      toast({
        title: 'Validation Error',
        description: 'Course must have at least one module',
        variant: 'destructive'
      })
      return
    }
    
    for (const module of modules) {
      if (!module.title.trim()) {
        toast({
          title: 'Validation Error',
          description: `Module ${module.order + 1} title is required`,
          variant: 'destructive'
        })
        return
      }
      
      if (module.chapters.length === 0) {
        toast({
          title: 'Validation Error',
          description: `Module "${module.title}" must have at least one chapter`,
          variant: 'destructive'
        })
        return
      }
      
      for (const chapter of module.chapters) {
        if (!chapter.title.trim()) {
          toast({
            title: 'Validation Error',
            description: `Chapter ${chapter.order + 1} title is required`,
            variant: 'destructive'
          })
          return
        }
        
        if (chapter.lessons.length === 0) {
          toast({
            title: 'Validation Error',
            description: `Chapter "${chapter.title}" must have at least one lesson`,
            variant: 'destructive'
          })
          return
        }
        
        for (const lesson of chapter.lessons) {
          if (!lesson.title.trim()) {
            toast({
              title: 'Validation Error',
              description: `Lesson ${lesson.order + 1} title is required`,
              variant: 'destructive'
            })
            return
          }
        }
      }
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

  const addResourceToLesson = (
    moduleIndex: number,
    chapterIndex: number,
    lessonIndex: number,
    resource: LessonResource
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
                resources: [...lesson.resources, { ...resource, _id: generateId() }]
              }
            })
          }
        })
      }
    }))
  }

  const removeResourceFromLesson = (
    moduleIndex: number,
    chapterIndex: number,
    lessonIndex: number,
    resourceIndex: number
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
                resources: lesson.resources.filter((_, r) => r !== resourceIndex)
              }
            })
          }
        })
      }
    }))
  }

  const addSubLesson = (
    moduleIndex: number,
    chapterIndex: number,
    lessonIndex: number
  ) => {
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading course...</p>
        </div>
      </div>
    )
  }

  if (error || !course) {
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
            <AlertDescription>
              {error || 'Course not found'}
            </AlertDescription>
          </Alert>
          
          <Card>
            <CardContent className="p-6 text-center">
              <Button onClick={() => router.push('/admin/youtube-courses')}>
                Go to Courses List
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              onClick={() => router.push(`/admin/youtube-courses/${course._id}`)}
              className="mr-2"
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold">Edit Course</h1>
              <p className="text-gray-600">{courseData.title}</p>
            </div>
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
              className="gap-2"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Save Changes
                </>
              )}
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
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => window.open(courseData.thumbnail, '_blank')}
                      disabled={!courseData.thumbnail}
                    >
                      <ExternalLink className="w-4 h-4" />
                    </Button>
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
                {courseData.previewVideo ? (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Youtube className="w-5 h-5 text-red-600" />
                        <span className="font-medium">{courseData.previewVideo.videoId}</span>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setCourseData(prev => ({ ...prev, previewVideo: undefined }))}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                    <div className="aspect-video rounded-lg overflow-hidden border">
                      <iframe
                        src={`https://www.youtube.com/embed/${courseData.previewVideo.videoId}`}
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
                        value={youtubeUrl}
                        onChange={(e) => setYoutubeUrl(e.target.value)}
                        placeholder="https://www.youtube.com/watch?v=..."
                        disabled={youtubeLoading}
                      />
                      <Button
                        type="button"
                        onClick={handleYouTubeUrlSubmit}
                        disabled={youtubeLoading}
                      >
                        {youtubeLoading ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Plus className="w-4 h-4" />
                        )}
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
                  <FolderOpen className="w-5 h-5" />
                  Course Content ({modules.length} modules)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Accordion
                  type="multiple"
                  value={expandedModules}
                  onValueChange={setExpandedModules}
                  className="space-y-4"
                >
                  {modules.map((module, moduleIndex) => (
                    <AccordionItem key={module._id} value={module._id} className="border rounded-lg">
                      <div className="flex items-center justify-between px-4 py-2 bg-gray-50 border-b">
                        <div className="flex items-center gap-3">
                          <DragHandle
                            onMoveUp={() => moveModule(moduleIndex, 'up')}
                            onMoveDown={() => moveModule(moduleIndex, 'down')}
                            canMoveUp={moduleIndex > 0}
                            canMoveDown={moduleIndex < modules.length - 1}
                          />
                          <div className="text-left">
                            <h3 className="font-semibold">Module {moduleIndex + 1}: {module.title}</h3>
                            {module.description && (
                              <p className="text-sm text-gray-600 truncate">{module.description}</p>
                            )}
                            <p className="text-xs text-gray-500">
                              {module.chapters?.length || 0} chapters, 
                              {' '}{module.chapters?.reduce((acc, ch) => acc + (ch.lessons?.length || 0), 0)} lessons
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => removeModule(moduleIndex)}
                            disabled={modules.length <= 1}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                      
                      <AccordionTrigger className="px-4 hover:no-underline">
                        <div className="flex items-center gap-2 text-sm font-medium">
                          Click to {expandedModules.includes(module._id) ? 'collapse' : 'expand'} module details
                        </div>
                      </AccordionTrigger>
                      
                      <AccordionContent className="px-4 pb-4">
                        <div className="space-y-4 pt-4">
                          {/* Module Details */}
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
                                type="button"
                                size="sm"
                                onClick={() => addChapter(moduleIndex)}
                                variant="outline"
                              >
                                <Plus className="w-4 h-4 mr-2" />
                                Add Chapter
                              </Button>
                            </div>
                            
                            <Accordion
                              type="multiple"
                              value={expandedChapters}
                              onValueChange={setExpandedChapters}
                              className="space-y-3"
                            >
                              {module.chapters.map((chapter, chapterIndex) => (
                                <AccordionItem 
                                  key={chapter._id} 
                                  value={chapter._id} 
                                  className="border rounded-lg"
                                >
                                  <div className="flex items-center justify-between px-3 py-2 bg-gray-50 border-b">
                                    <div className="flex items-center gap-3">
                                      <DragHandle
                                        onMoveUp={() => moveChapter(moduleIndex, chapterIndex, 'up')}
                                        onMoveDown={() => moveChapter(moduleIndex, chapterIndex, 'down')}
                                        canMoveUp={chapterIndex > 0}
                                        canMoveDown={chapterIndex < module.chapters.length - 1}
                                      />
                                      <div className="text-left">
                                        <h4 className="font-medium">Chapter {chapterIndex + 1}: {chapter.title}</h4>
                                        <p className="text-xs text-gray-500">
                                          {chapter.lessons?.length || 0} lessons
                                        </p>
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <Button
                                        type="button"
                                        size="sm"
                                        variant="outline"
                                        onClick={() => removeChapter(moduleIndex, chapterIndex)}
                                        disabled={module.chapters.length <= 1}
                                      >
                                        <Trash2 className="w-4 h-4" />
                                      </Button>
                                    </div>
                                  </div>
                                  
                                  <AccordionTrigger className="px-3 hover:no-underline">
                                    <div className="flex items-center gap-2 text-sm font-medium">
                                      Click to {expandedChapters.includes(chapter._id) ? 'collapse' : 'expand'} chapter details
                                    </div>
                                  </AccordionTrigger>
                                  
                                  <AccordionContent className="px-3 pb-3">
                                    <div className="space-y-4 pt-4">
                                      {/* Chapter Details */}
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
                                            type="button"
                                            size="sm"
                                            onClick={() => addLesson(moduleIndex, chapterIndex)}
                                            variant="outline"
                                          >
                                            <Plus className="w-4 h-4 mr-2" />
                                            Add Lesson
                                          </Button>
                                        </div>
                                        
                                        <Accordion
                                          type="multiple"
                                          value={expandedLessons}
                                          onValueChange={setExpandedLessons}
                                          className="space-y-3"
                                        >
                                          {chapter.lessons.map((lesson, lessonIndex) => (
                                            <AccordionItem 
                                              key={lesson._id} 
                                              value={lesson._id} 
                                              className="border rounded-lg"
                                            >
                                              <div className="flex items-center justify-between px-3 py-2 bg-gray-50 border-b">
                                                <div className="flex items-center gap-3">
                                                  <DragHandle
                                                    onMoveUp={() => moveLesson(moduleIndex, chapterIndex, lessonIndex, 'up')}
                                                    onMoveDown={() => moveLesson(moduleIndex, chapterIndex, lessonIndex, 'down')}
                                                    canMoveUp={lessonIndex > 0}
                                                    canMoveDown={lessonIndex < chapter.lessons.length - 1}
                                                  />
                                                  <div className="text-left">
                                                    <div className="flex items-center gap-2">
                                                      <h5 className="font-medium">Lesson {lessonIndex + 1}: {lesson.title}</h5>
                                                      {lesson.isPreview && (
                                                        <Badge variant="outline" className="text-xs">
                                                          Preview
                                                        </Badge>
                                                      )}
                                                    </div>
                                                    <div className="flex items-center gap-2 text-xs text-gray-500">
                                                      {lesson.videoSource ? (
                                                        <>
                                                          <Youtube className="w-3 h-3 text-red-600" />
                                                          <span>YouTube Video</span>
                                                        </>
                                                      ) : (
                                                        <span>No video</span>
                                                      )}
                                                      {lesson.duration > 0 && (
                                                        <>
                                                          <Clock className="w-3 h-3" />
                                                          <span>{Math.round(lesson.duration / 60)} min</span>
                                                        </>
                                                      )}
                                                    </div>
                                                  </div>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                  <Switch
                                                    checked={lesson.isPreview}
                                                    onCheckedChange={(checked) => 
                                                      updateLesson(moduleIndex, chapterIndex, lessonIndex, 'isPreview', checked)
                                                    }
                                                    className="scale-75"
                                                  />
                                                  <Button
                                                    type="button"
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() => removeLesson(moduleIndex, chapterIndex, lessonIndex)}
                                                    disabled={chapter.lessons.length <= 1}
                                                  >
                                                    <Trash2 className="w-4 h-4" />
                                                  </Button>
                                                </div>
                                              </div>
                                              
                                              <AccordionTrigger className="px-3 hover:no-underline">
                                                <div className="flex items-center gap-2 text-sm font-medium">
                                                  Click to {expandedLessons.includes(lesson._id) ? 'collapse' : 'expand'} lesson details
                                                </div>
                                              </AccordionTrigger>
                                              
                                              <AccordionContent className="px-3 pb-3">
                                                <div className="space-y-4 pt-4">
                                                  {/* Lesson Details */}
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
                                                      rows={3}
                                                    />
                                                  </div>
                                                  
                                                  {/* YouTube Video */}
                                                  <div className="space-y-2">
                                                    <Label>YouTube Video</Label>
                                                    <div className="flex gap-2">
                                                      <Input
                                                        placeholder="Paste YouTube URL"
                                                        onBlur={(e) => {
                                                          if (e.target.value.trim()) {
                                                            handleLessonYouTubeVideo(moduleIndex, chapterIndex, lessonIndex, e.target.value)
                                                          }
                                                        }}
                                                        onKeyPress={(e) => {
                                                          if (e.key === 'Enter') {
                                                            handleLessonYouTubeVideo(moduleIndex, chapterIndex, lessonIndex, e.currentTarget.value)
                                                          }
                                                        }}
                                                      />
                                                      {lesson.videoSource && (
                                                        <Button
                                                          type="button"
                                                          variant="outline"
                                                          size="sm"
                                                          onClick={() => updateLesson(moduleIndex, chapterIndex, lessonIndex, 'videoSource', undefined)}
                                                        >
                                                          <Trash2 className="w-4 h-4" />
                                                        </Button>
                                                      )}
                                                    </div>
                                                    {lesson.videoSource && (
                                                      <div className="mt-2">
                                                        <div className="aspect-video rounded-lg overflow-hidden border">
                                                          <iframe
                                                            src={`https://www.youtube.com/embed/${lesson.videoSource.videoId}`}
                                                            className="w-full h-full"
                                                            allowFullScreen
                                                          />
                                                        </div>
                                                        <p className="text-xs text-gray-600 mt-1">
                                                          Video ID: {lesson.videoSource.videoId}
                                                        </p>
                                                      </div>
                                                    )}
                                                  </div>
                                                  
                                                  {/* Duration */}
                                                  <div className="space-y-2">
                                                    <Label>Duration (minutes)</Label>
                                                    <Input
                                                      type="number"
                                                      value={Math.round(lesson.duration / 60)}
                                                      onChange={(e) => updateLesson(moduleIndex, chapterIndex, lessonIndex, 'duration', (parseInt(e.target.value) || 0) * 60)}
                                                      placeholder="Duration in minutes"
                                                      min="0"
                                                    />
                                                  </div>
                                                  
                                                  {/* Content */}
                                                  <div className="space-y-2">
                                                    <Label>Content (HTML/Markdown)</Label>
                                                    <Textarea
                                                      value={lesson.content || ''}
                                                      onChange={(e) => updateLesson(moduleIndex, chapterIndex, lessonIndex, 'content', e.target.value)}
                                                      placeholder="Additional lesson content"
                                                      rows={4}
                                                    />
                                                  </div>
                                                  
                                                  {/* Resources */}
                                                  <div className="space-y-3">
                                                    <div className="flex items-center justify-between">
                                                      <Label>Resources</Label>
                                                      <Dialog>
                                                        <DialogTrigger asChild>
                                                          <Button type="button" size="sm" variant="outline">
                                                            <Plus className="w-4 h-4 mr-2" />
                                                            Add Resource
                                                          </Button>
                                                        </DialogTrigger>
                                                        <DialogContent>
                                                          <DialogHeader>
                                                            <DialogTitle>Add Resource</DialogTitle>
                                                          </DialogHeader>
                                                          <AddResourceDialog
                                                            onAdd={(resource) => {
                                                              addResourceToLesson(moduleIndex, chapterIndex, lessonIndex, resource)
                                                            }}
                                                          />
                                                        </DialogContent>
                                                      </Dialog>
                                                    </div>
                                                    
                                                    {lesson.resources.length > 0 ? (
                                                      <div className="space-y-2">
                                                        {lesson.resources.map((resource, resourceIndex) => (
                                                          <div key={resource._id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                                                            <div className="flex items-center gap-2">
                                                              {resource.type === 'pdf' && <FileText className="w-4 h-4" />}
                                                              {resource.type === 'youtube' && <Youtube className="w-4 h-4 text-red-600" />}
                                                              {resource.type === 'link' && <Link className="w-4 h-4" />}
                                                              {resource.type === 'document' && <FileText className="w-4 h-4" />}
                                                              <span className="text-sm">{resource.title}</span>
                                                            </div>
                                                            <Button
                                                              type="button"
                                                              size="sm"
                                                              variant="ghost"
                                                              onClick={() => removeResourceFromLesson(moduleIndex, chapterIndex, lessonIndex, resourceIndex)}
                                                            >
                                                              <Trash2 className="w-4 h-4" />
                                                            </Button>
                                                          </div>
                                                        ))}
                                                      </div>
                                                    ) : (
                                                      <p className="text-sm text-gray-500">No resources added</p>
                                                    )}
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
                                                    {lesson.subLessons.length > 0 ? (
                                                      <div className="space-y-2">
                                                        {lesson.subLessons.map((subLesson, subIndex) => (
                                                          <div key={subLesson._id} className="p-2 bg-gray-50 rounded">
                                                            <div className="flex items-center justify-between">
                                                              <span className="text-sm">{subLesson.title}</span>
                                                              <Button 
                                                                type="button"
                                                                size="sm" 
                                                                variant="ghost"
                                                                onClick={() => {
                                                                  setModules(prev => prev.map((m, mi) => {
                                                                    if (mi !== moduleIndex) return m
                                                                    return {
                                                                      ...m,
                                                                      chapters: m.chapters.map((c, ci) => {
                                                                        if (ci !== chapterIndex) return c
                                                                        return {
                                                                          ...c,
                                                                          lessons: c.lessons.map((l, li) => {
                                                                            if (li !== lessonIndex) return l
                                                                            return {
                                                                              ...l,
                                                                              subLessons: l.subLessons.filter((_, s) => s !== subIndex)
                                                                            }
                                                                          })
                                                                        }
                                                                      })
                                                                    }
                                                                  }))
                                                                }}
                                                              >
                                                                <Trash2 className="w-4 h-4" />
                                                              </Button>
                                                            </div>
                                                          </div>
                                                        ))}
                                                      </div>
                                                    ) : (
                                                      <p className="text-sm text-gray-500">No sub-lessons added</p>
                                                    )}
                                                  </div>
                                                </div>
                                              </AccordionContent>
                                            </AccordionItem>
                                          ))}
                                        </Accordion>
                                      </div>
                                    </div>
                                  </AccordionContent>
                                </AccordionItem>
                              ))}
                            </Accordion>
                          </div>
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
                
                <Button
                  type="button"
                  onClick={addModule}
                  variant="outline"
                  className="w-full mt-4"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Module
                </Button>
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
            
            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button
                  type="button"
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => {
                    toast({
                      title: 'Coming Soon',
                      description: 'Duplicate feature is in development',
                    })
                  }}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Duplicate Course
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => {
                    toast({
                      title: 'Coming Soon',
                      description: 'Export feature is in development',
                    })
                  }}
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Export Content
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => {
                    window.open(`/courses/${course.slug}`, '_blank')
                  }}
                >
                  <Eye className="w-4 h-4 mr-2" />
                  Preview Course
                </Button>
              </CardContent>
            </Card>
            
            {/* Course Information */}
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