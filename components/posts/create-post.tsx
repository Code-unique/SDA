'use client'

import { useState, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { 
  Image, 
  X, 
  Upload, 
  Hash, 
  Video, 
  Play, 
  GripVertical, 
  AlertCircle,
  Check,
  Loader2,
  Clock,
  FileVideo,
  ImageIcon
} from 'lucide-react'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/components/ui/use-toast'
import { 
  DndContext, 
  closestCenter, 
  KeyboardSensor, 
  PointerSensor, 
  useSensor, 
  useSensors,
  DragEndEvent
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

interface MediaItem {
  id: string
  file: File
  preview: string
  type: 'image' | 'video'
  duration?: number
  size: number
  uploadProgress: number
  uploadStatus: 'pending' | 'uploading' | 'uploaded' | 'error'
  error?: string
}

interface CreatePostProps {
  onPostCreated?: () => void
}

// Sortable Media Item Component
function SortableMediaItem({ item, index, onRemove, onDurationLoad }: { 
  item: MediaItem, 
  index: number, 
  onRemove: (id: string) => void,
  onDurationLoad: (id: string, duration: number) => void
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: item.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <div ref={setNodeRef} style={style} className="relative group">
      <div className="absolute top-2 left-2 z-10">
        <button
          {...attributes}
          {...listeners}
          className="w-6 h-6 bg-black/50 backdrop-blur-sm text-white rounded-full flex items-center justify-center cursor-grab active:cursor-grabbing"
        >
          <GripVertical className="w-3 h-3" />
        </button>
      </div>
      
      <div className="w-full h-32 bg-slate-100 dark:bg-slate-800 rounded-lg overflow-hidden">
        {item.type === 'image' ? (
          <img
            src={item.preview}
            alt={`Preview ${index + 1}`}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="relative w-full h-full">
            <video
              src={item.preview}
              className="w-full h-full object-cover"
              muted
              onLoadedMetadata={(e) => {
                onDurationLoad(item.id, e.currentTarget.duration)
              }}
            />
            <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
              <Play className="w-8 h-8 text-white" />
            </div>
            {item.duration && (
              <div className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
                {Math.floor(item.duration)}s
              </div>
            )}
          </div>
        )}
        
        {/* Upload Progress */}
        {item.uploadStatus === 'uploading' && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <div className="text-center">
              <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto mb-2" />
              <span className="text-white text-sm">{item.uploadProgress}%</span>
            </div>
          </div>
        )}
        
        {/* Error State */}
        {item.uploadStatus === 'error' && (
          <div className="absolute inset-0 bg-red-500/50 flex items-center justify-center">
            <AlertCircle className="w-6 h-6 text-white" />
          </div>
        )}
        
        {/* Uploaded State */}
        {item.uploadStatus === 'uploaded' && (
          <div className="absolute inset-0 bg-green-500/50 flex items-center justify-center">
            <Check className="w-6 h-6 text-white" />
          </div>
        )}
      </div>
      
      {/* Remove Button */}
      <button
        type="button"
        onClick={() => onRemove(item.id)}
        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity z-20"
      >
        <X className="w-3 h-3" />
      </button>
      
      {/* File Info */}
      <div className="mt-1 text-xs text-slate-500 truncate">
        {item.type === 'image' ? (
          <div className="flex items-center space-x-1">
            <ImageIcon className="w-3 h-3" />
            <span>{(item.size / 1024 / 1024).toFixed(2)} MB</span>
          </div>
        ) : (
          <div className="flex items-center space-x-2">
            <FileVideo className="w-3 h-3" />
            <span>{(item.size / 1024 / 1024).toFixed(2)} MB</span>
            {item.duration && (
              <>
                <span>•</span>
                <Clock className="w-3 h-3" />
                <span>{Math.floor(item.duration)}s</span>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export function CreatePost({ onPostCreated }: CreatePostProps) {
  const [caption, setCaption] = useState('')
  const [hashtags, setHashtags] = useState('')
  const [mediaItems, setMediaItems] = useState<MediaItem[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [totalDuration, setTotalDuration] = useState(0)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()
  const { toast } = useToast()

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  // Constants
  const MAX_MEDIA_COUNT = 4
  const MAX_VIDEO_DURATION = 120 // 2 minutes in seconds
  const MAX_FILE_SIZE = 100 * 1024 * 1024 // 100MB

  const handleMediaUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files) return

    const newItems: MediaItem[] = []
    
    // Check if adding these files would exceed the limit
    if (mediaItems.length + files.length > MAX_MEDIA_COUNT) {
      toast({
        title: "Media limit exceeded",
        description: `You can only upload up to ${MAX_MEDIA_COUNT} items`,
        variant: "destructive"
      })
      return
    }

    Array.from(files).forEach((file) => {
      // Check file size
      if (file.size > MAX_FILE_SIZE) {
        toast({
          title: "File too large",
          description: `${file.name} exceeds 100MB limit`,
          variant: "destructive"
        })
        return
      }

      // Check file type
      const isImage = file.type.startsWith('image/')
      const isVideo = file.type.startsWith('video/')
      
      if (!isImage && !isVideo) {
        toast({
          title: "Invalid file type",
          description: `${file.name} is not an image or video`,
          variant: "destructive"
        })
        return
      }

      const id = `media-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      const preview = URL.createObjectURL(file)
      
      newItems.push({
        id,
        file,
        preview,
        type: isImage ? 'image' : 'video',
        size: file.size,
        uploadProgress: 0,
        uploadStatus: 'pending'
      })
    })

    setMediaItems(prev => [...prev, ...newItems])
    
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const removeMedia = (id: string) => {
    setMediaItems(prev => {
      const item = prev.find(item => item.id === id)
      if (item) {
        URL.revokeObjectURL(item.preview)
      }
      return prev.filter(item => item.id !== id)
    })
  }

  const handleDurationLoad = useCallback((id: string, duration: number) => {
    setMediaItems(prev => prev.map(item => {
      if (item.id === id) {
        return { ...item, duration }
      }
      return item
    }))
    
    // Update total duration
    setTotalDuration(prev => {
      const items = [...mediaItems]
      const itemIndex = items.findIndex(item => item.id === id)
      if (itemIndex > -1) {
        items[itemIndex] = { ...items[itemIndex], duration }
      }
      return items.reduce((total, item) => total + (item.duration || 0), 0)
    })
  }, [mediaItems])

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event

    if (over && active.id !== over.id) {
      setMediaItems((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id)
        const newIndex = items.findIndex((item) => item.id === over.id)
        
        return arrayMove(items, oldIndex, newIndex).map((item, index) => ({
          ...item,
          order: index
        }))
      })
    }
  }

  const extractHashtags = (text: string) => {
    const hashtagRegex = /#\w+/g
    const matches = text.match(hashtagRegex)
    return matches ? matches.map(tag => tag.substring(1).toLowerCase()) : []
  }

  const validateMedia = () => {
    if (mediaItems.length === 0) {
      toast({
        title: "No media selected",
        description: "Please upload at least one image or video",
        variant: "destructive"
      })
      return false
    }

    // Check total duration for videos
    const videoDuration = mediaItems.reduce((total, item) => {
      return item.type === 'video' ? total + (item.duration || 0) : total
    }, 0)

    if (videoDuration > MAX_VIDEO_DURATION) {
      toast({
        title: "Video duration exceeded",
        description: `Total video duration cannot exceed ${MAX_VIDEO_DURATION} seconds`,
        variant: "destructive"
      })
      return false
    }

    // Check video count
    const videoCount = mediaItems.filter(item => item.type === 'video').length
    if (videoCount > 1) {
      toast({
        title: "Multiple videos",
        description: "You can only upload one video per post",
        variant: "destructive"
      })
      return false
    }

    return true
  }

  const uploadToCloudinary = async (file: File, type: 'image' | 'video') => {
    return new Promise((resolve, reject) => {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('upload_preset', 'sutra_posts')
      formData.append('folder', `posts/${type}s`)
      
      if (type === 'video') {
        formData.append('resource_type', 'video')
      }

      const xhr = new XMLHttpRequest()

      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable) {
          const progress = Math.round((event.loaded / event.total) * 100)
          // Update progress for this specific file
          setMediaItems(prev => prev.map(item => 
            item.file === file ? { ...item, uploadProgress: progress } : item
          ))
        }
      })

      xhr.addEventListener('load', () => {
        if (xhr.status === 200) {
          try {
            const response = JSON.parse(xhr.responseText)
            resolve(response)
          } catch (error) {
            reject(new Error('Invalid response from Cloudinary'))
          }
        } else {
          try {
            const errorResponse = JSON.parse(xhr.responseText)
            reject(new Error(errorResponse.error?.message || `Upload failed with status ${xhr.status}`))
          } catch {
            reject(new Error(`Upload failed with status ${xhr.status}`))
          }
        }
      })

      xhr.addEventListener('error', () => {
        reject(new Error('Network error during upload'))
      })

      xhr.addEventListener('abort', () => {
        reject(new Error('Upload was cancelled'))
      })

      xhr.open(
        'POST',
        `https://api.cloudinary.com/v1_1/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || 'doztmbvi6'}/${type === 'image' ? 'image' : 'video'}/upload`
      )
      xhr.send(formData)
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!caption.trim() || !validateMedia()) return

    setIsLoading(true)
    setUploading(true)

    try {
      // Update upload status
      setMediaItems(prev => prev.map(item => ({ ...item, uploadStatus: 'uploading' })))

      // Upload all media files
      const uploadPromises = mediaItems.map(async (item) => {
        try {
          const response: any = await uploadToCloudinary(item.file, item.type)
          
          return {
            type: item.type,
            url: response.secure_url,
            publicId: response.public_id,
            thumbnail: item.type === 'video' ? response.thumbnail_url : undefined,
            duration: item.type === 'video' ? Math.floor(item.duration || 0) : undefined,
            size: item.size,
            mimetype: item.file.type,
            order: mediaItems.indexOf(item)
          }
        } catch (error: any) {
          setMediaItems(prev => prev.map(i => 
            i.id === item.id ? { 
              ...i, 
              uploadStatus: 'error', 
              error: error.message || 'Upload failed' 
            } : i
          ))
          throw error
        }
      })

      const uploadedMedia = await Promise.all(uploadPromises)

      // Create post with all media
      const response = await fetch('/api/posts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          caption,
          hashtags: extractHashtags(hashtags),
          media: uploadedMedia
        }),
      })

      if (response.ok) {
        const result = await response.json()
        
        setCaption('')
        setHashtags('')
        setMediaItems([])
        setTotalDuration(0)
        
        toast({
          title: "Post created successfully",
          description: "Your post is now live!",
        })
        
        onPostCreated?.()
        router.refresh()
        router.push('/dashboard')
      } else {
        const error = await response.json()
        throw new Error(error.error || 'Failed to create post')
      }
    } catch (error: any) {
      console.error('Error creating post:', error)
      toast({
        title: "Failed to create post",
        description: error.message || "Please try again",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
      setUploading(false)
    }
  }

  const mediaStats = {
    total: mediaItems.length,
    images: mediaItems.filter(item => item.type === 'image').length,
    videos: mediaItems.filter(item => item.type === 'video').length,
    totalDuration: mediaItems.reduce((total, item) => total + (item.duration || 0), 0)
  }

  return (
    <Card className="rounded-2xl">
      <CardHeader>
        <CardTitle>Create New Post</CardTitle>
        <CardDescription>
          Share your content with the community. Upload up to 4 images or 1 video (max 2 minutes)
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Media Upload Section */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Media ({mediaStats.total}/4)
            </label>
            
            {/* Stats Bar */}
            <div className="flex items-center justify-between mb-4 p-3 bg-slate-50 dark:bg-slate-800 rounded-xl">
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-1">
                  <Image className="w-4 h-4 text-blue-500" />
                  <span className="text-sm font-medium">{mediaStats.images} images</span>
                </div>
                <div className="flex items-center space-x-1">
                  <Video className="w-4 h-4 text-purple-500" />
                  <span className="text-sm font-medium">{mediaStats.videos} video</span>
                </div>
                {mediaStats.videos > 0 && (
                  <div className="flex items-center space-x-1">
                    <Clock className="w-4 h-4 text-amber-500" />
                    <span className="text-sm font-medium">
                      {Math.floor(mediaStats.totalDuration)}s / {MAX_VIDEO_DURATION}s
                    </span>
                  </div>
                )}
              </div>
              
              {mediaStats.total > 0 && (
                <Badge variant="outline" className="text-xs">
                  Drag to reorder
                </Badge>
              )}
            </div>
            
            {/* Upload Zone */}
            <div className="border-2 border-dashed border-slate-200 rounded-2xl p-6 text-center hover:border-rose-300 transition-colors">
              <input
                type="file"
                multiple
                accept="image/*,video/*"
                onChange={handleMediaUpload}
                className="hidden"
                id="media-upload"
                ref={fileInputRef}
                disabled={mediaItems.length >= MAX_MEDIA_COUNT || uploading}
              />
              <label
                htmlFor="media-upload"
                className={`cursor-pointer flex flex-col items-center space-y-2 ${
                  (mediaItems.length >= MAX_MEDIA_COUNT || uploading) && "opacity-50 cursor-not-allowed"
                }`}
              >
                <Upload className="w-8 h-8 text-slate-400" />
                <span className="text-sm text-slate-600">
                  Click to upload images/videos or drag and drop
                </span>
                <span className="text-xs text-slate-500">
                  Up to 4 items • 100MB max each • Videos up to 2 minutes
                </span>
              </label>
            </div>
            
            {/* Media Grid */}
            {mediaItems.length > 0 && (
              <div className="mt-4">
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleDragEnd}
                >
                  <SortableContext
                    items={mediaItems.map(item => item.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                      {mediaItems.map((item, index) => (
                        <SortableMediaItem
                          key={item.id}
                          item={item}
                          index={index}
                          onRemove={removeMedia}
                          onDurationLoad={handleDurationLoad}
                        />
                      ))}
                    </div>
                  </SortableContext>
                </DndContext>
                
                {/* Warning Messages */}
                {mediaStats.videos > 1 && (
                  <div className="mt-3 p-3 bg-amber-50 dark:bg-amber-900/20 text-amber-800 dark:text-amber-300 rounded-lg flex items-start space-x-2">
                    <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                    <p className="text-sm">
                      Only one video allowed per post. Please remove extra videos.
                    </p>
                  </div>
                )}
                
                {mediaStats.totalDuration > MAX_VIDEO_DURATION && (
                  <div className="mt-3 p-3 bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-300 rounded-lg flex items-start space-x-2">
                    <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                    <p className="text-sm">
                      Total video duration ({Math.floor(mediaStats.totalDuration)}s) exceeds 2 minute limit.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Caption */}
          <div>
            <label htmlFor="caption" className="block text-sm font-medium mb-2">
              Caption
            </label>
            <Textarea
              id="caption"
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="Describe your content, inspiration, or story..."
              className="rounded-2xl min-h-[100px]"
              required
            />
            <p className="text-xs text-slate-500 mt-1">
              {caption.length}/2200 characters
            </p>
          </div>

          {/* Hashtags */}
          <div>
            <label htmlFor="hashtags" className="block text-sm font-medium mb-2">
              <Hash className="w-4 h-4 inline mr-1" />
              Hashtags
            </label>
            <Input
              id="hashtags"
              value={hashtags}
              onChange={(e) => setHashtags(e.target.value)}
              placeholder="#fashion #design #trending #inspiration"
              className="rounded-2xl"
            />
            <p className="text-xs text-slate-500 mt-1">
              Separate hashtags with spaces. They help others discover your content.
            </p>
          </div>

          {/* Submit Button */}
          <Button
            type="submit"
            disabled={isLoading || uploading || mediaItems.length === 0 || !caption.trim()}
            className="w-full rounded-2xl"
            variant="premium"
          >
            {isLoading || uploading ? (
              <div className="flex items-center justify-center">
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                {uploading ? 'Uploading...' : 'Creating Post...'}
              </div>
            ) : (
              'Share Post'
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}