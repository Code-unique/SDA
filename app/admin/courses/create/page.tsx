'use client'

import { useState, useRef, useEffect, useCallback, useMemo, memo } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@clerk/nextjs'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Progress } from '@/components/ui/progress'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Sheet, SheetContent } from '@/components/ui/sheet'
import { ScrollArea } from '@/components/ui/scroll-area'
import VideoLibrarySelector from '@/components/video-library/VideoLibrarySelector'
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
  Shield,
  ChevronDown,
  ChevronRight,
  FileText,
  DollarSign,
  Settings,
  Upload,
  Tag,
  Target,
  Award,
  Layers,
  Clock,
  Eye,
  EyeOff,
  ArrowLeft,
  Calendar,
  Users,
  Globe,
  Lock,
  Sparkles,
  Rocket,
  Palette,
  GraduationCap,
  FileVideo,
  Film,
  Bookmark,
  Star,
  TrendingUp,
  Feather,
  Gem,
  Crown,
  Search,
  Filter,
  Check,
  Copy,
  Grid,
  List,
  Download,
  Cloud,
  Database,
  AlertTriangle,
  Info
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

// ==================== TYPES ====================
interface S3Asset {
  key: string
  url: string
  size: number
  type: 'image' | 'video'
  duration?: number
  width?: number
  height?: number
  uploadedAt?: string
  fileName?: string
  mimeType?: string
  etag?: string
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
    lastBytes?: number
    lastTime?: number
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

interface Resource {
  title: string
  url: string
  type: 'pdf' | 'document' | 'link' | 'video'
}

interface Lesson {
  title: string
  description: string
  content: string
  video?: S3Asset
  videoSource?: {
    type: 'uploaded' | 'library'
    videoLibraryId?: string
    video: S3Asset
    uploadedAt?: string
    uploadedBy?: string
  }
  duration: number
  isPreview: boolean
  resources: Resource[]
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

interface VideoLibraryItem {
  _id: string;
  title: string;
  description?: string;
  video: {
    key: string;
    url: string;
    size: number;
    type: 'video';
    duration?: number;
    width?: number;
    height?: number;
    originalFileName?: string;
    mimeType?: string;
  };
  categories: string[];
  tags: string[];
  usageCount: number;
  courses: any[];
  uploadDate: string;
  uploadedBy?: any;
  formattedDuration?: string;
  formattedSize?: string;
  isPublic?: boolean;
  metadata?: {
    resolution?: string;
    format?: string;
    bitrate?: number;
    frameRate?: number;
  };
}

interface ApiResponse {
  success: boolean;
  error?: string;
  details?: string;
  uploadId?: string;
  fileKey?: string;
  fileUrl?: string;
  presignedUrl?: string;
  presignedUrls?: string[];
  [key: string]: any;
}

// ==================== HELPER FUNCTIONS ====================
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
  const mins = Math.floor(minutes % 60)
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

const isMobile = () => {
  if (typeof window === 'undefined') return false
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
}

// ==================== MEMOIZED COMPONENTS ====================
interface UploadOptimizationTipsProps {
  fileSize: number
  uploadStatus?: string
}

const UploadOptimizationTips = memo(({ fileSize, uploadStatus }: UploadOptimizationTipsProps) => {
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
              {isMobile() && (
                <li className="flex items-start gap-1.5">
                  <div className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-0.5 flex-shrink-0"></div>
                  <span className="truncate">Mobile: Keep screen on during upload</span>
                </li>
              )}
            </ul>
          </div>
        </div>
      </CardContent>
    </Card>
  )
})
UploadOptimizationTips.displayName = 'UploadOptimizationTips'

interface UploadStatusCardProps {
  upload: UploadProgress[string]
  onCancel: () => void
  onRetry?: () => void
}

const UploadStatusCard = memo(({ upload, onCancel, onRetry }: UploadStatusCardProps) => {
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
  }, [upload.parts, upload.currentPart, upload.uploadSpeed, upload.status])

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

// ==================== ENHANCED UPLOAD HOOK ====================
interface UseEnhancedS3UploadReturn {
  uploadProgress: UploadProgress
  uploadFile: (
    file: File,
    type: 'thumbnail' | 'previewVideo' | 'lessonVideo' | 'moduleThumbnail',
    identifier: string,
    moduleIndex?: number
  ) => Promise<S3Asset>
  cancelUpload: (identifier: string) => Promise<void>
  retryUpload: (
    file: File,
    type: 'thumbnail' | 'previewVideo' | 'lessonVideo' | 'moduleThumbnail',
    identifier: string,
    moduleIndex?: number
  ) => Promise<S3Asset>
  multipartUploads: Record<string, MultipartUploadState>
  activeUploads: string[]
}

const useEnhancedS3Upload = (): UseEnhancedS3UploadReturn => {
  const [uploadProgress, setUploadProgress] = useState<UploadProgress>({})
  const [multipartUploads, setMultipartUploads] = useState<Record<string, MultipartUploadState>>({})
  const [activeUploads, setActiveUploads] = useState<Set<string>>(new Set())
  const abortControllers = useRef<Map<string, AbortController>>(new Map())
  const uploadedBytesByPart = useRef<Record<string, Record<number, number>>>({})
  const lastProgressUpdate = useRef<Record<string, { time: number; progress: number }>>({})
  const { getToken } = useAuth()

  const apiCallRef = useRef(async (endpoint: string, body: any, signal?: AbortSignal): Promise<ApiResponse> => {
    try {
      const token = await getToken()
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(body),
        signal
      })

      if (response.status === 401) {
        const currentPath = window.location.pathname + window.location.search
        window.location.href = `/sign-in?redirect_url=${encodeURIComponent(currentPath)}`
        throw new Error('Authentication required')
      }

      if (response.status === 403) {
        throw new Error('Admin access required')
      }

      if (!response.ok) {
        let errorData
        try {
          errorData = await response.json()
        } catch {
          errorData = { error: `HTTP ${response.status}: ${response.statusText}` }
        }
        
        if (response.status === 429) {
          throw new Error('Upload limit reached. Please try again in 15 minutes.')
        } else if (response.status === 400) {
          throw new Error(errorData.error || 'Invalid request')
        } else if (response.status === 500) {
          throw new Error(errorData.error || 'Server error. Please try again or contact support.')
        }
        
        throw new Error(errorData.error || errorData.details || `Upload failed: ${response.status}`)
      }

      const data = await response.json() as ApiResponse
      
      if (!data.success && !data.uploadId && !data.presignedUrl) {
        throw new Error(data.error || 'Request failed')
      }
      
      return data

    } catch (error) {
      if (error instanceof TypeError && error.message === 'Failed to fetch') {
        throw new Error('Network error. Please check your internet connection and try again.')
      }
      
      if (error instanceof DOMException && error.name === 'AbortError') {
        throw new Error('Upload cancelled')
      }
      
      throw error
    }
  })

  const uploadFile = useCallback(async (
    file: File,
    type: 'thumbnail' | 'previewVideo' | 'lessonVideo' | 'moduleThumbnail',
    identifier: string,
    moduleIndex?: number
  ): Promise<S3Asset> => {
    const MAX_FILE_SIZE = 10 * 1024 * 1024 * 1024; // 10GB for all devices
    const OPTIMAL_PART_SIZE = 100 * 1024 * 1024; // 100MB chunks for better performance
    const CONCURRENCY_LIMIT = 4; // Parallel uploads

    if (file.size > MAX_FILE_SIZE) {
      throw new Error(`File too large. Maximum size: ${formatFileSize(MAX_FILE_SIZE)}. Your file: ${formatFileSize(file.size)}`)
    }

    const abortController = new AbortController()
    abortControllers.current.set(identifier, abortController)
    
    const shouldUseMultipart = file.size > (100 * 1024 * 1024) // Use multipart for files > 100MB
    const PART_SIZE = shouldUseMultipart ? OPTIMAL_PART_SIZE : file.size

    try {
      setActiveUploads(prev => new Set([...prev, identifier]))
      
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

      let uploadId: string | undefined
      let fileKey: string | undefined
      let fileUrl: string | undefined

      if (shouldUseMultipart) {
        const initData = await apiCallRef.current('/api/admin/upload/initiate', {
          fileName: file.name,
          fileType: file.type,
          folder: `${type}s`
        }, abortController.signal)
        uploadId = initData.uploadId
        fileKey = initData.fileKey
        fileUrl = initData.fileUrl

        if (!uploadId || !fileKey) {
          throw new Error('Failed to initiate multipart upload')
        }

        setUploadProgress(prev => ({
          ...prev,
          [identifier]: {
            ...prev[identifier]!,
            progress: 5,
            status: 'generating-urls'
          }
        }))

        const totalParts = Math.ceil(file.size / PART_SIZE)
        const parts = Array.from({ length: totalParts }, (_, i) => ({
          partNumber: i + 1,
          start: i * PART_SIZE,
          end: Math.min((i + 1) * PART_SIZE, file.size),
          presignedUrl: undefined,
          etag: undefined,
          status: 'pending' as const,
          progress: 0
        }))

        setUploadProgress(prev => ({
          ...prev,
          [identifier]: {
            ...prev[identifier]!,
            progress: 10,
            status: 'uploading',
            parts: totalParts,
            currentPart: 1
          }
        }))

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

        const bulkUrlData = await apiCallRef.current('/api/admin/upload/parts', {
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
        })).filter(part => part.presignedUrl !== undefined) as Array<{
          partNumber: number;
          start: number;
          end: number;
          presignedUrl: string;
          etag?: string;
          status: 'pending' | 'uploading' | 'completed' | 'error';
          progress?: number;
        }>

        if (partsWithUrls.length !== totalParts) {
          throw new Error(`Failed to generate presigned URLs for all parts. Expected ${totalParts}, got ${partsWithUrls.length}`)
        }

        setUploadProgress(prev => ({
          ...prev,
          [identifier]: {
            ...prev[identifier]!,
            progress: 15
          }
        }))

        const uploadedParts: Array<{ ETag: string; PartNumber: number }> = []
        uploadedBytesByPart.current[identifier] = {}

        // Upload parts with optimized concurrency
        for (let i = 0; i < partsWithUrls.length; i += CONCURRENCY_LIMIT) {
          const batch = partsWithUrls.slice(i, i + CONCURRENCY_LIMIT)
          
          if (abortController.signal.aborted) {
            throw new Error('Upload cancelled')
          }

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

          const batchPromises = batch.map(async (part) => {
            try {
              const partSize = part.end - part.start;
              const blob = file.slice(part.start, part.end);
              
              const result = await new Promise<{ ETag: string; PartNumber: number }>((resolve, reject) => {
                const xhr = new XMLHttpRequest();
                const startTime = Date.now();
                
                xhr.upload.addEventListener('progress', (event) => {
                  if (event.lengthComputable) {
                    if (!uploadedBytesByPart.current[identifier]) {
                      uploadedBytesByPart.current[identifier] = {};
                    }
                    uploadedBytesByPart.current[identifier][part.partNumber] = event.loaded;
                    
                    const partBytes = uploadedBytesByPart.current[identifier];
                    const totalUploadedBytes = Object.values(partBytes).reduce((sum, bytes) => sum + bytes, 0);
                    
                    const uploadProgressValue = 15 + (totalUploadedBytes / file.size) * 80;
                    
                    const elapsedSeconds = (Date.now() - startTime) / 1000;
                    const uploadSpeed = totalUploadedBytes / elapsedSeconds;
                    
                    const remainingBytes = file.size - totalUploadedBytes;
                    const timeRemaining = uploadSpeed > 0 ? remainingBytes / uploadSpeed : 0;
                    
                    const now = Date.now();
                    const lastUpdate = lastProgressUpdate.current[identifier];
                    const newProgress = Math.min(Math.round(uploadProgressValue), 95);
                    
                    if (!lastUpdate || now - lastUpdate.time > 100 || Math.abs(newProgress - lastUpdate.progress) > 1) {
                      lastProgressUpdate.current[identifier] = { time: now, progress: newProgress };
                      
                      setUploadProgress(prev => {
                        const current = prev[identifier];
                        if (!current) return prev;
                        
                        return {
                          ...prev,
                          [identifier]: {
                            ...current,
                            progress: newProgress,
                            currentPart: part.partNumber,
                            uploadSpeed,
                            timeRemaining,
                            uploadedBytes: totalUploadedBytes
                          }
                        };
                      });
                    }
                  }
                });
                
                xhr.addEventListener('load', () => {
                  if (xhr.status === 200) {
                    const etag = xhr.getResponseHeader('etag') || 
                                 xhr.getResponseHeader('ETag')?.replace(/"/g, '') ||
                                 `part-${part.partNumber}`;
                    
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
                
                xhr.open('PUT', part.presignedUrl);
                xhr.setRequestHeader('Content-Type', file.type);
                xhr.send(blob);
              });
              
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

          const batchResults = await Promise.all(batchPromises)
          uploadedParts.push(...batchResults)
        }

        uploadedParts.sort((a, b) => a.PartNumber - b.PartNumber)

        setUploadProgress(prev => ({
          ...prev,
          [identifier]: {
            ...prev[identifier]!,
            progress: 98,
            status: 'processing'
          }
        }))

        try {
          const completeData = await apiCallRef.current('/api/admin/upload/complete', {
            fileKey,
            uploadId,
            parts: uploadedParts
          }, abortController.signal)
          fileUrl = completeData.fileUrl || fileUrl
        } catch (error) {
          try {
            await apiCallRef.current('/api/admin/upload/abort', {
              fileKey,
              uploadId
            }, abortController.signal)
          } catch (abortError) {
            console.warn('Failed to abort upload:', abortError)
          }
          throw error
        }

      } else {
        const initData = await apiCallRef.current('/api/admin/upload', {
          fileName: file.name,
          fileType: file.type,
          fileSize: file.size,
          folder: `${type}s`
        }, abortController.signal)

        fileKey = initData.fileKey
        fileUrl = initData.fileUrl
        const presignedUrl = initData.presignedUrl

        if (!presignedUrl) {
          throw new Error('No presigned URL received from server')
        }

        setUploadProgress(prev => ({
          ...prev,
          [identifier]: {
            ...prev[identifier]!,
            progress: 30,
            status: 'uploading'
          }
        }))

        await new Promise<void>((resolve, reject) => {
          const xhr = new XMLHttpRequest()
          const startTime = Date.now()
          
          xhr.upload.addEventListener('progress', (event) => {
            if (event.lengthComputable) {
              const progress = 30 + (event.loaded / event.total) * 65
              const elapsedSeconds = (Date.now() - startTime) / 1000
              const uploadSpeed = event.loaded / elapsedSeconds
              
              const now = Date.now();
              const lastUpdate = lastProgressUpdate.current[identifier];
              const newProgress = Math.round(progress);
              
              if (!lastUpdate || now - lastUpdate.time > 100 || Math.abs(newProgress - lastUpdate.progress) > 1) {
                lastProgressUpdate.current[identifier] = { time: now, progress: newProgress };
                
                setUploadProgress(prev => {
                  const current = prev[identifier];
                  if (!current) return prev;
                  
                  return {
                    ...prev,
                    [identifier]: {
                      ...current,
                      progress: newProgress,
                      uploadSpeed,
                      timeRemaining: uploadSpeed > 0 
                        ? (event.total - event.loaded) / uploadSpeed 
                        : 0,
                      uploadedBytes: event.loaded
                    }
                  };
                });
              }
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

      setUploadProgress(prev => ({
        ...prev,
        [identifier]: {
          ...prev[identifier]!,
          progress: 100,
          status: 'completed'
        }
      }))

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
        delete lastProgressUpdate.current[identifier]
        abortControllers.current.delete(identifier)
      }, 3000)

      const s3Asset: S3Asset = {
        key: fileKey!,
        url: fileUrl!,
        size: file.size,
        type: type === 'thumbnail' || type === 'moduleThumbnail' ? 'image' : 'video',
        duration: type.includes('video') ? 0 : undefined,
        uploadedAt: new Date().toISOString(),
        fileName: file.name,
        mimeType: file.type
      }

      return s3Asset

    } catch (error) {
      setUploadProgress(prev => ({
        ...prev,
        [identifier]: {
          ...prev[identifier]!,
          status: 'error',
          error: error instanceof Error ? error.message : 'Upload failed'
        }
      }))

      setActiveUploads(prev => {
        const newSet = new Set(prev)
        newSet.delete(identifier)
        return newSet
      })
      
      abortControllers.current.delete(identifier)
      delete uploadedBytesByPart.current[identifier]
      delete lastProgressUpdate.current[identifier]
      
      throw error
    }
  }, [])

  const cancelUpload = useCallback(async (identifier: string) => {
    const controller = abortControllers.current.get(identifier)
    if (controller) {
      controller.abort()
    }

    const upload = uploadProgress[identifier]
    const multipartState = multipartUploads[identifier]
    
    if (upload?.isMultipart && multipartState?.uploadId && multipartState?.fileKey) {
      try {
        await apiCallRef.current('/api/admin/upload/abort', {
          fileKey: multipartState.fileKey,
          uploadId: multipartState.uploadId
        })
      } catch (error) {
        console.warn('Failed to abort multipart upload on S3:', error)
      }
    }

    setUploadProgress(prev => ({
      ...prev,
      [identifier]: {
        ...prev[identifier]!,
        status: 'cancelled',
        progress: 0
      }
    }))

    setActiveUploads(prev => {
      const newSet = new Set(prev)
      newSet.delete(identifier)
      return newSet
    })

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
      delete lastProgressUpdate.current[identifier]
      abortControllers.current.delete(identifier)
    }, 1000)
  }, [uploadProgress, multipartUploads])

  const retryUpload = useCallback(async (
    file: File,
    type: 'thumbnail' | 'previewVideo' | 'lessonVideo' | 'moduleThumbnail',
    identifier: string,
    moduleIndex?: number
  ) => {
    setUploadProgress(prev => {
      const newProgress = { ...prev }
      delete newProgress[identifier]
      return newProgress
    })
    
    delete uploadedBytesByPart.current[identifier]
    delete lastProgressUpdate.current[identifier]
    
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

// ==================== FILE UPLOAD AREA ====================
interface FileUploadAreaProps {
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
  onBrowseLibrary?: () => void
  onFileSelect?: (file: File) => void
}

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
  onBrowseLibrary,
  onFileSelect,
}: FileUploadAreaProps) => {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragOver, setDragOver] = useState(false)
  const [fileSizeError, setFileSizeError] = useState<string | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [mobileFile, setMobileFile] = useState<File | null>(null)

  const identifier = useMemo(() => 
    type === 'lessonVideo' && moduleIndex !== undefined && chapterIndex !== undefined && lessonIndex !== undefined
      ? `lesson-${moduleIndex}-${chapterIndex}-${lessonIndex}` 
      : type === 'moduleThumbnail' && moduleIndex !== undefined
        ? `module-${moduleIndex}-thumbnail` 
        : type
  , [type, moduleIndex, chapterIndex, lessonIndex])

  const upload = useMemo(() => 
    uploadProgress?.[identifier]
  , [uploadProgress, identifier])

  const isVideo = useMemo(() => 
    type === 'previewVideo' || type === 'lessonVideo'
  , [type])

  // Mobile-specific file handling
  useEffect(() => {
    const checkIsMobile = isMobile()
    if (checkIsMobile && upload?.status === 'uploading') {
      // Keep screen awake on mobile during upload
      if ('wakeLock' in navigator) {
        try {
          navigator.wakeLock.request('screen')
            .then(wakeLock => {
              console.log('Screen wake lock acquired')
            })
            .catch(err => {
              console.error('Failed to acquire wake lock:', err)
            })
        } catch (err) {
          console.error('Wake lock not supported:', err)
        }
      }
    }
  }, [upload?.status])

  const handleFileSelect = useCallback(async (file: File) => {
    // Validate file size (10GB for all devices)
    const MAX_SIZE = 10 * 1024 * 1024 * 1024;
    
    if (file.size > MAX_SIZE) {
      const maxSizeText = formatFileSize(MAX_SIZE);
      const fileSizeText = formatFileSize(file.size);
      setFileSizeError(`File too large. Maximum: ${maxSizeText}. Your file: ${fileSizeText}`);
      return;
    }
    
    setFileSizeError(null);
    setIsUploading(true);
    
    // Store file reference for mobile
    if (isMobile()) {
      setMobileFile(file);
    }
    
    // For mobile, use setTimeout to ensure UI updates before upload starts
    setTimeout(() => {
      if (onFileSelect) {
        onFileSelect(file);
      } else {
        const dataTransfer = new DataTransfer();
        dataTransfer.items.add(file);
        const syntheticEvent = {
          target: { files: dataTransfer.files }
        } as React.ChangeEvent<HTMLInputElement>;
        onFileChange(syntheticEvent);
      }
      
      // Reset uploading state after a delay
      setTimeout(() => {
        setIsUploading(false);
      }, 500);
    }, 300);
  }, [onFileSelect, onFileChange])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file && acceptedFiles.split(',').some(ext => file.type.includes(ext.replace('*', '')))) {
      handleFileSelect(file);
    }
  }, [acceptedFiles, handleFileSelect])

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setFileSizeError(null);
    
    // Use setTimeout to ensure proper event handling on mobile
    setTimeout(() => {
      handleFileSelect(file);
    }, 100);
  }, [handleFileSelect])

  const handleClick = useCallback(() => {
    if (upload?.status === 'uploading' || isUploading) return;
    
    setFileSizeError(null);
    
    if (inputRef.current) {
      inputRef.current.value = '';
      inputRef.current.click();
    }
  }, [upload?.status, isUploading])

  const isFromLibrary = useMemo(() => {
    return currentFile?.url?.includes('s3.amazonaws.com') || currentFile?.key?.includes('courses/');
  }, [currentFile])

  // Mobile-specific retry button
  const handleMobileRetry = useCallback(() => {
    if (mobileFile && onRetryUpload) {
      handleFileSelect(mobileFile);
    }
  }, [mobileFile, onRetryUpload, handleFileSelect])

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        {isVideo ? (
          <div className="p-2 rounded-lg bg-gradient-to-r from-blue-500 to-cyan-500 text-white">
            <Film className="w-5 h-5" />
          </div>
        ) : (
          <div className="p-2 rounded-lg bg-gradient-to-r from-purple-500 to-pink-500 text-white">
            <Image className="w-5 h-5" />
          </div>
        )}
        <div>
          <span className="font-semibold text-slate-900 dark:text-white">{label}</span>
          <span className="text-sm text-slate-500 dark:text-slate-400 ml-2">({maxSize})</span>
          {currentFile && !upload && (
            <span className="text-xs text-emerald-600 dark:text-emerald-400 ml-2">
              ✓ {isFromLibrary ? 'From Library' : 'Uploaded'}
            </span>
          )}
          {isMobile() && isUploading && !upload && (
            <span className="text-xs text-blue-600 dark:text-blue-400 ml-2">
              Processing...
            </span>
          )}
        </div>
        
        {/* Library Button */}
        {isVideo && !upload && !isUploading && onBrowseLibrary && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onBrowseLibrary}
            className="ml-auto h-9 rounded-lg"
          >
            <Search className="w-4 h-4 mr-2" />
            Browse Library
          </Button>
        )}
      </div>
      
      <input
        ref={inputRef}
        type="file"
        accept={acceptedFiles}
        onChange={handleInputChange}
        className="hidden"
        disabled={upload?.status === 'uploading' || isUploading}
        // Mobile-specific attributes
        capture={isMobile() && isVideo ? "environment" : undefined}
      />
      
      <div 
        className={`relative rounded-2xl p-6 text-center cursor-pointer transition-all duration-300 min-h-[180px] flex flex-col items-center justify-center border-2 ${
          dragOver 
            ? 'border-emerald-400 bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20' 
            : upload || isUploading
              ? 'border-blue-300 bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 cursor-not-allowed' 
              : currentFile
                ? 'border-emerald-400 bg-gradient-to-br from-emerald-50/50 to-teal-50/50 dark:from-emerald-900/20 dark:to-teal-900/20'
                : 'border-dashed border-slate-300 dark:border-slate-700 bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900/50 dark:to-slate-800/50 hover:border-emerald-400 hover:bg-gradient-to-br hover:from-emerald-50/50 hover:to-teal-50/50'
        }`}
        onClick={handleClick}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {fileSizeError && (
          <div className="absolute top-3 left-3 right-3 bg-gradient-to-r from-rose-500 to-red-500 text-white text-xs px-3 py-2 rounded-lg shadow-lg z-30">
            {fileSizeError}
          </div>
        )}
        
        {currentFile && !upload && !isUploading ? (
          <div className="space-y-4 w-full">
            <div className="relative mx-auto w-40 h-40 rounded-xl overflow-hidden shadow-lg">
              {isVideo ? (
                <>
                  <div className="absolute inset-0 bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center">
                    <Play className="w-10 h-10 text-white z-10" />
                    <div className="absolute inset-0">
                      <div className="w-full h-full bg-gradient-to-br from-blue-900/70 to-cyan-900/70" />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <Video className="w-16 h-16 text-white/50" />
                      </div>
                    </div>
                  </div>
                  <div className="absolute bottom-3 right-3 bg-gradient-to-r from-blue-600 to-cyan-600 text-white text-xs px-3 py-1.5 rounded-full shadow-lg z-20">
                    Video
                  </div>
                  {isFromLibrary && (
                    <div className="absolute top-3 left-3 bg-emerald-600 text-white text-xs px-2 py-1 rounded-full shadow-lg z-20">
                      Library
                    </div>
                  )}
                </>
              ) : (
                <>
                  <img
                    src={currentFile.url}
                    alt="Preview"
                    className="w-full h-full object-cover"
                    loading="lazy"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = `data:image/svg+xml,${encodeURIComponent('<svg width="200" height="200" viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg"><rect width="200" height="200" fill="%23F3F4F6"/><text x="50%" y="50%" font-family="Arial" font-size="12" fill="%23999" text-anchor="middle" dy=".3em">Image Preview</text></svg>')}`
                    }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
                  <div className="absolute bottom-3 right-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white text-xs px-3 py-1.5 rounded-full shadow-lg">
                    Image
                  </div>
                  {isFromLibrary && (
                    <div className="absolute top-3 left-3 bg-emerald-600 text-white text-xs px-2 py-1 rounded-full shadow-lg">
                      Library
                    </div>
                  )}
                </>
              )}
            </div>
            <div className="px-4">
              <p className="font-medium text-slate-900 dark:text-white truncate">
                {currentFile.fileName || currentFile.url?.split('/').pop()?.substring(0, 25) || 'Unknown file'}...
              </p>
              <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                {formatFileSize(currentFile.size || 0)}
                {currentFile.duration && ` • ${currentFile.duration}s`}
              </p>
              <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1">
                ✓ {isFromLibrary ? 'Selected from video library' : 'Uploaded successfully'}
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-4 px-4">
            <div className="relative mx-auto">
              <div className={`p-4 rounded-2xl shadow-lg ${upload || isUploading ? 'bg-gradient-to-r from-blue-500 to-cyan-500' : 'bg-gradient-to-r from-emerald-500 to-teal-500'}`}>
                {upload || isUploading ? (
                  <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : isVideo ? (
                  <Film className="w-8 h-8 text-white" />
                ) : (
                  <Image className="w-8 h-8 text-white" />
                )}
              </div>
            </div>
            <div className="space-y-2">
              <p className="font-semibold text-slate-900 dark:text-white">
                {upload || isUploading ? (
                  <span className="inline-flex items-center gap-2">
                    <span>{isUploading && !upload ? 'Processing...' : 'Uploading...'}</span>
                    {upload?.progress && (
                      <span className="text-sm font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
                        {Math.round(upload.progress)}%
                      </span>
                    )}
                  </span>
                ) : (
                  `Upload ${isVideo ? 'Video' : 'Image'}`
                )}
              </p>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                {dragOver ? 'Drop file here' : 'Click to browse or drag & drop'}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-500 mt-2">
                {isVideo 
                  ? 'MP4, WebM, MOV up to 10GB'
                  : 'JPG, PNG, WebP up to 20MB'
                }
              </p>
              {isVideo && (
                <div className="mt-1 inline-flex items-center gap-0.5 text-xs text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-2 py-1 rounded-full max-w-full">
                  <Shield className="w-3 h-3 flex-shrink-0" />
                  <span className="truncate">10GB multipart upload supported</span>
                </div>
              )}
              {isMobile() && (
                <div className="mt-1 inline-flex items-center gap-0.5 text-xs text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30 px-2 py-1 rounded-full max-w-full">
                  <Info className="w-3 h-3 flex-shrink-0" />
                  <span className="truncate">Mobile: Keep screen on for best results</span>
                </div>
              )}
              {isVideo && onBrowseLibrary && !upload && !isUploading && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={onBrowseLibrary}
                  className="mt-2 h-8 text-xs"
                >
                  <Search className="w-3 h-3 mr-1" />
                  Or select from video library
                </Button>
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
      
      {/* Mobile-specific retry button for failed file selection */}
      {isMobile() && !upload && mobileFile && !currentFile && (
        <div className="flex items-center justify-between p-3 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 rounded-xl">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600" />
            <span className="text-sm font-medium">File selected but not uploaded</span>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleMobileRetry}
            className="h-8 text-xs"
          >
            Retry
          </Button>
        </div>
      )}
    </div>
  )
})
FileUploadArea.displayName = 'FileUploadArea'

