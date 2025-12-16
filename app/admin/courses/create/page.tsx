'use client'

import { useState, useRef, useEffect, useCallback, useMemo, memo } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@clerk/nextjs'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { 
  Plus, 
  Trash2, 
  X, 
  Save, 
  BookOpen,
  Video,
  Image,
  Play,
  CheckCircle,
  AlertCircle,
  CloudUpload,
  FileUp,
  Pause,
  WifiOff,
  RefreshCw,
  HardDrive,
  Zap,
  Shield
} from 'lucide-react'

// ==================== TYPES & INTERFACES ====================
interface S3Asset {
  key: string
  url: string
  size: number
  type: 'image' | 'video'
  duration?: number
  width?: number
  height?: number
  uploadedAt?: string
}

interface UploadProgress {
  [key: string]: {
    progress: number
    fileName: string
    type: 'thumbnail' | 'previewVideo' | 'lessonVideo' | 'moduleThumbnail'
    status: 'initiating' | 'generating-urls' | 'uploading' | 'processing' | 'completed' | 'error' | 'paused' | 'cancelled'
    error?: string
    parts?: number
    currentPart?: number
    uploadSpeed?: number
    timeRemaining?: number
    isMultipart?: boolean
    size?: number
    uploadedBytes?: number
    startTime?: number
  }
}

interface MultipartUploadState {
  uploadId?: string
  fileKey?: string
  fileUrl?: string
  parts: Array<{
    partNumber: number
    start: number
    end: number
    presignedUrl?: string
    etag?: string
    status: 'pending' | 'uploading' | 'completed' | 'error'
    progress?: number
  }>
  isUploading: boolean
  totalProgress: number
  startTime?: number
  totalBytes?: number
  uploadedBytes?: number
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

// ==================== OPTIMIZED HELPER FUNCTIONS ====================
const formatFileSize = (bytes: number): string => {
  if (bytes >= 1024 * 1024 * 1024) {
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`
  }
  if (bytes >= 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
  }
  if (bytes >= 1024) {
    return `${(bytes / 1024).toFixed(2)} KB`
  }
  return `${bytes} B`
}

const formatDuration = (minutes: number): string => {
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`
}

const formatUploadSpeed = (bytesPerSecond: number): string => {
  if (bytesPerSecond >= 1024 * 1024) {
    return `${(bytesPerSecond / (1024 * 1024)).toFixed(1)} MB/s`
  }
  if (bytesPerSecond >= 1024) {
    return `${(bytesPerSecond / 1024).toFixed(1)} KB/s`
  }
  return `${bytesPerSecond.toFixed(1)} B/s`
}

const formatTimeRemaining = (seconds: number): string => {
  if (seconds <= 0) return 'Almost done'
  
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = Math.floor(seconds % 60)
  
  if (hours > 0) return `${hours}h ${minutes}m remaining`
  if (minutes > 0) return `${minutes}m ${secs}s remaining`
  return `${secs}s remaining`
}

// ==================== MEMOIZED COMPONENTS ====================
const UploadOptimizationTips = memo(({ fileSize, uploadStatus }: { fileSize: number, uploadStatus?: string }) => {
  const sizeInMB = fileSize / (1024 * 1024)
  const sizeInGB = fileSize / (1024 * 1024 * 1024)
  const isLargeFile = sizeInGB > 1
  
  return (
    <Card className="rounded-xl sm:rounded-2xl border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 dark:border-blue-800">
      <CardContent className="p-3 sm:p-4">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0">
            <div className="p-1.5 sm:p-2 bg-blue-100 dark:bg-blue-800 rounded-lg">
              {isLargeFile ? <HardDrive className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600 dark:text-blue-300" /> : <Zap className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600 dark:text-blue-300" />}
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start sm:items-center justify-between gap-2 mb-1 sm:mb-2">
              <p className="text-xs sm:text-sm font-semibold text-blue-800 dark:text-blue-300 truncate leading-tight sm:leading-normal">
                {isLargeFile ? `Large File (${sizeInGB.toFixed(1)}GB)` : `File (${sizeInMB.toFixed(0)}MB)`}
              </p>
              {uploadStatus && (
                <Badge variant="outline" className="text-xs px-1.5 py-0.5 h-auto">
                  {uploadStatus}
                </Badge>
              )}
            </div>
            <ul className="text-[11px] sm:text-xs text-blue-700 dark:text-blue-400 space-y-1">
              {isLargeFile && (
                <>
                  <li className="flex items-start gap-1.5">
                    <div className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-0.5 flex-shrink-0"></div>
                    <span className="truncate">Multipart upload for reliability</span>
                  </li>
                  <li className="flex items-start gap-1.5">
                    <div className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-0.5 flex-shrink-0"></div>
                    <span className="truncate">Parallel uploads for speed</span>
                  </li>
                </>
              )}
              <li className="flex items-start gap-1.5">
                <div className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-0.5 flex-shrink-0"></div>
                <span className="truncate">Keep page open during upload</span>
              </li>
              <li className="flex items-start gap-1.5">
                <div className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-0.5 flex-shrink-0"></div>
                <span className="truncate">Use stable connection</span>
              </li>
            </ul>
          </div>
        </div>
      </CardContent>
    </Card>
  )
})
UploadOptimizationTips.displayName = 'UploadOptimizationTips'

const UploadStatusCard = memo(({ upload, onCancel, onRetry }: {
  upload: UploadProgress[string]
  onCancel: () => void
  onRetry?: () => void
}) => {
  const getStatusColor = useCallback(() => {
    switch (upload.status) {
      case 'initiating': return 'bg-blue-500'
      case 'generating-urls': return 'bg-blue-500'
      case 'uploading': return 'bg-blue-500'
      case 'processing': return 'bg-yellow-500'
      case 'completed': return 'bg-green-500'
      case 'error': return 'bg-red-500'
      case 'paused': return 'bg-gray-500'
      case 'cancelled': return 'bg-gray-500'
      default: return 'bg-gray-500'
    }
  }, [upload.status])

  const getStatusIcon = useCallback(() => {
    switch (upload.status) {
      case 'initiating': return <CloudUpload className="w-3 h-3 sm:w-4 sm:h-4" />
      case 'generating-urls': return <FileUp className="w-3 h-3 sm:w-4 sm:h-4" />
      case 'uploading': return <CloudUpload className="w-3 h-3 sm:w-4 sm:h-4" />
      case 'processing': return <RefreshCw className="w-3 h-3 sm:w-4 sm:h-4 animate-spin" />
      case 'completed': return <CheckCircle className="w-3 h-3 sm:w-4 sm:h-4" />
      case 'error': return <AlertCircle className="w-3 h-3 sm:w-4 sm:h-4" />
      case 'paused': return <Pause className="w-3 h-3 sm:w-4 sm:h-4" />
      case 'cancelled': return <X className="w-3 h-3 sm:w-4 sm:h-4" />
      default: return <CloudUpload className="w-3 h-3 sm:w-4 sm:h-4" />
    }
  }, [upload.status])

  const getStatusText = useMemo(() => {
    switch (upload.status) {
      case 'initiating': return 'Preparing upload...'
      case 'generating-urls': return 'Generating URLs...'
      case 'uploading': 
        const partsText = upload.parts ? ` (${upload.currentPart}/${upload.parts})` : ''
        const speedText = upload.uploadSpeed ? ` • ${formatUploadSpeed(upload.uploadSpeed)}` : ''
        return `Uploading${partsText}${speedText}`
      case 'processing': return 'Finalizing...'
      case 'completed': return 'Completed'
      case 'error': return 'Failed'
      case 'paused': return 'Paused'
      case 'cancelled': return 'Cancelled'
      default: return 'Uploading...'
    }
  }, [upload])

  return (
    <div className="flex items-center gap-2 sm:gap-3 p-2.5 sm:p-4 bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-900 rounded-xl sm:rounded-2xl border border-slate-200 dark:border-slate-700">
      <div className={`p-1.5 sm:p-2 rounded-full ${getStatusColor()} text-white flex-shrink-0`}>
        {getStatusIcon()}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-0.5 sm:mb-1">
          <span className="font-medium text-xs sm:text-sm truncate max-w-[100px] xs:max-w-[120px] sm:max-w-[150px]">
            {upload.fileName}
          </span>
          <span className="text-xs sm:text-sm font-semibold flex-shrink-0">
            {Math.round(upload.progress)}%
          </span>
        </div>
        <Progress value={upload.progress} className="h-1 sm:h-1.5 mb-0.5 sm:mb-1" />
        <div className="flex items-center justify-between text-[10px] sm:text-xs text-slate-500">
          <span className="truncate max-w-[120px] xs:max-w-[150px] sm:max-w-none">{getStatusText}</span>
          {upload.isMultipart && (
            <span className="hidden xs:flex items-center flex-shrink-0 ml-1">
              <Shield className="w-2.5 h-2.5 sm:w-3 sm:h-3 mr-0.5" />
              <span className="hidden sm:inline">Multipart</span>
            </span>
          )}
        </div>
        {upload.error && (
          <p className="text-[10px] sm:text-xs text-red-500 mt-0.5 truncate max-w-[180px]">{upload.error}</p>
        )}
      </div>
      <div className="flex items-center gap-0.5 sm:gap-1 flex-shrink-0">
        {upload.status === 'error' && onRetry && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={onRetry}
            className="h-7 w-7 sm:h-8 sm:w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
          >
            <RefreshCw className="w-3 h-3" />
          </Button>
        )}
        {(upload.status === 'initiating' || upload.status === 'generating-urls' || upload.status === 'uploading') && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={onCancel}
            className="h-7 w-7 sm:h-8 sm:w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
          >
            <X className="w-3 h-3" />
          </Button>
        )}
      </div>
    </div>
  )
})
UploadStatusCard.displayName = 'UploadStatusCard'

