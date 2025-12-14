// app/admin/courses/edit/[id]/page.tsx

'use client'

import { useState, useEffect, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useAuth } from '@clerk/nextjs'
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
  AlertCircle,
  ArrowLeft,
  Loader2,
  CloudUpload
} from 'lucide-react'
import { useToast } from '@/components/ui/use-toast'

// Import the shared components and types from create page
interface S3Asset {
  key: string
  url: string
  size: number
  type: 'image' | 'video'
  duration?: number
  width?: number
  height?: number
}

interface UploadProgress {
  [key: string]: {
    progress: number
    fileName: string
    type: 'thumbnail' | 'previewVideo' | 'lessonVideo' | 'moduleThumbnail'
    status: 'generating-url' | 'uploading' | 'processing' | 'completed' | 'error'
    error?: string
  }
}

interface Lesson {
  title: string
  description: string
  content: string
  video?: S3Asset
  duration: number
  isPreview: boolean
  resources: {
    title: string
    url: string
    type: 'pdf' | 'document' | 'link' | 'video'
  }[]
  order: number
}

interface Chapter {
  title: string
  description: string
  order: number
  lessons: Lesson[]
}

interface Module {
  title: string
  description: string
  thumbnailUrl?: string
  chapters: Chapter[]
  order: number
}

interface Course {
  _id: string
  title: string
  slug: string
  description: string
  shortDescription: string
  price: number
  isFree: boolean
  level: 'beginner' | 'intermediate' | 'advanced'
  category: string
  tags: string[]
  thumbnail: any
  previewVideo: any
  modules: Module[]
  requirements: string[]
  learningOutcomes: string[]
  isPublished: boolean
  isFeatured: boolean
  totalStudents: number
  averageRating: number
}