// ==================== NEW COMPONENTS ====================
interface SectionHeaderProps {
  title: string
  description: string
  icon: React.ElementType
  color?: string
}

const SectionHeader = memo(({ 
  title, 
  description, 
  icon: Icon,
  color = 'from-emerald-500 to-teal-500'
}: SectionHeaderProps) => (
  <div className="flex items-center gap-4 mb-6">
    <div className={`p-3 rounded-xl bg-gradient-to-r ${color} text-white shadow-lg`}>
      <Icon className="w-6 h-6" />
    </div>
    <div>
      <h2 className="text-xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 dark:from-white dark:to-slate-300 bg-clip-text text-transparent">{title}</h2>
      <p className="text-sm text-slate-600 dark:text-slate-400">{description}</p>
    </div>
  </div>
))
SectionHeader.displayName = 'SectionHeader'

interface FormCardProps {
  children: React.ReactNode
  className?: string
}

const FormCard = memo(({ 
  children, 
  className = '' 
}: FormCardProps) => (
  <Card className={`bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm border border-slate-200/50 dark:border-slate-700/50 shadow-xl rounded-2xl overflow-hidden ${className}`}>
    {children}
  </Card>
))
FormCard.displayName = 'FormCard'

interface FormGroupProps {
  label: string
  children: React.ReactNode
  required?: boolean
  icon?: React.ElementType
  disabled?: boolean
}