// ==================== OPTIMIZED FILE UPLOAD AREA ====================
const FileUploadArea = memo(({
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
  onCancelUpload,
  onRetryUpload,
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
  onRetryUpload?: (identifier: string) => void
}) => {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragOver, setDragOver] = useState(false)

  const identifier = useMemo(() => 
    type === 'lessonVideo' 
      ? `lesson-${moduleIndex}-${chapterIndex}-${lessonIndex}` 
      : type === 'moduleThumbnail' 
        ? `module-${moduleIndex}-thumbnail` 
        : type
  , [type, moduleIndex, chapterIndex, lessonIndex])

  const upload = useMemo(() => 
    uploadProgress?.[identifier]
  , [uploadProgress, identifier])

  const isUploading = useMemo(() => 
    upload?.status === 'initiating' || 
    upload?.status === 'generating-urls' || 
    upload?.status === 'uploading' || 
    upload?.status === 'processing'
  , [upload])

  const isVideo = useMemo(() => 
    type === 'previewVideo' || type === 'lessonVideo'
  , [type])

  const handleFileSelect = useCallback(async (file: File) => {
    const dataTransfer = new DataTransfer()
    dataTransfer.items.add(file)
    const syntheticEvent = {
      target: { files: dataTransfer.files }
    } as React.ChangeEvent<HTMLInputElement>
    
    onFileChange(syntheticEvent)
  }, [onFileChange])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    
    const file = e.dataTransfer.files[0]
    if (file && acceptedFiles.split(',').some(ext => file.type.includes(ext.replace('*', '')))) {
      handleFileSelect(file)
    }
  }, [acceptedFiles, handleFileSelect])

  return (
    <div className="space-y-2 sm:space-y-4">
      <div className="flex items-center gap-1.5 sm:gap-2">
        {isVideo ? (
          <Video className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-rose-600 flex-shrink-0" />
        ) : (
          <Image className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-rose-600 flex-shrink-0" />
        )}
        <span className="text-xs sm:text-sm font-semibold truncate">{label}</span>
        <span className="text-[10px] sm:text-xs font-normal text-slate-500 flex-shrink-0 whitespace-nowrap">
          ({maxSize})
        </span>
      </div>
      
      <input
        ref={inputRef}
        type="file"
        accept={acceptedFiles}
        onChange={onFileChange}
        className="hidden"
        disabled={isUploading}
      />
      
      <div 
        className={`border-2 border-dashed rounded-xl sm:rounded-2xl p-3 sm:p-4 text-center cursor-pointer transition-all duration-200 min-h-[110px] sm:min-h-[140px] flex items-center justify-center ${
          dragOver 
            ? 'border-rose-400 bg-rose-50 dark:border-rose-500 dark:bg-rose-900/20' 
            : isUploading
              ? 'border-blue-300 bg-blue-50 dark:border-blue-700 dark:bg-blue-900/20 cursor-not-allowed' 
              : 'border-slate-300 dark:border-slate-600 hover:border-rose-400 hover:bg-rose-50/50 dark:hover:border-rose-500'
        }`}
        onClick={() => !isUploading && inputRef.current?.click()}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {currentFile ? (
          <div className="space-y-2 sm:space-y-3 w-full">
            <div className="relative mx-auto w-20 h-20 sm:w-32 sm:h-32">
              {isVideo ? (
                <>
                  <div className="w-full h-full bg-gradient-to-br from-slate-800 to-slate-900 rounded-lg sm:rounded-xl flex items-center justify-center">
                    <Play className="w-5 h-5 sm:w-8 sm:h-8 text-white" />
                  </div>
                  <div className="absolute bottom-1 right-1 bg-black/70 text-white text-[10px] sm:text-xs px-1 sm:px-2 py-0.5 rounded">
                    Video
                  </div>
                </>
              ) : (
                <img
                  src={currentFile.url}
                  alt="Preview"
                  className="w-full h-full object-cover rounded-lg sm:rounded-xl"
                  loading="lazy"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = `data:image/svg+xml,${encodeURIComponent('<svg width="200" height="200" viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg"><rect width="200" height="200" fill="%23F3F4F6"/><text x="50%" y="50%" font-family="Arial" font-size="12" fill="%23999" text-anchor="middle" dy=".3em">Image Uploaded</text></svg>')}`
                  }}
                />
              )}
            </div>
            <div className="px-1">
              <p className="text-xs sm:text-sm font-medium truncate px-2">
                {currentFile.url.split('/').pop()?.substring(0, 20)}...
              </p>
              <p className="text-[10px] sm:text-xs text-slate-500 mt-0.5">
                {formatFileSize(currentFile.size)}
                {currentFile.duration && ` • ${currentFile.duration}s`}
              </p>
              <p className="text-[10px] sm:text-xs text-slate-400 mt-0.5">
                Click to change file
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-2 sm:space-y-3 px-1">
            <div className="p-2 sm:p-3 rounded-full bg-gradient-to-r from-rose-100 to-pink-100 dark:from-rose-900/30 dark:to-pink-900/30 w-10 h-10 sm:w-12 sm:h-12 mx-auto flex items-center justify-center">
              {isVideo ? (
                <Video className="w-4 h-4 sm:w-5 sm:h-5 text-rose-600 dark:text-rose-400" />
              ) : (
                <Image className="w-4 h-4 sm:w-5 sm:h-5 text-rose-600 dark:text-rose-400" />
              )}
            </div>
            <div className="space-y-1">
              <p className="font-semibold text-xs sm:text-sm">
                {isUploading ? 'Uploading...' : `Upload ${isVideo ? 'Video' : 'Image'}`}
              </p>
              <p className="text-[10px] sm:text-xs text-slate-500">
                {dragOver ? 'Drop file here' : 'Click to browse'}
              </p>
              <p className="text-[10px] text-slate-400 mt-1 hidden sm:block">
                {acceptedFiles.split(',').join(', ')}
              </p>
              {isVideo && (
                <div className="mt-1 inline-flex items-center gap-0.5 text-[10px] sm:text-xs text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full max-w-full">
                  <Shield className="w-2.5 h-2.5 sm:w-3 sm:h-3 flex-shrink-0" />
                  <span className="truncate">10GB supported</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
      
      {/* Upload Status Display */}
      {upload && (
        <UploadStatusCard
          upload={upload}
          onCancel={() => onCancelUpload?.(identifier)}
          onRetry={onRetryUpload && (() => onRetryUpload(identifier))}
        />
      )}
    </div>
  )
})
FileUploadArea.displayName = 'FileUploadArea'

