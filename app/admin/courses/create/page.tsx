// app/admin/courses/create/page.tsx
'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { 
  Plus, 
  Trash2, 
  Upload, 
  X, 
  Save, 
  BookOpen,
  Video,
  Image,
  FileText,
  Clock,
  Users,
  Star,
  Eye,
  EyeOff,
  Play,
  CheckCircle,
  AlertCircle
} from 'lucide-react'

interface CloudinaryAsset {
  public_id: string
  secure_url: string
  format: string
  resource_type: 'image' | 'video'
  width?: number
  height?: number
  duration?: number
  bytes: number
}

interface UploadProgress {
  [key: string]: {
    progress: number
    fileName: string
    type: 'thumbnail' | 'previewVideo' | 'lessonVideo'
  }
}

interface Lesson {
  title: string
  description: string
  content: string
  video?: CloudinaryAsset
  duration: number
  isPreview: boolean
  resources: {
    title: string
    url: string
    type: 'pdf' | 'document' | 'link' | 'video'
  }[]
  order: number
}

interface Module {
  title: string
  description: string
  lessons: Lesson[]
  order: number
}

// Cloudinary configuration
const CLOUDINARY_CONFIG = {
  cloudName: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME!,
  uploadPreset: 'sutra_courses',
}

// Direct Cloudinary upload function
const uploadToCloudinary = async (
  file: File, 
  type: 'thumbnail' | 'previewVideo' | 'lessonVideo',
  onProgress?: (progress: number) => void
): Promise<any> => {
  return new Promise((resolve, reject) => {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('upload_preset', CLOUDINARY_CONFIG.uploadPreset)
    formData.append('folder', `sutra-courses/${type}s`)
    
    // Set resource type
    if (type !== 'thumbnail') {
      formData.append('resource_type', 'video')
    }

    const xhr = new XMLHttpRequest()

    // Progress tracking
    xhr.upload.addEventListener('progress', (event) => {
      if (event.lengthComputable && onProgress) {
        const progress = (event.loaded / event.total) * 100
        onProgress(Math.round(progress))
      }
    })

    // Load completion
    xhr.addEventListener('load', () => {
      if (xhr.status === 200) {
        const response = JSON.parse(xhr.responseText)
        resolve(response)
      } else {
        reject(new Error('Upload failed'))
      }
    })

    // Error handling
    xhr.addEventListener('error', () => {
      reject(new Error('Upload failed'))
    })

    xhr.open(
      'POST',
      `https://api.cloudinary.com/v1_1/${CLOUDINARY_CONFIG.cloudName}/${
        type === 'thumbnail' ? 'image' : 'video'
      }/upload`
    )
    xhr.send(formData)
  })
}

