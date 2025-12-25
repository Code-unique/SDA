// app/components/create-post.tsx
'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
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
  ImageIcon,
  Sparkles,
  TrendingUp,
  Tag
} from 'lucide-react'
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
import { cn } from '@/lib/utils'

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

interface TrendingHashtag {
  tag: string
  count: number
  trendScore?: number
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
          type="button"
          {...attributes}
          {...listeners}
          className="w-6 h-6 bg-black/50 backdrop-blur-sm text-white rounded-full flex items-center justify-center cursor-grab active:cursor-grabbing hover:bg-black/70 transition-colors"
        >
          <GripVertical className="w-3 h-3" />
        </button>
      </div>
      
      <div className="w-full h-32 bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-900 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700">
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
            <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent flex items-center justify-center">
              <div className="w-12 h-12 bg-black/50 backdrop-blur-sm rounded-full flex items-center justify-center group-hover:bg-black/70 transition-colors">
                <Play className="w-6 h-6 text-white fill-white" />
              </div>
            </div>
            {item.duration && (
              <div className="absolute bottom-2 right-2 bg-black/70 backdrop-blur-sm text-white text-xs px-2 py-1 rounded-lg">
                {Math.floor(item.duration)}s
              </div>
            )}
          </div>
        )}
        
        {/* Upload Progress */}
        {item.uploadStatus === 'uploading' && (
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/40 to-transparent flex items-center justify-center">
            <div className="text-center">
              <div className="w-10 h-10 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto mb-2" />
              <div className="w-32 h-1.5 bg-white/30 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-green-400 to-emerald-500 transition-all duration-300"
                  style={{ width: `${item.uploadProgress}%` }}
                />
              </div>
              <span className="text-white text-xs mt-2 block">{item.uploadProgress}%</span>
            </div>
          </div>
        )}
        
        {/* Error State */}
        {item.uploadStatus === 'error' && (
          <div className="absolute inset-0 bg-gradient-to-t from-red-500/60 to-red-400/40 flex items-center justify-center">
            <div className="text-center">
              <AlertCircle className="w-8 h-8 text-white mx-auto mb-2" />
              <span className="text-white text-xs block">Upload failed</span>
            </div>
          </div>
        )}
        
        {/* Uploaded State */}
        {item.uploadStatus === 'uploaded' && (
          <div className="absolute inset-0 bg-gradient-to-t from-green-500/60 to-emerald-400/40 flex items-center justify-center">
            <div className="text-center">
              <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center mx-auto mb-2">
                <Check className="w-6 h-6 text-white" />
              </div>
              <span className="text-white text-xs block">Ready</span>
            </div>
          </div>
        )}
      </div>
      
      {/* Remove Button */}
      <button
        type="button"
        onClick={() => onRemove(item.id)}
        className="absolute -top-2 -right-2 bg-gradient-to-r from-rose-500 to-pink-500 text-white rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition-all duration-300 z-20 hover:scale-110 shadow-lg"
      >
        <X className="w-3 h-3" />
      </button>
      
      {/* File Info */}
      <div className="mt-2 text-xs text-slate-500 dark:text-slate-400 truncate flex items-center justify-between">
        <div className="flex items-center space-x-1.5">
          {item.type === 'image' ? (
            <>
              <ImageIcon className="w-3 h-3" />
              <span>Image</span>
            </>
          ) : (
            <>
              <FileVideo className="w-3 h-3" />
              <span>Video</span>
            </>
          )}
        </div>
        <div className="flex items-center space-x-1.5">
          {item.type === 'video' && item.duration && (
            <>
              <Clock className="w-3 h-3" />
              <span>{Math.floor(item.duration)}s</span>
            </>
          )}
          <span>•</span>
          <span>{(item.size / 1024 / 1024).toFixed(1)}MB</span>
        </div>
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
  const [trendingHashtags, setTrendingHashtags] = useState<TrendingHashtag[]>([])
  const [loadingTrends, setLoadingTrends] = useState(false)
  const [showTrending, setShowTrending] = useState(false)
  
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

  // Fetch trending hashtags - FIXED: Simplified to avoid dependency issues
  const fetchTrendingHashtags = useCallback(async () => {
    try {
      setLoadingTrends(true)
      const response = await fetch('/api/hashtags/trending')
      
      if (response.ok) {
        const data = await response.json()
        if (data.success && data.hashtags) {
          setTrendingHashtags(data.hashtags)
        }
      }
    } catch (error) {
      console.error('Error fetching trending hashtags:', error)
    } finally {
      setLoadingTrends(false)
    }
  }, [])

  // Initialize trending hashtags - FIXED: Only fetch once on mount
  useEffect(() => {
    fetchTrendingHashtags()
  }, [fetchTrendingHashtags])

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
    
    // Update total duration
    const removedItem = mediaItems.find(item => item.id === id)
    if (removedItem?.duration) {
      setTotalDuration(prev => Math.max(0, prev - (removedItem.duration || 0)))
    }
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
        const oldDuration = items[itemIndex].duration || 0
        items[itemIndex] = { ...items[itemIndex], duration }
        return prev - oldDuration + duration
      }
      return prev
    })
  }, [mediaItems])

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event

    if (over && active.id !== over.id) {
      setMediaItems((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id)
        const newIndex = items.findIndex((item) => item.id === over.id)
        
        return arrayMove(items, oldIndex, newIndex)
      })
    }
  }

  const extractHashtags = (text: string) => {
    const hashtagRegex = /#(\w+)/g
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
        description: `Total video duration cannot exceed ${MAX_VIDEO_DURATION} seconds (${Math.floor(videoDuration)}s used)`,
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

  // Upload to Cloudinary - FIXED: Improved error handling
  const uploadToCloudinary = async (file: File, type: 'image' | 'video') => {
    return new Promise((resolve, reject) => {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('upload_preset', 'sutra_posts')
      formData.append('folder', `posts/${type}s`)
      
      if (type === 'video') {
        formData.append('resource_type', 'video')
        formData.append('eager', 'w_400,h_300,c_fill')
        formData.append('eager_async', 'true')
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

  const addHashtag = (tag: string) => {
    const currentTags = hashtags.trim().split(' ').filter(Boolean)
    const hashtag = `#${tag.toLowerCase()}`
    
    if (!currentTags.includes(hashtag)) {
      const newTags = [...currentTags, hashtag].join(' ')
      setHashtags(newTags)
    }
  }

  // Handle form submission - FIXED: Improved error handling and state management
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
          
          // Update to uploaded status
          setMediaItems(prev => prev.map(i => 
            i.id === item.id ? { ...i, uploadStatus: 'uploaded' } : i
          ))
          
          return {
            type: item.type,
            url: response.secure_url,
            publicId: response.public_id,
            thumbnail: item.type === 'video' ? response.eager?.[0]?.secure_url : undefined,
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

      // Extract hashtags from both caption and hashtags input
      const captionHashtags = extractHashtags(caption)
      const inputHashtags = extractHashtags(hashtags)
      const allHashtags = [...new Set([...captionHashtags, ...inputHashtags])]

      // Create post with all media
      const response = await fetch('/api/posts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          caption,
          hashtags: allHashtags,
          media: uploadedMedia
        }),
      })

      if (response.ok) {
        const result = await response.json()
        
        // Clean up preview URLs
        mediaItems.forEach(item => {
          URL.revokeObjectURL(item.preview)
        })
        
        setCaption('')
        setHashtags('')
        setMediaItems([])
        setTotalDuration(0)
        
        toast({
          title: "🎉 Post created successfully!",
          description: "Your content is now live for the world to see.",
        })
        
        onPostCreated?.()
        router.refresh()
        
        // Navigate to the post if available, otherwise to dashboard
        if (result.data?._id) {
          router.push(`/posts/${result.data._id}`)
        } else {
          router.push('/dashboard')
        }
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
    <Card className="rounded-2xl border-0 shadow-2xl bg-gradient-to-br from-white to-slate-50 dark:from-slate-800 dark:to-slate-900">
      <CardHeader>
        <CardTitle className="text-2xl font-bold bg-gradient-to-r from-rose-500 to-purple-500 bg-clip-text text-transparent">
          Create New Post
        </CardTitle>
        <CardDescription className="text-slate-600 dark:text-slate-400">
          Share your amazing content with the community. Upload up to 4 images or 1 video (max 2 minutes)
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Media Upload Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label className="block text-sm font-medium">
                Media Upload ({mediaStats.total}/4)
              </label>
              <Badge variant="outline" className="text-xs">
                Drag to reorder
              </Badge>
            </div>
            
            {/* Stats Bar */}
            <div className="p-4 bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-800/50 dark:to-slate-900/50 rounded-2xl border border-slate-200 dark:border-slate-700">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
                  <div className="text-lg font-bold text-slate-900 dark:text-white">{mediaStats.total}</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">Total Items</div>
                </div>
                <div className="text-center p-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
                  <div className="flex items-center justify-center space-x-2">
                    <Image className="w-4 h-4 text-blue-500" />
                    <div className="text-lg font-bold text-slate-900 dark:text-white">{mediaStats.images}</div>
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">Images</div>
                </div>
                <div className="text-center p-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
                  <div className="flex items-center justify-center space-x-2">
                    <Video className="w-4 h-4 text-purple-500" />
                    <div className="text-lg font-bold text-slate-900 dark:text-white">{mediaStats.videos}</div>
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">Videos</div>
                </div>
                <div className="text-center p-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
                  <div className="flex items-center justify-center space-x-2">
                    <Clock className="w-4 h-4 text-amber-500" />
                    <div className="text-lg font-bold text-slate-900 dark:text-white">
                      {Math.floor(mediaStats.totalDuration)}s
                    </div>
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">Duration</div>
                </div>
              </div>
            </div>
            
            {/* Upload Zone */}
            <div className="border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-2xl p-8 text-center hover:border-rose-400 dark:hover:border-rose-600 transition-colors duration-300 bg-gradient-to-br from-white to-slate-50 dark:from-slate-900 dark:to-slate-800">
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
                className={cn(
                  "cursor-pointer flex flex-col items-center space-y-4",
                  (mediaItems.length >= MAX_MEDIA_COUNT || uploading) && "opacity-50 cursor-not-allowed"
                )}
              >
                <div className="w-16 h-16 bg-gradient-to-r from-rose-100 to-pink-100 dark:from-rose-900/20 dark:to-pink-900/20 rounded-2xl flex items-center justify-center">
                  <Upload className="w-8 h-8 text-rose-500 dark:text-rose-400" />
                </div>
                <div>
                  <h4 className="font-semibold text-slate-900 dark:text-white mb-1">
                    Click to upload or drag and drop
                  </h4>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    Images and videos up to 100MB each
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    Maximum 4 items • Videos up to 2 minutes
                  </p>
                </div>
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
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
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
                  <div className="mt-4 p-4 bg-gradient-to-r from-amber-50 to-amber-100 dark:from-amber-900/20 dark:to-amber-800/20 text-amber-800 dark:text-amber-300 rounded-xl flex items-start space-x-3">
                    <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                    <p className="text-sm">
                      <strong>Multiple videos detected:</strong> You can only upload one video per post. Please remove extra videos.
                    </p>
                  </div>
                )}
                
                {mediaStats.totalDuration > MAX_VIDEO_DURATION && (
                  <div className="mt-4 p-4 bg-gradient-to-r from-red-50 to-rose-100 dark:from-red-900/20 dark:to-rose-800/20 text-red-800 dark:text-red-300 rounded-xl flex items-start space-x-3">
                    <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                    <p className="text-sm">
                      <strong>Duration limit exceeded:</strong> Total video duration ({Math.floor(mediaStats.totalDuration)}s) exceeds 2 minute limit.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Caption */}
          <div className="space-y-3">
            <label htmlFor="caption" className="block text-sm font-medium">
              Caption
            </label>
            <Textarea
              id="caption"
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="Share your story, inspiration, or what makes this content special..."
              className="rounded-2xl min-h-[120px] text-base border-2 border-slate-200 dark:border-slate-700 focus:border-rose-500 dark:focus:border-rose-400 transition-colors bg-white dark:bg-slate-800"
              required
              maxLength={2200}
            />
            <div className="flex justify-between items-center">
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {caption.length}/2200 characters
              </p>
              {extractHashtags(caption).length > 0 && (
                <Badge variant="outline" className="text-xs">
                  {extractHashtags(caption).length} hashtag(s) detected in caption
                </Badge>
              )}
            </div>
          </div>

          {/* Hashtags Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label htmlFor="hashtags" className="block text-sm font-medium flex items-center space-x-2">
                <Hash className="w-4 h-4 text-blue-500" />
                <span>Hashtags</span>
              </label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setShowTrending(!showTrending)}
                className="flex items-center space-x-1 text-xs"
              >
                <TrendingUp className="w-3 h-3" />
                <span>{showTrending ? 'Hide' : 'Show'} trending</span>
              </Button>
            </div>
            
            <Input
              id="hashtags"
              value={hashtags}
              onChange={(e) => setHashtags(e.target.value)}
              placeholder="#fashion #design #inspiration #trending"
              className="rounded-2xl border-2 border-slate-200 dark:border-slate-700 focus:border-blue-500 dark:focus:border-blue-400 transition-colors"
            />
            
            <div className="flex justify-between items-center">
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Separate hashtags with spaces
              </p>
              <Badge variant="outline" className="text-xs">
                {extractHashtags(hashtags).length} hashtag(s)
              </Badge>
            </div>

            {/* Trending Hashtags Section */}
            {showTrending && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Sparkles className="w-4 h-4 text-amber-500" />
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                      Trending Suggestions
                    </span>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={fetchTrendingHashtags}
                    disabled={loadingTrends}
                    className="h-6 w-6 p-0"
                  >
                    <Loader2 className={cn("w-3 h-3", loadingTrends && "animate-spin")} />
                  </Button>
                </div>
                
                {loadingTrends ? (
                  <div className="flex items-center justify-center p-4">
                    <Loader2 className="w-5 h-5 animate-spin text-amber-500" />
                  </div>
                ) : trendingHashtags.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {trendingHashtags.slice(0, 8).map((hashtag, index) => (
                      <Badge
                        key={hashtag.tag}
                        variant="secondary"
                        className={cn(
                          "cursor-pointer rounded-full transition-all duration-300 hover:scale-105",
                          index < 3 
                            ? "bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800"
                            : "hover:bg-blue-100 dark:hover:bg-blue-900/30"
                        )}
                        onClick={() => addHashtag(hashtag.tag)}
                      >
                        <div className="flex items-center space-x-1">
                          {index < 3 && (
                            <Sparkles className="w-3 h-3" />
                          )}
                          <span>#{hashtag.tag}</span>
                          <span className="text-xs opacity-70">({hashtag.count})</span>
                        </div>
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <div className="text-center p-4 text-slate-500 dark:text-slate-400 text-sm">
                    No trending hashtags found
                  </div>
                )}
              </div>
            )}

            {/* Quick Suggestions */}
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Tag className="w-4 h-4 text-emerald-500" />
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  Quick Suggestions
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {['fashion', 'design', 'art', 'photography', 'inspiration', 'creative', 'trending', 'style'].map((tag) => (
                  <Badge
                    key={tag}
                    variant="outline"
                    className="cursor-pointer rounded-full hover:bg-emerald-50 dark:hover:bg-emerald-900/20 hover:text-emerald-700 dark:hover:text-emerald-400 transition-colors"
                    onClick={() => addHashtag(tag)}
                  >
                    #{tag}
                  </Badge>
                ))}
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <Button
            type="submit"
            disabled={isLoading || uploading || mediaItems.length === 0 || !caption.trim()}
            className="w-full rounded-2xl h-12 text-base font-semibold bg-gradient-to-r from-rose-500 to-purple-500 hover:from-rose-600 hover:to-purple-600 text-white shadow-lg shadow-rose-500/25 hover:shadow-rose-500/40 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading || uploading ? (
              <div className="flex items-center justify-center">
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                {uploading ? 'Uploading Media...' : 'Creating Post...'}
              </div>
            ) : (
              '🎉 Share Your Post'
            )}
          </Button>

          {/* Status Summary */}
          <div className="p-4 bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-800/50 dark:to-slate-900/50 rounded-2xl border border-slate-200 dark:border-slate-700">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="text-center">
                <div className="text-sm font-medium text-slate-700 dark:text-slate-300">Media</div>
                <div className={cn(
                  "text-lg font-bold",
                  mediaItems.length === 0 ? "text-red-500" : "text-green-600"
                )}>
                  {mediaItems.length === 0 ? 'Required' : 'Ready'}
                </div>
              </div>
              <div className="text-center">
                <div className="text-sm font-medium text-slate-700 dark:text-slate-300">Caption</div>
                <div className={cn(
                  "text-lg font-bold",
                  !caption.trim() ? "text-red-500" : "text-green-600"
                )}>
                  {!caption.trim() ? 'Required' : 'Ready'}
                </div>
              </div>
              <div className="text-center">
                <div className="text-sm font-medium text-slate-700 dark:text-slate-300">Hashtags</div>
                <div className={cn(
                  "text-lg font-bold",
                  extractHashtags(hashtags).length + extractHashtags(caption).length === 0 
                    ? "text-amber-500" 
                    : "text-green-600"
                )}>
                  {extractHashtags(hashtags).length + extractHashtags(caption).length} tags
                </div>
              </div>
              <div className="text-center">
                <div className="text-sm font-medium text-slate-700 dark:text-slate-300">Video Duration</div>
                <div className={cn(
                  "text-lg font-bold",
                  mediaStats.totalDuration > MAX_VIDEO_DURATION 
                    ? "text-red-500" 
                    : mediaStats.videos > 0 
                      ? "text-green-600" 
                      : "text-slate-500"
                )}>
                  {Math.floor(mediaStats.totalDuration)}s
                </div>
              </div>
            </div>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}