// ==================== OPTIMIZED UPLOAD HOOK ====================
const useEnhancedS3Upload = () => {
  const [uploadProgress, setUploadProgress] = useState<UploadProgress>({})
  const [multipartUploads, setMultipartUploads] = useState<Record<string, MultipartUploadState>>({})
  const [activeUploads, setActiveUploads] = useState<Set<string>>(new Set())
  const abortControllers = useRef<Map<string, AbortController>>(new Map())
  const uploadedBytesByPart = useRef<Record<string, Record<number, number>>>({})

  // Helper to get optimal concurrency based on connection
  const getConcurrencyLimit = useCallback((): number => {
    if (typeof navigator !== 'undefined' && 'connection' in navigator) {
      const conn = (navigator as any).connection;
      if (conn) {
        const downlink = conn.downlink; // in Mbps
        if (downlink > 50) return 8;
        if (downlink > 20) return 6;
        if (downlink > 5) return 4;
      }
    }
    return 3;
  }, []);

  // API Call Helper with enhanced error handling
  const apiCall = useCallback(async (endpoint: string, body: any, signal?: AbortSignal) => {
    console.log(`📤 API Call to ${endpoint}:`, { 
      ...body, 
      fileSize: body.fileSize ? `${formatFileSize(body.fileSize)}` : 'N/A' 
    })
    
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
        signal
      })

      console.log(`📥 API Response status: ${response.status} for ${endpoint}`)

      if (response.status === 401) {
        const failedRequest = { endpoint, body, timestamp: Date.now() }
        localStorage.setItem('failed_upload_request', JSON.stringify(failedRequest))
        
        const currentPath = window.location.pathname + window.location.search
        window.location.href = `/sign-in?redirect_url=${encodeURIComponent(currentPath)}`
        
        throw new Error('Authentication required. Redirecting to sign-in...')
      }

      if (response.status === 403) {
        throw new Error('Admin access required. Please contact support if you believe this is an error.')
      }

      if (!response.ok) {
        let errorData
        try {
          errorData = await response.json()
        } catch {
          errorData = { error: `HTTP ${response.status}: ${response.statusText}` }
        }
        
        console.error(`❌ API Error for ${endpoint}:`, errorData)
        
        if (response.status === 429) {
          throw new Error('Upload limit reached. Please try again in 15 minutes.')
        } else if (response.status === 400) {
          throw new Error(errorData.error || 'Invalid request. Please check your file and try again.')
        } else if (response.status === 500) {
          throw new Error('Server error. Please try again or contact support.')
        }
        
        throw new Error(errorData.error || errorData.details || `Upload failed: ${response.status}`)
      }

      const data = await response.json()
      
      if (!data.success && !data.uploadId && !data.presignedUrl) {
        throw new Error(data.error || 'Request failed')
      }
      
      console.log(`✅ API Success for ${endpoint}:`, data)
      return data

    } catch (error) {
      console.error(`❌ Network/API error for ${endpoint}:`, error)
      
      if (error instanceof TypeError && error.message === 'Failed to fetch') {
        throw new Error('Network error. Please check your internet connection and try again.')
      }
      
      if (error instanceof DOMException && error.name === 'AbortError') {
        throw new Error('Upload cancelled')
      }
      
      throw error
    }
  }, [])

  // Update progress with smooth animation
  const updateProgress = useCallback((identifier: string, updates: Partial<UploadProgress[string]>) => {
    setUploadProgress(prev => {
      const current = prev[identifier]
      if (!current) return prev
      
      return {
        ...prev,
        [identifier]: {
          ...current,
          ...updates
        }
      }
    })
  }, [])

  // Function to upload a single part with retry logic
  const uploadPartWithRetry = useCallback(async (
    part: { partNumber: number; start: number; end: number; presignedUrl?: string },
    file: File,
    identifier: string,
    startTime: number,
    abortController: AbortController,
    maxRetries = 3
  ): Promise<{ ETag: string; PartNumber: number }> => {
    let lastError: Error | null = null;
    const partSize = part.end - part.start;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        if (abortController.signal.aborted) {
          throw new Error('Upload cancelled');
        }

        if (!part.presignedUrl) {
          throw new Error('No presigned URL available for part');
        }

        const blob = file.slice(part.start, part.end);
        
        // Upload using XMLHttpRequest for better progress tracking
        return await new Promise<{ ETag: string; PartNumber: number }>((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          
          xhr.upload.addEventListener('progress', (event) => {
            if (event.lengthComputable) {
              // Track bytes for this specific part
              if (!uploadedBytesByPart.current[identifier]) {
                uploadedBytesByPart.current[identifier] = {};
              }
              uploadedBytesByPart.current[identifier][part.partNumber] = event.loaded;
              
              // Calculate total uploaded bytes across all parts
              const partBytes = uploadedBytesByPart.current[identifier];
              const totalUploadedBytes = Object.values(partBytes).reduce((sum, bytes) => sum + bytes, 0);
              
              // Calculate progress (15-95% range for upload phase)
              const uploadProgress = 15 + (totalUploadedBytes / file.size) * 80;
              
              // Calculate speed
              const elapsedSeconds = (Date.now() - startTime) / 1000;
              const uploadSpeed = totalUploadedBytes / elapsedSeconds;
              
              // Calculate remaining time
              const remainingBytes = file.size - totalUploadedBytes;
              const timeRemaining = uploadSpeed > 0 ? remainingBytes / uploadSpeed : 0;
              
              updateProgress(identifier, {
                progress: Math.min(Math.round(uploadProgress), 95),
                currentPart: part.partNumber,
                uploadSpeed,
                timeRemaining,
                uploadedBytes: totalUploadedBytes
              });
            }
          });
          
          xhr.addEventListener('load', () => {
            if (xhr.status === 200) {
              // Extract ETag safely
              const etag = xhr.getResponseHeader('etag') || 
                           xhr.getResponseHeader('ETag')?.replace(/"/g, '');
              
              if (!etag) {
                reject(new Error(`No ETag received for part ${part.partNumber}`));
                return;
              }
              
              // Mark this part as fully uploaded
              if (uploadedBytesByPart.current[identifier]) {
                uploadedBytesByPart.current[identifier][part.partNumber] = partSize;
              }
              
              resolve({ ETag: etag, PartNumber: part.partNumber });
            } else {
              reject(new Error(`Part upload failed: ${xhr.status}`));
            }
          });
          
          xhr.addEventListener('error', () => reject(new Error('Network error during part upload')));
          xhr.addEventListener('abort', () => reject(new Error('Upload cancelled')));
          
          if (!part.presignedUrl) {
  console.error('Missing presigned URL for part:', part);
  reject(new Error(`Missing presigned URL for part ${part.partNumber}`));
  return;
}
xhr.open('PUT', part.presignedUrl);
          xhr.setRequestHeader('Content-Type', file.type);
          xhr.send(blob);
        });

      } catch (error) {
        lastError = error as Error;
        console.warn(`Attempt ${attempt} failed for part ${part.partNumber}:`, error);

        if (attempt < maxRetries) {
          const delay = 1000 * Math.pow(2, attempt - 1);
          console.log(`Retrying part ${part.partNumber} in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    throw lastError || new Error(`Failed to upload part ${part.partNumber} after ${maxRetries} attempts`);
  }, [updateProgress]);

  // Main Upload Function with 10GB Support
  const uploadFile = useCallback(async (
    file: File,
    type: 'thumbnail' | 'previewVideo' | 'lessonVideo' | 'moduleThumbnail',
    identifier: string,
    moduleIndex?: number
  ): Promise<S3Asset> => {
    // Set maximum file size to 10 GB
    const MAX_FILE_SIZE = 10 * 1024 * 1024 * 1024 // 10 GB
    if (file.size > MAX_FILE_SIZE) {
      throw new Error(`File too large. Maximum size: 10GB. Your file: ${formatFileSize(file.size)}`)
    }

    // Create abort controller for this upload
    const abortController = new AbortController()
    abortControllers.current.set(identifier, abortController)
    
    // Determine if we should use multipart upload (for files > 100MB)
    const shouldUseMultipart = file.size > 100 * 1024 * 1024 // 100MB threshold
    const OPTIMAL_PART_SIZE = 25 * 1024 * 1024 // 25MB parts for multipart
    const PART_SIZE = shouldUseMultipart ? OPTIMAL_PART_SIZE : file.size
    const CONCURRENCY_LIMIT = getConcurrencyLimit()

    try {
      // Add to active uploads
      setActiveUploads(prev => new Set([...prev, identifier]))
      
      // Initialize upload progress
      setUploadProgress(prev => ({
        ...prev,
        [identifier]: {
          progress: 0,
          fileName: file.name,
          type,
          status: 'initiating',
          isMultipart: shouldUseMultipart,
          size: file.size,
          uploadedBytes: 0,
          startTime: Date.now()
        }
      }))

      let uploadId: string
      let fileKey: string
      let fileUrl: string

      if (shouldUseMultipart) {
        // ========== MULTIPART UPLOAD (for files > 100MB) ==========
        console.log(`🚀 Starting multipart upload for ${file.name} (${formatFileSize(file.size)})`)

        // Step 1: Initiate multipart upload
        const initData = await apiCall('/api/admin/upload/initiate', {
          fileName: file.name,
          fileType: file.type,
          folder: `${type}s`
        }, abortController.signal)
        uploadId = initData.uploadId
        fileKey = initData.fileKey
        fileUrl = initData.fileUrl

        if (!uploadId || !fileKey) {
          throw new Error('Failed to initiate multipart upload: Missing uploadId or fileKey')
        }

        console.log(`✅ Multipart upload initiated:`, { uploadId, fileKey })

        updateProgress(identifier, {
          progress: 5,
          status: 'generating-urls'
        })

        // Step 2: Calculate parts
        const totalParts = Math.ceil(file.size / PART_SIZE)
        const parts = Array.from({ length: totalParts }, (_, i) => ({
          partNumber: i + 1,
          start: i * PART_SIZE,
          end: Math.min((i + 1) * PART_SIZE, file.size),
          presignedUrl: undefined as string | undefined,
          etag: undefined as string | undefined,
          status: 'pending' as const,
          progress: 0
        }))

        console.log(`📊 Total parts to upload: ${totalParts}`)

        updateProgress(identifier, {
          progress: 10,
          status: 'uploading',
          parts: totalParts,
          currentPart: 1
        })

        // Store multipart state
        setMultipartUploads(prev => ({
          ...prev,
          [identifier]: {
            uploadId,
            fileKey,
            fileUrl,
            parts,
            isUploading: true,
            totalProgress: 10,
            startTime: Date.now(),
            totalBytes: file.size,
            uploadedBytes: 0
          }
        }))

        // Step 3: Generate ALL presigned URLs at once
        console.log(`🔗 Generating presigned URLs for ${totalParts} parts...`)
        
        const bulkUrlData = await apiCall('/api/admin/upload/parts', {
          fileKey,
          uploadId,
          totalParts
        }, abortController.signal)
        const presignedUrls = bulkUrlData.presignedUrls
        
        if (!presignedUrls || presignedUrls.length !== totalParts) {
          throw new Error(`Failed to generate presigned URLs. Expected ${totalParts}, got ${presignedUrls?.length || 0}`)
        }
        
        const partsWithUrls = parts.map((part, index) => ({
          ...part,
          presignedUrl: presignedUrls[index]
        }))

        console.log(`✅ All presigned URLs generated successfully`)

        updateProgress(identifier, {
          progress: 15
        })

        // Step 4: Upload parts in batches with progress tracking
        const uploadedParts: Array<{ ETag: string; PartNumber: number }> = []
        
        // Initialize progress tracking for this upload
        uploadedBytesByPart.current[identifier] = {}

        // Upload parts in batches
        for (let i = 0; i < partsWithUrls.length; i += CONCURRENCY_LIMIT) {
          const batch = partsWithUrls.slice(i, i + CONCURRENCY_LIMIT)
          
          // Check if upload was cancelled
          if (abortController.signal.aborted) {
            throw new Error('Upload cancelled')
          }

          console.log(`📤 Uploading batch ${Math.floor(i/CONCURRENCY_LIMIT) + 1} of ${Math.ceil(partsWithUrls.length/CONCURRENCY_LIMIT)}`)

          // Update batch parts to uploading status
          batch.forEach(part => {
            setMultipartUploads(prev => ({
              ...prev,
              [identifier]: {
                ...prev[identifier]!,
                parts: prev[identifier]!.parts.map(p => 
                  p.partNumber === part.partNumber 
                    ? { ...p, status: 'uploading' }
                    : p
                )
              }
            }))
          })

          // Upload batch in parallel
          const batchPromises = batch.map(async (part) => {
            try {
              // Upload part with retry logic
              const result = await uploadPartWithRetry(part, file, identifier, Date.now(), abortController)
              
              // Update part status to completed
              setMultipartUploads(prev => ({
                ...prev,
                [identifier]: {
                  ...prev[identifier]!,
                  parts: prev[identifier]!.parts.map(p => 
                    p.partNumber === part.partNumber 
                      ? { ...p, status: 'completed', etag: result.ETag, progress: 100 }
                      : p
                  )
                }
              }))

              return result
            } catch (error) {
              // Update part status to error
              setMultipartUploads(prev => ({
                ...prev,
                [identifier]: {
                  ...prev[identifier]!,
                  parts: prev[identifier]!.parts.map(p => 
                    p.partNumber === part.partNumber 
                      ? { ...p, status: 'error' }
                      : p
                  )
                }
              }))
              throw error
            }
          })

          // Wait for batch to complete
          const batchResults = await Promise.all(batchPromises)
          uploadedParts.push(...batchResults)
          
          console.log(`✅ Batch ${Math.floor(i/CONCURRENCY_LIMIT) + 1} completed: ${batchResults.length} parts uploaded`)
        }

        // Sort parts by part number for completion
        uploadedParts.sort((a, b) => a.PartNumber - b.PartNumber)

        // Step 5: Complete multipart upload
        console.log(`✅ All parts uploaded. Completing multipart upload...`)
        
        updateProgress(identifier, {
          progress: 98,
          status: 'processing'
        })

        try {
          const completeData = await apiCall('/api/admin/upload/complete', {
            fileKey,
            uploadId,
            parts: uploadedParts
          }, abortController.signal)
          fileUrl = completeData.fileUrl || fileUrl
          console.log(`🎉 Multipart upload completed successfully! File URL: ${fileUrl}`)
        } catch (error) {
          console.error('❌ Error completing multipart upload:', error)
          // Try to abort the upload if completion fails
          try {
            await apiCall('/api/admin/upload/abort', {
              fileKey,
              uploadId
            }, abortController.signal)
          } catch (abortError) {
            console.warn('Failed to abort upload:', abortError)
          }
          throw error
        }

      } else {
        // ========== SINGLE PART UPLOAD (for small files) ==========
        console.log(`📤 Starting single-part upload for ${file.name} (${formatFileSize(file.size)})`)

        const initData = await apiCall('/api/admin/upload', {
          fileName: file.name,
          fileType: file.type,
          fileSize: file.size,
          folder: `${type}s`
        }, abortController.signal)

        fileKey = initData.fileKey
        fileUrl = initData.fileUrl
        const { presignedUrl } = initData

        if (!presignedUrl) {
          throw new Error('No presigned URL received from server')
        }

        // Upload the file using XMLHttpRequest for progress tracking
        updateProgress(identifier, {
          progress: 30,
          status: 'uploading'
        })

        await new Promise<void>((resolve, reject) => {
          const xhr = new XMLHttpRequest()
          const startTime = Date.now()
          
          xhr.upload.addEventListener('progress', (event) => {
            if (event.lengthComputable) {
              const progress = 30 + (event.loaded / event.total) * 65 // 30-95% range
              const elapsedSeconds = (Date.now() - startTime) / 1000
              const uploadSpeed = event.loaded / elapsedSeconds
              
              updateProgress(identifier, {
                progress: Math.round(progress),
                uploadSpeed,
                timeRemaining: uploadSpeed > 0 
                  ? (event.total - event.loaded) / uploadSpeed 
                  : 0,
                uploadedBytes: event.loaded
              })
            }
          })

          xhr.addEventListener('load', () => {
            if (xhr.status === 200) {
              resolve()
            } else {
              reject(new Error(`Upload failed with status: ${xhr.status}`))
            }
          })

          xhr.addEventListener('error', () => {
            reject(new Error('Network error during upload'))
          })

          xhr.addEventListener('abort', () => {
            reject(new Error('Upload cancelled'))
          })

          xhr.open('PUT', presignedUrl)
          xhr.setRequestHeader('Content-Type', file.type)
          xhr.send(file)
        })
      }

      // Final success update
      updateProgress(identifier, {
        progress: 100,
        status: 'completed'
      })

      // Clear progress after success
      setTimeout(() => {
        setUploadProgress(prev => {
          const newProgress = { ...prev }
          delete newProgress[identifier]
          return newProgress
        })
        setMultipartUploads(prev => {
          const newUploads = { ...prev }
          delete newUploads[identifier]
          return newUploads
        })
        setActiveUploads(prev => {
          const newSet = new Set(prev)
          newSet.delete(identifier)
          return newSet
        })
        delete uploadedBytesByPart.current[identifier]
        abortControllers.current.delete(identifier)
      }, 3000)

      return {
        key: fileKey!,
        url: fileUrl!,
        size: file.size,
        type: type === 'thumbnail' || type === 'moduleThumbnail' ? 'image' : 'video',
        duration: type.includes('video') ? 0 : undefined,
        uploadedAt: new Date().toISOString()
      }

    } catch (error) {
      console.error('❌ Upload error:', error)
      
      // Update error state
      updateProgress(identifier, {
        status: 'error',
        error: error instanceof Error ? error.message : 'Upload failed'
      })

      // Remove from active uploads
      setActiveUploads(prev => {
        const newSet = new Set(prev)
        newSet.delete(identifier)
        return newSet
      })
      
      // Clean up abort controller
      abortControllers.current.delete(identifier)
      delete uploadedBytesByPart.current[identifier]
      
      throw error
    }
  }, [apiCall, updateProgress, uploadPartWithRetry, getConcurrencyLimit])

  const cancelUpload = useCallback(async (identifier: string) => {
    // Abort the upload
    const controller = abortControllers.current.get(identifier)
    if (controller) {
      controller.abort()
    }

    // If it's a multipart upload, abort on S3 too
    const upload = uploadProgress[identifier]
    const multipartState = multipartUploads[identifier]
    
    if (upload?.isMultipart && multipartState?.uploadId && multipartState?.fileKey) {
      try {
        await apiCall('/api/admin/upload/abort', {
          fileKey: multipartState.fileKey,
          uploadId: multipartState.uploadId
        })
        console.log(`✅ Multipart upload ${identifier} aborted on S3`)
      } catch (error) {
        console.warn('Failed to abort multipart upload on S3:', error)
      }
    }

    // Update progress to cancelled
    updateProgress(identifier, {
      status: 'cancelled',
      progress: 0
    })

    // Remove from active uploads
    setActiveUploads(prev => {
      const newSet = new Set(prev)
      newSet.delete(identifier)
      return newSet
    })

    // Clean up after delay
    setTimeout(() => {
      setUploadProgress(prev => {
        const newProgress = { ...prev }
        delete newProgress[identifier]
        return newProgress
      })
      setMultipartUploads(prev => {
        const newUploads = { ...prev }
        delete newUploads[identifier]
        return newUploads
      })
      delete uploadedBytesByPart.current[identifier]
      abortControllers.current.delete(identifier)
    }, 1000)
  }, [apiCall, multipartUploads, uploadProgress, updateProgress])

  const retryUpload = useCallback(async (
    file: File,
    type: 'thumbnail' | 'previewVideo' | 'lessonVideo' | 'moduleThumbnail',
    identifier: string,
    moduleIndex?: number
  ) => {
    // Clear previous error state
    setUploadProgress(prev => {
      const newProgress = { ...prev }
      delete newProgress[identifier]
      return newProgress
    })
    
    // Clean up any existing tracking
    delete uploadedBytesByPart.current[identifier]
    
    // Retry the upload
    return uploadFile(file, type, identifier, moduleIndex)
  }, [uploadFile])

  return useMemo(() => ({ 
    uploadProgress, 
    uploadFile, 
    cancelUpload, 
    retryUpload, 
    multipartUploads,
    activeUploads: Array.from(activeUploads)
  }), [uploadProgress, uploadFile, cancelUpload, retryUpload, multipartUploads, activeUploads])
}

// ==================== MAIN CREATE COURSE PAGE ====================
export default function CreateCoursePage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [isClient, setIsClient] = useState(false)
  const [userRole, setUserRole] = useState<string | null>(null)
  const [checkingAuth, setCheckingAuth] = useState(true)
  const [networkStatus, setNetworkStatus] = useState<'online' | 'offline'>(typeof window !== 'undefined' ? (navigator.onLine ? 'online' : 'offline') : 'online')
  const [uploadStats, setUploadStats] = useState({
    totalFiles: 0,
    totalSize: 0,
    completedFiles: 0
  })
  
  const { 
    uploadProgress, 
    uploadFile: enhancedUploadFile, 
    cancelUpload, 
    retryUpload,
    multipartUploads,
    activeUploads
  } = useEnhancedS3Upload()
  
  const { isSignedIn, isLoaded, userId } = useAuth()

  // Form state
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
    isFeatured: false
  })

  const [newTag, setNewTag] = useState('')
  const [newRequirement, setNewRequirement] = useState('')
  const [newOutcome, setNewOutcome] = useState('')

  // Effect hooks
  useEffect(() => {
    setIsClient(true)
    
    const handleOnline = () => {
      setNetworkStatus('online')
      console.log('🌐 Network: Online')
    }
    const handleOffline = () => {
      setNetworkStatus('offline')
      console.log('🌐 Network: Offline')
    }
    
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  useEffect(() => {
    const checkUserRole = async () => {
      if (isLoaded && isClient && isSignedIn && userId) {
        try {
          setCheckingAuth(true)
          const response = await fetch('/api/users/me')
          
          if (response.ok) {
            const data = await response.json()
            const userData = data.user || data
            
            if (userData.role === 'admin') {
              setUserRole('admin')
            } else {
              setUserRole(userData.role || 'user')
              router.push('/')
            }
          } else {
            console.error('Failed to fetch user role:', response.status)
            setUserRole(null)
          }
        } catch (error) {
          console.error('Error checking user role:', error)
          setUserRole(null)
        } finally {
          setCheckingAuth(false)
        }
      } else if (isLoaded && !isSignedIn) {
        router.push('/sign-in')
      } else {
        setCheckingAuth(false)
      }
    }

    checkUserRole()
  }, [isLoaded, isSignedIn, isClient, userId, router])

  // Calculate upload statistics
  useEffect(() => {
    const uploads = Object.values(uploadProgress)
    const stats = {
      totalFiles: uploads.length,
      totalSize: uploads.reduce((sum, upload) => sum + (upload.size || 0), 0),
      completedFiles: uploads.filter(u => u.status === 'completed').length
    }
    setUploadStats(stats)
  }, [uploadProgress])

  // Memoized values for performance
  const totalDuration = useMemo(() => formData.modules.reduce((total, module) => {
    return total + module.chapters.reduce((chapterTotal, chapter) => {
      return chapterTotal + chapter.lessons.reduce((lessonTotal, lesson) => 
        lessonTotal + lesson.duration, 0)
    }, 0)
  }, 0), [formData.modules])

  const totalLessons = useMemo(() => formData.modules.reduce((total, module) => {
    return total + module.chapters.reduce((chapterTotal, chapter) => 
      chapterTotal + chapter.lessons.length, 0)
  }, 0), [formData.modules])

  const totalChapters = useMemo(() => formData.modules.reduce((total, module) => total + module.chapters.length, 0), [formData.modules])

  // File upload handlers
  const handleThumbnailChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      try {
        const result = await enhancedUploadFile(file, 'thumbnail', 'thumbnail')
        setFormData(prev => ({ ...prev, thumbnail: result }))
      } catch (error) {
        console.error('Error uploading thumbnail:', error)
      }
    }
  }, [enhancedUploadFile])

  const handlePreviewVideoChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      try {
        const result = await enhancedUploadFile(file, 'previewVideo', 'previewVideo')
        setFormData(prev => ({ ...prev, previewVideo: result }))
      } catch (error) {
        console.error('Error uploading preview video:', error)
      }
    }
  }, [enhancedUploadFile])

  const handleModuleThumbnailChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>, moduleIndex: number) => {
    const file = e.target.files?.[0]
    if (file) {
      try {
        const result = await enhancedUploadFile(file, 'moduleThumbnail', `module-${moduleIndex}-thumbnail`, moduleIndex)
        const updatedModules = [...formData.modules]
        updatedModules[moduleIndex].thumbnailUrl = result.url
        setFormData(prev => ({ ...prev, modules: updatedModules }))
      } catch (error) {
        console.error('Error uploading module thumbnail:', error)
      }
    }
  }, [enhancedUploadFile, formData.modules])

  const handleLessonVideoChange = useCallback(async (
    e: React.ChangeEvent<HTMLInputElement>, 
    moduleIndex: number, 
    chapterIndex: number, 
    lessonIndex: number
  ) => {
    const file = e.target.files?.[0]
    if (file) {
      const identifier = `lesson-${moduleIndex}-${chapterIndex}-${lessonIndex}`
      try {
        const result = await enhancedUploadFile(file, 'lessonVideo', identifier, moduleIndex)
        const updatedModules = [...formData.modules]
        updatedModules[moduleIndex].chapters[chapterIndex].lessons[lessonIndex].video = result
        setFormData(prev => ({ ...prev, modules: updatedModules }))
      } catch (error) {
        console.error('Error uploading lesson video:', error)
      }
    }
  }, [enhancedUploadFile, formData.modules])

  const handleRetryUpload = useCallback(async (identifier: string) => {
    const upload = uploadProgress[identifier]
    if (!upload) return

    // Create file input for user to select the file again
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = upload.type.includes('video') 
      ? 'video/mp4,video/webm,video/ogg,video/quicktime,video/mov' 
      : 'image/jpeg,image/jpg,image/png,image/webp'
    
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (!file) return

      try {
        // Determine the type and module info from identifier
        let moduleIndex: number | undefined
        let chapterIndex: number | undefined
        let lessonIndex: number | undefined
        
        if (identifier.startsWith('lesson-')) {
          const parts = identifier.split('-')
          moduleIndex = parseInt(parts[1])
          chapterIndex = parseInt(parts[2])
          lessonIndex = parseInt(parts[3])
        }
        
        const type = upload.type as 'thumbnail' | 'previewVideo' | 'lessonVideo' | 'moduleThumbnail'
        
        // Retry the upload
        const result = await enhancedUploadFile(file, type, identifier, moduleIndex)
        
        // Update the form data with the new upload result
        if (type === 'thumbnail') {
          setFormData(prev => ({ ...prev, thumbnail: result }))
        } else if (type === 'previewVideo') {
          setFormData(prev => ({ ...prev, previewVideo: result }))
        } else if (type === 'moduleThumbnail' && moduleIndex !== undefined) {
          const updatedModules = [...formData.modules]
          updatedModules[moduleIndex].thumbnailUrl = result.url
          setFormData(prev => ({ ...prev, modules: updatedModules }))
        } else if (type === 'lessonVideo' && moduleIndex !== undefined && chapterIndex !== undefined && lessonIndex !== undefined) {
          const updatedModules = [...formData.modules]
          updatedModules[moduleIndex].chapters[chapterIndex].lessons[lessonIndex].video = result
          setFormData(prev => ({ ...prev, modules: updatedModules }))
        }
        
      } catch (error) {
        console.error('Retry failed:', error)
      }
    }
    
    input.click()
  }, [enhancedUploadFile, uploadProgress, formData.modules])

  // Tag management
  const addTag = useCallback(() => {
    if (newTag.trim() && !formData.tags.includes(newTag.trim())) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, newTag.trim()]
      }))
      setNewTag('')
    }
  }, [newTag, formData.tags])

  const removeTag = useCallback((tagToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }))
  }, [])

  // Requirements & Outcomes
  const addRequirement = useCallback(() => {
    if (newRequirement.trim()) {
      setFormData(prev => ({
        ...prev,
        requirements: [...prev.requirements, newRequirement.trim()]
      }))
      setNewRequirement('')
    }
  }, [newRequirement])

  const removeRequirement = useCallback((index: number) => {
    setFormData(prev => ({
      ...prev,
      requirements: prev.requirements.filter((_, i) => i !== index)
    }))
  }, [])

  const addOutcome = useCallback(() => {
    if (newOutcome.trim()) {
      setFormData(prev => ({
        ...prev,
        learningOutcomes: [...prev.learningOutcomes, newOutcome.trim()]
      }))
      setNewOutcome('')
    }
  }, [newOutcome])

  const removeOutcome = useCallback((index: number) => {
    setFormData(prev => ({
      ...prev,
      learningOutcomes: prev.learningOutcomes.filter((_, i) => i !== index)
    }))
  }, [])

  // Module management
  const addModule = useCallback(() => {
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
  }, [])

  const removeModule = useCallback((moduleIndex: number) => {
    setFormData(prev => ({
      ...prev,
      modules: prev.modules.filter((_, index) => index !== moduleIndex)
    }))
  }, [])

  // Chapter management
  const addChapter = useCallback((moduleIndex: number) => {
    const updatedModules = [...formData.modules]
    updatedModules[moduleIndex].chapters.push({
      title: '',
      description: '',
      order: updatedModules[moduleIndex].chapters.length,
      lessons: []
    })
    setFormData(prev => ({ ...prev, modules: updatedModules }))
  }, [formData.modules])

  const removeChapter = useCallback((moduleIndex: number, chapterIndex: number) => {
    const updatedModules = [...formData.modules]
    updatedModules[moduleIndex].chapters = updatedModules[moduleIndex].chapters.filter(
      (_, index) => index !== chapterIndex
    )
    setFormData(prev => ({ ...prev, modules: updatedModules }))
  }, [formData.modules])

  // Lesson management
  const addLesson = useCallback((moduleIndex: number, chapterIndex: number) => {
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
  }, [formData.modules])

  const removeLesson = useCallback((moduleIndex: number, chapterIndex: number, lessonIndex: number) => {
    const updatedModules = [...formData.modules]
    updatedModules[moduleIndex].chapters[chapterIndex].lessons = 
      updatedModules[moduleIndex].chapters[chapterIndex].lessons.filter(
        (_, index) => index !== lessonIndex
      )
    setFormData(prev => ({ ...prev, modules: updatedModules }))
  }, [formData.modules])

  const addResource = useCallback((moduleIndex: number, chapterIndex: number, lessonIndex: number) => {
    const updatedModules = [...formData.modules]
    updatedModules[moduleIndex].chapters[chapterIndex].lessons[lessonIndex].resources.push({
      title: '',
      url: '',
      type: 'pdf'
    })
    setFormData(prev => ({ ...prev, modules: updatedModules }))
  }, [formData.modules])

  const removeResource = useCallback((moduleIndex: number, chapterIndex: number, lessonIndex: number, resourceIndex: number) => {
    const updatedModules = [...formData.modules]
    updatedModules[moduleIndex].chapters[chapterIndex].lessons[lessonIndex].resources = 
      updatedModules[moduleIndex].chapters[chapterIndex].lessons[lessonIndex].resources.filter(
        (_, index) => index !== resourceIndex
      )
    setFormData(prev => ({ ...prev, modules: updatedModules }))
  }, [formData.modules])

  // Form submission
  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Check for active uploads
    const hasActiveUploads = activeUploads.length > 0
    
    if (hasActiveUploads) {
      alert('Please wait for all uploads to complete before submitting')
      return
    }

    // Check network status
    if (networkStatus === 'offline') {
      alert('You are offline. Please check your internet connection and try again.')
      return
    }

    // Validate required fields
    if (!formData.thumbnail) {
      alert('Please upload a course thumbnail')
      return
    }

    if (!formData.title.trim()) {
      alert('Please enter a course title')
      return
    }

    if (!formData.description.trim()) {
      alert('Please enter a course description')
      return
    }

    // Validate all lessons have videos
    const missingVideos = formData.modules.some(module => 
      module.chapters.some(chapter => 
        chapter.lessons.some(lesson => !lesson.video)
      )
    )

    if (missingVideos) {
      alert('All lessons must have a video uploaded')
      return
    }

    setLoading(true)

    try {
      console.log('📤 Creating course with data:', {
        ...formData,
        modules: formData.modules.map(module => ({
          ...module,
          chapters: module.chapters.map(chapter => ({
            ...chapter,
            lessons: chapter.lessons.map(lesson => ({
              ...lesson,
              video: lesson.video ? {
                key: lesson.video.key,
                url: lesson.video.url,
                size: lesson.video.size,
                type: lesson.video.type
              } : undefined
            }))
          }))
        }))
      })

      const response = await fetch('/api/admin/courses', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          thumbnail: formData.thumbnail ? {
            key: formData.thumbnail.key,
            url: formData.thumbnail.url,
            size: formData.thumbnail.size,
            type: formData.thumbnail.type
          } : null,
          previewVideo: formData.previewVideo ? {
            key: formData.previewVideo.key,
            url: formData.previewVideo.url,
            size: formData.previewVideo.size,
            type: formData.previewVideo.type
          } : null
        }),
      })

      const responseData = await response.json()
      
      if (response.ok) {
        console.log('✅ Course created successfully:', responseData)
        alert('Course created successfully!')
        router.push('/admin/courses')
        router.refresh()
      } else {
        console.error('❌ API Error response:', responseData)
        alert(responseData.error || responseData.details || 'Failed to create course')
      }
    } catch (error) {
      console.error('❌ Error creating course:', error)
      alert('Failed to create course. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [activeUploads, networkStatus, formData, router])

  // Show loading state
  if (!isLoaded || !isClient || checkingAuth) {
    return (
      <div className="p-4 sm:p-6 max-w-7xl mx-auto flex items-center justify-center min-h-screen">
        <div className="text-center space-y-3 sm:space-y-4">
          <div className="w-10 h-10 sm:w-12 sm:h-12 border-3 border-rose-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <div>
            <p className="text-sm sm:text-base font-medium text-slate-700 dark:text-slate-300">Loading Course Creator</p>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">Preparing your workspace...</p>
          </div>
        </div>
      </div>
    )
  }

  // Check authentication
  if (!isSignedIn) {
    return null
  }

  if (userRole !== 'admin') {
    return (
      <div className="p-4 sm:p-6 max-w-7xl mx-auto flex items-center justify-center min-h-screen">
        <div className="text-center max-w-xs sm:max-w-md px-4">
          <AlertCircle className="w-10 h-10 sm:w-12 sm:h-12 text-red-500 mx-auto mb-3 sm:mb-4" />
          <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-slate-100 mb-1.5 sm:mb-2">Access Denied</h2>
          <p className="text-sm text-slate-600 dark:text-slate-400 mb-4 sm:mb-6">
            Admin privileges are required to access this page.
          </p>
          <div className="space-y-2 sm:space-y-3">
            <Button onClick={() => router.push('/')} className="w-full rounded-xl sm:rounded-2xl text-sm sm:text-base">
              Return to Home
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-3 sm:p-4 md:p-6 max-w-7xl mx-auto space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl md:text-3xl font-serif font-bold bg-gradient-to-r from-rose-600 to-pink-600 bg-clip-text text-transparent leading-tight">
            Create New Course
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-0.5 sm:mt-1 truncate">
            Design and publish a comprehensive fashion course with 10GB video support
          </p>
        </div>
        <div className="flex flex-wrap gap-1.5 sm:gap-2">
          {networkStatus === 'offline' && (
            <div className="inline-flex items-center text-amber-600 dark:text-amber-400 text-xs bg-amber-50 dark:bg-amber-900/20 px-2 sm:px-3 py-1 rounded-full">
              <WifiOff className="w-3 h-3 mr-1 flex-shrink-0" />
              Offline
            </div>
          )}
          {activeUploads.length > 0 && (
            <div className="inline-flex items-center text-blue-600 dark:text-blue-400 text-xs bg-blue-50 dark:bg-blue-900/20 px-2 sm:px-3 py-1 rounded-full">
              <CloudUpload className="w-3 h-3 mr-1 animate-pulse flex-shrink-0" />
              {activeUploads.length} Active
            </div>
          )}
          <Button 
            variant="outline" 
            className="rounded-xl sm:rounded-2xl text-xs sm:text-sm px-3 sm:px-4"
            onClick={() => router.push('/admin/courses')}
            disabled={activeUploads.length > 0}
            size="sm"
          >
            Cancel
          </Button>
        </div>
      </div>

      {/* Upload Status Banner */}
      {activeUploads.length > 0 && (
        <div className="space-y-2 sm:space-y-3">
          <Alert className="rounded-xl sm:rounded-2xl border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 p-3 sm:p-4">
            <div className="flex gap-2 sm:gap-3">
              <CloudUpload className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="min-w-0">
                <AlertTitle className="text-sm sm:text-base font-semibold text-blue-800 dark:text-blue-300 mb-0.5">
                  Uploading {activeUploads.length} file{activeUploads.length > 1 ? 's' : ''}
                </AlertTitle>
                <AlertDescription className="text-xs sm:text-sm text-blue-700 dark:text-blue-400">
                  Files are uploading to AWS S3. Do not close this page.
                </AlertDescription>
              </div>
            </div>
          </Alert>
          
          {/* Show optimization tips for large files */}
          {Object.values(uploadProgress).some(upload => 
            upload.status === 'uploading' && 
            (upload.type === 'previewVideo' || upload.type === 'lessonVideo')
          ) && (
            <UploadOptimizationTips 
              fileSize={uploadStats.totalSize}
              uploadStatus="Active"
            />
          )}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6 md:space-y-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 sm:gap-6 md:gap-8">
          {/* Main Form Content - 3 columns */}
          <div className="lg:col-span-3 space-y-4 sm:space-y-6 md:space-y-8">
            {/* Basic Information */}
            <Card className="rounded-xl sm:rounded-2xl border-slate-200 dark:border-slate-700">
              <CardHeader className="bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-900 rounded-t-xl sm:rounded-t-2xl p-3 sm:p-6">
                <CardTitle className="flex items-center text-base sm:text-lg md:text-xl">
                  <BookOpen className="w-4 h-4 sm:w-5 sm:h-5 mr-1.5 sm:mr-2 text-rose-600 flex-shrink-0" />
                  <span className="truncate">Course Information</span>
                </CardTitle>
                <CardDescription className="text-xs sm:text-sm">
                  Basic details about your course
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-3 sm:pt-4 space-y-3 sm:space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                  <div className="space-y-2 sm:space-y-3">
                    <div>
                      <label className="text-xs sm:text-sm font-medium mb-1 block">Course Title *</label>
                      <Input
                        placeholder="e.g., Advanced Fashion Design"
                        value={formData.title}
                        onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                        className="rounded-xl sm:rounded-2xl text-sm sm:text-base"
                        required
                      />
                    </div>
                    
                    <div>
                      <label className="text-xs sm:text-sm font-medium mb-1 block">Short Description *</label>
                      <Textarea
                        placeholder="Brief overview of the course"
                        value={formData.shortDescription}
                        onChange={(e) => setFormData(prev => ({ ...prev, shortDescription: e.target.value }))}
                        className="rounded-xl sm:rounded-2xl min-h-[60px] sm:min-h-[80px] text-sm sm:text-base"
                        required
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2 sm:space-y-3">
                    <div>
                      <label className="text-xs sm:text-sm font-medium mb-1 block">Level *</label>
                      <select
                        value={formData.level}
                        onChange={(e) => setFormData(prev => ({ 
                          ...prev, 
                          level: e.target.value as 'beginner' | 'intermediate' | 'advanced' 
                        }))}
                        className="w-full rounded-xl sm:rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 sm:px-4 sm:py-3 text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-rose-500"
                        required
                      >
                        <option value="beginner">Beginner</option>
                        <option value="intermediate">Intermediate</option>
                        <option value="advanced">Advanced</option>
                      </select>
                    </div>
                    
                    <div>
                      <label className="text-xs sm:text-sm font-medium mb-1 block">Category *</label>
                      <Input
                        placeholder="e.g., Fashion Design, Pattern Making"
                        value={formData.category}
                        onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                        className="rounded-xl sm:rounded-2xl text-sm sm:text-base"
                        required
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="text-xs sm:text-sm font-medium mb-1 block">Full Description *</label>
                  <Textarea
                    placeholder="Detailed description of what students will learn..."
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    className="rounded-xl sm:rounded-2xl min-h-[80px] sm:min-h-[100px] text-sm sm:text-base"
                    required
                  />
                </div>

                {/* Tags */}
                <div className="space-y-2">
                  <label className="text-xs sm:text-sm font-medium">Tags</label>
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {formData.tags.map((tag, index) => (
                      <Badge key={index} variant="secondary" className="rounded-full px-2 py-0.5 text-xs">
                        <span className="truncate max-w-[80px]">{tag}</span>
                        <button
                          type="button"
                          onClick={() => removeTag(tag)}
                          className="ml-1 hover:text-red-500"
                        >
                          <X className="w-2.5 h-2.5" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                  <div className="flex gap-1.5">
                    <Input
                      placeholder="Add a tag and press Enter"
                      value={newTag}
                      onChange={(e) => setNewTag(e.target.value)}
                      className="rounded-xl flex-1 text-xs sm:text-sm"
                      onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                    />
                    <Button type="button" onClick={addTag} variant="outline" className="rounded-xl px-2.5" size="sm">
                      <Plus className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Course Media */}
            <Card className="rounded-xl sm:rounded-2xl border-slate-200 dark:border-slate-700">
              <CardHeader className="bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-900 rounded-t-xl sm:rounded-t-2xl p-3 sm:p-6">
                <CardTitle className="flex items-center text-base sm:text-lg md:text-xl">
                  <Video className="w-4 h-4 sm:w-5 sm:h-5 mr-1.5 sm:mr-2 text-rose-600 flex-shrink-0" />
                  <span className="truncate">Course Media</span>
                </CardTitle>
                <CardDescription className="text-xs sm:text-sm">
                  Upload thumbnail and preview video (10GB multipart upload supported)
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-3 sm:pt-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 md:gap-6">
                  {/* Thumbnail Upload */}
                  <FileUploadArea
                    type="thumbnail"
                    label="Course Thumbnail *"
                    acceptedFiles="image/jpeg,image/jpg,image/png,image/webp"
                    maxSize="5MB"
                    currentFile={formData.thumbnail}
                    onFileChange={handleThumbnailChange}
                    uploadProgress={uploadProgress}
                    onCancelUpload={cancelUpload}
                    onRetryUpload={handleRetryUpload}
                  />

                  {/* Preview Video Upload */}
                  <FileUploadArea
                    type="previewVideo"
                    label="Preview Video (Optional)"
                    acceptedFiles="video/mp4,video/webm,video/ogg,video/quicktime,video/mov"
                    maxSize="10GB"
                    currentFile={formData.previewVideo}
                    onFileChange={handlePreviewVideoChange}
                    uploadProgress={uploadProgress}
                    onCancelUpload={cancelUpload}
                    onRetryUpload={handleRetryUpload}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Requirements & Outcomes */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
              {/* Requirements */}
              <Card className="rounded-xl sm:rounded-2xl border-slate-200 dark:border-slate-700">
                <CardHeader className="p-3 sm:p-4">
                  <CardTitle className="text-sm sm:text-base">Requirements</CardTitle>
                  <CardDescription className="text-xs sm:text-sm">
                    What students should know before taking this course
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-0 space-y-2">
                  {formData.requirements.map((requirement, index) => (
                    <div key={index} className="flex items-center gap-2 p-2 bg-slate-50 dark:bg-slate-800 rounded-lg">
                      <div className="w-1.5 h-1.5 bg-rose-500 rounded-full flex-shrink-0"></div>
                      <span className="flex-1 text-xs sm:text-sm truncate">{requirement}</span>
                      <button
                        type="button"
                        onClick={() => removeRequirement(index)}
                        className="text-red-500 hover:text-red-600 flex-shrink-0"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                  <div className="flex gap-1.5">
                    <Input
                      placeholder="Add a requirement"
                      value={newRequirement}
                      onChange={(e) => setNewRequirement(e.target.value)}
                      className="rounded-lg text-xs sm:text-sm"
                      onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addRequirement())}
                    />
                    <Button type="button" onClick={addRequirement} variant="outline" size="sm" className="rounded-lg px-2.5">
                      <Plus className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Learning Outcomes */}
              <Card className="rounded-xl sm:rounded-2xl border-slate-200 dark:border-slate-700">
                <CardHeader className="p-3 sm:p-4">
                  <CardTitle className="text-sm sm:text-base">Learning Outcomes</CardTitle>
                  <CardDescription className="text-xs sm:text-sm">
                    What students will learn from this course
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-0 space-y-2">
                  {formData.learningOutcomes.map((outcome, index) => (
                    <div key={index} className="flex items-center gap-2 p-2 bg-slate-50 dark:bg-slate-800 rounded-lg">
                      <div className="w-1.5 h-1.5 bg-green-500 rounded-full flex-shrink-0"></div>
                      <span className="flex-1 text-xs sm:text-sm truncate">{outcome}</span>
                      <button
                        type="button"
                        onClick={() => removeOutcome(index)}
                        className="text-red-500 hover:text-red-600 flex-shrink-0"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                  <div className="flex gap-1.5">
                    <Input
                      placeholder="Add a learning outcome"
                      value={newOutcome}
                      onChange={(e) => setNewOutcome(e.target.value)}
                      className="rounded-lg text-xs sm:text-sm"
                      onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addOutcome())}
                    />
                    <Button type="button" onClick={addOutcome} variant="outline" size="sm" className="rounded-lg px-2.5">
                      <Plus className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Course Content */}
            <Card className="rounded-xl sm:rounded-2xl border-slate-200 dark:border-slate-700">
              <CardHeader className="bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-900 rounded-t-xl sm:rounded-t-2xl p-3 sm:p-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="min-w-0">
                    <CardTitle className="flex items-center text-base sm:text-lg md:text-xl">
                      <BookOpen className="w-4 h-4 sm:w-5 sm:h-5 mr-1.5 sm:mr-2 text-rose-600 flex-shrink-0" />
                      <span className="truncate">Course Content</span>
                    </CardTitle>
                    <CardDescription className="text-xs sm:text-sm">
                      Add modules, chapters and lessons to your course
                    </CardDescription>
                  </div>
                  <Button type="button" onClick={addModule} variant="outline" className="rounded-xl sm:rounded-2xl text-xs sm:text-sm px-3" disabled={activeUploads.length > 0} size="sm">
                    <Plus className="w-3.5 h-3.5 mr-1.5" />
                    Add Module
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="pt-3 sm:pt-4 space-y-4 sm:space-y-6">
                {formData.modules.map((module, moduleIndex) => (
                  <div key={moduleIndex} className="border border-slate-200 dark:border-slate-700 rounded-xl sm:rounded-2xl p-3 sm:p-4 md:p-6 bg-gradient-to-br from-slate-50/50 to-white dark:from-slate-800/50 dark:to-slate-900/50">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                      <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
                        <div className="w-7 h-7 sm:w-8 sm:h-8 md:w-10 md:h-10 bg-gradient-to-r from-rose-500 to-pink-500 rounded-lg sm:rounded-xl flex items-center justify-center text-white font-bold text-sm sm:text-base md:text-lg flex-shrink-0">
                          {moduleIndex + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <Input
                            placeholder="Module Title *"
                            value={module.title}
                            onChange={(e) => {
                              const updatedModules = [...formData.modules]
                              updatedModules[moduleIndex].title = e.target.value
                              setFormData(prev => ({ ...prev, modules: updatedModules }))
                            }}
                            className="rounded-xl sm:rounded-2xl text-sm sm:text-base md:text-lg font-semibold"
                            required
                            disabled={activeUploads.length > 0}
                          />
                        </div>
                      </div>
                      <Button 
                        type="button" 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => removeModule(moduleIndex)}
                        className="text-red-500 hover:text-red-600 hover:bg-red-50 rounded-xl self-start sm:self-center"
                        disabled={activeUploads.length > 0}
                      >
                        <Trash2 className="w-4 h-4 sm:w-4 sm:h-4" />
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
                        onRetryUpload={handleRetryUpload}
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
                      className="rounded-xl sm:rounded-2xl mb-4 min-h-[60px] sm:min-h-[80px] text-sm sm:text-base"
                      required
                      disabled={activeUploads.length > 0}
                    />
                    
                    {/* Chapters */}
                    <div className="space-y-3 sm:space-y-4">
                      {module.chapters.map((chapter, chapterIndex) => (
                        <div key={chapterIndex} className="border border-slate-200 dark:border-slate-600 rounded-xl sm:rounded-2xl p-3 sm:p-4 bg-white/50 dark:bg-slate-800/30">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
                            <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
                              <div className="w-5 h-5 sm:w-6 sm:h-6 md:w-8 md:h-8 bg-gradient-to-r from-blue-500 to-cyan-500 rounded sm:rounded-lg flex items-center justify-center text-white font-bold text-xs sm:text-sm flex-shrink-0">
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
                                className="rounded-xl sm:rounded-2xl flex-1 text-sm sm:text-base min-w-0"
                                required
                                disabled={activeUploads.length > 0}
                              />
                            </div>
                            <Button 
                              type="button" 
                              variant="ghost" 
                              size="icon"
                              onClick={() => removeChapter(moduleIndex, chapterIndex)}
                              className="text-red-500 hover:text-red-600 hover:bg-red-50 rounded-xl self-start sm:self-center"
                              disabled={activeUploads.length > 0}
                            >
                              <X className="w-3.5 h-3.5" />
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
                            className="rounded-xl sm:rounded-2xl mb-3 min-h-[50px] sm:min-h-[60px] text-sm sm:text-base"
                            required
                            disabled={activeUploads.length > 0}
                          />
                          
                          {/* Lessons inside chapter */}
                          <div className="space-y-2 sm:space-y-3">
                            {chapter.lessons.map((lesson, lessonIndex) => (
                              <div key={lessonIndex} className="border border-slate-200 dark:border-slate-600 rounded-xl sm:rounded-2xl p-2.5 sm:p-3 md:p-4 bg-slate-50/50 dark:bg-slate-800/20">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-2.5 sm:mb-3">
                                  <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
                                    <div className="w-4 h-4 sm:w-5 sm:h-5 md:w-7 md:h-7 bg-gradient-to-r from-slate-500 to-slate-600 rounded sm:rounded-md flex items-center justify-center text-white font-bold text-[10px] sm:text-xs flex-shrink-0">
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
                                      className="rounded-xl sm:rounded-2xl flex-1 text-sm sm:text-base min-w-0"
                                      required
                                      disabled={activeUploads.length > 0}
                                    />
                                  </div>
                                  <Button 
                                    type="button" 
                                    variant="ghost" 
                                    size="icon"
                                    onClick={() => removeLesson(moduleIndex, chapterIndex, lessonIndex)}
                                    className="text-red-500 hover:text-red-600 hover:bg-red-50 rounded-xl self-start sm:self-center"
                                    disabled={activeUploads.length > 0}
                                  >
                                    <X className="w-3.5 h-3.5" />
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
                                  className="rounded-xl sm:rounded-2xl mb-2.5 sm:mb-3 min-h-[50px] sm:min-h-[60px] text-sm sm:text-base"
                                  required
                                  disabled={activeUploads.length > 0}
                                />

                                {/* Video Upload - 10GB SUPPORT */}
                                <div className="mb-2.5 sm:mb-3">
                                  <FileUploadArea
                                    type="lessonVideo"
                                    label="Lesson Video * (10GB supported)"
                                    acceptedFiles="video/mp4,video/webm,video/ogg,video/quicktime,video/mov"
                                    maxSize="10GB"
                                    currentFile={lesson.video || null}
                                    onFileChange={(e) => handleLessonVideoChange(e, moduleIndex, chapterIndex, lessonIndex)}
                                    moduleIndex={moduleIndex}
                                    chapterIndex={chapterIndex}
                                    lessonIndex={lessonIndex}
                                    uploadProgress={uploadProgress}
                                    onCancelUpload={cancelUpload}
                                    onRetryUpload={handleRetryUpload}
                                  />
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 sm:gap-3 mb-2.5 sm:mb-3">
                                  <div>
                                    <label className="text-xs sm:text-sm font-medium mb-1 block">Duration (minutes)</label>
                                    <Input
                                      type="number"
                                      placeholder="e.g., 45"
                                      value={lesson.duration}
                                      onChange={(e) => {
                                        const updatedModules = [...formData.modules]
                                        updatedModules[moduleIndex].chapters[chapterIndex].lessons[lessonIndex].duration = parseInt(e.target.value) || 0
                                        setFormData(prev => ({ ...prev, modules: updatedModules }))
                                      }}
                                      className="rounded-xl sm:rounded-2xl text-sm sm:text-base"
                                      min="0"
                                      disabled={activeUploads.length > 0}
                                    />
                                  </div>
                                </div>

                                <div>
                                  <label className="text-xs sm:text-sm font-medium mb-1 block">Lesson Content *</label>
                                  <Textarea
                                    placeholder="Detailed content for this lesson..."
                                    value={lesson.content}
                                    onChange={(e) => {
                                      const updatedModules = [...formData.modules]
                                      updatedModules[moduleIndex].chapters[chapterIndex].lessons[lessonIndex].content = e.target.value
                                      setFormData(prev => ({ ...prev, modules: updatedModules }))
                                    }}
                                    className="rounded-xl sm:rounded-2xl min-h-[60px] sm:min-h-[80px] text-sm sm:text-base"
                                    required
                                    disabled={activeUploads.length > 0}
                                  />
                                </div>

                                <div className="flex items-center gap-2.5 sm:gap-3 mt-2.5 sm:mt-3 p-2 sm:p-3 bg-slate-100 dark:bg-slate-800 rounded-lg sm:rounded-xl">
                                  <label className="flex items-center gap-1.5 sm:gap-2 cursor-pointer">
                                    <div className="relative">
                                      <input
                                        type="checkbox"
                                        checked={lesson.isPreview}
                                        onChange={(e) => {
                                          const updatedModules = [...formData.modules]
                                          updatedModules[moduleIndex].chapters[chapterIndex].lessons[lessonIndex].isPreview = e.target.checked
                                          setFormData(prev => ({ ...prev, modules: updatedModules }))
                                        }}
                                        className="sr-only"
                                        disabled={activeUploads.length > 0}
                                      />
                                      <div className={`w-4 h-4 sm:w-5 sm:h-5 rounded border flex items-center justify-center ${lesson.isPreview ? 'bg-rose-500 border-rose-500' : 'border-slate-300 dark:border-slate-600'} ${activeUploads.length > 0 ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}>
                                        {lesson.isPreview && <CheckCircle className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-white" />}
                                      </div>
                                    </div>
                                    <div className="min-w-0">
                                      <span className="text-xs sm:text-sm font-medium">Preview Lesson</span>
                                      <p className="text-[10px] sm:text-xs text-slate-500">Free for all students</p>
                                    </div>
                                  </label>
                                </div>

                                {/* Resources */}
                                <div className="space-y-2 sm:space-y-3 mt-2.5 sm:mt-3">
                                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                                    <h4 className="text-xs sm:text-sm font-medium">Resources</h4>
                                    <Button 
                                      type="button" 
                                      onClick={() => addResource(moduleIndex, chapterIndex, lessonIndex)} 
                                      variant="outline" 
                                      size="sm" 
                                      className="rounded-xl text-xs px-2 py-1 h-auto"
                                      disabled={activeUploads.length > 0}
                                    >
                                      <Plus className="w-3 h-3 mr-1" />
                                      Add Resource
                                    </Button>
                                  </div>
                                  
                                  {lesson.resources.map((resource, resourceIndex) => (
                                    <div key={resourceIndex} className="grid grid-cols-1 md:grid-cols-12 gap-1.5 p-2 bg-slate-50 dark:bg-slate-800 rounded-lg">
                                      <Input
                                        placeholder="Title"
                                        value={resource.title}
                                        onChange={(e) => {
                                          const updatedModules = [...formData.modules]
                                          updatedModules[moduleIndex].chapters[chapterIndex].lessons[lessonIndex].resources[resourceIndex].title = e.target.value
                                          setFormData(prev => ({ ...prev, modules: updatedModules }))
                                        }}
                                        className="rounded-lg md:col-span-4 text-xs sm:text-sm"
                                        disabled={activeUploads.length > 0}
                                      />
                                      <Input
                                        placeholder="URL"
                                        value={resource.url}
                                        onChange={(e) => {
                                          const updatedModules = [...formData.modules]
                                          updatedModules[moduleIndex].chapters[chapterIndex].lessons[lessonIndex].resources[resourceIndex].url = e.target.value
                                          setFormData(prev => ({ ...prev, modules: updatedModules }))
                                        }}
                                        className="rounded-lg md:col-span-5 text-xs sm:text-sm"
                                        disabled={activeUploads.length > 0}
                                      />
                                      <select
                                        value={resource.type}
                                        onChange={(e) => {
                                          const updatedModules = [...formData.modules]
                                          updatedModules[moduleIndex].chapters[chapterIndex].lessons[lessonIndex].resources[resourceIndex].type = e.target.value as any
                                          setFormData(prev => ({ ...prev, modules: updatedModules }))
                                        }}
                                        className="rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-2 py-1.5 text-xs md:col-span-2"
                                        disabled={activeUploads.length > 0}
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
                                        className="text-red-500 rounded-lg hover:text-red-600 md:col-span-1 h-8 w-8"
                                        disabled={activeUploads.length > 0}
                                      >
                                        <X className="w-3.5 h-3.5" />
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
                              className="rounded-xl sm:rounded-2xl w-full text-xs sm:text-sm"
                              disabled={activeUploads.length > 0}
                              size="sm"
                            >
                              <Plus className="w-3.5 h-3.5 mr-1.5" />
                              Add Lesson
                            </Button>
                          </div>
                        </div>
                      ))}
                      
                      <Button 
                        type="button" 
                        onClick={() => addChapter(moduleIndex)} 
                        variant="outline" 
                        className="rounded-xl sm:rounded-2xl w-full text-xs sm:text-sm"
                        disabled={activeUploads.length > 0}
                        size="sm"
                      >
                        <Plus className="w-3.5 h-3.5 mr-1.5" />
                        Add Chapter
                      </Button>
                    </div>
                  </div>
                ))}

                {formData.modules.length === 0 && (
                  <div className="text-center py-6 sm:py-8 md:py-12 border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-xl sm:rounded-2xl">
                    <BookOpen className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 text-slate-400 mx-auto mb-3 sm:mb-4" />
                    <h3 className="text-sm sm:text-base md:text-lg font-semibold text-slate-700 dark:text-slate-300 mb-1.5 sm:mb-2">
                      No modules yet
                    </h3>
                    <p className="text-xs sm:text-sm text-slate-500 mb-3 sm:mb-4 px-4">
                      Start building your course by adding the first module
                    </p>
                    <Button type="button" onClick={addModule} variant="outline" className="rounded-xl sm:rounded-2xl text-xs sm:text-sm" disabled={activeUploads.length > 0} size="sm">
                      <Plus className="w-3.5 h-3.5 mr-1.5" />
                      Add Your First Module
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar - 1 column */}
          <div className="space-y-4 sm:space-y-6">
            {/* Upload Stats */}
            <Card className="rounded-xl sm:rounded-2xl border-slate-200 dark:border-slate-700">
              <CardHeader className="bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-900 rounded-t-xl sm:rounded-t-2xl p-3 sm:p-4">
                <CardTitle className="text-sm sm:text-base">Upload Statistics</CardTitle>
                <CardDescription className="text-xs sm:text-sm">
                  Current upload progress
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-3 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 p-2.5 rounded-lg">
                    <p className="text-[10px] sm:text-xs text-slate-600 dark:text-slate-400">Total Files</p>
                    <p className="text-lg sm:text-xl font-bold text-blue-600 dark:text-blue-400">
                      {uploadStats.totalFiles}
                    </p>
                  </div>
                  <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 p-2.5 rounded-lg">
                    <p className="text-[10px] sm:text-xs text-slate-600 dark:text-slate-400">Completed</p>
                    <p className="text-lg sm:text-xl font-bold text-green-600 dark:text-green-400">
                      {uploadStats.completedFiles}
                    </p>
                  </div>
                </div>
                <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 p-2.5 rounded-lg">
                  <p className="text-[10px] sm:text-xs text-slate-600 dark:text-slate-400">Total Size</p>
                  <p className="text-sm sm:text-base font-bold text-purple-600 dark:text-purple-400">
                    {formatFileSize(uploadStats.totalSize)}
                  </p>
                </div>
                {activeUploads.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-700">
                    <p className="text-xs sm:text-sm font-medium mb-1.5">Active Uploads</p>
                    <div className="space-y-1.5">
                      {activeUploads.map(identifier => {
                        const upload = uploadProgress[identifier]
                        return upload ? (
                          <div key={identifier} className="flex items-center justify-between text-xs">
                            <span className="truncate max-w-[100px] sm:max-w-[120px]">{upload.fileName}</span>
                            <span className="font-medium">{upload.progress}%</span>
                          </div>
                        ) : null
                      })}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Pricing */}
            <Card className="rounded-xl sm:rounded-2xl border-slate-200 dark:border-slate-700">
              <CardHeader className="bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-900 rounded-t-xl sm:rounded-t-2xl p-3 sm:p-4">
                <CardTitle className="text-sm sm:text-base">Pricing</CardTitle>
                <CardDescription className="text-xs sm:text-sm">
                  Set your course pricing
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-3 space-y-3">
                <div className="flex items-center justify-between p-2.5 bg-slate-50 dark:bg-slate-800 rounded-lg">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <div className="relative">
                      <input
                        type="checkbox"
                        checked={formData.isFree}
                        onChange={(e) => setFormData(prev => ({ ...prev, isFree: e.target.checked }))}
                        className="sr-only"
                        disabled={activeUploads.length > 0}
                      />
                      <div className={`w-4 h-4 sm:w-5 sm:h-5 rounded border flex items-center justify-center ${formData.isFree ? 'bg-green-500 border-green-500' : 'border-slate-300 dark:border-slate-600'} ${activeUploads.length > 0 ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}>
                        {formData.isFree && <CheckCircle className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-white" />}
                      </div>
                    </div>
                    <div className="min-w-0">
                      <span className="text-xs sm:text-sm font-medium">Free Course</span>
                      <p className="text-[10px] sm:text-xs text-slate-500">Available to all students</p>
                    </div>
                  </label>
                </div>
                
                {!formData.isFree && (
                  <div>
                    <label className="text-xs sm:text-sm font-medium mb-1 block">Price ($)</label>
                    <div className="relative">
                      <span className="absolute left-2.5 top-1/2 transform -translate-y-1/2 text-slate-500 text-sm">$</span>
                      <Input
                        type="number"
                        placeholder="0.00"
                        value={formData.price}
                        onChange={(e) => setFormData(prev => ({ ...prev, price: parseFloat(e.target.value) || 0 }))}
                        className="rounded-xl sm:rounded-2xl pl-7 text-sm sm:text-base"
                        min="0"
                        step="0.01"
                        disabled={activeUploads.length > 0}
                      />
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Course Settings */}
            <Card className="rounded-xl sm:rounded-2xl border-slate-200 dark:border-slate-700">
              <CardHeader className="bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-900 rounded-t-xl sm:rounded-t-2xl p-3 sm:p-4">
                <CardTitle className="text-sm sm:text-base">Settings</CardTitle>
              </CardHeader>
              <CardContent className="pt-3">
                <div className="space-y-3">
                  <label className="flex items-center gap-2 cursor-pointer p-2.5 bg-slate-50 dark:bg-slate-800 rounded-lg">
                    <div className="relative">
                      <input
                        type="checkbox"
                        checked={formData.isFeatured}
                        onChange={(e) => setFormData(prev => ({ ...prev, isFeatured: e.target.checked }))}
                        className="sr-only"
                        disabled={activeUploads.length > 0}
                      />
                      <div className={`w-4 h-4 sm:w-5 sm:h-5 rounded border flex items-center justify-center ${formData.isFeatured ? 'bg-rose-500 border-rose-500' : 'border-slate-300 dark:border-slate-600'} ${activeUploads.length > 0 ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}>
                        {formData.isFeatured && <CheckCircle className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-white" />}
                      </div>
                    </div>
                    <div className="min-w-0">
                      <span className="text-xs sm:text-sm font-medium">Feature this course</span>
                      <p className="text-[10px] sm:text-xs text-slate-500">Show on homepage</p>
                    </div>
                  </label>
                </div>
              </CardContent>
            </Card>

            {/* Course Summary */}
            <Card className="rounded-xl sm:rounded-2xl border-slate-200 dark:border-slate-700">
              <CardHeader className="bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-900 rounded-t-xl sm:rounded-t-2xl p-3 sm:p-4">
                <CardTitle className="text-sm sm:text-base">Course Summary</CardTitle>
                <CardDescription className="text-xs sm:text-sm">
                  Overview of your course
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-3 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 p-2.5 rounded-lg">
                    <p className="text-[10px] sm:text-xs text-slate-600 dark:text-slate-400">Modules</p>
                    <p className="text-lg sm:text-xl font-bold text-blue-600 dark:text-blue-400">
                      {formData.modules.length}
                    </p>
                  </div>
                  <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 p-2.5 rounded-lg">
                    <p className="text-[10px] sm:text-xs text-slate-600 dark:text-slate-400">Chapters</p>
                    <p className="text-lg sm:text-xl font-bold text-purple-600 dark:text-purple-400">
                      {totalChapters}
                    </p>
                  </div>
                  <div className="bg-gradient-to-br from-rose-50 to-rose-100 dark:from-rose-900/20 dark:to-rose-800/20 p-2.5 rounded-lg">
                    <p className="text-[10px] sm:text-xs text-slate-600 dark:text-slate-400">Lessons</p>
                    <p className="text-lg sm:text-xl font-bold text-rose-600 dark:text-rose-400">
                      {totalLessons}
                    </p>
                  </div>
                  <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 p-2.5 rounded-lg">
                    <p className="text-[10px] sm:text-xs text-slate-600 dark:text-slate-400">Duration</p>
                    <p className="text-sm sm:text-base font-bold text-green-600 dark:text-green-400">
                      {formatDuration(totalDuration)}
                    </p>
                  </div>
                </div>
                
                <div className="pt-3 border-t border-slate-200 dark:border-slate-700 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-600 dark:text-slate-400">Price</span>
                    <span className="font-semibold text-sm">
                      {formData.isFree ? (
                        <Badge className="bg-green-500 text-white text-xs px-1.5 py-0.5">Free</Badge>
                      ) : (
                        `$${formData.price.toFixed(2)}`
                      )}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-600 dark:text-slate-400">Level</span>
                    <Badge variant="outline" className="rounded-full capitalize text-xs px-2 py-0.5">
                      {formData.level}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-600 dark:text-slate-400">Featured</span>
                    <Badge variant={formData.isFeatured ? "default" : "outline"} className="rounded-full text-xs px-2 py-0.5">
                      {formData.isFeatured ? 'Yes' : 'No'}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Actions */}
            <Card className="rounded-xl sm:rounded-2xl border-slate-200 dark:border-slate-700">
              <CardHeader className="bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-900 rounded-t-xl sm:rounded-t-2xl p-3 sm:p-4">
                <CardTitle className="text-sm sm:text-base">Actions</CardTitle>
              </CardHeader>
              <CardContent className="pt-3 space-y-3">
                <Button 
                  type="submit" 
                  variant="premium" 
                  className="w-full rounded-xl sm:rounded-2xl py-3 sm:py-4 text-sm sm:text-base font-semibold shadow-lg" 
                  disabled={loading || activeUploads.length > 0 || !formData.thumbnail || networkStatus === 'offline'}
                >
                  {loading ? (
                    <>
                      <div className="w-3.5 h-3.5 sm:w-4 sm:h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <Save className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1.5" />
                      Create Course
                    </>
                  )}
                </Button>
                
                {activeUploads.length > 0 && (
                  <div className="text-center text-xs text-amber-600 dark:text-amber-400">
                    {activeUploads.length} upload{activeUploads.length > 1 ? 's' : ''} in progress
                  </div>
                )}
                
                {networkStatus === 'offline' && (
                  <div className="text-center text-xs text-red-600 dark:text-red-400 flex items-center justify-center">
                    <WifiOff className="w-3 h-3 mr-1" />
                    You are offline
                  </div>
                )}
                
                <Button 
                  type="button" 
                  variant="outline" 
                  className="w-full rounded-xl sm:rounded-2xl py-3 sm:py-4 text-xs sm:text-sm"
                  onClick={() => router.push('/admin/courses')}
                  disabled={loading || activeUploads.length > 0}
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