// File Upload Area Component
const FileUploadArea = ({
  type,
  label,
  acceptedFiles,
  maxSize,
  currentFile,
  onFileChange,
  moduleIndex,
  chapterIndex,
  lessonIndex,
  uploadProgress,
  onCancelUpload
}: {
  type: 'thumbnail' | 'previewVideo' | 'lessonVideo' | 'moduleThumbnail'
  label: string
  acceptedFiles: string
  maxSize: string
  currentFile: S3Asset | null
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  moduleIndex?: number
  chapterIndex?: number
  lessonIndex?: number
  uploadProgress?: UploadProgress
  onCancelUpload?: (identifier: string) => void
}) => {
  const inputRef = useRef<HTMLInputElement>(null)
  const uploadId = type === 'lessonVideo' ? `lesson-${moduleIndex}-${chapterIndex}-${lessonIndex}` : 
                  type === 'moduleThumbnail' ? `module-${moduleIndex}-thumbnail` : type
  const upload = uploadProgress?.[uploadId]
  const isUploading = upload?.status === 'generating-url' || upload?.status === 'uploading'

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const getStatusColor = () => {
    switch (upload?.status) {
      case 'generating-url': return 'bg-blue-500'
      case 'uploading': return 'bg-blue-500'
      case 'processing': return 'bg-yellow-500'
      case 'completed': return 'bg-green-500'
      case 'error': return 'bg-red-500'
      default: return 'bg-gray-500'
    }
  }

  const getStatusIcon = () => {
    switch (upload?.status) {
      case 'generating-url': return <CloudUpload className="w-4 h-4" />
      case 'uploading': return <CloudUpload className="w-4 h-4" />
      case 'processing': return <AlertCircle className="w-4 h-4" />
      case 'completed': return <CheckCircle className="w-4 h-4" />
      case 'error': return <AlertCircle className="w-4 h-4" />
      default: return <CloudUpload className="w-4 h-4" />
    }
  }

  const getStatusText = () => {
    switch (upload?.status) {
      case 'generating-url': return 'Preparing upload...'
      case 'uploading': return `Uploading... ${upload.progress}%`
      case 'processing': return 'Processing...'
      case 'completed': return 'Upload completed'
      case 'error': return 'Upload failed'
      default: return 'Uploading...'
    }
  }

  return (
    <div className="space-y-4">
      <label className="text-sm font-medium flex items-center space-x-2">
        {type === 'thumbnail' || type === 'moduleThumbnail' ? <Image className="w-4 h-4" /> : <Video className="w-4 h-4" />}
        <span>{label}</span>
      </label>
      
      <input
        ref={inputRef}
        type="file"
        accept={acceptedFiles}
        onChange={onFileChange}
        className="hidden"
        disabled={isUploading}
      />
      
      <div 
        className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-colors ${
          isUploading 
            ? 'border-blue-300 bg-blue-50 dark:border-blue-700 dark:bg-blue-900/20 cursor-not-allowed' 
            : 'border-slate-300 dark:border-slate-600 hover:border-rose-400'
        }`}
        onClick={() => !isUploading && inputRef.current?.click()}
      >
        {currentFile ? (
          <div className="space-y-2">
            {type === 'thumbnail' || type === 'moduleThumbnail' ? (
              <img
                src={currentFile.url}
                alt="Preview"
                className="w-32 h-32 object-cover rounded-xl mx-auto"
              />
            ) : (
              <div className="relative">
                <video className="w-32 h-32 object-cover rounded-xl mx-auto">
                  <source src={currentFile.url} type="video/mp4" />
                </video>
                <Play className="w-6 h-6 text-white absolute inset-0 m-auto" />
              </div>
            )}
            <p className="text-sm text-slate-600">Click to change</p>
            <p className="text-xs text-slate-500">
              {formatFileSize(currentFile.size)}
              {currentFile.duration && type !== 'thumbnail' && type !== 'moduleThumbnail' && ` • ${currentFile.duration}s`}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {type === 'thumbnail' || type === 'moduleThumbnail' ? (
              <Image className="w-8 h-8 text-slate-400 mx-auto" />
            ) : (
              <Video className="w-8 h-8 text-slate-400 mx-auto" />
            )}
            <p className="text-sm font-medium">
              {isUploading ? 'Uploading...' : `Upload ${type === 'thumbnail' || type === 'moduleThumbnail' ? 'Thumbnail' : 'Video'}`}
            </p>
            <p className="text-xs text-slate-500">
              {acceptedFiles.split(',').join(', ')} up to {maxSize}
            </p>
            {type !== 'thumbnail' && type !== 'moduleThumbnail' && (
              <p className="text-xs text-blue-500 mt-1">
                Large files supported (up to 5GB)
              </p>
            )}
          </div>
        )}
      </div>
      
      {/* Upload Progress */}
      {upload && (
        <div className="flex items-center space-x-3 p-3 bg-slate-50 dark:bg-slate-800 rounded-xl">
          <div className={`p-1 rounded-full ${getStatusColor()} text-white`}>
            {getStatusIcon()}
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium truncate max-w-[200px]">
                {upload.fileName}
              </span>
              <span className="text-slate-500">
                {getStatusText()}
              </span>
            </div>
            {(upload.status === 'generating-url' || upload.status === 'uploading') && (
              <Progress value={upload.progress} className="h-2 mt-1" />
            )}
            {upload.status === 'error' && upload.error && (
              <p className="text-xs text-red-500 mt-1">{upload.error}</p>
            )}
          </div>
          {(upload.status === 'generating-url' || upload.status === 'uploading') && onCancelUpload && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onCancelUpload(uploadId)}
              className="text-red-500 hover:text-red-600"
            >
              <X className="w-4 h-4" />
            </Button>
          )}
        </div>
      )}
    </div>
  )
}

// Upload Optimization Tips Component
const UploadOptimizationTips = ({ fileSize }: { fileSize: number }) => {
  const sizeInMB = fileSize / (1024 * 1024)
  
  return (
    <Card className="rounded-2xl border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-900/20">
      <CardContent className="p-4">
        <div className="flex items-start space-x-3">
          <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-medium text-yellow-800 dark:text-yellow-300 mb-2">
              Large File Upload in Progress ({sizeInMB.toFixed(2)}MB)
            </p>
            <ul className="text-xs text-yellow-700 dark:text-yellow-400 space-y-1">
              <li>• Keep this page open during upload</li>
              <li>• Use a stable internet connection</li>
              <li>• Avoid uploading multiple large files simultaneously</li>
              <li>• Upload time depends on your internet speed</li>
            </ul>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// Custom hook for S3 file uploads with Clerk auth
const useS3Upload = () => {
  const [uploadProgress, setUploadProgress] = useState<UploadProgress>({})
  const { getToken, userId } = useAuth()

  const uploadFile = async (
    file: File,
    type: 'thumbnail' | 'previewVideo' | 'lessonVideo' | 'moduleThumbnail',
    identifier: string,
    moduleIndex?: number
  ) => {
    const maxSize = type === 'thumbnail' || type === 'moduleThumbnail' ? 5 * 1024 * 1024 : 5 * 1024 * 1024 * 1024
    if (file.size > maxSize) {
      throw new Error(
        `File too large. Maximum size: ${type === 'thumbnail' || type === 'moduleThumbnail' ? '5MB' : '5GB'}`
      )
    }

    // Calculate dynamic timeout (1 minute per 100MB + 10 minutes buffer)
    const timeoutDuration = Math.max(
      10 * 60 * 1000, // Minimum 10 minutes
      Math.ceil(file.size / (100 * 1024 * 1024)) * 60 * 1000 + 10 * 60 * 1000
    )

    try {
      setUploadProgress(prev => ({
        ...prev,
        [identifier]: { 
          progress: 0, 
          fileName: file.name, 
          type,
          status: 'generating-url'
        }
      }))

      console.log('🔐 Getting Clerk token...')
      const token = await getToken()
      
      if (!token || !userId) {
        throw new Error('Authentication failed. Please sign in again.')
      }

      console.log('✅ Token obtained, making upload request...')

      // Get presigned URL
      const presignedResponse = await fetch('/api/admin/upload', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fileName: file.name,
          fileType: file.type,
          fileSize: file.size,
          folder: `${type}s`
        }),
      })

      console.log('📡 Upload API response status:', presignedResponse.status)

      if (!presignedResponse.ok) {
        const errorText = await presignedResponse.text()
        let errorData
        try {
          errorData = JSON.parse(errorText)
        } catch {
          errorData = { error: 'Failed to get upload URL' }
        }
        throw new Error(errorData.error || `Upload failed with status: ${presignedResponse.status}`)
      }

      const { presignedUrl, fileUrl, fileKey } = await presignedResponse.json()

      console.log('✅ Presigned URL received, starting upload...')
      console.log(`⏰ Using timeout: ${timeoutDuration / 1000 / 60} minutes for ${(file.size / (1024 * 1024)).toFixed(2)}MB file`)

      setUploadProgress(prev => ({
        ...prev,
        [identifier]: { 
          ...prev[identifier], 
          status: 'uploading',
          progress: 5
        }
      }))

      // Enhanced upload with better progress tracking
      const uploadResult = await new Promise<S3Asset>((resolve, reject) => {
        const xhr = new XMLHttpRequest()
        const uploadStartTime = Date.now()
        let lastProgressUpdate = Date.now()
        let lastLoaded = 0

        xhr.upload.addEventListener('progress', (event) => {
          if (event.lengthComputable) {
            const currentTime = Date.now()
            const progress = 5 + (event.loaded / event.total) * 90 // 5% to 95%
            
            // Calculate speed (only update every 500ms to reduce noise)
            if (currentTime - lastProgressUpdate > 500) {
              const timeDiff = (currentTime - lastProgressUpdate) / 1000
              const loadedDiff = event.loaded - lastLoaded
              const uploadSpeed = loadedDiff / timeDiff // bytes per second
              
              console.log(`📊 Upload progress: ${Math.round(progress)}% - Speed: ${(uploadSpeed / (1024 * 1024)).toFixed(2)} MB/s`)
              
              lastProgressUpdate = currentTime
              lastLoaded = event.loaded
            }

            setUploadProgress(prev => ({
              ...prev,
              [identifier]: { 
                ...prev[identifier], 
                progress: Math.round(progress)
              }
            }))
          }
        })

        xhr.addEventListener('load', () => {
          const uploadTime = (Date.now() - uploadStartTime) / 1000
          console.log(`✅ Upload completed in ${uploadTime} seconds`)
          
          if (xhr.status === 200) {
            setUploadProgress(prev => ({
              ...prev,
              [identifier]: { 
                ...prev[identifier], 
                progress: 100,
                status: 'completed'
              }
            }))

            resolve({
              key: fileKey,
              url: fileUrl,
              size: file.size,
              type: type === 'thumbnail' || type === 'moduleThumbnail' ? 'image' : 'video',
              duration: type !== 'thumbnail' && type !== 'moduleThumbnail' ? 0 : undefined
            })
          } else {
            console.error('❌ Upload failed with status:', xhr.status)
            reject(new Error(`Upload failed with status: ${xhr.status}`))
          }
        })

        xhr.addEventListener('error', (e) => {
          console.error('❌ Network error during upload:', e)
          reject(new Error('Network error during upload. Please check your connection.'))
        })

        xhr.addEventListener('abort', () => {
          console.error('❌ Upload was cancelled')
          reject(new Error('Upload was cancelled'))
        })

        // Set timeout and handle timeout gracefully
        xhr.timeout = timeoutDuration
        xhr.ontimeout = () => {
          const elapsed = (Date.now() - uploadStartTime) / 1000
          const uploadedMB = (lastLoaded / (1024 * 1024)).toFixed(2)
          console.error(`❌ Upload timeout after ${elapsed} seconds, uploaded: ${uploadedMB}MB`)
          reject(new Error(`Upload timeout after ${Math.round(elapsed / 60)} minutes. Uploaded ${uploadedMB}MB of ${(file.size / (1024 * 1024)).toFixed(2)}MB.`))
        }

        console.log('📤 Starting direct upload to S3...')
        xhr.open('PUT', presignedUrl)
        xhr.setRequestHeader('Content-Type', file.type)
        // Remove unsafe headers - browser will set Content-Length automatically
        
        xhr.send(file)
      })

      // Clear progress after success
      setTimeout(() => {
        setUploadProgress(prev => {
          const newProgress = { ...prev }
          delete newProgress[identifier]
          return newProgress
        })
      }, 3000)

      return uploadResult

    } catch (error) {
      console.error('❌ Upload error:', error)
      setUploadProgress(prev => ({
        ...prev,
        [identifier]: { 
          ...prev[identifier], 
          status: 'error',
          error: error instanceof Error ? error.message : 'Upload failed'
        }
      }))
      throw error
    }
  }

  const cancelUpload = (identifier: string) => {
    console.log('🚫 Cancelling upload:', identifier)
    setUploadProgress(prev => {
      const newProgress = { ...prev }
      delete newProgress[identifier]
      return newProgress
    })
  }

  return { uploadProgress, uploadFile, cancelUpload }
}

export default function EditCoursePage() {
  const params = useParams()
  const router = useRouter()
  const { toast } = useToast()
  const { uploadProgress, uploadFile, cancelUpload } = useS3Upload()
  
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [course, setCourse] = useState<Course | null>(null)
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    shortDescription: '',
    price: 0,
    isFree: false,
    level: 'beginner' as 'beginner' | 'intermediate' | 'advanced',
    category: '',
    tags: [] as string[],
    thumbnail: null as S3Asset | null,
    previewVideo: null as S3Asset | null,
    modules: [] as Module[],
    requirements: [] as string[],
    learningOutcomes: [] as string[],
    isPublished: false,
    isFeatured: false
  })

  const [newTag, setNewTag] = useState('')
  const [newRequirement, setNewRequirement] = useState('')
  const [newOutcome, setNewOutcome] = useState('')

  // Calculate upload stats
  const activeUploads = Object.values(uploadProgress).filter(
    upload => upload.status === 'generating-url' || upload.status === 'uploading'
  ).length

  useEffect(() => {
    if (params.id) {
      fetchCourse()
    }
  }, [params.id])

  const fetchCourse = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/admin/courses/${params.id}`)
      
      if (!response.ok) {
        throw new Error('Failed to fetch course')
      }

      const courseData = await response.json()
      setCourse(courseData)
      
      // Transform assets to S3 assets format
      const transformAsset = (asset: any): S3Asset | null => {
        if (!asset) return null
        
        // Handle both Cloudinary and S3 asset formats
        if (asset.public_id || asset.secure_url) {
          // Cloudinary format
          return {
            key: asset.public_id || '',
            url: asset.secure_url || '',
            size: asset.bytes || 0,
            type: asset.resource_type === 'image' ? 'image' : 'video',
            duration: asset.duration,
            width: asset.width,
            height: asset.height
          }
        } else if (asset.key || asset.url) {
          // S3 format
          return {
            key: asset.key || '',
            url: asset.url || '',
            size: asset.size || 0,
            type: asset.type || 'image',
            duration: asset.duration,
            width: asset.width,
            height: asset.height
          }
        }
        return null
      }

      // Transform module assets (for backward compatibility)
      const transformedModules = courseData.modules.map((module: any) => {
        // Handle old structure where lessons are directly in module
        if (module.lessons && !module.chapters) {
          return {
            ...module,
            thumbnailUrl: module.thumbnailUrl || undefined,
            chapters: [
              {
                title: 'Main Chapter',
                description: 'Default chapter for migrated content',
                order: 0,
                lessons: module.lessons.map((lesson: any) => ({
                  ...lesson,
                  video: transformAsset(lesson.video)
                }))
              }
            ]
          }
        }
        
        // Handle new structure with chapters
        return {
          ...module,
          thumbnailUrl: module.thumbnailUrl || undefined,
          chapters: module.chapters?.map((chapter: any) => ({
            ...chapter,
            lessons: chapter.lessons.map((lesson: any) => ({
              ...lesson,
              video: transformAsset(lesson.video)
            }))
          })) || []
        }
      })

      setFormData({
        title: courseData.title,
        description: courseData.description,
        shortDescription: courseData.shortDescription,
        price: courseData.price,
        isFree: courseData.isFree,
        level: courseData.level,
        category: courseData.category,
        tags: courseData.tags,
        thumbnail: transformAsset(courseData.thumbnail),
        previewVideo: transformAsset(courseData.previewVideo),
        modules: transformedModules,
        requirements: courseData.requirements,
        learningOutcomes: courseData.learningOutcomes,
        isPublished: courseData.isPublished,
        isFeatured: courseData.isFeatured
      })
      
      toast({
        title: 'Success',
        description: 'Course loaded successfully!',
        variant: 'default'
      })
    } catch (err: any) {
      console.error('Error fetching course:', err)
      toast({
        title: 'Error',
        description: 'Failed to load course',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  const handleFileUpload = async (
    file: File, 
    type: 'thumbnail' | 'previewVideo' | 'lessonVideo' | 'moduleThumbnail', 
    moduleIndex?: number, 
    chapterIndex?: number,
    lessonIndex?: number
  ) => {
    const uploadId = type === 'lessonVideo' ? `lesson-${moduleIndex}-${chapterIndex}-${lessonIndex}` : 
                    type === 'moduleThumbnail' ? `module-${moduleIndex}-thumbnail` : type
    
    try {
      const result = await uploadFile(file, type, uploadId, moduleIndex)

      // Update form data based on upload type
      if (type === 'thumbnail') {
        setFormData(prev => ({
          ...prev,
          thumbnail: result
        }))
      } else if (type === 'previewVideo') {
        setFormData(prev => ({
          ...prev,
          previewVideo: result
        }))
      } else if (type === 'moduleThumbnail' && moduleIndex !== undefined) {
        const updatedModules = [...formData.modules]
        updatedModules[moduleIndex].thumbnailUrl = result.url
        setFormData(prev => ({ ...prev, modules: updatedModules }))
      } else if (type === 'lessonVideo' && moduleIndex !== undefined && chapterIndex !== undefined && lessonIndex !== undefined) {
        const updatedModules = [...formData.modules]
        updatedModules[moduleIndex].chapters[chapterIndex].lessons[lessonIndex].video = result
        setFormData(prev => ({ ...prev, modules: updatedModules }))
      }

      toast({
        title: 'Success',
        description: `${type.replace(/([A-Z])/g, ' $1')} uploaded successfully!`,
        variant: 'default'
      })
    } catch (error) {
      console.error('Error uploading file:', error)
      const errorMessage = error instanceof Error ? error.message : 'Failed to upload file. Please try again.'
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive'
      })
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

  const handleModuleThumbnailChange = (e: React.ChangeEvent<HTMLInputElement>, moduleIndex: number) => {
    const file = e.target.files?.[0]
    if (file) {
      handleFileUpload(file, 'moduleThumbnail', moduleIndex)
    }
  }

  const handleLessonVideoChange = (e: React.ChangeEvent<HTMLInputElement>, moduleIndex: number, chapterIndex: number, lessonIndex: number) => {
    const file = e.target.files?.[0]
    if (file) {
      handleFileUpload(file, 'lessonVideo', moduleIndex, chapterIndex, lessonIndex)
    }
  }

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
        thumbnailUrl: undefined,
        chapters: [],
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

  // Chapter Management
  const addChapter = (moduleIndex: number) => {
    const updatedModules = [...formData.modules]
    updatedModules[moduleIndex].chapters.push({
      title: '',
      description: '',
      order: updatedModules[moduleIndex].chapters.length,
      lessons: []
    })
    setFormData(prev => ({ ...prev, modules: updatedModules }))
  }

  const removeChapter = (moduleIndex: number, chapterIndex: number) => {
    const updatedModules = [...formData.modules]
    updatedModules[moduleIndex].chapters = updatedModules[moduleIndex].chapters.filter(
      (_, index) => index !== chapterIndex
    )
    setFormData(prev => ({ ...prev, modules: updatedModules }))
  }

  // Lesson Management
  const addLesson = (moduleIndex: number, chapterIndex: number) => {
    const updatedModules = [...formData.modules]
    updatedModules[moduleIndex].chapters[chapterIndex].lessons.push({
      title: '',
      description: '',
      content: '',
      duration: 0,
      isPreview: false,
      resources: [],
      order: updatedModules[moduleIndex].chapters[chapterIndex].lessons.length
    })
    setFormData(prev => ({ ...prev, modules: updatedModules }))
  }

  const removeLesson = (moduleIndex: number, chapterIndex: number, lessonIndex: number) => {
    const updatedModules = [...formData.modules]
    updatedModules[moduleIndex].chapters[chapterIndex].lessons = updatedModules[moduleIndex].chapters[chapterIndex].lessons.filter(
      (_, index) => index !== lessonIndex
    )
    setFormData(prev => ({ ...prev, modules: updatedModules }))
  }

  const addResource = (moduleIndex: number, chapterIndex: number, lessonIndex: number) => {
    const updatedModules = [...formData.modules]
    updatedModules[moduleIndex].chapters[chapterIndex].lessons[lessonIndex].resources.push({
      title: '',
      url: '',
      type: 'pdf' as const
    })
    setFormData(prev => ({ ...prev, modules: updatedModules }))
  }

  const removeResource = (moduleIndex: number, chapterIndex: number, lessonIndex: number, resourceIndex: number) => {
    const updatedModules = [...formData.modules]
    updatedModules[moduleIndex].chapters[chapterIndex].lessons[lessonIndex].resources = 
      updatedModules[moduleIndex].chapters[chapterIndex].lessons[lessonIndex].resources.filter(
        (_, index) => index !== resourceIndex
      )
    setFormData(prev => ({ ...prev, modules: updatedModules }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Check if any uploads are in progress
    const hasActiveUploads = Object.values(uploadProgress).some(
      upload => upload.status === 'generating-url' || upload.status === 'uploading'
    )
    
    if (hasActiveUploads) {
      toast({
        title: 'Error',
        description: 'Please wait for all uploads to complete before saving',
        variant: 'destructive'
      })
      return
    }

    setSaving(true)

    try {
      if (!formData.thumbnail) {
        toast({
          title: 'Error',
          description: 'Please upload a course thumbnail',
          variant: 'destructive'
        })
        return
      }

      const response = await fetch(`/api/admin/courses/${params.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      })

      if (response.ok) {
        toast({
          title: 'Success',
          description: 'Course updated successfully!',
          variant: 'default'
        })
        router.push('/admin/courses')
        router.refresh()
      } else {
        const error = await response.json()
        toast({
          title: 'Error',
          description: error.error || 'Failed to update course',
          variant: 'destructive'
        })
      }
    } catch (error) {
      console.error('Error updating course:', error)
      toast({
        title: 'Error',
        description: 'Failed to update course. Please try again.',
        variant: 'destructive'
      })
    } finally {
      setSaving(false)
    }
  }

  const togglePublish = async () => {
    try {
      const response = await fetch(`/api/admin/courses/${params.id}/publish`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          isPublished: !formData.isPublished
        }),
      })

      if (response.ok) {
        setFormData(prev => ({ ...prev, isPublished: !prev.isPublished }))
        toast({
          title: 'Success',
          description: formData.isPublished ? 'Course unpublished!' : 'Course published successfully!',
          variant: 'default'
        })
      } else {
        throw new Error('Failed to update publish status')
      }
    } catch (error) {
      console.error('Error toggling publish:', error)
      toast({
        title: 'Error',
        description: 'Failed to update publish status',
        variant: 'destructive'
      })
    }
  }

  const deleteCourse = async () => {
    if (!confirm('Are you sure you want to delete this course? This action cannot be undone.')) {
      return
    }

    try {
      const response = await fetch(`/api/admin/courses/${params.id}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        toast({
          title: 'Success',
          description: 'Course deleted successfully!',
          variant: 'default'
        })
        router.push('/admin/courses')
        router.refresh()
      } else {
        throw new Error('Failed to delete course')
      }
    } catch (error) {
      console.error('Error deleting course:', error)
      toast({
        title: 'Error',
        description: 'Failed to delete course',
        variant: 'destructive'
      })
    }
  }

  // Calculate totals with chapters structure
  const totalDuration = formData.modules.reduce((total, module) => {
    return total + module.chapters.reduce((chapterTotal, chapter) => {
      return chapterTotal + chapter.lessons.reduce((lessonTotal, lesson) => lessonTotal + lesson.duration, 0)
    }, 0)
  }, 0)

  const totalLessons = formData.modules.reduce((total, module) => {
    return total + module.chapters.reduce((chapterTotal, chapter) => chapterTotal + chapter.lessons.length, 0)
  }, 0)

  const totalChapters = formData.modules.reduce((total, module) => total + module.chapters.length, 0)

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`
  }

  if (loading) {
    return (
      <div className="p-6 flex justify-center items-center min-h-96">
        <Loader2 className="w-8 h-8 animate-spin text-rose-600" />
      </div>
    )
  }

  if (!course) {
    return (
      <div className="p-6 text-center">
        <h1 className="text-2xl font-bold mb-4">Course not found</h1>
        <Button onClick={() => router.push('/admin/courses')} variant="premium">
          Back to Courses
        </Button>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button
            variant="outline"
            onClick={() => router.push('/admin/courses')}
            className="rounded-2xl"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-3xl font-serif font-bold">Edit Course</h1>
            <p className="text-slate-600 dark:text-slate-400">
              Update course details and content
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          <Button 
            variant={formData.isPublished ? "outline" : "premium"}
            onClick={togglePublish}
            className="rounded-2xl"
          >
            {formData.isPublished ? (
              <>
                <EyeOff className="w-4 h-4 mr-2" />
                Unpublish
              </>
            ) : (
              <>
                <Eye className="w-4 h-4 mr-2" />
                Publish
              </>
            )}
          </Button>
          <Button 
            variant="destructive"
            onClick={deleteCourse}
            className="rounded-2xl"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Delete
          </Button>
        </div>
      </div>

      {/* Enhanced upload status banner */}
      {activeUploads > 0 && (
        <div className="space-y-3">
          <Card className="rounded-2xl border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-900/20">
            <CardContent className="p-4">
              <div className="flex items-center space-x-3">
                <CloudUpload className="w-5 h-5 text-blue-600" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-blue-800 dark:text-blue-300">
                    Uploading {activeUploads} file{activeUploads > 1 ? 's' : ''} to AWS S3...
                  </p>
                  <p className="text-xs text-blue-600 dark:text-blue-400">
                    Large video support enabled • Do not close this page during upload
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          {/* Show optimization tips for large files */}
          {Object.values(uploadProgress).map(upload => 
            upload.status === 'uploading' && uploadProgress[upload.fileName]?.progress < 100
          ).filter(Boolean).length > 0 && (
            <UploadOptimizationTips fileSize={1680.41 * 1024 * 1024} />
          )}
        </div>
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
                  Upload thumbnail and preview video to AWS S3
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Thumbnail Upload */}
                  <FileUploadArea
                    type="thumbnail"
                    label="Course Thumbnail *"
                    acceptedFiles="image/jpeg,image/jpg,image/png,image/webp,image/gif"
                    maxSize="5MB"
                    currentFile={formData.thumbnail}
                    onFileChange={handleThumbnailChange}
                    uploadProgress={uploadProgress}
                    onCancelUpload={cancelUpload}
                  />

                  {/* Preview Video Upload */}
                  <FileUploadArea
                    type="previewVideo"
                    label="Preview Video (Optional)"
                    acceptedFiles="video/mp4,video/webm,video/ogg,video/quicktime,video/x-msvideo,video/avi,video/mkv,video/mov"
                    maxSize="5GB"
                    currentFile={formData.previewVideo}
                    onFileChange={handlePreviewVideoChange}
                    uploadProgress={uploadProgress}
                    onCancelUpload={cancelUpload}
                  />
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
                      Add modules, chapters and lessons to your course
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
                    
                    {/* Module thumbnail upload */}
                    <div className="mb-4">
                      <FileUploadArea
                        type="moduleThumbnail"
                        label="Module Thumbnail (Optional)"
                        acceptedFiles="image/jpeg,image/jpg,image/png,image/webp"
                        maxSize="5MB"
                        currentFile={module.thumbnailUrl ? {
                          key: `module-${moduleIndex}-thumbnail`,
                          url: module.thumbnailUrl,
                          size: 0,
                          type: 'image'
                        } : null}
                        onFileChange={(e) => handleModuleThumbnailChange(e, moduleIndex)}
                        moduleIndex={moduleIndex}
                        uploadProgress={uploadProgress}
                        onCancelUpload={cancelUpload}
                      />
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
                    
                    {/* Chapters instead of direct lessons */}
                    <div className="space-y-4">
                      {module.chapters.map((chapter, chapterIndex) => (
                        <div key={chapterIndex} className="border border-slate-200 dark:border-slate-600 rounded-2xl p-4">
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center space-x-3 flex-1">
                              <div className="w-6 h-6 bg-blue-100 dark:bg-blue-900/30 rounded-md flex items-center justify-center text-blue-600 font-bold text-xs">
                                {chapterIndex + 1}
                              </div>
                              <Input
                                placeholder="Chapter Title *"
                                value={chapter.title}
                                onChange={(e) => {
                                  const updatedModules = [...formData.modules]
                                  updatedModules[moduleIndex].chapters[chapterIndex].title = e.target.value
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
                              onClick={() => removeChapter(moduleIndex, chapterIndex)}
                              className="text-red-500 rounded-2xl hover:text-red-600 hover:bg-red-50"
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </div>

                          <Textarea
                            placeholder="Chapter Description *"
                            value={chapter.description}
                            onChange={(e) => {
                              const updatedModules = [...formData.modules]
                              updatedModules[moduleIndex].chapters[chapterIndex].description = e.target.value
                              setFormData(prev => ({ ...prev, modules: updatedModules }))
                            }}
                            className="rounded-2xl mb-3 min-h-[60px]"
                            required
                          />
                          
                          {/* Lessons inside chapter */}
                          <div className="space-y-3">
                            {chapter.lessons.map((lesson, lessonIndex) => (
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
                                        updatedModules[moduleIndex].chapters[chapterIndex].lessons[lessonIndex].title = e.target.value
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
                                    onClick={() => removeLesson(moduleIndex, chapterIndex, lessonIndex)}
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
                                    updatedModules[moduleIndex].chapters[chapterIndex].lessons[lessonIndex].description = e.target.value
                                    setFormData(prev => ({ ...prev, modules: updatedModules }))
                                  }}
                                  className="rounded-2xl mb-3 min-h-[60px]"
                                  required
                                />

                                {/* Video Upload */}
                                <div className="mb-3">
                                  <FileUploadArea
                                    type="lessonVideo"
                                    label="Lesson Video *"
                                    acceptedFiles="video/mp4,video/webm,video/ogg,video/quicktime,video/x-msvideo,video/avi,video/mkv,video/mov"
                                    maxSize="5GB"
                                    currentFile={lesson.video || null}
                                    onFileChange={(e) => handleLessonVideoChange(e, moduleIndex, chapterIndex, lessonIndex)}
                                    moduleIndex={moduleIndex}
                                    chapterIndex={chapterIndex}
                                    lessonIndex={lessonIndex}
                                    uploadProgress={uploadProgress}
                                    onCancelUpload={cancelUpload}
                                  />
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
                                        updatedModules[moduleIndex].chapters[chapterIndex].lessons[lessonIndex].duration = parseInt(e.target.value) || 0
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
                                    updatedModules[moduleIndex].chapters[chapterIndex].lessons[lessonIndex].content = e.target.value
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
                                        updatedModules[moduleIndex].chapters[chapterIndex].lessons[lessonIndex].isPreview = e.target.checked
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
                                      onClick={() => addResource(moduleIndex, chapterIndex, lessonIndex)} 
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
                                          updatedModules[moduleIndex].chapters[chapterIndex].lessons[lessonIndex].resources[resourceIndex].title = e.target.value
                                          setFormData(prev => ({ ...prev, modules: updatedModules }))
                                        }}
                                        className="rounded-xl md:col-span-4"
                                      />
                                      <Input
                                        placeholder="URL"
                                        value={resource.url}
                                        onChange={(e) => {
                                          const updatedModules = [...formData.modules]
                                          updatedModules[moduleIndex].chapters[chapterIndex].lessons[lessonIndex].resources[resourceIndex].url = e.target.value
                                          setFormData(prev => ({ ...prev, modules: updatedModules }))
                                        }}
                                        className="rounded-xl md:col-span-5"
                                      />
                                      <select
                                        value={resource.type}
                                        onChange={(e) => {
                                          const updatedModules = [...formData.modules]
                                          updatedModules[moduleIndex].chapters[chapterIndex].lessons[lessonIndex].resources[resourceIndex].type = e.target.value as any
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
                                        onClick={() => removeResource(moduleIndex, chapterIndex, lessonIndex, resourceIndex)}
                                        className="text-red-500 rounded-xl hover:text-red-600 md:col-span-1"
                                      >
                                        <X className="w-3 h-3" />
                                      </Button>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            ))}
                            
                            <Button 
                              type="button" 
                              onClick={() => addLesson(moduleIndex, chapterIndex)} 
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
                      
                      <Button 
                        type="button" 
                        onClick={() => addChapter(moduleIndex)} 
                        variant="outline" 
                        size="sm" 
                        className="rounded-2xl"
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Add Chapter
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
                  <span className="text-slate-600">Chapters</span>
                  <span className="font-semibold">{totalChapters}</span>
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

            {/* Course Stats */}
            <Card className="rounded-2xl">
              <CardHeader>
                <CardTitle>Course Stats</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-600">Students</span>
                  <span className="font-semibold">{course.totalStudents}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-600">Rating</span>
                  <div className="flex items-center space-x-1">
                    <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                    <span className="font-semibold">{course.averageRating.toFixed(1)}</span>
                  </div>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-600">Duration</span>
                  <span className="font-semibold">{formatDuration(totalDuration)}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-600">Lessons</span>
                  <span className="font-semibold">{totalLessons}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-600">Modules</span>
                  <span className="font-semibold">{formData.modules.length}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-600">Status</span>
                  <Badge variant={formData.isPublished ? "success" : "secondary"} className="rounded-full">
                    {formData.isPublished ? 'Published' : 'Draft'}
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
                  disabled={saving || !formData.thumbnail || activeUploads > 0}
                >
                  {saving ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      Save Changes
                    </>
                  )}
                </Button>
                
                <Button 
                  type="button" 
                  variant="outline" 
                  className="w-full rounded-2xl"
                  onClick={() => router.push(`/courses/${course.slug}`)}
                >
                  <Eye className="w-4 h-4 mr-2" />
                  View Course
                </Button>

                <Button 
                  type="button" 
                  variant="outline" 
                  className="w-full rounded-2xl"
                  onClick={() => router.push('/admin/courses')}
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