export default function CreateCoursePage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState<UploadProgress>({})
  const thumbnailInputRef = useRef<HTMLInputElement>(null)
  const videoInputRef = useRef<HTMLInputElement>(null)
  const lessonVideoInputRefs = useRef<{ [key: string]: HTMLInputElement | null }>({})

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    shortDescription: '',
    price: 0,
    isFree: false,
    level: 'beginner' as 'beginner' | 'intermediate' | 'advanced',
    category: '',
    tags: [] as string[],
    thumbnail: null as CloudinaryAsset | null,
    previewVideo: null as CloudinaryAsset | null,
    modules: [] as Module[],
    requirements: [] as string[],
    learningOutcomes: [] as string[],
    isFeatured: false
  })

  const [newTag, setNewTag] = useState('')
  const [newRequirement, setNewRequirement] = useState('')
  const [newOutcome, setNewOutcome] = useState('')

  // Enhanced File Upload Handler with Direct Cloudinary Upload
  const handleFileUpload = async (
    file: File, 
    type: 'thumbnail' | 'previewVideo' | 'lessonVideo', 
    moduleIndex?: number, 
    lessonIndex?: number
  ) => {
    const uploadId = type === 'lessonVideo' ? `lesson-${moduleIndex}-${lessonIndex}` : type
    
    try {
      setUploadProgress(prev => ({
        ...prev,
        [uploadId]: { progress: 0, fileName: file.name, type }
      }))

      // Validate file size
      const maxSize = type === 'thumbnail' ? 5 * 1024 * 1024 : 100 * 1024 * 1024
      if (file.size > maxSize) {
        throw new Error(`File too large. Maximum size: ${maxSize / 1024 / 1024}MB`)
      }

      // Upload directly to Cloudinary
      const result = await uploadToCloudinary(file, type, (progress) => {
        setUploadProgress(prev => ({
          ...prev,
          [uploadId]: { ...prev[uploadId], progress }
        }))
      })

      // Transform Cloudinary response to our asset format
      const asset: CloudinaryAsset = {
        public_id: result.public_id,
        secure_url: result.secure_url,
        format: result.format,
        resource_type: type === 'thumbnail' ? 'image' : 'video',
        width: result.width,
        height: result.height,
        duration: result.duration,
        bytes: result.bytes
      }

      // Update form data based on upload type
      if (type === 'thumbnail') {
        setFormData(prev => ({
          ...prev,
          thumbnail: asset
        }))
      } else if (type === 'previewVideo') {
        setFormData(prev => ({
          ...prev,
          previewVideo: asset
        }))
      } else if (type === 'lessonVideo' && moduleIndex !== undefined && lessonIndex !== undefined) {
        const updatedModules = [...formData.modules]
        updatedModules[moduleIndex].lessons[lessonIndex].video = asset
        // Auto-set duration from video metadata
        if (asset.duration) {
          updatedModules[moduleIndex].lessons[lessonIndex].duration = Math.round(asset.duration / 60)
        }
        setFormData(prev => ({ ...prev, modules: updatedModules }))
      }

      // Clear progress after success
      setTimeout(() => {
        setUploadProgress(prev => {
          const newProgress = { ...prev }
          delete newProgress[uploadId]
          return newProgress
        })
      }, 2000)

    } catch (error) {
      console.error('Error uploading file:', error)
      setUploadProgress(prev => {
        const newProgress = { ...prev }
        delete newProgress[uploadId]
        return newProgress
      })
      
      const errorMessage = error instanceof Error ? error.message : 'Failed to upload file. Please try again.'
      alert(errorMessage)
    }
  }

  const handleThumbnailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      handleFileUpload(file, 'thumbnail')
    }
  }

  const handlePreviewVideoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      handleFileUpload(file, 'previewVideo')
    }
  }

  const handleLessonVideoChange = (e: React.ChangeEvent<HTMLInputElement>, moduleIndex: number, lessonIndex: number) => {
    const file = e.target.files?.[0]
    if (file) {
      handleFileUpload(file, 'lessonVideo', moduleIndex, lessonIndex)
    }
  }

  // Tag Management
  const addTag = () => {
    if (newTag.trim() && !formData.tags.includes(newTag.trim())) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, newTag.trim()]
      }))
      setNewTag('')
    }
  }

  const removeTag = (tagToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }))
  }

  // Requirements & Outcomes
  const addRequirement = () => {
    if (newRequirement.trim()) {
      setFormData(prev => ({
        ...prev,
        requirements: [...prev.requirements, newRequirement.trim()]
      }))
      setNewRequirement('')
    }
  }

  const removeRequirement = (index: number) => {
    setFormData(prev => ({
      ...prev,
      requirements: prev.requirements.filter((_, i) => i !== index)
    }))
  }

  const addOutcome = () => {
    if (newOutcome.trim()) {
      setFormData(prev => ({
        ...prev,
        learningOutcomes: [...prev.learningOutcomes, newOutcome.trim()]
      }))
      setNewOutcome('')
    }
  }

  const removeOutcome = (index: number) => {
    setFormData(prev => ({
      ...prev,
      learningOutcomes: prev.learningOutcomes.filter((_, i) => i !== index)
    }))
  }

  // Module Management
  const addModule = () => {
    setFormData(prev => ({
      ...prev,
      modules: [...prev.modules, {
        title: '',
        description: '',
        lessons: [],
        order: prev.modules.length
      }]
    }))
  }

  const removeModule = (moduleIndex: number) => {
    setFormData(prev => ({
      ...prev,
      modules: prev.modules.filter((_, index) => index !== moduleIndex)
    }))
  }

  const addLesson = (moduleIndex: number) => {
    const updatedModules = [...formData.modules]
    updatedModules[moduleIndex].lessons.push({
      title: '',
      description: '',
      content: '',
      duration: 0,
      isPreview: false,
      resources: [],
      order: updatedModules[moduleIndex].lessons.length
    })
    setFormData(prev => ({ ...prev, modules: updatedModules }))
  }

  const removeLesson = (moduleIndex: number, lessonIndex: number) => {
    const updatedModules = [...formData.modules]
    updatedModules[moduleIndex].lessons = updatedModules[moduleIndex].lessons.filter(
      (_, index) => index !== lessonIndex
    )
    setFormData(prev => ({ ...prev, modules: updatedModules }))
  }

  const addResource = (moduleIndex: number, lessonIndex: number) => {
    const updatedModules = [...formData.modules]
    updatedModules[moduleIndex].lessons[lessonIndex].resources.push({
      title: '',
      url: '',
      type: 'pdf'
    })
    setFormData(prev => ({ ...prev, modules: updatedModules }))
  }

  const removeResource = (moduleIndex: number, lessonIndex: number, resourceIndex: number) => {
    const updatedModules = [...formData.modules]
    updatedModules[moduleIndex].lessons[lessonIndex].resources = 
      updatedModules[moduleIndex].lessons[lessonIndex].resources.filter(
        (_, index) => index !== resourceIndex
      )
    setFormData(prev => ({ ...prev, modules: updatedModules }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      // Validate required fields
      if (!formData.thumbnail) {
        alert('Please upload a course thumbnail')
        return
      }

      // Validate all lessons have videos
      const missingVideos = formData.modules.some(module => 
        module.lessons.some(lesson => !lesson.video)
      )

      if (missingVideos) {
        alert('All lessons must have a video uploaded')
        return
      }

      const response = await fetch('/api/admin/courses', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      })

      if (response.ok) {
        router.push('/admin/courses')
        router.refresh()
      } else {
        const error = await response.json()
        alert(error.error || 'Failed to create course')
      }
    } catch (error) {
      console.error('Error creating course:', error)
      alert('Failed to create course. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  // Calculate totals
  const totalDuration = formData.modules.reduce((total, module) => {
    return total + module.lessons.reduce((moduleTotal, lesson) => moduleTotal + lesson.duration, 0)
  }, 0)

  const totalLessons = formData.modules.reduce((total, module) => total + module.lessons.length, 0)

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-serif font-bold">Create New Course</h1>
          <p className="text-slate-600 dark:text-slate-400">
            Design and publish a comprehensive fashion course
          </p>
        </div>
        <Button 
          variant="outline" 
          className="rounded-2xl"
          onClick={() => router.back()}
        >
          Cancel
        </Button>
      </div>

      {/* Upload Status Banner */}
      {Object.keys(uploadProgress).length > 0 && (
        <Card className="rounded-2xl border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-900/20">
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <AlertCircle className="w-5 h-5 text-blue-600" />
              <div className="flex-1">
                <p className="text-sm font-medium text-blue-800 dark:text-blue-300">
                  Uploading files to Cloudinary...
                </p>
                <p className="text-xs text-blue-600 dark:text-blue-400">
                  {Object.values(uploadProgress).map(upload => 
                    `${upload.fileName} (${upload.progress}%)`
                  ).join(', ')}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Main Form */}
          <div className="lg:col-span-3 space-y-6">
            {/* Basic Information */}
            <Card className="rounded-2xl">
              <CardHeader>
                <CardTitle>Course Information</CardTitle>
                <CardDescription>
                  Basic details about your course
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-4">
                    <Input
                      placeholder="Course Title *"
                      value={formData.title}
                      onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                      className="rounded-2xl"
                      required
                    />
                    
                    <Textarea
                      placeholder="Short Description *"
                      value={formData.shortDescription}
                      onChange={(e) => setFormData(prev => ({ ...prev, shortDescription: e.target.value }))}
                      className="rounded-2xl min-h-[80px]"
                      required
                    />
                  </div>
                  
                  <div className="space-y-4">
                    <select
                      value={formData.level}
                      onChange={(e) => setFormData(prev => ({ 
                        ...prev, 
                        level: e.target.value as 'beginner' | 'intermediate' | 'advanced' 
                      }))}
                      className="w-full rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2"
                      required
                    >
                      <option value="beginner">Beginner</option>
                      <option value="intermediate">Intermediate</option>
                      <option value="advanced">Advanced</option>
                    </select>
                    
                    <Input
                      placeholder="Category *"
                      value={formData.category}
                      onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                      className="rounded-2xl"
                      required
                    />
                  </div>
                </div>

                <Textarea
                  placeholder="Full Description *"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  className="rounded-2xl min-h-[120px]"
                  required
                />

                {/* Tags */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Tags</label>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {formData.tags.map((tag, index) => (
                      <Badge key={index} variant="secondary" className="rounded-lg">
                        {tag}
                        <button
                          type="button"
                          onClick={() => removeTag(tag)}
                          className="ml-1 hover:text-red-500"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Add a tag"
                      value={newTag}
                      onChange={(e) => setNewTag(e.target.value)}
                      className="rounded-2xl flex-1"
                      onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                    />
                    <Button type="button" onClick={addTag} variant="outline" className="rounded-2xl">
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Media Uploads */}
            <Card className="rounded-2xl">
              <CardHeader>
                <CardTitle>Course Media</CardTitle>
                <CardDescription>
                  Upload thumbnail and preview video to Cloudinary
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Thumbnail Upload */}
                  <div className="space-y-4">
                    <label className="text-sm font-medium flex items-center space-x-2">
                      <Image className="w-4 h-4" />
                      <span>Course Thumbnail *</span>
                    </label>
                    
                    <input
                      ref={thumbnailInputRef}
                      type="file"
                      accept="image/jpeg,image/jpg,image/png,image/webp,image/gif"
                      onChange={handleThumbnailChange}
                      className="hidden"
                    />
                    
                    <div 
                      className="border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-2xl p-6 text-center cursor-pointer hover:border-rose-400 transition-colors"
                      onClick={() => thumbnailInputRef.current?.click()}
                    >
                      {formData.thumbnail ? (
                        <div className="space-y-2">
                          <img
                            src={formData.thumbnail.secure_url}
                            alt="Thumbnail preview"
                            className="w-32 h-32 object-cover rounded-xl mx-auto"
                          />
                          <p className="text-sm text-slate-600">Click to change</p>
                          <p className="text-xs text-slate-500">
                            {formatFileSize(formData.thumbnail.bytes)}
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <Image className="w-8 h-8 text-slate-400 mx-auto" />
                          <p className="text-sm font-medium">Upload Thumbnail</p>
                          <p className="text-xs text-slate-500">JPEG, PNG, WebP, GIF up to 5MB</p>
                        </div>
                      )}
                    </div>
                    
                    {uploadProgress.thumbnail && (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span>Uploading {uploadProgress.thumbnail.fileName}...</span>
                          <span>{uploadProgress.thumbnail.progress}%</span>
                        </div>
                        <Progress value={uploadProgress.thumbnail.progress} className="h-2" />
                      </div>
                    )}
                  </div>

                  {/* Preview Video Upload */}
                  <div className="space-y-4">
                    <label className="text-sm font-medium flex items-center space-x-2">
                      <Video className="w-4 h-4" />
                      <span>Preview Video (Optional)</span>
                    </label>
                    
                    <input
                      ref={videoInputRef}
                      type="file"
                      accept="video/mp4,video/webm,video/ogg,video/quicktime,video/x-msvideo"
                      onChange={handlePreviewVideoChange}
                      className="hidden"
                    />
                    
                    <div 
                      className="border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-2xl p-6 text-center cursor-pointer hover:border-rose-400 transition-colors"
                      onClick={() => videoInputRef.current?.click()}
                    >
                      {formData.previewVideo ? (
                        <div className="space-y-2">
                          <div className="relative">
                            <video className="w-32 h-32 object-cover rounded-xl mx-auto">
                              <source src={formData.previewVideo.secure_url} type={`video/${formData.previewVideo.format}`} />
                            </video>
                            <Play className="w-6 h-6 text-white absolute inset-0 m-auto" />
                          </div>
                          <p className="text-sm text-slate-600">Click to change</p>
                          <p className="text-xs text-slate-500">
                            {formatFileSize(formData.previewVideo.bytes)} • {formData.previewVideo.duration ? `${Math.round(formData.previewVideo.duration)}s` : ''}
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <Video className="w-8 h-8 text-slate-400 mx-auto" />
                          <p className="text-sm font-medium">Upload Preview Video</p>
                          <p className="text-xs text-slate-500">MP4, WebM, OGG up to 100MB</p>
                        </div>
                      )}
                    </div>
                    
                    {uploadProgress.previewVideo && (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span>Uploading {uploadProgress.previewVideo.fileName}...</span>
                          <span>{uploadProgress.previewVideo.progress}%</span>
                        </div>
                        <Progress value={uploadProgress.previewVideo.progress} className="h-2" />
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Requirements & Outcomes */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Requirements */}
              <Card className="rounded-2xl">
                <CardHeader>
                  <CardTitle className="text-lg">Requirements</CardTitle>
                  <CardDescription>
                    What students should know before taking this course
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {formData.requirements.map((requirement, index) => (
                    <div key={index} className="flex items-center space-x-2 p-2 bg-slate-50 dark:bg-slate-800 rounded-xl">
                      <div className="w-2 h-2 bg-rose-500 rounded-full flex-shrink-0"></div>
                      <span className="flex-1 text-sm">{requirement}</span>
                      <button
                        type="button"
                        onClick={() => removeRequirement(index)}
                        className="text-red-500 hover:text-red-600"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                  <div className="flex gap-2">
                    <Input
                      placeholder="Add a requirement"
                      value={newRequirement}
                      onChange={(e) => setNewRequirement(e.target.value)}
                      className="rounded-xl text-sm"
                      onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addRequirement())}
                    />
                    <Button type="button" onClick={addRequirement} variant="outline" size="sm" className="rounded-xl">
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Learning Outcomes */}
              <Card className="rounded-2xl">
                <CardHeader>
                  <CardTitle className="text-lg">Learning Outcomes</CardTitle>
                  <CardDescription>
                    What students will learn from this course
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {formData.learningOutcomes.map((outcome, index) => (
                    <div key={index} className="flex items-center space-x-2 p-2 bg-slate-50 dark:bg-slate-800 rounded-xl">
                      <div className="w-2 h-2 bg-green-500 rounded-full flex-shrink-0"></div>
                      <span className="flex-1 text-sm">{outcome}</span>
                      <button
                        type="button"
                        onClick={() => removeOutcome(index)}
                        className="text-red-500 hover:text-red-600"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                  <div className="flex gap-2">
                    <Input
                      placeholder="Add a learning outcome"
                      value={newOutcome}
                      onChange={(e) => setNewOutcome(e.target.value)}
                      className="rounded-xl text-sm"
                      onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addOutcome())}
                    />
                    <Button type="button" onClick={addOutcome} variant="outline" size="sm" className="rounded-xl">
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Course Content */}
            <Card className="rounded-2xl">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Course Content</CardTitle>
                    <CardDescription>
                      Add modules and lessons to your course
                    </CardDescription>
                  </div>
                  <Button type="button" onClick={addModule} variant="outline" className="rounded-2xl">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Module
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {formData.modules.map((module, moduleIndex) => (
                  <div key={moduleIndex} className="border border-slate-200 dark:border-slate-700 rounded-2xl p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center space-x-3 flex-1">
                        <div className="w-8 h-8 bg-rose-100 dark:bg-rose-900/30 rounded-lg flex items-center justify-center text-rose-600 font-bold text-sm">
                          {moduleIndex + 1}
                        </div>
                        <Input
                          placeholder="Module Title *"
                          value={module.title}
                          onChange={(e) => {
                            const updatedModules = [...formData.modules]
                            updatedModules[moduleIndex].title = e.target.value
                            setFormData(prev => ({ ...prev, modules: updatedModules }))
                          }}
                          className="rounded-2xl flex-1"
                          required
                        />
                      </div>
                      <Button 
                        type="button" 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => removeModule(moduleIndex)}
                        className="text-red-500 rounded-2xl hover:text-red-600 hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                    
                    <Textarea
                      placeholder="Module Description *"
                      value={module.description}
                      onChange={(e) => {
                        const updatedModules = [...formData.modules]
                        updatedModules[moduleIndex].description = e.target.value
                        setFormData(prev => ({ ...prev, modules: updatedModules }))
                      }}
                      className="rounded-2xl mb-4"
                      required
                    />
                    
                    <div className="space-y-4">
                      {module.lessons.map((lesson, lessonIndex) => {
                        const uploadId = `lesson-${moduleIndex}-${lessonIndex}`
                        const currentUploadProgress = uploadProgress[uploadId]
                        
                        return (
                          <div key={lessonIndex} className="border border-slate-200 dark:border-slate-600 rounded-2xl p-4">
                            <div className="flex items-center justify-between mb-3">
                              <div className="flex items-center space-x-3 flex-1">
                                <div className="w-6 h-6 bg-slate-100 dark:bg-slate-700 rounded-md flex items-center justify-center text-slate-600 dark:text-slate-400 font-bold text-xs">
                                  {lessonIndex + 1}
                                </div>
                                <Input
                                  placeholder="Lesson Title *"
                                  value={lesson.title}
                                  onChange={(e) => {
                                    const updatedModules = [...formData.modules]
                                    updatedModules[moduleIndex].lessons[lessonIndex].title = e.target.value
                                    setFormData(prev => ({ ...prev, modules: updatedModules }))
                                  }}
                                  className="rounded-2xl flex-1"
                                  required
                                />
                              </div>
                              <Button 
                                type="button" 
                                variant="ghost" 
                                size="icon"
                                onClick={() => removeLesson(moduleIndex, lessonIndex)}
                                className="text-red-500 rounded-2xl hover:text-red-600 hover:bg-red-50"
                              >
                                <X className="w-4 h-4" />
                              </Button>
                            </div>

                            <Textarea
                              placeholder="Lesson Description *"
                              value={lesson.description}
                              onChange={(e) => {
                                const updatedModules = [...formData.modules]
                                updatedModules[moduleIndex].lessons[lessonIndex].description = e.target.value
                                setFormData(prev => ({ ...prev, modules: updatedModules }))
                              }}
                              className="rounded-2xl mb-3 min-h-[60px]"
                              required
                            />

                            {/* Video Upload */}
                            <div className="mb-3">
                              <label className="text-sm font-medium mb-2 block">Lesson Video *</label>
                              
                              <input
                                ref={el => {
  lessonVideoInputRefs.current[uploadId] = el;
}}
                                type="file"
                                accept="video/mp4,video/webm,video/ogg,video/quicktime,video/x-msvideo"
                                onChange={(e) => handleLessonVideoChange(e, moduleIndex, lessonIndex)}
                                className="hidden"
                              />
                              
                              {lesson.video ? (
                                <div className="border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20 rounded-xl p-3">
                                  <div className="flex items-center space-x-3">
                                    <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                                    <div className="flex-1">
                                      <p className="text-sm font-medium text-green-800 dark:text-green-300">
                                        Video uploaded successfully
                                      </p>
                                      <p className="text-xs text-green-600 dark:text-green-400">
                                        {formatFileSize(lesson.video.bytes)} • {lesson.duration} minutes
                                      </p>
                                    </div>
                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="sm"
                                      onClick={() => lessonVideoInputRefs.current[uploadId]?.click()}
                                      className="rounded-xl"
                                    >
                                      Change
                                    </Button>
                                  </div>
                                </div>
                              ) : (
                                <div 
                                  className="border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-xl p-4 text-center cursor-pointer hover:border-rose-400 transition-colors"
                                  onClick={() => lessonVideoInputRefs.current[uploadId]?.click()}
                                >
                                  <Video className="w-6 h-6 text-slate-400 mx-auto mb-2" />
                                  <p className="text-sm font-medium">Upload Lesson Video</p>
                                  <p className="text-xs text-slate-500">MP4, WebM, OGG up to 100MB</p>
                                </div>
                              )}

                              {currentUploadProgress && (
                                <div className="mt-2 space-y-2">
                                  <div className="flex items-center justify-between text-sm">
                                    <span>Uploading {currentUploadProgress.fileName}...</span>
                                    <span>{currentUploadProgress.progress}%</span>
                                  </div>
                                  <Progress value={currentUploadProgress.progress} className="h-2" />
                                </div>
                              )}
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                              <div>
                                <label className="text-sm font-medium mb-1 block">Duration (minutes)</label>
                                <Input
                                  type="number"
                                  placeholder="Duration"
                                  value={lesson.duration}
                                  onChange={(e) => {
                                    const updatedModules = [...formData.modules]
                                    updatedModules[moduleIndex].lessons[lessonIndex].duration = parseInt(e.target.value) || 0
                                    setFormData(prev => ({ ...prev, modules: updatedModules }))
                                  }}
                                  className="rounded-2xl"
                                  min="0"
                                />
                              </div>
                            </div>

                            <Textarea
                              placeholder="Lesson Content *"
                              value={lesson.content}
                              onChange={(e) => {
                                const updatedModules = [...formData.modules]
                                updatedModules[moduleIndex].lessons[lessonIndex].content = e.target.value
                                setFormData(prev => ({ ...prev, modules: updatedModules }))
                              }}
                              className="rounded-2xl mb-3 min-h-[100px]"
                              required
                            />

                            <div className="flex items-center justify-between mb-3">
                              <label className="flex items-center space-x-2">
                                <input
                                  type="checkbox"
                                  checked={lesson.isPreview}
                                  onChange={(e) => {
                                    const updatedModules = [...formData.modules]
                                    updatedModules[moduleIndex].lessons[lessonIndex].isPreview = e.target.checked
                                    setFormData(prev => ({ ...prev, modules: updatedModules }))
                                  }}
                                  className="rounded"
                                />
                                <span className="text-sm">Preview Lesson (Free to watch)</span>
                              </label>
                            </div>

                            {/* Resources */}
                            <div className="space-y-3">
                              <div className="flex items-center justify-between">
                                <h4 className="text-sm font-medium">Resources</h4>
                                <Button 
                                  type="button" 
                                  onClick={() => addResource(moduleIndex, lessonIndex)} 
                                  variant="outline" 
                                  size="sm" 
                                  className="rounded-2xl"
                                >
                                  <Plus className="w-3 h-3 mr-1" />
                                  Add Resource
                                </Button>
                              </div>
                              
                              {lesson.resources.map((resource, resourceIndex) => (
                                <div key={resourceIndex} className="grid grid-cols-1 md:grid-cols-12 gap-2 p-3 bg-slate-50 dark:bg-slate-800 rounded-xl">
                                  <Input
                                    placeholder="Resource Title"
                                    value={resource.title}
                                    onChange={(e) => {
                                      const updatedModules = [...formData.modules]
                                      updatedModules[moduleIndex].lessons[lessonIndex].resources[resourceIndex].title = e.target.value
                                      setFormData(prev => ({ ...prev, modules: updatedModules }))
                                    }}
                                    className="rounded-xl md:col-span-4"
                                  />
                                  <Input
                                    placeholder="URL"
                                    value={resource.url}
                                    onChange={(e) => {
                                      const updatedModules = [...formData.modules]
                                      updatedModules[moduleIndex].lessons[lessonIndex].resources[resourceIndex].url = e.target.value
                                      setFormData(prev => ({ ...prev, modules: updatedModules }))
                                    }}
                                    className="rounded-xl md:col-span-5"
                                  />
                                  <select
                                    value={resource.type}
                                    onChange={(e) => {
                                      const updatedModules = [...formData.modules]
                                      updatedModules[moduleIndex].lessons[lessonIndex].resources[resourceIndex].type = e.target.value as any
                                      setFormData(prev => ({ ...prev, modules: updatedModules }))
                                    }}
                                    className="rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-2 py-1 text-sm md:col-span-2"
                                  >
                                    <option value="pdf">PDF</option>
                                    <option value="document">Document</option>
                                    <option value="link">Link</option>
                                    <option value="video">Video</option>
                                  </select>
                                  <Button 
                                    type="button" 
                                    variant="ghost" 
                                    size="icon"
                                    onClick={() => removeResource(moduleIndex, lessonIndex, resourceIndex)}
                                    className="text-red-500 rounded-xl hover:text-red-600 md:col-span-1"
                                  >
                                    <X className="w-3 h-3" />
                                  </Button>
                                </div>
                              ))}
                            </div>
                          </div>
                        )
                      })}
                      
                      <Button 
                        type="button" 
                        onClick={() => addLesson(moduleIndex)} 
                        variant="outline" 
                        size="sm" 
                        className="rounded-2xl"
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Add Lesson
                      </Button>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Pricing */}
            <Card className="rounded-2xl">
              <CardHeader>
                <CardTitle>Pricing</CardTitle>
                <CardDescription>
                  Set your course pricing
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center space-x-4">
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={formData.isFree}
                      onChange={(e) => setFormData(prev => ({ ...prev, isFree: e.target.checked }))}
                      className="rounded"
                    />
                    <span>Free Course</span>
                  </label>
                </div>
                
                {!formData.isFree && (
                  <div>
                    <label className="text-sm font-medium mb-1 block">Price ($)</label>
                    <Input
                      type="number"
                      placeholder="Price"
                      value={formData.price}
                      onChange={(e) => setFormData(prev => ({ ...prev, price: parseFloat(e.target.value) || 0 }))}
                      className="rounded-2xl"
                      min="0"
                      step="0.01"
                    />
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Course Settings */}
            <Card className="rounded-2xl">
              <CardHeader>
                <CardTitle>Settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={formData.isFeatured}
                    onChange={(e) => setFormData(prev => ({ ...prev, isFeatured: e.target.checked }))}
                    className="rounded"
                  />
                  <span>Feature this course</span>
                </label>
              </CardContent>
            </Card>

            {/* Course Summary */}
            <Card className="rounded-2xl">
              <CardHeader>
                <CardTitle>Course Summary</CardTitle>
                <CardDescription>
                  Overview of your course
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-600">Modules</span>
                  <span className="font-semibold">{formData.modules.length}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-600">Lessons</span>
                  <span className="font-semibold">{totalLessons}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-600">Total Duration</span>
                  <span className="font-semibold">{formatDuration(totalDuration)}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-600">Price</span>
                  <span className="font-semibold">
                    {formData.isFree ? 'Free' : `$${formData.price}`}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-600">Level</span>
                  <Badge variant="outline" className="rounded-full capitalize">
                    {formData.level}
                  </Badge>
                </div>
              </CardContent>
            </Card>

            {/* Actions */}
            <Card className="rounded-2xl">
              <CardHeader>
                <CardTitle>Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button 
                  type="submit" 
                  variant="premium" 
                  className="w-full rounded-2xl" 
                  disabled={loading || !formData.thumbnail || Object.keys(uploadProgress).length > 0}
                >
                  {loading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      Create Course
                    </>
                  )}
                </Button>
                
                <Button 
                  type="button" 
                  variant="outline" 
                  className="w-full rounded-2xl"
                  onClick={() => router.back()}
                >
                  Cancel
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </form>
    </div>
  )
}