const FormGroup = memo(({ 
  label, 
  children,
  required = false,
  icon: Icon,
  disabled = false
}: FormGroupProps) => (
  <div className="space-y-3">
    <label className={`font-semibold text-slate-900 dark:text-white flex items-center gap-2 ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}>
      {Icon && <Icon className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />}
      {label}
      {required && <span className="text-rose-500">*</span>}
    </label>
    <div className={disabled ? 'opacity-50 cursor-not-allowed' : ''}>
      {children}
    </div>
  </div>
))
FormGroup.displayName = 'FormGroup'

interface UploadStatsPanelProps {
  uploadStats: { totalFiles: number, totalSize: number, completedFiles: number }
  activeUploads: string[]
  uploadProgress: UploadProgress
}

const UploadStatsPanel = memo(({ 
  uploadStats,
  activeUploads,
  uploadProgress
}: UploadStatsPanelProps) => (
  <FormCard>
    <CardHeader>
      <SectionHeader 
        title="Upload Statistics" 
        description="Current upload progress"
        icon={CloudUpload}
        color="from-blue-500 to-cyan-500"
      />
    </CardHeader>
    <CardContent className="space-y-3">
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
  </FormCard>
))
UploadStatsPanel.displayName = 'UploadStatsPanel'

interface MobileUploadNotificationProps {
  show: boolean
  message: string
  type: 'info' | 'warning' | 'error' | 'success'
  onClose: () => void
}

const MobileUploadNotification = memo(({ 
  show, 
  message, 
  type,
  onClose 
}: MobileUploadNotificationProps) => {
  if (!show) return null;
  
  const bgColor = {
    info: 'from-blue-500 to-cyan-500',
    warning: 'from-amber-500 to-orange-500',
    error: 'from-rose-500 to-red-500',
    success: 'from-emerald-500 to-green-500'
  }[type];
  
  return (
    <motion.div
      initial={{ y: 100 }}
      animate={{ y: 0 }}
      exit={{ y: 100 }}
      className="fixed bottom-20 left-4 right-4 z-50 sm:hidden"
    >
      <div className={`p-4 rounded-2xl bg-gradient-to-r ${bgColor} text-white shadow-2xl`}>
        <div className="flex items-center gap-3">
          {type === 'warning' ? (
            <AlertTriangle className="w-5 h-5" />
          ) : type === 'error' ? (
            <AlertCircle className="w-5 h-5" />
          ) : type === 'success' ? (
            <CheckCircle className="w-5 h-5" />
          ) : (
            <Info className="w-5 h-5" />
          )}
          <p className="flex-1 text-sm font-medium">{message}</p>
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </motion.div>
  );
});
MobileUploadNotification.displayName = 'MobileUploadNotification'

interface StickyActionsProps {
  loading: boolean
  activeUploads: string[]
  networkStatus: string
  hasThumbnail: boolean
  onSubmit: (e: React.MouseEvent<HTMLButtonElement>) => void
  canSubmit: boolean
}

const StickyActions = memo(({ 
  loading, 
  activeUploads, 
  networkStatus, 
  hasThumbnail,
  onSubmit,
  canSubmit
}: StickyActionsProps) => {
  const handleSubmit = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault()
    e.stopPropagation()
    onSubmit(e)
  }

  return (
    <div className="sticky bottom-0 left-0 right-0 bg-gradient-to-t from-white via-white/95 to-white/90 dark:from-slate-900 dark:via-slate-900/95 dark:to-slate-900/90 backdrop-blur-xl border-t border-slate-200/50 dark:border-slate-800/50 p-6 z-50">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row gap-4">
          <Button 
            type="button"
            onClick={handleSubmit}
            className="flex-1 h-14 text-base font-bold shadow-2xl bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-700 hover:to-teal-600 text-white rounded-2xl transform hover:scale-[1.02] transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed" 
            disabled={loading || !canSubmit || !hasThumbnail || networkStatus === 'offline'}
          >
            {loading ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-3" />
                Creating Course...
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5 mr-2" />
                Create & Publish Course
              </>
            )}
          </Button>
          
          <Button 
            type="button" 
            variant="outline" 
            className="h-14 rounded-2xl border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800"
            onClick={() => window.history.back()}
            disabled={loading}
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            Cancel
          </Button>
        </div>
        
        <AnimatePresence>
          {activeUploads.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="text-center text-sm bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent font-medium mt-3 flex items-center justify-center gap-2"
            >
              <CloudUpload className="w-4 h-4" />
              {activeUploads.length} upload{activeUploads.length > 1 ? 's' : ''} in progress • Please wait...
            </motion.div>
          )}
          
          {networkStatus === 'offline' && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center text-sm bg-gradient-to-r from-rose-600 to-red-500 bg-clip-text text-transparent font-medium mt-3 flex items-center justify-center"
            >
              <WifiOff className="w-4 h-4 mr-2" />
              You are offline. Connect to internet to continue.
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
})
StickyActions.displayName = 'StickyActions'

const LoadingSkeleton = memo(() => (
  <div className="min-h-screen bg-gradient-to-br from-slate-50 to-white dark:from-slate-900 dark:to-slate-950 flex items-center justify-center">
    <div className="text-center space-y-6">
      <div className="relative">
        <div className="w-16 h-16 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
        <div className="absolute inset-0 bg-gradient-to-r from-emerald-500 to-teal-500 blur-2xl opacity-20"></div>
      </div>
      <div>
        <p className="text-lg font-bold bg-gradient-to-r from-emerald-600 to-teal-500 bg-clip-text text-transparent">Loading Course Creator</p>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">Preparing your workspace...</p>
      </div>
    </div>
  </div>
))
LoadingSkeleton.displayName = 'LoadingSkeleton'

interface AccessDeniedProps {
  onBack: () => void
}

const AccessDenied = memo(({ onBack }: AccessDeniedProps) => (
  <div className="min-h-screen bg-gradient-to-br from-slate-50 to-white dark:from-slate-900 dark:to-slate-950 flex items-center justify-center">
    <div className="text-center max-w-md px-6">
      <div className="p-4 rounded-2xl bg-gradient-to-r from-rose-100 to-pink-100 dark:from-rose-900/30 dark:to-pink-900/30 w-20 h-20 mx-auto mb-6 flex items-center justify-center">
        <Lock className="w-10 h-10 text-rose-600 dark:text-rose-400" />
      </div>
      <h2 className="text-2xl font-bold bg-gradient-to-r from-rose-600 to-pink-600 bg-clip-text text-transparent mb-3">Access Denied</h2>
      <p className="text-slate-600 dark:text-slate-400 mb-8">
        Admin privileges are required to access this page.
      </p>
      <Button 
        onClick={onBack} 
        className="w-full h-12 text-base font-semibold rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-700 hover:to-teal-600 text-white"
      >
        Return to Home
      </Button>
    </div>
  </div>
))
AccessDenied.displayName = 'AccessDenied'

// ==================== MAIN PAGE ====================
export default function CreateCoursePage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [isClient, setIsClient] = useState(false)
  const [userRole, setUserRole] = useState<string | null>(null)
  const [checkingAuth, setCheckingAuth] = useState(true)
  const [networkStatus, setNetworkStatus] = useState<'online' | 'offline'>(
    typeof window !== 'undefined' ? (navigator.onLine ? 'online' : 'offline') : 'online'
  )
  const [uploadStats, setUploadStats] = useState({
    totalFiles: 0,
    totalSize: 0,
    completedFiles: 0
  })
  
  // Video library state
  const [showVideoLibrary, setShowVideoLibrary] = useState<{
    open: boolean
    type: 'previewVideo' | 'lessonVideo'
    moduleIndex?: number
    chapterIndex?: number
    lessonIndex?: number
  }>({ open: false, type: 'lessonVideo' })
  
  // Mobile notification state
  const [mobileUploadNotification, setMobileUploadNotification] = useState<{
    show: boolean
    message: string
    type: 'info' | 'warning' | 'error' | 'success'
  }>({ show: false, message: '', type: 'info' })
  
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
    _id: '',
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
    const handleOnline = () => setNetworkStatus('online')
    const handleOffline = () => setNetworkStatus('offline')
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  // Authentication check
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
    
    if (isLoaded) {
      checkUserRole()
    }
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

  // Mobile notification effect
  useEffect(() => {
    const isMobileDevice = isMobile()
    
    if (isMobileDevice && activeUploads.length > 0) {
      setMobileUploadNotification({
        show: true,
        message: 'Upload in progress. Keep screen on and app open for best results.',
        type: 'info'
      })
      
      const timer = setTimeout(() => {
        setMobileUploadNotification(prev => ({ ...prev, show: false }))
      }, 10000)
      
      return () => clearTimeout(timer)
    }
    
    if (activeUploads.length === 0 && mobileUploadNotification.show) {
      setMobileUploadNotification(prev => ({ ...prev, show: false }))
    }
  }, [activeUploads, mobileUploadNotification.show])

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

  // Video selection handler
  const handleVideoLibrarySelect = useCallback((video: VideoLibraryItem, context: {
    type: 'previewVideo' | 'lessonVideo'
    moduleIndex?: number
    chapterIndex?: number
    lessonIndex?: number
  }) => {
    const s3Asset: S3Asset = {
      key: video.video.key,
      url: video.video.url,
      size: video.video.size,
      type: 'video',
      duration: video.video.duration,
      fileName: video.video.originalFileName || video.title,
      width: video.video.width,
      height: video.video.height,
      uploadedAt: video.uploadDate,
      mimeType: video.video.mimeType
    }

    if (context.type === 'previewVideo') {
      setFormData(prev => ({ 
        ...prev, 
        previewVideo: s3Asset 
      }));
    } else if (context.type === 'lessonVideo' && 
               context.moduleIndex !== undefined && 
               context.chapterIndex !== undefined && 
               context.lessonIndex !== undefined) {
      
      setFormData(prev => {
        const updatedModules = [...prev.modules];
        
        if (!updatedModules[context.moduleIndex!]) {
          console.error('❌ Module does not exist at index:', context.moduleIndex);
          return prev;
        }
        
        if (!updatedModules[context.moduleIndex!].chapters[context.chapterIndex!]) {
          console.error('❌ Chapter does not exist at index:', context.chapterIndex);
          return prev;
        }
        
        if (!updatedModules[context.moduleIndex!].chapters[context.chapterIndex!].lessons[context.lessonIndex!]) {
          console.error('❌ Lesson does not exist at index:', context.lessonIndex);
          return prev;
        }
        
        updatedModules[context.moduleIndex!] = {
          ...updatedModules[context.moduleIndex!],
          chapters: updatedModules[context.moduleIndex!].chapters.map((chapter, chapIdx) =>
            chapIdx === context.chapterIndex ? {
              ...chapter,
              lessons: chapter.lessons.map((lesson, lesIdx) =>
                lesIdx === context.lessonIndex ? {
                  ...lesson,
                  video: s3Asset,
                  videoSource: {
                    type: 'library',
                    videoLibraryId: video._id,
                    video: s3Asset,
                    uploadedAt: video.uploadDate,
                    uploadedBy: video.uploadedBy?._id
                  }
                } : lesson
              )
            } : chapter
          )
        };
        
        return { 
          ...prev, 
          modules: updatedModules 
        };
      });
    }
  }, [])

  // File upload handlers - FIXED FOR MOBILE
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
        setFormData(prev => {
          const updatedModules = [...prev.modules]
          updatedModules[moduleIndex] = {
            ...updatedModules[moduleIndex],
            thumbnailUrl: result.url
          }
          return { ...prev, modules: updatedModules }
        })
      } catch (error) {
        console.error('Error uploading module thumbnail:', error)
      }
    }
  }, [enhancedUploadFile])

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
        setFormData(prev => {
          const updatedModules = [...prev.modules]
          updatedModules[moduleIndex] = {
            ...updatedModules[moduleIndex],
            chapters: updatedModules[moduleIndex].chapters.map((chapter, chapIdx) => 
              chapIdx === chapterIndex ? {
                ...chapter,
                lessons: chapter.lessons.map((lesson, lesIdx) => 
                  lesIdx === lessonIndex ? {
                    ...lesson,
                    video: result,
                    videoSource: {
                      type: 'uploaded',
                      video: result,
                      uploadedAt: new Date().toISOString()
                    }
                  } : lesson
                )
              } : chapter
            )
          }
          return { ...prev, modules: updatedModules }
        })
      } catch (error) {
        console.error('Error uploading lesson video:', error)
      }
    }
  }, [enhancedUploadFile])

  // Mobile-specific file selection handler
  const handleMobileFileSelect = useCallback(async (
    file: File,
    type: 'thumbnail' | 'previewVideo' | 'lessonVideo' | 'moduleThumbnail',
    moduleIndex?: number,
    chapterIndex?: number,
    lessonIndex?: number
  ) => {
    if (!file) return;

    try {
      let result: S3Asset;
      
      if (type === 'thumbnail') {
        result = await enhancedUploadFile(file, type, 'thumbnail');
        setFormData(prev => ({ ...prev, thumbnail: result }));
      } else if (type === 'previewVideo') {
        result = await enhancedUploadFile(file, type, 'previewVideo');
        setFormData(prev => ({ ...prev, previewVideo: result }));
      } else if (type === 'moduleThumbnail' && moduleIndex !== undefined) {
        result = await enhancedUploadFile(file, type, `module-${moduleIndex}-thumbnail`, moduleIndex);
        setFormData(prev => {
          const updatedModules = [...prev.modules];
          updatedModules[moduleIndex] = {
            ...updatedModules[moduleIndex],
            thumbnailUrl: result.url
          };
          return { ...prev, modules: updatedModules };
        });
      } else if (type === 'lessonVideo' && moduleIndex !== undefined && chapterIndex !== undefined && lessonIndex !== undefined) {
        const identifier = `lesson-${moduleIndex}-${chapterIndex}-${lessonIndex}`;
        result = await enhancedUploadFile(file, type, identifier, moduleIndex);
        setFormData(prev => {
          const updatedModules = [...prev.modules];
          updatedModules[moduleIndex] = {
            ...updatedModules[moduleIndex],
            chapters: updatedModules[moduleIndex].chapters.map((chapter, chapIdx) => 
              chapIdx === chapterIndex ? {
                ...chapter,
                lessons: chapter.lessons.map((lesson, lesIdx) => 
                  lesIdx === lessonIndex ? {
                    ...lesson,
                    video: result,
                    videoSource: {
                      type: 'uploaded',
                      video: result,
                      uploadedAt: new Date().toISOString()
                    }
                  } : lesson
                )
              } : chapter
            )
          };
          return { ...prev, modules: updatedModules };
        });
      }
    } catch (error) {
      console.error('Mobile upload failed:', error);
      // Show mobile notification
      setMobileUploadNotification({
        show: true,
        message: 'Upload failed. Please try again.',
        type: 'error'
      });
    }
  }, [enhancedUploadFile]);

  const handleRetryUpload = useCallback(async (identifier: string) => {
    const upload = uploadProgress[identifier]
    if (!upload) return

    const input = document.createElement('input')
    input.type = 'file'
    input.accept = upload.type.includes('video') 
      ? 'video/mp4,video/webm,video/ogg,video/quicktime,video/mov' 
      : 'image/jpeg,image/jpg,image/png,image/webp'
    
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (!file) return

      try {
        let moduleIndex: number | undefined
        if (identifier.startsWith('lesson-')) {
          const parts = identifier.split('-')
          moduleIndex = parseInt(parts[1])
        } else if (identifier.startsWith('module-')) {
          const parts = identifier.split('-')
          moduleIndex = parseInt(parts[1])
        }
        
        const type = upload.type as 'thumbnail' | 'previewVideo' | 'lessonVideo' | 'moduleThumbnail'
        const result = await enhancedUploadFile(file, type, identifier, moduleIndex)
        
        if (type === 'thumbnail') {
          setFormData(prev => ({ ...prev, thumbnail: result }))
        } else if (type === 'previewVideo') {
          setFormData(prev => ({ ...prev, previewVideo: result }))
        } else if (type === 'moduleThumbnail' && moduleIndex !== undefined) {
          setFormData(prev => {
            const updatedModules = [...prev.modules]
            updatedModules[moduleIndex!] = {
              ...updatedModules[moduleIndex!],
              thumbnailUrl: result.url
            }
            return { ...prev, modules: updatedModules }
          })
        } else if (type === 'lessonVideo' && identifier.startsWith('lesson-')) {
          const parts = identifier.split('-')
          const modIdx = parseInt(parts[1])
          const chapIdx = parseInt(parts[2])
          const lesIdx = parseInt(parts[3])
          
          setFormData(prev => {
            const updatedModules = [...prev.modules]
            if (updatedModules[modIdx]?.chapters[chapIdx]?.lessons[lesIdx]) {
              updatedModules[modIdx] = {
                ...updatedModules[modIdx],
                chapters: updatedModules[modIdx].chapters.map((chapter, cIdx) => 
                  cIdx === chapIdx ? {
                    ...chapter,
                    lessons: chapter.lessons.map((lesson, lIdx) => 
                      lIdx === lesIdx ? {
                        ...lesson,
                        video: result,
                        videoSource: {
                          type: 'uploaded',
                          video: result,
                          uploadedAt: new Date().toISOString()
                        }
                      } : lesson
                    )
                  } : chapter
                )
              }
            }
            return { ...prev, modules: updatedModules }
          })
        }
      } catch (error) {
        console.error('Retry failed:', error)
      }
    }
    
    input.click()
  }, [enhancedUploadFile, uploadProgress])

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
    setFormData(prev => {
      const updatedModules = [...prev.modules]
      updatedModules[moduleIndex] = {
        ...updatedModules[moduleIndex],
        chapters: [
          ...updatedModules[moduleIndex].chapters,
          {
            title: '',
            description: '',
            order: updatedModules[moduleIndex].chapters.length,
            lessons: []
          }
        ]
      }
      return { ...prev, modules: updatedModules }
    })
  }, [])

  const removeChapter = useCallback((moduleIndex: number, chapterIndex: number) => {
    setFormData(prev => {
      const updatedModules = [...prev.modules]
      updatedModules[moduleIndex] = {
        ...updatedModules[moduleIndex],
        chapters: updatedModules[moduleIndex].chapters.filter(
          (_, index) => index !== chapterIndex
        )
      }
      return { ...prev, modules: updatedModules }
    })
  }, [])

  // Lesson management
  const addLesson = useCallback((moduleIndex: number, chapterIndex: number) => {
    setFormData(prev => {
      const updatedModules = [...prev.modules]
      updatedModules[moduleIndex] = {
        ...updatedModules[moduleIndex],
        chapters: updatedModules[moduleIndex].chapters.map((chapter, chapIdx) =>
          chapIdx === chapterIndex ? {
            ...chapter,
            lessons: [
              ...chapter.lessons,
              {
                title: '',
                description: '',
                content: '',
                duration: 0,
                isPreview: false,
                resources: [],
                order: chapter.lessons.length
              }
            ]
          } : chapter
        )
      }
      return { ...prev, modules: updatedModules }
    })
  }, [])

  const removeLesson = useCallback((moduleIndex: number, chapterIndex: number, lessonIndex: number) => {
    setFormData(prev => {
      const updatedModules = [...prev.modules]
      updatedModules[moduleIndex] = {
        ...updatedModules[moduleIndex],
        chapters: updatedModules[moduleIndex].chapters.map((chapter, chapIdx) =>
          chapIdx === chapterIndex ? {
            ...chapter,
            lessons: chapter.lessons.filter(
              (_, index) => index !== lessonIndex
            )
          } : chapter
        )
      }
      return { ...prev, modules: updatedModules }
    })
  }, [])

  const addResource = useCallback((moduleIndex: number, chapterIndex: number, lessonIndex: number) => {
    setFormData(prev => {
      const updatedModules = [...prev.modules]
      updatedModules[moduleIndex] = {
        ...updatedModules[moduleIndex],
        chapters: updatedModules[moduleIndex].chapters.map((chapter, chapIdx) =>
          chapIdx === chapterIndex ? {
            ...chapter,
            lessons: chapter.lessons.map((lesson, lesIdx) =>
              lesIdx === lessonIndex ? {
                ...lesson,
                resources: [...lesson.resources, {
                  title: '',
                  url: '',
                  type: 'pdf'
                }]
              } : lesson
            )
          } : chapter
        )
      }
      return { ...prev, modules: updatedModules }
    })
  }, [])

  const removeResource = useCallback((moduleIndex: number, chapterIndex: number, lessonIndex: number, resourceIndex: number) => {
    setFormData(prev => {
      const updatedModules = [...prev.modules]
      updatedModules[moduleIndex] = {
        ...updatedModules[moduleIndex],
        chapters: updatedModules[moduleIndex].chapters.map((chapter, chapIdx) =>
          chapIdx === chapterIndex ? {
            ...chapter,
            lessons: chapter.lessons.map((lesson, lesIdx) =>
              lesIdx === lessonIndex ? {
                ...lesson,
                resources: lesson.resources.filter((_, index) => index !== resourceIndex)
              } : lesson
            )
          } : chapter
        )
      }
      return { ...prev, modules: updatedModules }
    })
  }, [])

  // Form submission
  const handleSubmit = useCallback(async (e: React.FormEvent | React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault()
    e.stopPropagation()
    
    // Check if there are any uploads in progress
    const uploadingFiles = Object.values(uploadProgress).filter(
      u => u.status === 'initiating' || u.status === 'generating-urls' || u.status === 'uploading' || u.status === 'processing'
    )
    
    if (uploadingFiles.length > 0) {
      alert('Please wait for all uploads to complete before submitting')
      return
    }

    if (networkStatus === 'offline') {
      alert('You are offline. Please check your internet connection and try again.')
      return
    }

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
        alert('Course created successfully!')
        router.push('/admin/courses');
        router.refresh();
      } else {
        alert(responseData.error || responseData.details || 'Failed to create course')
      }
    } catch (error) {
      console.error('Error creating course:', error)
      alert('Failed to create course. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [uploadProgress, networkStatus, formData, router])

  // Check if user can submit (no uploads in progress)
  const canSubmit = useMemo(() => {
    const uploadingFiles = Object.values(uploadProgress).filter(
      u => u.status === 'initiating' || 
           u.status === 'generating-urls' || 
           u.status === 'uploading' || 
           u.status === 'processing'
    )
    return uploadingFiles.length === 0
  }, [uploadProgress])

  // Show loading state
  if (!isLoaded || !isClient || checkingAuth) {
    return <LoadingSkeleton />
  }

  if (!isSignedIn) {
    return null
  }

  if (userRole !== 'admin') {
    return <AccessDenied onBack={() => router.push('/')} />
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-emerald-50/30 dark:from-slate-900 dark:via-slate-950 dark:to-emerald-900/10 pb-32">
      <div className="p-4 sm:p-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => router.push('/admin/courses')}
            className="mb-4 text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Courses
          </Button>
          
          <div className="space-y-3">
            <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-emerald-600 via-teal-500 to-cyan-600 bg-clip-text text-transparent">
              Create New Course
            </h1>
            <p className="text-slate-600 dark:text-slate-400">
              Design and publish a comprehensive fashion course with 10GB video support
            </p>
          </div>
        </div>

        {/* Upload Status Banner */}
        <AnimatePresence>
          {activeUploads.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="mb-8 space-y-4"
            >
              <Alert className="border-blue-200 bg-gradient-to-r from-blue-50/80 to-cyan-50/80 dark:from-blue-900/30 dark:to-cyan-900/30 backdrop-blur-sm">
                <div className="flex gap-3">
                  <div className="p-2 rounded-lg bg-gradient-to-r from-blue-500 to-cyan-500 text-white">
                    <CloudUpload className="h-5 w-5" />
                  </div>
                  <div>
                    <AlertTitle className="text-base font-bold text-blue-800 dark:text-blue-300">
                      Uploading {activeUploads.length} file{activeUploads.length > 1 ? 's' : ''}
                    </AlertTitle>
                    <AlertDescription className="text-sm text-blue-700 dark:text-blue-400">
                      Files are uploading to AWS S3. You can continue filling out the form while uploads are in progress.
                      {isMobile() && " Keep screen on for best results."}
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
            </motion.div>
          )}
        </AnimatePresence>

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Tabs for Mobile Navigation */}
          <div className="block sm:hidden">
            <Tabs defaultValue="basic" className="w-full">
              <TabsList className="grid w-full grid-cols-3 bg-gradient-to-r from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-900 p-1 rounded-2xl">
                <TabsTrigger value="basic" className="rounded-xl data-[state=active]:bg-white data-[state=active]:shadow-lg">
                  <BookOpen className="w-4 h-4 mr-2" />
                  Basic
                </TabsTrigger>
                <TabsTrigger value="content" className="rounded-xl data-[state=active]:bg-white data-[state=active]:shadow-lg">
                  <Layers className="w-4 h-4 mr-2" />
                  Content
                </TabsTrigger>
                <TabsTrigger value="settings" className="rounded-xl data-[state=active]:bg-white data-[state=active]:shadow-lg">
                  <Settings className="w-4 h-4 mr-2" />
                  Settings
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="basic" className="space-y-6 mt-4">
                {/* Basic Information Card */}
                <FormCard>
                  <CardHeader>
                    <SectionHeader 
                      title="Course Information" 
                      description="Basic details about your course"
                      icon={BookOpen}
                    />
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <FormGroup label="Course Title" required icon={Feather}>
                      <Input
                        placeholder="e.g., Advanced Fashion Design Masterclass"
                        value={formData.title}
                        onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                        className="h-12 rounded-xl border-slate-300 dark:border-slate-700 text-base"
                        required
                      />
                    </FormGroup>

                    <FormGroup label="Short Description" required icon={FileText}>
                      <Textarea
                        placeholder="Brief overview of the course"
                        value={formData.shortDescription}
                        onChange={(e) => setFormData(prev => ({ ...prev, shortDescription: e.target.value }))}
                        className="min-h-[100px] rounded-xl border-slate-300 dark:border-slate-700 text-base"
                        required
                      />
                    </FormGroup>

                    <FormGroup label="Full Description" required icon={BookOpen}>
                      <Textarea
                        placeholder="Detailed description of what students will learn..."
                        value={formData.description}
                        onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                        className="min-h-[120px] rounded-xl border-slate-300 dark:border-slate-700 text-base"
                        required
                      />
                    </FormGroup>

                    <div className="grid grid-cols-1 gap-6">
                      <FormGroup label="Level" required icon={TrendingUp}>
                        <select
                          value={formData.level}
                          onChange={(e) => setFormData(prev => ({ 
                            ...prev, 
                            level: e.target.value as 'beginner' | 'intermediate' | 'advanced' 
                          }))}
                          className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-emerald-500"
                          required
                        >
                          <option value="beginner">Beginner</option>
                          <option value="intermediate">Intermediate</option>
                          <option value="advanced">Advanced</option>
                        </select>
                      </FormGroup>

                      <FormGroup label="Category" icon={Tag}>
                        <Input
                          placeholder="e.g., Fashion Design, Pattern Making (Optional)"
                          value={formData.category}
                          onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                          className="h-12 rounded-xl border-slate-300 dark:border-slate-700 text-base"
                        />
                      </FormGroup>
                    </div>

                    {/* Tags */}
                    <FormGroup label="Tags" icon={Tag}>
                      <div className="flex flex-wrap gap-2 mb-3">
                        {formData.tags.map((tag, index) => (
                          <Badge key={index} variant="secondary" className="rounded-full px-4 py-1.5 bg-gradient-to-r from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-900">
                            <span className="truncate">{tag}</span>
                            <button
                              type="button"
                              onClick={() => removeTag(tag)}
                              className="ml-2 hover:text-rose-500"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </Badge>
                        ))}
                      </div>
                      <div className="flex gap-2">
                        <Input
                          placeholder="Add a tag and press Enter"
                          value={newTag}
                          onChange={(e) => setNewTag(e.target.value)}
                          className="h-12 rounded-xl border-slate-300 dark:border-slate-700 text-base"
                          onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                        />
                        <Button type="button" onClick={addTag} variant="outline" className="h-12 px-4 rounded-xl">
                          <Plus className="w-5 h-5" />
                        </Button>
                      </div>
                    </FormGroup>
                  </CardContent>
                </FormCard>

                {/* Course Media Card */}
                <FormCard>
                  <CardHeader>
                    <SectionHeader 
                      title="Course Media" 
                      description="Upload thumbnail and preview video"
                      icon={Film}
                      color="from-blue-500 to-cyan-500"
                    />
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <FileUploadArea
                      type="thumbnail"
                      label="Course Thumbnail *"
                      acceptedFiles="image/jpeg,image/jpg,image/png,image/webp"
                      maxSize="20MB"
                      currentFile={formData.thumbnail}
                      onFileChange={handleThumbnailChange}
                      uploadProgress={uploadProgress}
                      onCancelUpload={cancelUpload}
                      onRetryUpload={handleRetryUpload}
                      onFileSelect={(file) => handleMobileFileSelect(file, 'thumbnail')}
                    />

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
                      onBrowseLibrary={() => setShowVideoLibrary({
                        open: true,
                        type: 'previewVideo'
                      })}
                      onFileSelect={(file) => handleMobileFileSelect(file, 'previewVideo')}
                    />
                  </CardContent>
                </FormCard>
              </TabsContent>

              <TabsContent value="content" className="space-y-6 mt-4">
                {/* Requirements & Outcomes */}
                <div className="space-y-6">
                  <FormCard>
                    <CardHeader>
                      <SectionHeader 
                        title="Requirements" 
                        description="What students should know before taking this course"
                        icon={Target}
                        color="from-rose-500 to-pink-500"
                      />
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {formData.requirements.map((requirement, index) => (
                        <div key={index} className="flex items-center gap-3 p-3 bg-gradient-to-r from-rose-50 to-pink-50 dark:from-rose-900/20 dark:to-pink-900/20 rounded-xl">
                          <div className="w-2 h-2 bg-gradient-to-r from-rose-500 to-pink-500 rounded-full flex-shrink-0"></div>
                          <span className="flex-1 text-sm">{requirement}</span>
                          <button
                            type="button"
                            onClick={() => removeRequirement(index)}
                            className="text-rose-500 hover:text-rose-600 flex-shrink-0"
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
                          className="h-12 rounded-xl"
                          onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addRequirement())}
                        />
                        <Button type="button" onClick={addRequirement} variant="outline" className="h-12 px-4 rounded-xl">
                          <Plus className="w-5 h-5" />
                        </Button>
                      </div>
                    </CardContent>
                  </FormCard>

                  <FormCard>
                    <CardHeader>
                      <SectionHeader 
                        title="Learning Outcomes" 
                        description="What students will learn from this course"
                        icon={Award}
                        color="from-emerald-500 to-green-500"
                      />
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {formData.learningOutcomes.map((outcome, index) => (
                        <div key={index} className="flex items-center gap-3 p-3 bg-gradient-to-r from-emerald-50 to-green-50 dark:from-emerald-900/20 dark:to-green-900/20 rounded-xl">
                          <div className="w-2 h-2 bg-gradient-to-r from-emerald-500 to-green-500 rounded-full flex-shrink-0"></div>
                          <span className="flex-1 text-sm">{outcome}</span>
                          <button
                            type="button"
                            onClick={() => removeOutcome(index)}
                            className="text-emerald-500 hover:text-emerald-600 flex-shrink-0"
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
                          className="h-12 rounded-xl"
                          onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addOutcome())}
                        />
                        <Button type="button" onClick={addOutcome} variant="outline" className="h-12 px-4 rounded-xl">
                          <Plus className="w-5 h-5" />
                        </Button>
                      </div>
                    </CardContent>
                  </FormCard>
                </div>

                {/* Course Content */}
                <FormCard>
                  <CardHeader>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <SectionHeader 
                        title="Course Content" 
                        description="Add modules, chapters and lessons to your course"
                        icon={Layers}
                        color="from-purple-500 to-indigo-500"
                      />
                      <Button type="button" onClick={addModule} className="h-11 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white">
                        <Plus className="w-4 h-4 mr-1.5" />
                        Add Module
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {formData.modules.map((module, moduleIndex) => (
                      <Accordion key={moduleIndex} type="single" collapsible className="border border-slate-200/50 dark:border-slate-700/50 rounded-2xl overflow-hidden">
                        <AccordionItem value={`module-${moduleIndex}`} className="border-b-0">
                          <AccordionTrigger className="px-6 hover:no-underline">
                            <div className="flex items-center gap-4 flex-1 text-left">
                              <div className="w-12 h-12 bg-gradient-to-r from-purple-600 to-indigo-600 rounded-xl flex items-center justify-center text-white font-bold text-lg shadow-lg">
                                {moduleIndex + 1}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-bold text-slate-900 dark:text-white truncate">{module.title || `Module ${moduleIndex + 1}`}</p>
                                <p className="text-sm text-slate-500 truncate">
                                  {module.chapters.length} chapters • {module.chapters.reduce((sum, ch) => sum + ch.lessons.length, 0)} lessons
                                </p>
                              </div>
                            </div>
                          </AccordionTrigger>
                          <AccordionContent className="px-6 pb-6">
                            <div className="space-y-6">
                              <FormGroup label="Module Title" required icon={Bookmark}>
                                <Input
                                  placeholder="Module Title *"
                                  value={module.title}
                                  onChange={(e) => {
                                    const updatedModules = [...formData.modules]
                                    updatedModules[moduleIndex] = {
                                      ...updatedModules[moduleIndex],
                                      title: e.target.value
                                    }
                                    setFormData(prev => ({ ...prev, modules: updatedModules }))
                                  }}
                                  className="h-12 rounded-xl"
                                  required
                                />
                              </FormGroup>

                              <FormGroup label="Module Description" icon={FileText}>
                                <Textarea
                                  placeholder="Module Description (Optional)"
                                  value={module.description}
                                  onChange={(e) => {
                                    const updatedModules = [...formData.modules]
                                    updatedModules[moduleIndex] = {
                                      ...updatedModules[moduleIndex],
                                      description: e.target.value
                                    }
                                    setFormData(prev => ({ ...prev, modules: updatedModules }))
                                  }}
                                  className="min-h-[100px] rounded-xl"
                                />
                              </FormGroup>

                              {/* Module thumbnail upload */}
                              <FileUploadArea
                                type="moduleThumbnail"
                                label="Module Thumbnail (Optional)"
                                acceptedFiles="image/jpeg,image/jpg,image/png,image/webp"
                                maxSize="20MB"
                                currentFile={module.thumbnailUrl ? {
                                  key: `module-${moduleIndex}-thumbnail`,
                                  url: module.thumbnailUrl,
                                  size: 0,
                                  type: 'image',
                                  fileName: 'module-thumbnail.jpg'
                                } : null}
                                onFileChange={(e) => handleModuleThumbnailChange(e, moduleIndex)}
                                moduleIndex={moduleIndex}
                                uploadProgress={uploadProgress}
                                onCancelUpload={cancelUpload}
                                onRetryUpload={handleRetryUpload}
                                onFileSelect={(file) => handleMobileFileSelect(file, 'moduleThumbnail', moduleIndex)}
                              />

                              {/* Chapters */}
                              <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                  <h4 className="font-bold text-slate-900 dark:text-white">Chapters</h4>
                                  <Button 
                                    type="button" 
                                    onClick={() => addChapter(moduleIndex)} 
                                    variant="outline"
                                    className="h-10 rounded-xl"
                                  >
                                    <Plus className="w-4 h-4 mr-1" />
                                    Add Chapter
                                  </Button>
                                </div>
                                
                                {module.chapters.map((chapter, chapterIndex) => (
                                  <Accordion key={chapterIndex} type="single" collapsible className="border border-slate-200/50 dark:border-slate-700/50 rounded-xl">
                                    <AccordionItem value={`chapter-${moduleIndex}-${chapterIndex}`} className="border-b-0">
                                      <AccordionTrigger className="px-4 hover:no-underline">
                                        <div className="flex items-center gap-3 flex-1 text-left">
                                          <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-cyan-600 rounded-lg flex items-center justify-center text-white font-bold text-sm shadow-md">
                                            {chapterIndex + 1}
                                          </div>
                                          <div className="flex-1 min-w-0">
                                            <p className="font-semibold text-slate-900 dark:text-white truncate">{chapter.title || `Chapter ${chapterIndex + 1}`}</p>
                                            <p className="text-sm text-slate-500 truncate">
                                              {chapter.lessons.length} lessons
                                            </p>
                                          </div>
                                        </div>
                                      </AccordionTrigger>
                                      <AccordionContent className="px-4 pb-4">
                                        <div className="space-y-4">
                                          <FormGroup label="Chapter Title" required icon={Bookmark}>
                                            <Input
                                              placeholder="Chapter Title *"
                                              value={chapter.title}
                                              onChange={(e) => {
                                                const updatedModules = [...formData.modules]
                                                updatedModules[moduleIndex] = {
                                                  ...updatedModules[moduleIndex],
                                                  chapters: updatedModules[moduleIndex].chapters.map((chap, chapIdx) =>
                                                    chapIdx === chapterIndex ? {
                                                      ...chap,
                                                      title: e.target.value
                                                    } : chap
                                                  )
                                                }
                                                setFormData(prev => ({ ...prev, modules: updatedModules }))
                                              }}
                                              className="h-11 rounded-lg"
                                              required
                                            />
                                          </FormGroup>

                                          <FormGroup label="Chapter Description" icon={FileText}>
                                            <Textarea
                                              placeholder="Chapter Description (Optional)"
                                              value={chapter.description}
                                              onChange={(e) => {
                                                const updatedModules = [...formData.modules]
                                                updatedModules[moduleIndex] = {
                                                  ...updatedModules[moduleIndex],
                                                  chapters: updatedModules[moduleIndex].chapters.map((chap, chapIdx) =>
                                                    chapIdx === chapterIndex ? {
                                                      ...chap,
                                                      description: e.target.value
                                                    } : chap
                                                  )
                                                }
                                                setFormData(prev => ({ ...prev, modules: updatedModules }))
                                              }}
                                              className="min-h-[80px] rounded-lg"
                                            />
                                          </FormGroup>

                                          {/* Lessons */}
                                          <div className="space-y-4">
                                            <div className="flex items-center justify-between">
                                              <h5 className="font-semibold text-slate-900 dark:text-white">Lessons</h5>
                                              <Button 
                                                type="button" 
                                                onClick={() => addLesson(moduleIndex, chapterIndex)} 
                                                variant="outline"
                                                className="h-9 rounded-lg"
                                              >
                                                <Plus className="w-3.5 h-3.5 mr-1" />
                                                Add Lesson
                                              </Button>
                                            </div>
                                            
                                            {chapter.lessons.map((lesson, lessonIndex) => (
                                              <div key={lessonIndex} className="border border-slate-200/50 dark:border-slate-700/50 rounded-xl p-4 space-y-4">
                                                <div className="flex items-center gap-3">
                                                  <div className="w-8 h-8 bg-gradient-to-r from-slate-600 to-slate-700 rounded-lg flex items-center justify-center text-white font-bold text-xs shadow-md">
                                                    {lessonIndex + 1}
                                                  </div>
                                                  <div className="flex-1 min-w-0">
                                                    <p className="font-semibold text-slate-900 dark:text-white truncate">{lesson.title || `Lesson ${lessonIndex + 1}`}</p>
                                                  </div>
                                                  <Button 
                                                    type="button" 
                                                    variant="ghost" 
                                                    size="icon"
                                                    onClick={() => removeLesson(moduleIndex, chapterIndex, lessonIndex)}
                                                    className="h-8 w-8 rounded-lg text-rose-500 hover:text-rose-600 hover:bg-rose-50"
                                                  >
                                                    <X className="w-4 h-4" />
                                                  </Button>
                                                </div>

                                                <FormGroup label="Lesson Title" required icon={Feather}>
                                                  <Input
                                                    placeholder="Lesson Title *"
                                                    value={lesson.title}
                                                    onChange={(e) => {
                                                      const updatedModules = [...formData.modules]
                                                      updatedModules[moduleIndex] = {
                                                        ...updatedModules[moduleIndex],
                                                        chapters: updatedModules[moduleIndex].chapters.map((chap, chapIdx) =>
                                                          chapIdx === chapterIndex ? {
                                                            ...chap,
                                                            lessons: chap.lessons.map((les, lesIdx) =>
                                                              lesIdx === lessonIndex ? {
                                                                ...les,
                                                                title: e.target.value
                                                              } : les
                                                            )
                                                          } : chap
                                                        )
                                                      }
                                                      setFormData(prev => ({ ...prev, modules: updatedModules }))
                                                    }}
                                                    className="h-11 rounded-lg"
                                                    required
                                                  />
                                                </FormGroup>

                                                <FormGroup label="Lesson Description" icon={FileText}>
                                                  <Textarea
                                                    placeholder="Lesson Description (Optional)"
                                                    value={lesson.description}
                                                    onChange={(e) => {
                                                      const updatedModules = [...formData.modules]
                                                      updatedModules[moduleIndex] = {
                                                        ...updatedModules[moduleIndex],
                                                        chapters: updatedModules[moduleIndex].chapters.map((chap, chapIdx) =>
                                                          chapIdx === chapterIndex ? {
                                                            ...chap,
                                                            lessons: chap.lessons.map((les, lesIdx) =>
                                                              lesIdx === lessonIndex ? {
                                                                ...les,
                                                                description: e.target.value
                                                              } : les
                                                            )
                                                          } : chap
                                                        )
                                                      }
                                                      setFormData(prev => ({ ...prev, modules: updatedModules }))
                                                    }}
                                                    className="min-h-[80px] rounded-lg"
                                                  />
                                                </FormGroup>

                                                {/* Video Upload */}
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
                                                  onBrowseLibrary={() => setShowVideoLibrary({
                                                    open: true,
                                                    type: 'lessonVideo',
                                                    moduleIndex,
                                                    chapterIndex,
                                                    lessonIndex
                                                  })}
                                                  onFileSelect={(file) => handleMobileFileSelect(file, 'lessonVideo', moduleIndex, chapterIndex, lessonIndex)}
                                                />

                                                <FormGroup label="Duration (minutes)" icon={Clock}>
                                                  <Input
                                                    type="number"
                                                    placeholder="e.g., 45"
                                                    value={lesson.duration}
                                                    onChange={(e) => {
                                                      const updatedModules = [...formData.modules]
                                                      updatedModules[moduleIndex] = {
                                                        ...updatedModules[moduleIndex],
                                                        chapters: updatedModules[moduleIndex].chapters.map((chap, chapIdx) =>
                                                          chapIdx === chapterIndex ? {
                                                            ...chap,
                                                            lessons: chap.lessons.map((les, lesIdx) =>
                                                              lesIdx === lessonIndex ? {
                                                                ...les,
                                                                duration: parseInt(e.target.value) || 0
                                                              } : les
                                                            )
                                                          } : chap
                                                        )
                                                      }
                                                      setFormData(prev => ({ ...prev, modules: updatedModules }))
                                                    }}
                                                    className="h-11 rounded-lg"
                                                    min="0"
                                                  />
                                                </FormGroup>

                                                <FormGroup label="Lesson Content" icon={BookOpen}>
                                                  <Textarea
                                                    placeholder="Detailed content for this lesson... (Optional)"
                                                    value={lesson.content}
                                                    onChange={(e) => {
                                                      const updatedModules = [...formData.modules]
                                                      updatedModules[moduleIndex] = {
                                                        ...updatedModules[moduleIndex],
                                                        chapters: updatedModules[moduleIndex].chapters.map((chap, chapIdx) =>
                                                          chapIdx === chapterIndex ? {
                                                            ...chap,
                                                            lessons: chap.lessons.map((les, lesIdx) =>
                                                              lesIdx === lessonIndex ? {
                                                                ...les,
                                                                content: e.target.value
                                                              } : les
                                                            )
                                                          } : chap
                                                        )
                                                      }
                                                      setFormData(prev => ({ ...prev, modules: updatedModules }))
                                                    }}
                                                    className="min-h-[100px] rounded-lg"
                                                  />
                                                </FormGroup>

                                                <div className="flex items-center gap-3 p-3 bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 rounded-lg">
                                                  <input
                                                    type="checkbox"
                                                    checked={lesson.isPreview}
                                                    onChange={(e) => {
                                                      const updatedModules = [...formData.modules]
                                                      updatedModules[moduleIndex] = {
                                                        ...updatedModules[moduleIndex],
                                                        chapters: updatedModules[moduleIndex].chapters.map((chap, chapIdx) =>
                                                          chapIdx === chapterIndex ? {
                                                            ...chap,
                                                            lessons: chap.lessons.map((les, lesIdx) =>
                                                              lesIdx === lessonIndex ? {
                                                                ...les,
                                                                isPreview: e.target.checked
                                                              } : les
                                                            )
                                                          } : chap
                                                        )
                                                      }
                                                      setFormData(prev => ({ ...prev, modules: updatedModules }))
                                                    }}
                                                    className="w-5 h-5 rounded border-slate-300 dark:border-slate-600 text-emerald-600 focus:ring-emerald-500"
                                                  />
                                                  <label className="text-sm font-semibold text-slate-900 dark:text-white">Preview Lesson</label>
                                                  <span className="text-xs text-slate-500">(Free for all students)</span>
                                                </div>

                                                {/* Resources */}
                                                <div className="space-y-3">
                                                  <div className="flex items-center justify-between">
                                                    <h6 className="font-medium text-slate-900 dark:text-white">Resources</h6>
                                                    <Button 
                                                      type="button" 
                                                      onClick={() => addResource(moduleIndex, chapterIndex, lessonIndex)} 
                                                      variant="outline"
                                                      size="sm"
                                                      className="h-8 rounded-lg"
                                                    >
                                                      <Plus className="w-3.5 h-3.5 mr-1" />
                                                      Add Resource
                                                    </Button>
                                                  </div>
                                                  
                                                  {lesson.resources.map((resource, resourceIndex) => (
                                                    <div key={resourceIndex} className="grid grid-cols-12 gap-2 p-2 bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-800/50 dark:to-slate-900/50 rounded-lg">
                                                      <Input
                                                        placeholder="Title"
                                                        value={resource.title}
                                                        onChange={(e) => {
                                                          const updatedModules = [...formData.modules]
                                                          updatedModules[moduleIndex] = {
                                                            ...updatedModules[moduleIndex],
                                                            chapters: updatedModules[moduleIndex].chapters.map((chap, chapIdx) =>
                                                              chapIdx === chapterIndex ? {
                                                                ...chap,
                                                                lessons: chap.lessons.map((les, lesIdx) =>
                                                                  lesIdx === lessonIndex ? {
                                                                    ...les,
                                                                    resources: les.resources.map((res, resIdx) =>
                                                                      resIdx === resourceIndex ? {
                                                                        ...res,
                                                                        title: e.target.value
                                                                      } : res
                                                                    )
                                                                  } : les
                                                                )
                                                              } : chap
                                                            )
                                                          }
                                                          setFormData(prev => ({ ...prev, modules: updatedModules }))
                                                        }}
                                                        className="col-span-5 rounded-md h-9 text-sm"
                                                      />
                                                      <Input
                                                        placeholder="URL"
                                                        value={resource.url}
                                                        onChange={(e) => {
                                                          const updatedModules = [...formData.modules]
                                                          updatedModules[moduleIndex] = {
                                                            ...updatedModules[moduleIndex],
                                                            chapters: updatedModules[moduleIndex].chapters.map((chap, chapIdx) =>
                                                              chapIdx === chapterIndex ? {
                                                                ...chap,
                                                                lessons: chap.lessons.map((les, lesIdx) =>
                                                                  lesIdx === lessonIndex ? {
                                                                    ...les,
                                                                    resources: les.resources.map((res, resIdx) =>
                                                                      resIdx === resourceIndex ? {
                                                                        ...res,
                                                                        url: e.target.value
                                                                      } : res
                                                                    )
                                                                  } : les
                                                                )
                                                              } : chap
                                                            )
                                                          }
                                                          setFormData(prev => ({ ...prev, modules: updatedModules }))
                                                        }}
                                                        className="col-span-5 rounded-md h-9 text-sm"
                                                      />
                                                      <select
                                                        value={resource.type}
                                                        onChange={(e) => {
                                                          const updatedModules = [...formData.modules]
                                                          updatedModules[moduleIndex] = {
                                                            ...updatedModules[moduleIndex],
                                                            chapters: updatedModules[moduleIndex].chapters.map((chap, chapIdx) =>
                                                              chapIdx === chapterIndex ? {
                                                                ...chap,
                                                                lessons: chap.lessons.map((les, lesIdx) =>
                                                                  lesIdx === lessonIndex ? {
                                                                    ...les,
                                                                    resources: les.resources.map((res, resIdx) =>
                                                                      resIdx === resourceIndex ? {
                                                                        ...res,
                                                                        type: e.target.value as 'pdf' | 'document' | 'link' | 'video'
                                                                      } : res
                                                                    )
                                                                  } : les
                                                                )
                                                              } : chap
                                                            )
                                                          }
                                                          setFormData(prev => ({ ...prev, modules: updatedModules }))
                                                        }}
                                                        className="col-span-1 rounded-md h-9 text-sm border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
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
                                                        className="col-span-1 h-9 w-9 rounded-md text-rose-500 hover:text-rose-600"
                                                      >
                                                        <X className="w-4 h-4" />
                                                      </Button>
                                                    </div>
                                                  ))}
                                                </div>
                                              </div>
                                            ))}
                                          </div>
                                        </div>
                                      </AccordionContent>
                                    </AccordionItem>
                                  </Accordion>
                                ))}
                              </div>
                            </div>
                          </AccordionContent>
                        </AccordionItem>
                      </Accordion>
                    ))}

                    {formData.modules.length === 0 && (
                      <div className="text-center py-12 border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-2xl">
                        <div className="p-4 rounded-2xl bg-gradient-to-r from-purple-100 to-indigo-100 dark:from-purple-900/30 dark:to-indigo-900/30 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                          <Layers className="w-8 h-8 text-purple-600 dark:text-purple-400" />
                        </div>
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">
                          No modules yet
                        </h3>
                        <p className="text-sm text-slate-500 mb-6">
                          Start building your course by adding the first module
                        </p>
                        <Button type="button" onClick={addModule} className="h-11 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white">
                          <Plus className="w-4 h-4 mr-1.5" />
                          Add Your First Module
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </FormCard>
              </TabsContent>

              <TabsContent value="settings" className="space-y-6 mt-4">
                {/* Pricing */}
                <FormCard>
                  <CardHeader>
                    <SectionHeader 
                      title="Pricing" 
                      description="Set your course pricing"
                      icon={DollarSign}
                      color="from-amber-500 to-orange-500"
                    />
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 rounded-xl">
                      <label className="flex items-center gap-4 cursor-pointer">
                        <div className="relative">
                          <input
                            type="checkbox"
                            checked={formData.isFree}
                            onChange={(e) => setFormData(prev => ({ ...prev, isFree: e.target.checked }))}
                            className="sr-only"
                          />
                          <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center ${formData.isFree ? 'bg-gradient-to-r from-emerald-500 to-green-500 border-transparent' : 'border-amber-300 dark:border-amber-700'} cursor-pointer`}>
                            {formData.isFree && <CheckCircle className="w-4 h-4 text-white" />}
                          </div>
                        </div>
                        <div>
                          <span className="font-semibold text-slate-900 dark:text-white">Free Course</span>
                          <p className="text-sm text-slate-600 dark:text-slate-400">Available to all students</p>
                        </div>
                      </label>
                    </div>
                    
                    {!formData.isFree && (
                      <FormGroup label="Price ($)" icon={DollarSign}>
                        <div className="relative">
                          <span className="absolute left-4 top-1/2 transform -translate-y-1/2 text-amber-600 dark:text-amber-400">$</span>
                          <Input
                            type="number"
                            placeholder="0.00"
                            value={formData.price}
                            onChange={(e) => setFormData(prev => ({ ...prev, price: parseFloat(e.target.value) || 0 }))}
                            className="pl-10 h-12 rounded-xl"
                            min="0"
                            step="0.01"
                          />
                        </div>
                      </FormGroup>
                    )}
                  </CardContent>
                </FormCard>

                {/* Course Settings */}
                <FormCard>
                  <CardHeader>
                    <SectionHeader 
                      title="Settings" 
                      description="Course visibility and features"
                      icon={Settings}
                      color="from-slate-600 to-slate-700"
                    />
                  </CardHeader>
                  <CardContent>
                    <label className="flex items-center gap-4 cursor-pointer p-4 bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-800/50 dark:to-slate-900/50 rounded-xl">
                      <div className="relative">
                        <input
                          type="checkbox"
                          checked={formData.isFeatured}
                          onChange={(e) => setFormData(prev => ({ ...prev, isFeatured: e.target.checked }))}
                          className="sr-only"
                        />
                        <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center ${formData.isFeatured ? 'bg-gradient-to-r from-emerald-500 to-teal-500 border-transparent' : 'border-slate-300 dark:border-slate-700'} cursor-pointer`}>
                          {formData.isFeatured && <CheckCircle className="w-4 h-4 text-white" />}
                        </div>
                      </div>
                      <div>
                        <span className="font-semibold text-slate-900 dark:text-white">Feature this course</span>
                        <p className="text-sm text-slate-600 dark:text-slate-400">Show on homepage</p>
                      </div>
                    </label>
                  </CardContent>
                </FormCard>

                {/* Upload Stats Panel */}
                <UploadStatsPanel 
                  uploadStats={uploadStats}
                  activeUploads={activeUploads}
                  uploadProgress={uploadProgress}
                />

                {/* Course Summary */}
                <FormCard>
                  <CardHeader>
                    <SectionHeader 
                      title="Course Summary" 
                      description="Overview of your course"
                      icon={Layers}
                      color="from-cyan-500 to-blue-500"
                    />
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-gradient-to-br from-cyan-50 to-blue-50 dark:from-cyan-900/20 dark:to-blue-900/20 p-3 rounded-xl">
                        <p className="text-xs text-slate-600 dark:text-slate-400">Modules</p>
                        <p className="text-xl font-bold bg-gradient-to-r from-cyan-600 to-blue-600 bg-clip-text text-transparent">
                          {formData.modules.length}
                        </p>
                      </div>
                      <div className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 p-3 rounded-xl">
                        <p className="text-xs text-slate-600 dark:text-slate-400">Chapters</p>
                        <p className="text-xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                          {totalChapters}
                        </p>
                      </div>
                      <div className="bg-gradient-to-br from-rose-50 to-red-50 dark:from-rose-900/20 dark:to-red-900/20 p-3 rounded-xl">
                        <p className="text-xs text-slate-600 dark:text-slate-400">Lessons</p>
                        <p className="text-xl font-bold bg-gradient-to-r from-rose-600 to-red-600 bg-clip-text text-transparent">
                          {totalLessons}
                        </p>
                      </div>
                      <div className="bg-gradient-to-br from-emerald-50 to-green-50 dark:from-emerald-900/20 dark:to-green-900/20 p-3 rounded-xl">
                        <p className="text-xs text-slate-600 dark:text-slate-400">Duration</p>
                        <p className="text-base font-bold bg-gradient-to-r from-emerald-600 to-green-600 bg-clip-text text-transparent">
                          {formatDuration(totalDuration)}
                        </p>
                      </div>
                    </div>
                    
                    <div className="space-y-3 pt-4 border-t border-slate-200 dark:border-slate-700">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-slate-600 dark:text-slate-400">Price</span>
                        <span className="font-semibold">
                          {formData.isFree ? (
                            <Badge className="bg-gradient-to-r from-emerald-500 to-green-500 text-white">Free</Badge>
                          ) : (
                            <span className="bg-gradient-to-r from-amber-600 to-orange-500 bg-clip-text text-transparent font-bold">
                              ${formData.price.toFixed(2)}
                            </span>
                          )}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-slate-600 dark:text-slate-400">Level</span>
                        <Badge variant="outline" className="rounded-full capitalize bg-gradient-to-r from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-900">
                          {formData.level}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-slate-600 dark:text-slate-400">Featured</span>
                        <Badge variant={formData.isFeatured ? "default" : "outline"} className={formData.isFeatured ? "bg-gradient-to-r from-emerald-500 to-teal-500" : ""}>
                          {formData.isFeatured ? 'Yes' : 'No'}
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </FormCard>
              </TabsContent>
            </Tabs>
          </div>

          {/* Desktop Layout - 3 columns */}
          <div className="hidden sm:grid grid-cols-1 lg:grid-cols-4 gap-8">
            {/* Main Content - 3 columns */}
            <div className="lg:col-span-3 space-y-8">
              {/* Basic Information */}
              <FormCard>
                <CardHeader>
                  <SectionHeader 
                    title="Course Information" 
                    description="Basic details about your course"
                    icon={BookOpen}
                  />
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormGroup label="Course Title" required icon={Feather}>
                      <Input
                        placeholder="e.g., Advanced Fashion Design Masterclass"
                        value={formData.title}
                        onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                        className="h-12 rounded-xl border-slate-300 dark:border-slate-700 text-base"
                        required
                      />
                    </FormGroup>

                    <FormGroup label="Level" required icon={TrendingUp}>
                      <select
                        value={formData.level}
                        onChange={(e) => setFormData(prev => ({ 
                          ...prev, 
                          level: e.target.value as 'beginner' | 'intermediate' | 'advanced' 
                        }))}
                        className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        required
                      >
                        <option value="beginner">Beginner</option>
                        <option value="intermediate">Intermediate</option>
                        <option value="advanced">Advanced</option>
                      </select>
                    </FormGroup>
                  </div>

                  <FormGroup label="Short Description" required icon={FileText}>
                    <Textarea
                      placeholder="Brief overview of the course"
                      value={formData.shortDescription}
                      onChange={(e) => setFormData(prev => ({ ...prev, shortDescription: e.target.value }))}
                      className="min-h-[100px] rounded-xl border-slate-300 dark:border-slate-700 text-base"
                      required
                    />
                  </FormGroup>

                  <FormGroup label="Full Description" required icon={BookOpen}>
                    <Textarea
                      placeholder="Detailed description of what students will learn..."
                      value={formData.description}
                      onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                      className="min-h-[120px] rounded-xl border-slate-300 dark:border-slate-700 text-base"
                      required
                    />
                  </FormGroup>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormGroup label="Category" icon={Tag}>
                      <Input
                        placeholder="e.g., Fashion Design, Pattern Making (Optional)"
                        value={formData.category}
                        onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                        className="h-12 rounded-xl border-slate-300 dark:border-slate-700 text-base"
                      />
                    </FormGroup>

                    <FormGroup label="Tags" icon={Tag}>
                      <div className="flex flex-wrap gap-2 mb-3">
                        {formData.tags.map((tag, index) => (
                          <Badge key={index} variant="secondary" className="rounded-full px-4 py-1.5 bg-gradient-to-r from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-900">
                            <span className="truncate">{tag}</span>
                            <button
                              type="button"
                              onClick={() => removeTag(tag)}
                              className="ml-2 hover:text-rose-500"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </Badge>
                        ))}
                      </div>
                      <div className="flex gap-2">
                        <Input
                          placeholder="Add a tag and press Enter"
                          value={newTag}
                          onChange={(e) => setNewTag(e.target.value)}
                          className="h-12 rounded-xl border-slate-300 dark:border-slate-700 text-base"
                          onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                        />
                        <Button type="button" onClick={addTag} variant="outline" className="h-12 px-4 rounded-xl">
                          <Plus className="w-5 h-5" />
                        </Button>
                      </div>
                    </FormGroup>
                  </div>
                </CardContent>
              </FormCard>

              {/* Course Media */}
              <FormCard>
                <CardHeader>
                  <SectionHeader 
                    title="Course Media" 
                    description="Upload thumbnail and preview video (10GB multipart upload supported)"
                    icon={Film}
                    color="from-blue-500 to-cyan-500"
                  />
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FileUploadArea
                      type="thumbnail"
                      label="Course Thumbnail *"
                      acceptedFiles="image/jpeg,image/jpg,image/png,image/webp"
                      maxSize="20MB"
                      currentFile={formData.thumbnail}
                      onFileChange={handleThumbnailChange}
                      uploadProgress={uploadProgress}
                      onCancelUpload={cancelUpload}
                      onRetryUpload={handleRetryUpload}
                      onFileSelect={(file) => handleMobileFileSelect(file, 'thumbnail')}
                    />

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
                      onBrowseLibrary={() => setShowVideoLibrary({
                        open: true,
                        type: 'previewVideo'
                      })}
                      onFileSelect={(file) => handleMobileFileSelect(file, 'previewVideo')}
                    />
                  </div>
                </CardContent>
              </FormCard>

              {/* Requirements & Outcomes */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormCard>
                  <CardHeader>
                    <SectionHeader 
                      title="Requirements" 
                      description="What students should know before taking this course"
                      icon={Target}
                      color="from-rose-500 to-pink-500"
                    />
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {formData.requirements.map((requirement, index) => (
                      <div key={index} className="flex items-center gap-3 p-3 bg-gradient-to-r from-rose-50 to-pink-50 dark:from-rose-900/20 dark:to-pink-900/20 rounded-xl">
                        <div className="w-2 h-2 bg-gradient-to-r from-rose-500 to-pink-500 rounded-full flex-shrink-0"></div>
                        <span className="flex-1 text-sm">{requirement}</span>
                        <button
                          type="button"
                          onClick={() => removeRequirement(index)}
                          className="text-rose-500 hover:text-rose-600 flex-shrink-0"
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
                        className="h-12 rounded-xl"
                        onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addRequirement())}
                      />
                      <Button type="button" onClick={addRequirement} variant="outline" className="h-12 px-4 rounded-xl">
                        <Plus className="w-5 h-5" />
                      </Button>
                    </div>
                  </CardContent>
                </FormCard>

                <FormCard>
                  <CardHeader>
                    <SectionHeader 
                      title="Learning Outcomes" 
                      description="What students will learn from this course"
                      icon={Award}
                      color="from-emerald-500 to-green-500"
                    />
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {formData.learningOutcomes.map((outcome, index) => (
                      <div key={index} className="flex items-center gap-3 p-3 bg-gradient-to-r from-emerald-50 to-green-50 dark:from-emerald-900/20 dark:to-green-900/20 rounded-xl">
                        <div className="w-2 h-2 bg-gradient-to-r from-emerald-500 to-green-500 rounded-full flex-shrink-0"></div>
                        <span className="flex-1 text-sm">{outcome}</span>
                        <button
                          type="button"
                          onClick={() => removeOutcome(index)}
                          className="text-emerald-500 hover:text-emerald-600 flex-shrink-0"
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
                        className="h-12 rounded-xl"
                        onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addOutcome())}
                      />
                      <Button type="button" onClick={addOutcome} variant="outline" className="h-12 px-4 rounded-xl">
                        <Plus className="w-5 h-5" />
                      </Button>
                    </div>
                  </CardContent>
                </FormCard>
              </div>

              {/* Course Content */}
              <FormCard>
                <CardHeader>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <SectionHeader 
                      title="Course Content" 
                      description="Add modules, chapters and lessons to your course"
                      icon={Layers}
                      color="from-purple-500 to-indigo-500"
                    />
                    <Button type="button" onClick={addModule} className="h-11 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white">
                      <Plus className="w-4 h-4 mr-1.5" />
                      Add Module
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  {formData.modules.map((module, moduleIndex) => (
                    <Accordion key={moduleIndex} type="single" collapsible className="border border-slate-200/50 dark:border-slate-700/50 rounded-2xl overflow-hidden">
                      <AccordionItem value={`module-${moduleIndex}`} className="border-b-0">
                        <AccordionTrigger className="px-6 hover:no-underline">
                          <div className="flex items-center gap-4 flex-1 text-left">
                            <div className="w-12 h-12 bg-gradient-to-r from-purple-600 to-indigo-600 rounded-xl flex items-center justify-center text-white font-bold text-lg shadow-lg">
                              {moduleIndex + 1}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-bold text-slate-900 dark:text-white truncate">{module.title || `Module ${moduleIndex + 1}`}</p>
                              <p className="text-sm text-slate-500 truncate">
                                {module.chapters.length} chapters • {module.chapters.reduce((sum, ch) => sum + ch.lessons.length, 0)} lessons
                              </p>
                            </div>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent className="px-6 pb-6">
                          <div className="space-y-6">
                            <FormGroup label="Module Title" required icon={Bookmark}>
                              <Input
                                placeholder="Module Title *"
                                value={module.title}
                                onChange={(e) => {
                                  const updatedModules = [...formData.modules]
                                  updatedModules[moduleIndex] = {
                                    ...updatedModules[moduleIndex],
                                    title: e.target.value
                                  }
                                  setFormData(prev => ({ ...prev, modules: updatedModules }))
                                }}
                                className="h-12 rounded-xl"
                                required
                              />
                            </FormGroup>

                            <FormGroup label="Module Description" icon={FileText}>
                              <Textarea
                                placeholder="Module Description (Optional)"
                                value={module.description}
                                onChange={(e) => {
                                  const updatedModules = [...formData.modules]
                                  updatedModules[moduleIndex] = {
                                    ...updatedModules[moduleIndex],
                                    description: e.target.value
                                  }
                                  setFormData(prev => ({ ...prev, modules: updatedModules }))
                                }}
                                className="min-h-[100px] rounded-xl"
                              />
                            </FormGroup>

                            {/* Module thumbnail upload */}
                            <FileUploadArea
                              type="moduleThumbnail"
                              label="Module Thumbnail (Optional)"
                              acceptedFiles="image/jpeg,image/jpg,image/png,image/webp"
                              maxSize="20MB"
                              currentFile={module.thumbnailUrl ? {
                                key: `module-${moduleIndex}-thumbnail`,
                                url: module.thumbnailUrl,
                                size: 0,
                                type: 'image',
                                fileName: 'module-thumbnail.jpg'
                              } : null}
                              onFileChange={(e) => handleModuleThumbnailChange(e, moduleIndex)}
                              moduleIndex={moduleIndex}
                              uploadProgress={uploadProgress}
                              onCancelUpload={cancelUpload}
                              onRetryUpload={handleRetryUpload}
                              onFileSelect={(file) => handleMobileFileSelect(file, 'moduleThumbnail', moduleIndex)}
                            />

                            {/* Chapters */}
                            <div className="space-y-4">
                              <div className="flex items-center justify-between">
                                <h4 className="font-bold text-slate-900 dark:text-white">Chapters</h4>
                                <Button 
                                  type="button" 
                                  onClick={() => addChapter(moduleIndex)} 
                                  variant="outline"
                                  className="h-10 rounded-xl"
                                >
                                  <Plus className="w-4 h-4 mr-1" />
                                  Add Chapter
                                </Button>
                              </div>
                              
                              {module.chapters.map((chapter, chapterIndex) => (
                                <Accordion key={chapterIndex} type="single" collapsible className="border border-slate-200/50 dark:border-slate-700/50 rounded-xl">
                                  <AccordionItem value={`chapter-${moduleIndex}-${chapterIndex}`} className="border-b-0">
                                    <AccordionTrigger className="px-4 hover:no-underline">
                                      <div className="flex items-center gap-3 flex-1 text-left">
                                        <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-cyan-600 rounded-lg flex items-center justify-center text-white font-bold text-sm shadow-md">
                                          {chapterIndex + 1}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                          <p className="font-semibold text-slate-900 dark:text-white truncate">{chapter.title || `Chapter ${chapterIndex + 1}`}</p>
                                          <p className="text-sm text-slate-500 truncate">
                                            {chapter.lessons.length} lessons
                                          </p>
                                        </div>
                                      </div>
                                    </AccordionTrigger>
                                    <AccordionContent className="px-4 pb-4">
                                      <div className="space-y-4">
                                        <FormGroup label="Chapter Title" required icon={Bookmark}>
                                          <Input
                                            placeholder="Chapter Title *"
                                            value={chapter.title}
                                            onChange={(e) => {
                                              const updatedModules = [...formData.modules]
                                              updatedModules[moduleIndex] = {
                                                ...updatedModules[moduleIndex],
                                                chapters: updatedModules[moduleIndex].chapters.map((chap, chapIdx) =>
                                                  chapIdx === chapterIndex ? {
                                                    ...chap,
                                                    title: e.target.value
                                                  } : chap
                                                )
                                              }
                                              setFormData(prev => ({ ...prev, modules: updatedModules }))
                                            }}
                                            className="h-11 rounded-lg"
                                            required
                                          />
                                        </FormGroup>

                                        <FormGroup label="Chapter Description" icon={FileText}>
                                          <Textarea
                                            placeholder="Chapter Description (Optional)"
                                            value={chapter.description}
                                            onChange={(e) => {
                                              const updatedModules = [...formData.modules]
                                              updatedModules[moduleIndex] = {
                                                ...updatedModules[moduleIndex],
                                                chapters: updatedModules[moduleIndex].chapters.map((chap, chapIdx) =>
                                                  chapIdx === chapterIndex ? {
                                                    ...chap,
                                                    description: e.target.value
                                                  } : chap
                                                )
                                              }
                                              setFormData(prev => ({ ...prev, modules: updatedModules }))
                                            }}
                                            className="min-h-[80px] rounded-lg"
                                          />
                                        </FormGroup>

                                        {/* Lessons */}
                                        <div className="space-y-4">
                                          <div className="flex items-center justify-between">
                                            <h5 className="font-semibold text-slate-900 dark:text-white">Lessons</h5>
                                            <Button 
                                              type="button" 
                                              onClick={() => addLesson(moduleIndex, chapterIndex)} 
                                              variant="outline"
                                              className="h-9 rounded-lg"
                                            >
                                              <Plus className="w-3.5 h-3.5 mr-1" />
                                              Add Lesson
                                            </Button>
                                          </div>
                                          
                                          {chapter.lessons.map((lesson, lessonIndex) => (
                                            <div key={lessonIndex} className="border border-slate-200/50 dark:border-slate-700/50 rounded-xl p-4 space-y-4">
                                              <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 bg-gradient-to-r from-slate-600 to-slate-700 rounded-lg flex items-center justify-center text-white font-bold text-xs shadow-md">
                                                  {lessonIndex + 1}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                  <p className="font-semibold text-slate-900 dark:text-white truncate">{lesson.title || `Lesson ${lessonIndex + 1}`}</p>
                                                </div>
                                                <Button 
                                                  type="button" 
                                                  variant="ghost" 
                                                  size="icon"
                                                  onClick={() => removeLesson(moduleIndex, chapterIndex, lessonIndex)}
                                                  className="h-8 w-8 rounded-lg text-rose-500 hover:text-rose-600 hover:bg-rose-50"
                                                >
                                                  <X className="w-4 h-4" />
                                                </Button>
                                              </div>

                                              <FormGroup label="Lesson Title" required icon={Feather}>
                                                <Input
                                                  placeholder="Lesson Title *"
                                                  value={lesson.title}
                                                  onChange={(e) => {
                                                    const updatedModules = [...formData.modules]
                                                    updatedModules[moduleIndex] = {
                                                      ...updatedModules[moduleIndex],
                                                      chapters: updatedModules[moduleIndex].chapters.map((chap, chapIdx) =>
                                                        chapIdx === chapterIndex ? {
                                                          ...chap,
                                                          lessons: chap.lessons.map((les, lesIdx) =>
                                                            lesIdx === lessonIndex ? {
                                                              ...les,
                                                              title: e.target.value
                                                            } : les
                                                          )
                                                        } : chap
                                                      )
                                                    }
                                                    setFormData(prev => ({ ...prev, modules: updatedModules }))
                                                  }}
                                                  className="h-11 rounded-lg"
                                                  required
                                                />
                                              </FormGroup>

                                              <FormGroup label="Lesson Description" icon={FileText}>
                                                <Textarea
                                                  placeholder="Lesson Description (Optional)"
                                                  value={lesson.description}
                                                  onChange={(e) => {
                                                    const updatedModules = [...formData.modules]
                                                    updatedModules[moduleIndex] = {
                                                      ...updatedModules[moduleIndex],
                                                      chapters: updatedModules[moduleIndex].chapters.map((chap, chapIdx) =>
                                                        chapIdx === chapterIndex ? {
                                                          ...chap,
                                                          lessons: chap.lessons.map((les, lesIdx) =>
                                                            lesIdx === lessonIndex ? {
                                                              ...les,
                                                              description: e.target.value
                                                            } : les
                                                          )
                                                        } : chap
                                                      )
                                                    }
                                                    setFormData(prev => ({ ...prev, modules: updatedModules }))
                                                  }}
                                                  className="min-h-[80px] rounded-lg"
                                                />
                                              </FormGroup>

                                              {/* Video Upload */}
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
                                                onBrowseLibrary={() => setShowVideoLibrary({
                                                  open: true,
                                                  type: 'lessonVideo',
                                                  moduleIndex,
                                                  chapterIndex,
                                                  lessonIndex
                                                })}
                                                onFileSelect={(file) => handleMobileFileSelect(file, 'lessonVideo', moduleIndex, chapterIndex, lessonIndex)}
                                              />

                                              <FormGroup label="Duration (minutes)" icon={Clock}>
                                                <Input
                                                  type="number"
                                                  placeholder="e.g., 45"
                                                  value={lesson.duration}
                                                  onChange={(e) => {
                                                    const updatedModules = [...formData.modules]
                                                    updatedModules[moduleIndex] = {
                                                      ...updatedModules[moduleIndex],
                                                      chapters: updatedModules[moduleIndex].chapters.map((chap, chapIdx) =>
                                                        chapIdx === chapterIndex ? {
                                                          ...chap,
                                                          lessons: chap.lessons.map((les, lesIdx) =>
                                                            lesIdx === lessonIndex ? {
                                                              ...les,
                                                              duration: parseInt(e.target.value) || 0
                                                            } : les
                                                          )
                                                        } : chap
                                                      )
                                                    }
                                                    setFormData(prev => ({ ...prev, modules: updatedModules }))
                                                  }}
                                                  className="h-11 rounded-lg"
                                                  min="0"
                                                />
                                              </FormGroup>

                                              <FormGroup label="Lesson Content" icon={BookOpen}>
                                                <Textarea
                                                  placeholder="Detailed content for this lesson... (Optional)"
                                                  value={lesson.content}
                                                  onChange={(e) => {
                                                    const updatedModules = [...formData.modules]
                                                    updatedModules[moduleIndex] = {
                                                      ...updatedModules[moduleIndex],
                                                      chapters: updatedModules[moduleIndex].chapters.map((chap, chapIdx) =>
                                                        chapIdx === chapterIndex ? {
                                                          ...chap,
                                                          lessons: chap.lessons.map((les, lesIdx) =>
                                                            lesIdx === lessonIndex ? {
                                                              ...les,
                                                              content: e.target.value
                                                            } : les
                                                          )
                                                        } : chap
                                                      )
                                                    }
                                                    setFormData(prev => ({ ...prev, modules: updatedModules }))
                                                  }}
                                                  className="min-h-[100px] rounded-lg"
                                                />
                                              </FormGroup>

                                              <div className="flex items-center gap-3 p-3 bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 rounded-lg">
                                                <input
                                                  type="checkbox"
                                                  checked={lesson.isPreview}
                                                  onChange={(e) => {
                                                    const updatedModules = [...formData.modules]
                                                    updatedModules[moduleIndex] = {
                                                      ...updatedModules[moduleIndex],
                                                      chapters: updatedModules[moduleIndex].chapters.map((chap, chapIdx) =>
                                                        chapIdx === chapterIndex ? {
                                                          ...chap,
                                                          lessons: chap.lessons.map((les, lesIdx) =>
                                                            lesIdx === lessonIndex ? {
                                                              ...les,
                                                              isPreview: e.target.checked
                                                            } : les
                                                          )
                                                        } : chap
                                                      )
                                                    }
                                                    setFormData(prev => ({ ...prev, modules: updatedModules }))
                                                  }}
                                                  className="w-5 h-5 rounded border-slate-300 dark:border-slate-600 text-emerald-600 focus:ring-emerald-500"
                                                />
                                                <label className="text-sm font-semibold text-slate-900 dark:text-white">Preview Lesson</label>
                                                <span className="text-xs text-slate-500">(Free for all students)</span>
                                              </div>

                                              {/* Resources */}
                                              <div className="space-y-3">
                                                <div className="flex items-center justify-between">
                                                  <h6 className="font-medium text-slate-900 dark:text-white">Resources</h6>
                                                  <Button 
                                                    type="button" 
                                                    onClick={() => addResource(moduleIndex, chapterIndex, lessonIndex)} 
                                                    variant="outline"
                                                    size="sm"
                                                    className="h-8 rounded-lg"
                                                  >
                                                    <Plus className="w-3.5 h-3.5 mr-1" />
                                                    Add Resource
                                                  </Button>
                                                </div>
                                                
                                                {lesson.resources.map((resource, resourceIndex) => (
                                                  <div key={resourceIndex} className="grid grid-cols-12 gap-2 p-2 bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-800/50 dark:to-slate-900/50 rounded-lg">
                                                    <Input
                                                      placeholder="Title"
                                                      value={resource.title}
                                                      onChange={(e) => {
                                                        const updatedModules = [...formData.modules]
                                                        updatedModules[moduleIndex] = {
                                                          ...updatedModules[moduleIndex],
                                                          chapters: updatedModules[moduleIndex].chapters.map((chap, chapIdx) =>
                                                            chapIdx === chapterIndex ? {
                                                              ...chap,
                                                              lessons: chap.lessons.map((les, lesIdx) =>
                                                                lesIdx === lessonIndex ? {
                                                                  ...les,
                                                                  resources: les.resources.map((res, resIdx) =>
                                                                    resIdx === resourceIndex ? {
                                                                      ...res,
                                                                      title: e.target.value
                                                                    } : res
                                                                  )
                                                                } : les
                                                              )
                                                            } : chap
                                                          )
                                                        }
                                                        setFormData(prev => ({ ...prev, modules: updatedModules }))
                                                      }}
                                                      className="col-span-5 rounded-md h-9 text-sm"
                                                    />
                                                    <Input
                                                      placeholder="URL"
                                                      value={resource.url}
                                                      onChange={(e) => {
                                                        const updatedModules = [...formData.modules]
                                                        updatedModules[moduleIndex] = {
                                                          ...updatedModules[moduleIndex],
                                                          chapters: updatedModules[moduleIndex].chapters.map((chap, chapIdx) =>
                                                            chapIdx === chapterIndex ? {
                                                              ...chap,
                                                              lessons: chap.lessons.map((les, lesIdx) =>
                                                                lesIdx === lessonIndex ? {
                                                                  ...les,
                                                                  resources: les.resources.map((res, resIdx) =>
                                                                    resIdx === resourceIndex ? {
                                                                      ...res,
                                                                      url: e.target.value
                                                                    } : res
                                                                  )
                                                                } : les
                                                              )
                                                            } : chap
                                                          )
                                                        }
                                                        setFormData(prev => ({ ...prev, modules: updatedModules }))
                                                      }}
                                                      className="col-span-5 rounded-md h-9 text-sm"
                                                    />
                                                    <select
                                                      value={resource.type}
                                                      onChange={(e) => {
                                                        const updatedModules = [...formData.modules]
                                                        updatedModules[moduleIndex] = {
                                                          ...updatedModules[moduleIndex],
                                                          chapters: updatedModules[moduleIndex].chapters.map((chap, chapIdx) =>
                                                            chapIdx === chapterIndex ? {
                                                              ...chap,
                                                              lessons: chap.lessons.map((les, lesIdx) =>
                                                                lesIdx === lessonIndex ? {
                                                                  ...les,
                                                                  resources: les.resources.map((res, resIdx) =>
                                                                    resIdx === resourceIndex ? {
                                                                      ...res,
                                                                      type: e.target.value as 'pdf' | 'document' | 'link' | 'video'
                                                                    } : res
                                                                  )
                                                                } : les
                                                              )
                                                            } : chap
                                                          )
                                                        }
                                                        setFormData(prev => ({ ...prev, modules: updatedModules }))
                                                      }}
                                                      className="col-span-1 rounded-md h-9 text-sm border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
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
                                                      className="col-span-1 h-9 w-9 rounded-md text-rose-500 hover:text-rose-600"
                                                    >
                                                      <X className="w-4 h-4" />
                                                    </Button>
                                                  </div>
                                                ))}
                                              </div>
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    </AccordionContent>
                                  </AccordionItem>
                                </Accordion>
                              ))}
                            </div>
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    </Accordion>
                  ))}

                  {formData.modules.length === 0 && (
                    <div className="text-center py-16 border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-2xl">
                      <div className="p-4 rounded-2xl bg-gradient-to-r from-purple-100 to-indigo-100 dark:from-purple-900/30 dark:to-indigo-900/30 w-20 h-20 mx-auto mb-6 flex items-center justify-center">
                        <Layers className="w-10 h-10 text-purple-600 dark:text-purple-400" />
                      </div>
                      <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-3">
                        No modules yet
                      </h3>
                      <p className="text-slate-600 dark:text-slate-400 mb-8">
                        Start building your course by adding the first module
                      </p>
                      <Button type="button" onClick={addModule} className="h-12 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white">
                        <Plus className="w-5 h-5 mr-2" />
                        Add Your First Module
                      </Button>
                    </div>
                  )}
                </CardContent>
              </FormCard>
            </div>

            {/* Sidebar - 1 column */}
            <div className="space-y-6">
              {/* Upload Stats Panel */}
              <UploadStatsPanel 
                uploadStats={uploadStats}
                activeUploads={activeUploads}
                uploadProgress={uploadProgress}
              />

              {/* Pricing */}
              <FormCard>
                <CardHeader>
                  <SectionHeader 
                    title="Pricing" 
                    description="Set your course pricing"
                    icon={DollarSign}
                    color="from-amber-500 to-orange-500"
                  />
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 rounded-xl">
                    <label className="flex items-center gap-4 cursor-pointer">
                      <div className="relative">
                        <input
                          type="checkbox"
                          checked={formData.isFree}
                          onChange={(e) => setFormData(prev => ({ ...prev, isFree: e.target.checked }))}
                          className="sr-only"
                        />
                        <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center ${formData.isFree ? 'bg-gradient-to-r from-emerald-500 to-green-500 border-transparent' : 'border-amber-300 dark:border-amber-700'} cursor-pointer`}>
                          {formData.isFree && <CheckCircle className="w-4 h-4 text-white" />}
                        </div>
                      </div>
                      <div>
                        <span className="font-semibold text-slate-900 dark:text-white">Free Course</span>
                        <p className="text-sm text-slate-600 dark:text-slate-400">Available to all students</p>
                      </div>
                    </label>
                  </div>
                  
                  {!formData.isFree && (
                    <FormGroup label="Price ($)" icon={DollarSign}>
                      <div className="relative">
                        <span className="absolute left-4 top-1/2 transform -translate-y-1/2 text-amber-600 dark:text-amber-400">$</span>
                        <Input
                          type="number"
                          placeholder="0.00"
                          value={formData.price}
                          onChange={(e) => setFormData(prev => ({ ...prev, price: parseFloat(e.target.value) || 0 }))}
                          className="pl-10 h-12 rounded-xl"
                          min="0"
                          step="0.01"
                        />
                      </div>
                    </FormGroup>
                  )}
                </CardContent>
              </FormCard>

              {/* Course Settings */}
              <FormCard>
                <CardHeader>
                  <SectionHeader 
                    title="Settings" 
                    description="Course visibility and features"
                    icon={Settings}
                    color="from-slate-600 to-slate-700"
                  />
                </CardHeader>
                <CardContent>
                  <label className="flex items-center gap-4 cursor-pointer p-4 bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-800/50 dark:to-slate-900/50 rounded-xl">
                    <div className="relative">
                      <input
                        type="checkbox"
                        checked={formData.isFeatured}
                        onChange={(e) => setFormData(prev => ({ ...prev, isFeatured: e.target.checked }))}
                        className="sr-only"
                      />
                      <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center ${formData.isFeatured ? 'bg-gradient-to-r from-emerald-500 to-teal-500 border-transparent' : 'border-slate-300 dark:border-slate-700'} cursor-pointer`}>
                        {formData.isFeatured && <CheckCircle className="w-4 h-4 text-white" />}
                      </div>
                    </div>
                    <div>
                      <span className="font-semibold text-slate-900 dark:text-white">Feature this course</span>
                      <p className="text-sm text-slate-600 dark:text-slate-400">Show on homepage</p>
                    </div>
                  </label>
                </CardContent>
              </FormCard>

              {/* Course Summary */}
              <FormCard>
                <CardHeader>
                  <SectionHeader 
                    title="Course Summary" 
                    description="Overview of your course"
                    icon={Layers}
                    color="from-cyan-500 to-blue-500"
                  />
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-gradient-to-br from-cyan-50 to-blue-50 dark:from-cyan-900/20 dark:to-blue-900/20 p-3 rounded-xl">
                      <p className="text-xs text-slate-600 dark:text-slate-400">Modules</p>
                      <p className="text-xl font-bold bg-gradient-to-r from-cyan-600 to-blue-600 bg-clip-text text-transparent">
                        {formData.modules.length}
                      </p>
                    </div>
                    <div className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 p-3 rounded-xl">
                      <p className="text-xs text-slate-600 dark:text-slate-400">Chapters</p>
                      <p className="text-xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                        {totalChapters}
                      </p>
                    </div>
                    <div className="bg-gradient-to-br from-rose-50 to-red-50 dark:from-rose-900/20 dark:to-red-900/20 p-3 rounded-xl">
                      <p className="text-xs text-slate-600 dark:text-slate-400">Lessons</p>
                      <p className="text-xl font-bold bg-gradient-to-r from-rose-600 to-red-600 bg-clip-text text-transparent">
                        {totalLessons}
                      </p>
                    </div>
                    <div className="bg-gradient-to-br from-emerald-50 to-green-50 dark:from-emerald-900/20 dark:to-green-900/20 p-3 rounded-xl">
                      <p className="text-xs text-slate-600 dark:text-slate-400">Duration</p>
                      <p className="text-base font-bold bg-gradient-to-r from-emerald-600 to-green-600 bg-clip-text text-transparent">
                        {formatDuration(totalDuration)}
                      </p>
                    </div>
                  </div>
                  
                  <div className="space-y-3 pt-4 border-t border-slate-200 dark:border-slate-700">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-slate-600 dark:text-slate-400">Price</span>
                      <span className="font-semibold">
                        {formData.isFree ? (
                          <Badge className="bg-gradient-to-r from-emerald-500 to-green-500 text-white">Free</Badge>
                        ) : (
                          <span className="bg-gradient-to-r from-amber-600 to-orange-500 bg-clip-text text-transparent font-bold">
                            ${formData.price.toFixed(2)}
                          </span>
                        )}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-slate-600 dark:text-slate-400">Level</span>
                      <Badge variant="outline" className="rounded-full capitalize bg-gradient-to-r from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-900">
                        {formData.level}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-slate-600 dark:text-slate-400">Featured</span>
                      <Badge variant={formData.isFeatured ? "default" : "outline"} className={formData.isFeatured ? "bg-gradient-to-r from-emerald-500 to-teal-500" : ""}>
                        {formData.isFeatured ? 'Yes' : 'No'}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </FormCard>
            </div>
          </div>
        </form>
      </div>

      {/* Video Library Selector */}
      <VideoLibrarySelector
        open={showVideoLibrary.open}
        onOpenChange={(open) => setShowVideoLibrary(prev => ({ ...prev, open }))}
        onSelect={(video) => handleVideoLibrarySelect(video, {
          type: showVideoLibrary.type,
          moduleIndex: showVideoLibrary.moduleIndex,
          chapterIndex: showVideoLibrary.chapterIndex,
          lessonIndex: showVideoLibrary.lessonIndex
        })}
        currentFile={
          showVideoLibrary.type === 'previewVideo' 
            ? formData.previewVideo 
            : showVideoLibrary.moduleIndex !== undefined &&
              showVideoLibrary.chapterIndex !== undefined &&
              showVideoLibrary.lessonIndex !== undefined
              ? formData.modules[showVideoLibrary.moduleIndex]?.chapters[showVideoLibrary.chapterIndex]?.lessons[showVideoLibrary.lessonIndex]?.video
              : null
        }
        type={showVideoLibrary.type}
        moduleIndex={showVideoLibrary.moduleIndex}
        chapterIndex={showVideoLibrary.chapterIndex}
        lessonIndex={showVideoLibrary.lessonIndex}
      />

      {/* Mobile Upload Notification */}
      <MobileUploadNotification
        show={mobileUploadNotification.show}
        message={mobileUploadNotification.message}
        type={mobileUploadNotification.type}
        onClose={() => setMobileUploadNotification(prev => ({ ...prev, show: false }))}
      />

      {/* Sticky Bottom Actions */}
      <StickyActions 
        loading={loading}
        activeUploads={activeUploads}
        networkStatus={networkStatus}
        hasThumbnail={!!formData.thumbnail}
        onSubmit={handleSubmit}
        canSubmit={canSubmit}
      />
    </div>
  )
}