// app/admin/courses/edit/[id]/page.tsx

'use client'

import { useState, useEffect, useRef, useCallback, useMemo, memo } from 'react'
import { useParams, useRouter } from 'next/navigation'
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
import { useToast } from '@/components/ui/use-toast'
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
  Loader2,
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
  Info,
  Battery,
  Wifi,
  Cpu,
  Smartphone,
  Monitor,
  Tablet
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

// ==================== IMPORT VIDEO LIBRARY SELECTOR ====================
import VideoLibrarySelector from '@/components/video-library/VideoLibrarySelector'

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
  lastModified?: string
  originalFileName?: string
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
    deviceType?: 'ios' | 'android' | 'desktop' | 'tablet'
    networkType?: 'wifi' | 'cellular' | 'ethernet' | 'unknown'
    memoryStatus?: 'healthy' | 'warning' | 'critical'
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
    uploadedBytes?: number
  }>
  isUploading: boolean
  totalProgress: number
  startTime?: number
  totalBytes?: number
  uploadedBytes?: number
  completedParts: number
}

interface Resource {
  _id?: string
  title: string
  url: string
  type: 'pdf' | 'document' | 'link' | 'video'
}

interface SubLesson {
  _id?: string
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

interface Lesson {
  _id?: string
  title: string
  description: string
  content: string
  video?: S3Asset  // Keep for backward compatibility
  videoSource?: {  // Add this for consistency with sub-lessons
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
  subLessons: SubLesson[]
}

interface Chapter {
  _id?: string
  title: string
  description: string
  order: number
  lessons: Lesson[]
}

interface Module {
  _id?: string
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
  category?: string
  tags: string[]
  thumbnail: S3Asset | null
  previewVideo: S3Asset | null
  modules: Module[]
  requirements: string[]
  learningOutcomes: string[]
  isPublished: boolean
  isFeatured: boolean
  totalStudents: number
  averageRating: number
  createdAt?: string
  updatedAt?: string
}

interface FileWithPossibleVideo {
  key?: string
  url?: string
  video?: S3Asset
  videoSource?: {
    video?: S3Asset
  }
  public_id?: string
  secure_url?: string
  bytes?: number
  resource_type?: 'image' | 'video'
  duration?: number
  width?: number
  height?: number
  original_filename?: string
  [key: string]: any // Allow any other properties
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

// ==================== HELPER FUNCTIONS ====================
const formatFileSize = (bytes: number): string => {
  if (bytes >= 1024 * 1024 * 1024) {
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`
  }
  if (bytes >= 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
  }
  if (bytes >= 1024) {
    return `${(bytes / (1024)).toFixed(2)} KB`
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

// Type guard for S3Asset
const isS3Asset = (obj: any): obj is S3Asset => {
  return obj && typeof obj === 'object' && 'key' in obj && 'url' in obj;
};

// ==================== NEW HELPER FUNCTIONS ====================
const detectDeviceType = (): 'ios' | 'android' | 'desktop' | 'tablet' => {
  if (typeof window === 'undefined') return 'desktop'
  
  const userAgent = navigator.userAgent.toLowerCase()
  const isTablet = /(ipad|tablet|(android(?!.*mobile))|(windows(?!.*phone)(.*touch))|kindle|playbook|silk|(puffin(?!.*(IP|AP|WP))))/.test(userAgent)
  
  if (isTablet) return 'tablet'
  if (/iphone|ipod/.test(userAgent)) return 'ios'
  if (/android/.test(userAgent)) return 'android'
  return 'desktop'
}

const isMobile = () => {
  if (typeof window === 'undefined') return false
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
}

const detectNetworkType = (): 'wifi' | 'cellular' | 'ethernet' | 'unknown' => {
  if (typeof window === 'undefined' || !('connection' in navigator)) return 'unknown'
  
  const connection = (navigator as any).connection
  if (!connection) return 'unknown'
  
  const type = connection.type || connection.effectiveType
  if (type.includes('wifi') || type.includes('ethernet')) return 'wifi'
  if (type.includes('cellular') || type.includes('2g') || type.includes('3g') || type.includes('4g') || type.includes('5g')) return 'cellular'
  if (type.includes('ethernet')) return 'ethernet'
  return 'unknown'
}

const getConnectionSpeed = (): number => {
  if (typeof window === 'undefined' || !('connection' in navigator)) return 0
  
  const connection = (navigator as any).connection
  if (!connection || !connection.downlink) return 0
  
  return connection.downlink * 1024 * 1024 // Convert Mbps to bytes per second
}

const checkMemoryStatus = (): 'healthy' | 'warning' | 'critical' => {
  if (typeof window === 'undefined' || !('deviceMemory' in navigator)) return 'healthy'
  
  const deviceMemory = (navigator as any).deviceMemory
  if (!deviceMemory) return 'healthy'
  
  if (deviceMemory >= 8) return 'healthy'
  if (deviceMemory >= 4) return 'warning'
  return 'critical'
}

// Device-specific optimizations
const getOptimalChunkSize = (
  deviceType: 'ios' | 'android' | 'desktop' | 'tablet', 
  fileSize: number,
  networkType: 'wifi' | 'cellular' | 'ethernet' | 'unknown',
  memoryStatus: 'healthy' | 'warning' | 'critical'
): number => {
  const MAX_CHUNK_SIZE = 200 * 1024 * 1024 // 200MB absolute max
  const MIN_CHUNK_SIZE = 5 * 1024 * 1024 // 5MB min for reliability
  
  let baseChunkSize = 100 * 1024 * 1024 // 100MB default
  
  // Adjust for device type
  switch (deviceType) {
    case 'ios':
      baseChunkSize = 50 * 1024 * 1024 // 50MB for iOS
      break
    case 'android':
      baseChunkSize = 75 * 1024 * 1024 // 75MB for Android
      break
    case 'tablet':
      baseChunkSize = 100 * 1024 * 1024 // 100MB for tablets
      break
    case 'desktop':
      baseChunkSize = 150 * 1024 * 1024 // 150MB for desktop
      break
  }
  
  // Adjust for network type
  switch (networkType) {
    case 'cellular':
      baseChunkSize = Math.min(baseChunkSize, 20 * 1024 * 1024) // 20MB max for cellular
      break
    case 'ethernet':
      baseChunkSize = Math.min(baseChunkSize * 1.5, MAX_CHUNK_SIZE) // Boost for ethernet
      break
  }
  
  // Adjust for memory status
  switch (memoryStatus) {
    case 'warning':
      baseChunkSize = Math.min(baseChunkSize, 50 * 1024 * 1024) // 50MB max for low memory
      break
    case 'critical':
      baseChunkSize = Math.min(baseChunkSize, 10 * 1024 * 1024) // 10MB max for very low memory
      break
  }
  
  // Adjust for file size
  if (fileSize > 5 * 1024 * 1024 * 1024) { // >5GB
    baseChunkSize = Math.min(baseChunkSize, 50 * 1024 * 1024)
  } else if (fileSize > 2 * 1024 * 1024 * 1024) { // >2GB
    baseChunkSize = Math.min(baseChunkSize, 100 * 1024 * 1024)
  } else if (fileSize > 500 * 1024 * 1024) { // >500MB
    baseChunkSize = Math.min(baseChunkSize, 50 * 1024 * 1024)
  }
  
  return Math.max(MIN_CHUNK_SIZE, Math.min(baseChunkSize, MAX_CHUNK_SIZE))
}

const getConcurrencyLimit = (
  deviceType: 'ios' | 'android' | 'desktop' | 'tablet',
  networkType: 'wifi' | 'cellular' | 'ethernet' | 'unknown',
  memoryStatus: 'healthy' | 'warning' | 'critical'
): number => {
  let baseConcurrency = 4
  
  // Adjust for device type
  switch (deviceType) {
    case 'ios':
      baseConcurrency = 2 // iOS has fewer concurrent connections
      break
    case 'android':
      baseConcurrency = 3 // Android can handle more
      break
    case 'tablet':
      baseConcurrency = 3 // Tablets in between
      break
    case 'desktop':
      baseConcurrency = 6 // Desktop can handle the most
      break
  }
  
  // Adjust for network type
  switch (networkType) {
    case 'cellular':
      baseConcurrency = Math.max(1, baseConcurrency - 2) // Reduce for cellular
      break
    case 'ethernet':
      baseConcurrency = Math.min(8, baseConcurrency + 2) // Increase for ethernet
      break
  }
  
  // Adjust for memory status
  switch (memoryStatus) {
    case 'warning':
      baseConcurrency = Math.max(1, baseConcurrency - 1)
      break
    case 'critical':
      baseConcurrency = 1 // Single upload for low memory
      break
  }
  
  return Math.max(1, Math.min(baseConcurrency, 8))
}

// ==================== IOS FILE UTILS CLASS ====================
class IOSFileUtils {
  private static instance: IOSFileUtils
  
  public static getInstance(): IOSFileUtils {
    if (!IOSFileUtils.instance) {
      IOSFileUtils.instance = new IOSFileUtils()
    }
    return IOSFileUtils.instance
  }
  
  async processIOSVideoFile(file: File): Promise<{
    processedFile: File
    needsProcessing: boolean
    originalSize: number
    processedSize: number
  }> {
    const isIOS = /iPhone|iPad|iPod/.test(navigator.userAgent) && !(window as any).MSStream
    
    if (!isIOS || !file.type.startsWith('video/')) {
      return {
        processedFile: file,
        needsProcessing: false,
        originalSize: file.size,
        processedSize: file.size
      }
    }
    
    console.log('📱 Processing iOS video file...')
    
    try {
      // Create a video element to get metadata
      const video = document.createElement('video')
      video.preload = 'metadata'
      
      return new Promise((resolve, reject) => {
        video.onloadedmetadata = () => {
          URL.revokeObjectURL(video.src)
          
          // iOS sometimes has issues with large files, so we create a new File object
          const processedFile = new File([file], file.name, {
            type: file.type,
            lastModified: file.lastModified
          })
          
          resolve({
            processedFile,
            needsProcessing: true,
            originalSize: file.size,
            processedSize: processedFile.size
          })
        }
        
        video.onerror = () => {
          URL.revokeObjectURL(video.src)
          console.warn('⚠️ Could not process iOS video metadata')
          resolve({
            processedFile: file,
            needsProcessing: false,
            originalSize: file.size,
            processedSize: file.size
          })
        }
        
        video.src = URL.createObjectURL(file)
      })
    } catch (error) {
      console.error('Error processing iOS file:', error)
      return {
        processedFile: file,
        needsProcessing: false,
        originalSize: file.size,
        processedSize: file.size
      }
    }
  }
}

// ==================== MEMOIZED COMPONENTS ====================
interface UploadOptimizationTipsProps {
  fileSize: number
  uploadStatus?: string
  deviceType?: 'ios' | 'android' | 'desktop' | 'tablet'
  networkType?: 'wifi' | 'cellular' | 'ethernet' | 'unknown'
  memoryStatus?: 'healthy' | 'warning' | 'critical'
}

const UploadOptimizationTips = memo(({ 
  fileSize, 
  uploadStatus, 
  deviceType,
  networkType,
  memoryStatus
}: UploadOptimizationTipsProps) => {
  const sizeInGB = fileSize / (1024 * 1024 * 1024)
  const isLargeFile = sizeInGB > 1
  
  const getDeviceIcon = () => {
    switch (deviceType) {
      case 'ios': return <Smartphone className="w-4 h-4 sm:w-5 sm:h-5" />
      case 'android': return <Smartphone className="w-4 h-4 sm:w-5 sm:h-5" />
      case 'tablet': return <Tablet className="w-4 h-4 sm:w-5 sm:h-5" />
      default: return <Monitor className="w-4 h-4 sm:w-5 sm:h-5" />
    }
  }
  
  const getNetworkIcon = () => {
    switch (networkType) {
      case 'wifi': return <Wifi className="w-3 h-3 sm:w-4 sm:h-4" />
      case 'cellular': return <Battery className="w-3 h-3 sm:w-4 sm:h-4" />
      case 'ethernet': return <Cpu className="w-3 h-3 sm:w-4 sm:h-4" />
      default: return <Wifi className="w-3 h-3 sm:w-4 sm:h-4" />
    }
  }
  
  const getMemoryIcon = () => {
    switch (memoryStatus) {
      case 'healthy': return <Database className="w-3 h-3 sm:w-4 sm:h-4" />
      case 'warning': return <AlertTriangle className="w-3 h-3 sm:w-4 sm:h-4" />
      case 'critical': return <AlertCircle className="w-3 h-3 sm:w-4 sm:h-4" />
      default: return <Database className="w-3 h-3 sm:w-4 sm:h-4" />
    }
  }
  
  const getDeviceTips = () => {
    if (deviceType === 'ios') {
      return [
        'iOS optimized multipart upload',
        'Adaptive chunk sizing',
        'Background upload support',
        'Memory efficient processing'
      ]
    } else if (deviceType === 'android') {
      return [
        'Android optimized upload',
        'Network aware chunking',
        'Resumable uploads',
        'Battery efficient'
      ]
    } else if (deviceType === 'tablet') {
      return [
        'Tablet optimized upload',
        'Balanced performance',
        'Stable connection preferred',
        'Large file support'
      ]
    } else {
      return [
        'Desktop multipart upload',
        'High concurrency support',
        'Maximum file size: 10GB',
        'Network optimized'
      ]
    }
  }
  
  return (
    <Card className="rounded-xl sm:rounded-2xl border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 dark:border-blue-800">
      <CardContent className="p-3 sm:p-4">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0">
            <div className="p-1.5 sm:p-2 bg-gradient-to-r from-blue-600 to-cyan-600 rounded-lg text-white">
              {getDeviceIcon()}
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start sm:items-center justify-between gap-2 mb-1 sm:mb-2">
              <div className="flex items-center gap-2">
                <p className="text-xs sm:text-sm font-semibold text-blue-800 dark:text-blue-300 truncate leading-tight sm:leading-normal">
                  {deviceType === 'ios' 
                    ? `iOS Optimized (${sizeInGB.toFixed(2)}GB)`
                    : deviceType === 'android'
                      ? `Android Optimized (${sizeInGB.toFixed(2)}GB)`
                      : isLargeFile 
                        ? `Large File Upload (${sizeInGB.toFixed(2)}GB)` 
                        : `File Upload (${formatFileSize(fileSize)})`
                  }
                </p>
                <div className="flex items-center gap-1">
                  {getNetworkIcon()}
                  {getMemoryIcon()}
                </div>
              </div>
              {uploadStatus && (
                <Badge variant="outline" className="text-xs px-1.5 py-0.5 h-auto bg-blue-50 text-blue-700">
                  {uploadStatus}
                </Badge>
              )}
            </div>
            <ul className="text-[11px] sm:text-xs text-blue-700 dark:text-blue-400 space-y-1">
              {getDeviceTips().map((tip, index) => (
                <li key={index} className="flex items-start gap-1.5">
                  <div className="w-1.5 h-1.5 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full mt-0.5 flex-shrink-0"></div>
                  <span className="truncate">{tip}</span>
                </li>
              ))}
              {memoryStatus === 'warning' && (
                <li className="flex items-start gap-1.5 text-amber-600">
                  <div className="w-1.5 h-1.5 bg-amber-500 rounded-full mt-0.5 flex-shrink-0"></div>
                  <span className="truncate">Low memory mode enabled</span>
                </li>
              )}
              {memoryStatus === 'critical' && (
                <li className="flex items-start gap-1.5 text-rose-600">
                  <div className="w-1.5 h-1.5 bg-rose-500 rounded-full mt=0.5 flex-shrink-0"></div>
                  <span className="truncate">Ultra low memory mode</span>
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
  onPause?: () => void
  onResume?: () => void
}

const UploadStatusCard = memo(({ upload, onCancel, onRetry, onPause, onResume }: UploadStatusCardProps) => {
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
    const partsText = upload.parts ? ` (Part ${upload.currentPart}/${upload.parts})` : ''
    const speedText = upload.uploadSpeed ? ` • ${formatUploadSpeed(upload.uploadSpeed)}` : ''
    const deviceText = upload.deviceType === 'ios' ? ' • iOS Optimized' : upload.deviceType === 'android' ? ' • Android Optimized' : ''
    const timeText = upload.timeRemaining ? ` • ${formatTimeRemaining(upload.timeRemaining)}` : ''
    
    switch (upload.status) {
      case 'initiating': return 'Preparing upload...'
      case 'generating-urls': return 'Generating URLs...'
      case 'uploading': return `Uploading${partsText}${speedText}${deviceText}${timeText}`
      case 'processing': return 'Finalizing...'
      case 'completed': return 'Completed'
      case 'error': return 'Failed'
      case 'paused': return 'Paused'
      case 'cancelled': return 'Cancelled'
      default: return 'Uploading...'
    }
  }, [upload.parts, upload.currentPart, upload.uploadSpeed, upload.deviceType, upload.timeRemaining, upload.status])

  return (
    <div className="flex items-center gap-2 sm:gap-3 p-2.5 sm:p-4 bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-900 rounded-xl sm:rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
      <div className={`p-1.5 sm:p-2 rounded-full ${getStatusColor()} text-white flex-shrink-0 shadow-md`}>
        {getStatusIcon()}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-0.5 sm:mb-1">
          <span className="font-medium text-xs sm:text-sm truncate max-w-[100px] xs:max-w-[120px] sm:max-w-[150px]">
            {upload.fileName}
          </span>
          <span className="text-xs sm:text-sm font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
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
            className="h-7 w-7 sm:h-8 sm:w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-900/30"
            title="Retry upload"
          >
            <RefreshCw className="w-3 h-3" />
          </Button>
        )}
        {(upload.status === 'uploading' || upload.status === 'initiating' || upload.status === 'generating-urls') && onPause && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={onPause}
            className="h-7 w-7 sm:h-8 sm:w-8 text-amber-600 hover:text-amber-700 hover:bg-amber-50 dark:hover:bg-amber-900/30"
            title="Pause upload"
          >
            <Pause className="w-3 h-3" />
          </Button>
        )}
        {upload.status === 'paused' && onResume && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={onResume}
            className="h-7 w-7 sm:h-8 sm:w-8 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-900/30"
            title="Resume upload"
          >
            <Play className="w-3 h-3" />
          </Button>
        )}
        {(upload.status === 'initiating' || upload.status === 'generating-urls' || upload.status === 'uploading' || upload.status === 'paused') && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={onCancel}
            className="h-7 w-7 sm:h-8 sm:w-8 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/30"
            title="Cancel upload"
          >
            <X className="w-3 h-3" />
          </Button>
        )}
      </div>
    </div>
  )
})
UploadStatusCard.displayName = 'UploadStatusCard'

// ==================== UPDATED FILEUPLOADAREA WITH VIDEO LIBRARY ====================
interface FileUploadAreaProps {
  type: 'thumbnail' | 'previewVideo' | 'lessonVideo' | 'moduleThumbnail'
  label: string
  acceptedFiles: string
  maxSize: string
  currentFile: S3Asset | FileWithPossibleVideo | null
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  onSelectFromLibrary?: (video: any) => void
  moduleIndex?: number
  chapterIndex?: number
  lessonIndex?: number
  subLessonIndex?: number // ADDED: Sub-lesson index
  uploadProgress?: UploadProgress
  onCancelUpload?: (identifier: string) => void
  onRetryUpload?: (identifier: string) => void
  onPauseUpload?: (identifier: string) => void
  onResumeUpload?: (identifier: string) => void
}

const FileUploadArea = memo(({
  type,
  label,
  acceptedFiles,
  maxSize,
  currentFile,
  onFileChange,
  onSelectFromLibrary,
  moduleIndex,
  chapterIndex,
  lessonIndex,
  subLessonIndex, // ADDED
  uploadProgress,
  onCancelUpload,
  onRetryUpload,
  onPauseUpload,
  onResumeUpload,
}: FileUploadAreaProps) => {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragOver, setDragOver] = useState(false)
  const [showVideoLibrary, setShowVideoLibrary] = useState(false)

  const identifier = useMemo(() => {
    if (subLessonIndex !== undefined && moduleIndex !== undefined && chapterIndex !== undefined && lessonIndex !== undefined) {
      return `sublesson-${moduleIndex}-${chapterIndex}-${lessonIndex}-${subLessonIndex}`;
    } else if (type === 'lessonVideo' && moduleIndex !== undefined && chapterIndex !== undefined && lessonIndex !== undefined) {
      return `lesson-${moduleIndex}-${chapterIndex}-${lessonIndex}`;
    } else if (type === 'moduleThumbnail' && moduleIndex !== undefined) {
      return `module-${moduleIndex}-thumbnail`;
    }
    return type;
  }, [type, moduleIndex, chapterIndex, lessonIndex, subLessonIndex])

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

  // Helper function to get the actual file from either video or videoSource
  const getActualFile = useMemo(() => {
    if (!currentFile) return null;
    
    // If currentFile is already an S3Asset
    if (isS3Asset(currentFile)) {
      return currentFile;
    }
    
    // If currentFile has a nested video property
    const fileWithVideo = currentFile as FileWithPossibleVideo;
    
    // Check if it has a video property that is an S3Asset
    if (fileWithVideo.video && isS3Asset(fileWithVideo.video)) {
      return fileWithVideo.video;
    }
    
    // Check if it has a videoSource with video property
    if (fileWithVideo.videoSource?.video && isS3Asset(fileWithVideo.videoSource.video)) {
      return fileWithVideo.videoSource.video;
    }
    
    // Handle S3 format directly
    if (fileWithVideo.key || fileWithVideo.url) {
      return {
        key: fileWithVideo.key || '',
        url: fileWithVideo.url || '',
        size: fileWithVideo.size || 0,
        type: fileWithVideo.type || 'image',
        duration: fileWithVideo.duration,
        width: fileWithVideo.width,
        height: fileWithVideo.height,
        fileName: fileWithVideo.fileName || fileWithVideo.originalFileName || fileWithVideo.key?.split('/').pop()
      } as S3Asset;
    }
    
    // Handle Cloudinary format
    if (fileWithVideo.public_id || fileWithVideo.secure_url) {
      return {
        key: fileWithVideo.public_id || '',
        url: fileWithVideo.secure_url || '',
        size: fileWithVideo.bytes || 0,
        type: fileWithVideo.resource_type === 'image' ? 'image' : 'video',
        duration: fileWithVideo.duration,
        width: fileWithVideo.width,
        height: fileWithVideo.height,
        fileName: fileWithVideo.original_filename || fileWithVideo.public_id?.split('/').pop()
      } as S3Asset;
    }
    
    return null;
  }, [currentFile])

  const actualFile = getActualFile;

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

  const handleVideoSelectFromLibrary = useCallback((video: any) => {
    if (onSelectFromLibrary) {
      onSelectFromLibrary(video)
      setShowVideoLibrary(false)
    }
  }, [onSelectFromLibrary])

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
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
          </div>
        </div>
        
        {/* Video Library Button for Videos */}
        {isVideo && onSelectFromLibrary && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setShowVideoLibrary(true)}
            className="h-9 px-3 rounded-xl"
          >
            <Video className="w-4 h-4 mr-2" />
            Choose from Library
          </Button>
        )}
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
        className={`relative rounded-2xl p-6 text-center cursor-pointer transition-all duration-300 min-h-[180px] flex flex-col items-center justify-center border-2 ${
          dragOver 
            ? 'border-emerald-400 bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20' 
            : isUploading
              ? 'border-blue-300 bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 cursor-not-allowed' 
              : 'border-dashed border-slate-300 dark:border-slate-700 bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900/50 dark:to-slate-800/50 hover:border-emerald-400 hover:bg-gradient-to-br hover:from-emerald-50/50 hover:to-teal-50/50'
        }`}
        onClick={() => !isUploading && inputRef.current?.click()}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {actualFile && !isUploading ? (
          <div className="space-y-4 w-full">
            <div className="relative mx-auto w-40 h-40 rounded-xl overflow-hidden shadow-lg">
              {isVideo ? (
                <>
                  <div className="absolute inset-0 bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center">
                    <Play className="w-10 h-10 text-white" />
                  </div>
                  <div className="absolute bottom-3 right-3 bg-gradient-to-r from-blue-600 to-cyan-600 text-white text-xs px-3 py-1.5 rounded-full shadow-lg">
                    Video
                  </div>
                </>
              ) : (
                <>
                  <img
                    src={actualFile.url}
                    alt="Preview"
                    className="w-full h-full object-cover"
                    loading="lazy"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = `data:image/svg+xml,${encodeURIComponent('<svg width="200" height="200" viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg"><rect width="200" height="200" fill="%23F3F4F6"/><text x="50%" y="50%" font-family="Arial" font-size="12" fill="%23999" text-anchor="middle" dy=".3em">Image Uploaded</text></svg>')}`
                    }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
                  <div className="absolute bottom-3 right-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white text-xs px-3 py-1.5 rounded-full shadow-lg">
                    Image
                  </div>
                </>
              )}
            </div>
            <div className="px-4">
              <p className="font-medium text-slate-900 dark:text-white truncate">
                {actualFile.fileName || actualFile.url.split('/').pop()?.substring(0, 25)}...
              </p>
              <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                {formatFileSize(actualFile.size)}
                {actualFile.duration && ` • ${actualFile.duration}s`}
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-4 px-4">
            <div className="relative mx-auto">
              <div className={`p-4 rounded-2xl shadow-lg ${isUploading ? 'bg-gradient-to-r from-blue-500 to-cyan-500' : 'bg-gradient-to-r from-emerald-500 to-teal-500'}`}>
                {isUploading ? (
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
                {isUploading ? (
                  <span className="inline-flex items-center gap-2">
                    <span>Uploading...</span>
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
              <p className="text-xs text-slate-500 mt-2">
                {isVideo ? 'MP4, WebM, MOV up to 10GB' : 'JPG, PNG, WebP up to 20MB'}
              </p>
              {isVideo && (
                <div className="mt-1 inline-flex items-center gap-0.5 text-xs text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-2 py-1 rounded-full max-w-full">
                  <Shield className="w-3 h-3 flex-shrink-0" />
                  <span className="truncate">10GB multipart upload supported</span>
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
          onPause={onPauseUpload && (() => onPauseUpload(identifier))}
          onResume={onResumeUpload && (() => onResumeUpload(identifier))}
        />
      )}

      {/* Video Library Selector Modal */}
      {isVideo && onSelectFromLibrary && (
        <VideoLibrarySelector
          open={showVideoLibrary}
          onOpenChange={setShowVideoLibrary}
          onSelect={handleVideoSelectFromLibrary}
          currentFile={currentFile}
          type={type === 'previewVideo' ? 'previewVideo' : 'lessonVideo'}
          moduleIndex={moduleIndex}
          chapterIndex={chapterIndex}
          lessonIndex={lessonIndex}
          // FIX: Remove subLessonIndex since VideoLibrarySelector doesn't accept it
          // subLessonIndex={subLessonIndex}
        />
      )}
    </div>
  )
})
FileUploadArea.displayName = 'FileUploadArea'

// ==================== NEW COMPONENTS ====================
interface IOSUploadNotificationProps {
  show: boolean
  uploadProgress?: UploadProgress[string]
  onDismiss: () => void
}

const IOSUploadNotification = memo(({ 
  show, 
  uploadProgress,
  onDismiss 
}: IOSUploadNotificationProps) => {
  if (!show) return null
  
  return (
    <motion.div
      initial={{ y: 100 }}
      animate={{ y: 0 }}
      exit={{ y: 100 }}
      className="fixed bottom-4 left-4 right-4 z-50"
    >
      <div className="p-4 rounded-2xl bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-2xl">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-white/20">
            <CloudUpload className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between mb-1">
              <p className="font-semibold">iOS Upload in Progress</p>
              <button
                onClick={onDismiss}
                className="text-white/80 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-sm opacity-90 mb-2">
              Keep this screen open for reliable upload
            </p>
            {uploadProgress && (
              <div className="space-y-1">
                <div className="w-full bg-white/30 rounded-full h-1.5">
                  <div 
                    className="bg-white h-1.5 rounded-full transition-all duration-300"
                    style={{ width: `${uploadProgress.progress}%` }}
                  />
                </div>
                <div className="flex justify-between text-xs">
                  <span>{uploadProgress.fileName}</span>
                  <span>{uploadProgress.progress}%</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  )
})
IOSUploadNotification.displayName = 'IOSUploadNotification'

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
  if (!show) return null
  
  const bgColor = {
    info: 'from-blue-500 to-cyan-500',
    warning: 'from-amber-500 to-orange-500',
    error: 'from-rose-500 to-red-500',
    success: 'from-emerald-500 to-green-500'
  }[type]
  
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
  )
})
MobileUploadNotification.displayName = 'MobileUploadNotification'

// ==================== ENHANCED UPLOAD HOOK ====================
const useEnhancedS3Upload = () => {
  const [uploadProgress, setUploadProgress] = useState<UploadProgress>({})
  const [multipartUploads, setMultipartUploads] = useState<Record<string, MultipartUploadState>>({})
  const [activeUploads, setActiveUploads] = useState<Set<string>>(new Set())
  const abortControllers = useRef<Map<string, AbortController>>(new Map())
  const uploadedBytesByPart = useRef<Record<string, Record<number, number>>>({})
  const lastProgressUpdate = useRef<Record<string, { time: number; progress: number }>>({})
  const { getToken } = useAuth()

  const apiCallRef = useRef<(endpoint: string, body: any, signal?: AbortSignal) => Promise<any>>(
    async (endpoint: string, body: any, signal?: AbortSignal) => {
      console.log(`📤 API Call to ${endpoint}:`, { 
        ...body, 
        fileSize: body.fileSize ? `${formatFileSize(body.fileSize)}` : 'N/A' 
      })
      
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

        console.log(`📥 API Response status: ${response.status} for ${endpoint}`)

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
          
          console.error(`❌ API Error for ${endpoint}:`, errorData)
          
          if (response.status === 429) {
            throw new Error('Upload limit reached. Please try again in 15 minutes.')
          } else if (response.status === 400) {
            throw new Error(errorData.error || 'Invalid request')
          } else if (response.status === 500) {
            throw new Error(errorData.error || 'Server error. Please try again or contact support.')
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
    }
  )

  const uploadFile = useCallback(async (
    file: File,
    type: 'thumbnail' | 'previewVideo' | 'lessonVideo' | 'moduleThumbnail',
    identifier: string,
    moduleIndex?: number
  ): Promise<S3Asset> => {
    // Detect device and network conditions
    const deviceType = detectDeviceType()
    const networkType = detectNetworkType()
    const memoryStatus = checkMemoryStatus()
    
    // Process iOS files if needed
    if (deviceType === 'ios' && type.includes('video')) {
      const iosUtils = IOSFileUtils.getInstance()
      const { processedFile } = await iosUtils.processIOSVideoFile(file)
      file = processedFile
    }
    
    // Get optimized settings
    const optimalChunkSize = getOptimalChunkSize(deviceType, file.size, networkType, memoryStatus)
    const concurrencyLimit = getConcurrencyLimit(deviceType, networkType, memoryStatus)
    
    const MAX_FILE_SIZE = 10 * 1024 * 1024 * 1024
    if (file.size > MAX_FILE_SIZE) {
      throw new Error(`File too large. Maximum size: 10GB. Your file: ${formatFileSize(file.size)}`)
    }

    const abortController = new AbortController()
    abortControllers.current.set(identifier, abortController)
    
    const shouldUseMultipart = file.size > optimalChunkSize
    const PART_SIZE = shouldUseMultipart ? optimalChunkSize : file.size
    
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
          startTime: Date.now(),
          deviceType,
          networkType,
          memoryStatus
        }
      }))

      let uploadId: string
      let fileKey: string
      let fileUrl: string

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
          presignedUrl: undefined as string | undefined,
          etag: undefined as string | undefined,
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
            uploadedBytes: 0,
            completedParts: 0
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

        for (let i = 0; i < partsWithUrls.length; i += concurrencyLimit) {
          const batch = partsWithUrls.slice(i, i + concurrencyLimit)
          
          if (abortController.signal.aborted) {
            throw new Error('Upload cancelled')
          }

          // Update batch status to uploading in one go
          setMultipartUploads(prev => ({
            ...prev,
            [identifier]: {
              ...prev[identifier]!,
              parts: prev[identifier]!.parts.map(p => 
                batch.some(b => b.partNumber === p.partNumber) 
                  ? { ...p, status: 'uploading' }
                  : p
              )
            }
          }))

          const batchPromises = batch.map(async (part) => {
            try {
              const partSize = part.end - part.start;
              const blob = file.slice(part.start, part.end);
              
              const result = await new Promise<{ ETag: string; PartNumber: number }>((resolve, reject) => {
                const xhr = new XMLHttpRequest();
                const startTime = Date.now();
                let lastReportedProgress = 0;
                
                xhr.upload.addEventListener('progress', (event) => {
                  if (event.lengthComputable) {
                    if (!uploadedBytesByPart.current[identifier]) {
                      uploadedBytesByPart.current[identifier] = {};
                    }
                    uploadedBytesByPart.current[identifier][part.partNumber] = event.loaded;
                    
                    const partBytes = uploadedBytesByPart.current[identifier];
                    const totalUploadedBytes = Object.values(partBytes).reduce((sum, bytes) => sum + bytes, 0);
                    
                    const uploadProgressValue = 15 + (totalUploadedBytes / file.size) * 80;
                    const newProgress = Math.min(Math.round(uploadProgressValue), 95);
                    
                    // Only update if progress changed by at least 1%
                    if (Math.abs(newProgress - lastReportedProgress) >= 1) {
                      lastReportedProgress = newProgress;
                      
                      const elapsedSeconds = (Date.now() - startTime) / 1000;
                      const uploadSpeed = totalUploadedBytes / elapsedSeconds;
                      const remainingBytes = file.size - totalUploadedBytes;
                      const timeRemaining = uploadSpeed > 0 ? remainingBytes / uploadSpeed : 0;
                      
                      // Use requestAnimationFrame to batch updates
                      if (typeof window !== 'undefined') {
                        requestAnimationFrame(() => {
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
                        });
                      }
                    }
                  }
                });
                
                xhr.addEventListener('load', () => {
                  if (xhr.status === 200) {
                    const etag = xhr.getResponseHeader('etag') || 
                                 xhr.getResponseHeader('ETag')?.replace(/"/g, '');
                    
                    if (!etag) {
                      reject(new Error(`No ETag received for part ${part.partNumber}`));
                      return;
                    }
                    
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
              
              // Update part status to completed
              setMultipartUploads(prev => ({
                ...prev,
                [identifier]: {
                  ...prev[identifier]!,
                  parts: prev[identifier]!.parts.map(p => 
                    p.partNumber === part.partNumber 
                      ? { ...p, status: 'completed', etag: result.ETag, progress: 100 }
                      : p
                  ),
                  completedParts: (prev[identifier]?.completedParts || 0) + 1
                }
              }));

              return result;
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
              }));
              throw error;
            }
          });

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
          console.error('❌ Error completing multipart upload:', error)
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
        const { presignedUrl } = initData

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
          let lastReportedProgress = 30;
          
          xhr.upload.addEventListener('progress', (event) => {
            if (event.lengthComputable) {
              const progress = 30 + (event.loaded / event.total) * 65
              const newProgress = Math.round(progress);
              
              // Only update if progress changed by at least 1%
              if (Math.abs(newProgress - lastReportedProgress) >= 1) {
                lastReportedProgress = newProgress;
                
                const elapsedSeconds = (Date.now() - startTime) / 1000
                const uploadSpeed = event.loaded / elapsedSeconds
                
                // Use requestAnimationFrame to batch updates
                if (typeof window !== 'undefined') {
                  requestAnimationFrame(() => {
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
                  });
                }
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

      return {
        key: fileKey!,
        url: fileUrl!,
        size: file.size,
        type: type === 'thumbnail' || type === 'moduleThumbnail' ? 'image' : 'video',
        duration: type.includes('video') ? 0 : undefined,
        uploadedAt: new Date().toISOString(),
        fileName: file.name,
        mimeType: file.type
      }

    } catch (error) {
      console.error('❌ Upload error:', error)
      
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

  const pauseUpload = useCallback(async (identifier: string) => {
    const controller = abortControllers.current.get(identifier)
    if (controller) {
      controller.abort()
    }
    
    setUploadProgress(prev => ({
      ...prev,
      [identifier]: {
        ...prev[identifier]!,
        status: 'paused'
      }
    }))
  }, [])

  const resumeUpload = useCallback(async (identifier: string) => {
    // For resuming, we need to get the file from the user again
    // This is a simplified version - in production you would want to save the file reference
    const upload = uploadProgress[identifier]
    if (!upload) return
    
    // Show a file picker to get the file again
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = upload.type.includes('video') 
      ? 'video/mp4,video/webm,video/ogg,video/quicktime,video/mov' 
      : 'image/jpeg,image/jpg,image/png,image/webp'
    
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (!file) return
      
      // Re-upload the file
      await uploadFile(file, upload.type, identifier)
    }
    
    input.click()
  }, [uploadProgress, uploadFile])

  return useMemo(() => ({ 
    uploadProgress, 
    uploadFile, 
    cancelUpload, 
    retryUpload,
    pauseUpload,
    resumeUpload,
    multipartUploads,
    activeUploads: Array.from(activeUploads)
  }), [uploadProgress, uploadFile, cancelUpload, retryUpload, pauseUpload, resumeUpload, multipartUploads, activeUploads])
}

// ==================== NEW COMPONENTS ====================
const SectionHeader = memo(({ 
  title, 
  description, 
  icon: Icon,
  color = 'from-emerald-500 to-teal-500'
}: { 
  title: string
  description: string
  icon: React.ElementType
  color?: string
}) => (
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

const FormCard = memo(({ 
  children, 
  className = '' 
}: { 
  children: React.ReactNode
  className?: string
}) => (
  <Card className={`bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm border border-slate-200/50 dark:border-slate-700/50 shadow-xl rounded-2xl overflow-hidden ${className}`}>
    {children}
  </Card>
))
FormCard.displayName = 'FormCard'

const FormGroup = memo(({ 
  label, 
  children,
  required = false,
  icon: Icon,
  disabled = false
}: { 
  label: string
  children: React.ReactNode
  required?: boolean
  icon?: React.ElementType
  disabled?: boolean
}) => (
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

const UploadStatsPanel = memo(({ 
  uploadStats,
  activeUploads,
  uploadProgress
}: { 
  uploadStats: { totalFiles: number, totalSize: number, completedFiles: number }
  activeUploads: string[]
  uploadProgress: UploadProgress
}) => (
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

const StickyActions = memo(({ 
  loading, 
  activeUploads, 
  networkStatus, 
  hasThumbnail,
  onSubmit,
  canSubmit,
  onDelete,
  onTogglePublish,
  isPublished,
  onViewCourse
}: { 
  loading: boolean
  activeUploads: string[]
  networkStatus: string
  hasThumbnail: boolean
  onSubmit: (e: React.MouseEvent<HTMLButtonElement>) => void
  canSubmit: boolean
  onDelete: () => void
  onTogglePublish: () => void
  isPublished: boolean
  onViewCourse: () => void
}) => {
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
                Saving Changes...
              </>
            ) : (
              <>
                <Save className="w-5 h-5 mr-2" />
                Save Changes
              </>
            )}
          </Button>
          
          <div className="flex gap-4">
            <Button 
              type="button" 
              variant="outline" 
              onClick={onTogglePublish}
              className="h-14 rounded-2xl border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800"
              disabled={loading}
            >
              {isPublished ? (
                <>
                  <EyeOff className="w-5 h-5 mr-2" />
                  Unpublish
                </>
              ) : (
                <>
                  <Eye className="w-5 h-5 mr-2" />
                  Publish
                </>
              )}
            </Button>
            
            <Button 
              type="button" 
              variant="outline" 
              className="h-14 rounded-2xl border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800"
              onClick={onViewCourse}
              disabled={loading}
            >
              <Eye className="w-5 h-5 mr-2" />
              View Course
            </Button>
          </div>
          
          <Button 
            type="button" 
            variant="destructive"
            onClick={onDelete}
            className="h-14 rounded-2xl"
            disabled={loading}
          >
            <Trash2 className="w-5 h-5 mr-2" />
            Delete Course
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
        <p className="text-lg font-bold bg-gradient-to-r from-emerald-600 to-teal-500 bg-clip-text text-transparent">Loading Course Editor</p>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">Preparing your workspace...</p>
      </div>
    </div>
  </div>
))
LoadingSkeleton.displayName = 'LoadingSkeleton'

// ==================== MAIN PAGE ====================
export default function EditCoursePage() {
  const params = useParams()
  const router = useRouter()
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [isClient, setIsClient] = useState(false)
  const [networkStatus, setNetworkStatus] = useState<'online' | 'offline'>(
    typeof window !== 'undefined' ? (navigator.onLine ? 'online' : 'offline') : 'online'
  )
  const [uploadStats, setUploadStats] = useState({
    totalFiles: 0,
    totalSize: 0,
    completedFiles: 0
  })
  
  const [showVideoLibrary, setShowVideoLibrary] = useState<{
    open: boolean
    type: 'previewVideo' | 'lessonVideo'
    moduleIndex?: number
    chapterIndex?: number
    lessonIndex?: number
    subLessonIndex?: number
  }>({ open: false, type: 'lessonVideo' })

  const [mobileUploadNotification, setMobileUploadNotification] = useState<{
    show: boolean
    message: string
    type: 'info' | 'warning' | 'error' | 'success'
  }>({ show: false, message: '', type: 'info' })

  const [showIOSNotification, setShowIOSNotification] = useState(false)
  
  const { 
    uploadProgress, 
    uploadFile: enhancedUploadFile, 
    cancelUpload, 
    retryUpload,
    pauseUpload,
    resumeUpload,
    multipartUploads,
    activeUploads
  } = useEnhancedS3Upload()
  
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

  useEffect(() => {
    if (params.id && isClient) {
      fetchCourse()
    }
  }, [params.id, isClient])

  useEffect(() => {
    const uploads = Object.values(uploadProgress)
    const stats = {
      totalFiles: uploads.length,
      totalSize: uploads.reduce((sum, upload) => sum + (upload.size || 0), 0),
      completedFiles: uploads.filter(u => u.status === 'completed').length
    }
    setUploadStats(stats)
  }, [uploadProgress])

  // iOS notification effect
  useEffect(() => {
    const isIOS = /iPhone|iPad|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    
    if (isIOS && activeUploads.length > 0) {
      setShowIOSNotification(true);
      
      // Auto-dismiss after 10 seconds if upload is complete
      const timer = setTimeout(() => {
        const hasActiveUploads = Object.values(uploadProgress).some(
          u => u.status === 'uploading' || u.status === 'initiating' || u.status === 'generating-urls'
        );
        
        if (!hasActiveUploads) {
          setShowIOSNotification(false);
        }
      }, 10000);
      
      return () => clearTimeout(timer);
    } else {
      setShowIOSNotification(false);
    }
  }, [activeUploads, uploadProgress]);

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

  // Get active iOS upload for notification
  const activeIOSUpload = Object.values(uploadProgress).find(
    u => u.status === 'uploading' && u.deviceType === 'ios'
  );

  // ==================== DURATION CALCULATION HELPERS ====================
  const calculateLessonDuration = useCallback((lesson: Lesson): number => {
    let totalDuration = 0;
    
    // Add lesson video duration if it exists
    if (lesson.video?.duration) {
      totalDuration += lesson.video.duration;
    } else if (lesson.videoSource?.video?.duration) {
      totalDuration += lesson.videoSource.video.duration;
    }
    
    // Add all sub-lesson durations
    totalDuration += lesson.subLessons.reduce((sum, subLesson) => {
      if (subLesson.video?.duration) {
        return sum + subLesson.video.duration;
      } else if (subLesson.videoSource?.video?.duration) {
        return sum + subLesson.videoSource.video.duration;
      }
      return sum + (subLesson.duration || 0);
    }, 0);
    
    return totalDuration || lesson.duration || 0;
  }, []);

  // Memoized calculations
  const totalDuration = useMemo(() => formData.modules.reduce((total, module) => {
    return total + module.chapters.reduce((chapterTotal, chapter) => {
      return chapterTotal + chapter.lessons.reduce((lessonTotal, lesson) => {
        // Calculate lesson duration based on both lesson video and sub-lesson videos
        return lessonTotal + calculateLessonDuration(lesson);
      }, 0);
    }, 0);
  }, 0), [formData.modules, calculateLessonDuration]);

  // Add total sub-lessons count
  const totalSubLessons = useMemo(() => formData.modules.reduce((total, module) => {
    return total + module.chapters.reduce((chapterTotal, chapter) => 
      chapterTotal + chapter.lessons.reduce((lessonTotal, lesson) => 
        lessonTotal + lesson.subLessons.length, 0
      ), 0
    )
  }, 0), [formData.modules])

  // Update total lessons to count only lessons (not sub-lessons)
  const totalLessons = useMemo(() => formData.modules.reduce((total, module) => {
    return total + module.chapters.reduce((chapterTotal, chapter) => 
      chapterTotal + chapter.lessons.length, 0
    )
  }, 0), [formData.modules])

  const totalChapters = useMemo(() => formData.modules.reduce((total, module) => total + module.chapters.length, 0), [formData.modules])

  // Fetch course data
  const fetchCourse = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/admin/courses/${params.id}`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch course: ${response.status}`);
      }

      const courseData = await response.json();
      setCourse(courseData);
      
      console.log('📥 Raw course data:', {
        title: courseData.title,
        thumbnail: courseData.thumbnail,
        previewVideo: courseData.previewVideo,
        modulesCount: courseData.modules?.length,
        firstModule: courseData.modules?.[0]
      });
      
      // Helper function to transform any asset to S3Asset format
      const transformAsset = (asset: any): S3Asset | null => {
        if (!asset) return null;
        
        // Case 1: Already in S3Asset format
        if (asset.key && asset.url) {
          return {
            key: asset.key,
            url: asset.url,
            size: asset.size || 0,
            type: asset.type === 'video' ? 'video' : 'image',
            duration: asset.duration,
            width: asset.width,
            height: asset.height,
            fileName: asset.fileName || asset.originalFileName || asset.key?.split('/').pop(),
            mimeType: asset.mimeType,
            uploadedAt: asset.uploadedAt,
            originalFileName: asset.originalFileName
          };
        }
        
        // Case 2: Cloudinary format
        if (asset.public_id || asset.secure_url) {
          return {
            key: asset.public_id || '',
            url: asset.secure_url || '',
            size: asset.bytes || 0,
            type: asset.resource_type === 'video' ? 'video' : 'image',
            duration: asset.duration,
            width: asset.width,
            height: asset.height,
            fileName: asset.original_filename || asset.public_id?.split('/').pop()
          };
        }
        
        // Case 3: Nested in videoSource
        if (asset.video && typeof asset.video === 'object') {
          return transformAsset(asset.video);
        }
        
        // Case 4: videoSource.video format
        if (asset.videoSource?.video) {
          return transformAsset(asset.videoSource.video);
        }
        
        return null;
      };

      // Transform modules with proper error handling
      const transformModules = (modules: any[]): Module[] => {
        if (!modules || !Array.isArray(modules)) return [];
        
        return modules.map((module: any, moduleIndex: number) => {
          // Ensure module has basic structure
          const baseModule: Module = {
            title: module.title || `Module ${moduleIndex + 1}`,
            description: module.description || '',
            thumbnailUrl: module.thumbnailUrl,
            order: module.order || moduleIndex,
            chapters: [],
            _id: module._id
          };
          
          // Handle chapters
          if (module.chapters && Array.isArray(module.chapters)) {
            baseModule.chapters = module.chapters.map((chapter: any, chapterIndex: number) => {
              const baseChapter: Chapter = {
                title: chapter.title || `Chapter ${chapterIndex + 1}`,
                description: chapter.description || '',
                order: chapter.order || chapterIndex,
                lessons: [],
                _id: chapter._id
              };
              
              // Handle lessons
              if (chapter.lessons && Array.isArray(chapter.lessons)) {
                baseChapter.lessons = chapter.lessons.map((lesson: any, lessonIndex: number) => {
                  const videoAsset = transformAsset(lesson.video || lesson.videoSource?.video);
                  
                  const baseLesson: Lesson = {
                    title: lesson.title || `Lesson ${lessonIndex + 1}`,
                    description: lesson.description || '',
                    content: lesson.content || '',
                    duration: lesson.duration || 0,
                    isPreview: lesson.isPreview || false,
                    order: lesson.order || lessonIndex,
                    resources: Array.isArray(lesson.resources) ? lesson.resources.map((res: any) => ({
                      title: res.title || '',
                      url: res.url || '',
                      type: res.type || 'pdf'
                    })) : [],
                    subLessons: [],
                    video: videoAsset || undefined, // FIX: Convert null to undefined
                    videoSource: lesson.videoSource ? {
                      type: lesson.videoSource.type || 'uploaded',
                      videoLibraryId: lesson.videoSource.videoLibraryId,
                      video: videoAsset!, // FIX: Use non-null assertion
                      uploadedAt: lesson.videoSource.uploadedAt,
                      uploadedBy: lesson.videoSource.uploadedBy
                    } : videoAsset ? {
                      type: 'uploaded' as const,
                      video: videoAsset,
                      videoLibraryId: undefined,
                      uploadedAt: undefined,
                      uploadedBy: undefined
                    } : undefined, // FIX: Return undefined if no video
                    _id: lesson._id
                  };
                  
                  // Handle sub-lessons
                  if (lesson.subLessons && Array.isArray(lesson.subLessons)) {
                    baseLesson.subLessons = lesson.subLessons.map((subLesson: any, subLessonIndex: number) => {
                      const subLessonVideoAsset = transformAsset(subLesson.video || subLesson.videoSource?.video);
                      
                      return {
                        title: subLesson.title || `Sub-lesson ${subLessonIndex + 1}`,
                        description: subLesson.description || '',
                        content: subLesson.content || '',
                        duration: subLesson.duration || 0,
                        isPreview: subLesson.isPreview || false,
                        order: subLesson.order || subLessonIndex,
                        resources: Array.isArray(subLesson.resources) ? subLesson.resources.map((res: any) => ({
                          title: res.title || '',
                          url: res.url || '',
                          type: res.type || 'pdf'
                        })) : [],
                        video: subLessonVideoAsset || undefined, // FIX: Convert null to undefined
                        videoSource: subLesson.videoSource ? {
                          type: subLesson.videoSource.type || 'uploaded',
                          videoLibraryId: subLesson.videoSource.videoLibraryId,
                          video: subLessonVideoAsset!, // FIX: Use non-null assertion
                          uploadedAt: subLesson.videoSource.uploadedAt,
                          uploadedBy: subLesson.videoSource.uploadedBy
                        } : subLessonVideoAsset ? {
                          type: 'uploaded' as const,
                          video: subLessonVideoAsset,
                          videoLibraryId: undefined,
                          uploadedAt: undefined,
                          uploadedBy: undefined
                        } : undefined, // FIX: Return undefined if no video
                        _id: subLesson._id
                      };
                    });
                  }
                  
                  return baseLesson;
                });
              }
              
              return baseChapter;
            });
          }
          
          return baseModule;
        });
      };

      const thumbnailAsset = transformAsset(courseData.thumbnail);
      const previewVideoAsset = transformAsset(courseData.previewVideo);
      
      const formDataToSet = {
        title: courseData.title || '',
        description: courseData.description || '',
        shortDescription: courseData.shortDescription || '',
        price: courseData.price || 0,
        isFree: courseData.isFree || false,
        level: courseData.level || 'beginner',
        category: courseData.category || '',
        tags: Array.isArray(courseData.tags) ? courseData.tags : [],
        thumbnail: thumbnailAsset,
        previewVideo: previewVideoAsset,
        modules: transformModules(courseData.modules),
        requirements: Array.isArray(courseData.requirements) ? courseData.requirements : [],
        learningOutcomes: Array.isArray(courseData.learningOutcomes) ? courseData.learningOutcomes : [],
        isPublished: courseData.isPublished || false,
        isFeatured: courseData.isFeatured || false
      };

      console.log('✅ Transformed form data:', {
        title: formDataToSet.title,
        thumbnail: formDataToSet.thumbnail ? 'Has thumbnail' : 'No thumbnail',
        previewVideo: formDataToSet.previewVideo ? 'Has preview video' : 'No preview video',
        modules: formDataToSet.modules.length,
        firstModuleFirstLesson: formDataToSet.modules[0]?.chapters[0]?.lessons[0],
        firstModuleFirstLessonVideo: formDataToSet.modules[0]?.chapters[0]?.lessons[0]?.video,
        firstModuleFirstLessonResources: formDataToSet.modules[0]?.chapters[0]?.lessons[0]?.resources
      });

      setFormData(formDataToSet);
      
      toast({
        title: 'Success',
        description: 'Course loaded successfully!',
        variant: 'default'
      });
    } catch (err: any) {
      console.error('❌ Error fetching course:', err);
      toast({
        title: 'Error',
        description: err.message || 'Failed to load course',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  // ==================== VIDEO LIBRARY HANDLERS ====================
  const handleVideoLibrarySelect = useCallback((video: VideoLibraryItem, context: {
    type: 'previewVideo' | 'lessonVideo'
    moduleIndex?: number
    chapterIndex?: number
    lessonIndex?: number
    subLessonIndex?: number
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
      mimeType: video.video.mimeType,
      lastModified: new Date().toISOString()
    }

    if (context.type === 'previewVideo') {
      setFormData(prev => ({ 
        ...prev, 
        previewVideo: s3Asset 
      }))
    } else if (context.type === 'lessonVideo') {
      if (context.subLessonIndex !== undefined && 
          context.moduleIndex !== undefined && 
          context.chapterIndex !== undefined && 
          context.lessonIndex !== undefined) {
        // For sub-lesson video selection
        setFormData(prev => {
          const updatedModules = [...prev.modules]
          
          updatedModules[context.moduleIndex!] = {
            ...updatedModules[context.moduleIndex!],
            chapters: updatedModules[context.moduleIndex!].chapters.map((chapter, chapIdx) =>
              chapIdx === context.chapterIndex ? {
                ...chapter,
                lessons: chapter.lessons.map((lesson, lesIdx) =>
                  lesIdx === context.lessonIndex ? {
                    ...lesson,
                    subLessons: lesson.subLessons.map((subLesson, subIdx) =>
                      subIdx === context.subLessonIndex ? {
                        ...subLesson,
                        video: s3Asset,
                        videoSource: {
                          type: 'library',
                          videoLibraryId: video._id,
                          video: s3Asset,
                          uploadedAt: video.uploadDate,
                          uploadedBy: video.uploadedBy?._id
                        }
                      } : subLesson
                    )
                  } : lesson
                )
              } : chapter
            )
          }
          
          return { 
            ...prev, 
            modules: updatedModules 
          }
        })
      } else if (context.moduleIndex !== undefined && 
                 context.chapterIndex !== undefined && 
                 context.lessonIndex !== undefined) {
        // For lesson video selection
        setFormData(prev => {
          const updatedModules = [...prev.modules]
          
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
          }
          
          return { 
            ...prev, 
            modules: updatedModules 
          }
        })
      }
    }
    
    toast({
      title: 'Success',
      description: 'Video selected from library!',
      variant: 'default'
    });
  }, [toast]);

  const handlePreviewVideoSelectFromLibrary = useCallback((video: any) => {
    const s3Asset: S3Asset = {
      key: video.video.key,
      url: video.video.url,
      size: video.video.size,
      type: 'video' as const,
      duration: video.video.duration,
      uploadedAt: new Date().toISOString(),
      fileName: video.video.originalFileName || video.title
    };
    
    setFormData(prev => ({ ...prev, previewVideo: s3Asset }));
    
    toast({
      title: 'Success',
      description: 'Preview video selected from library!',
      variant: 'default'
    });
  }, [toast]);

  // ==================== UPDATED FILE UPLOAD HANDLERS ====================
  const handleThumbnailChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      try {
        const result = await enhancedUploadFile(file, 'thumbnail', 'thumbnail')
        setFormData(prev => ({ ...prev, thumbnail: result }))
        toast({
          title: 'Success',
          description: 'Thumbnail uploaded successfully!',
          variant: 'default'
        })
      } catch (error) {
        console.error('Error uploading thumbnail:', error)
        toast({
          title: 'Error',
          description: error instanceof Error ? error.message : 'Failed to upload thumbnail',
          variant: 'destructive'
        })
      }
    }
  }, [enhancedUploadFile, toast])

  const handlePreviewVideoChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      try {
        const result = await enhancedUploadFile(file, 'previewVideo', 'previewVideo')
        setFormData(prev => ({ ...prev, previewVideo: result }))
        toast({
          title: 'Success',
          description: 'Preview video uploaded successfully!',
          variant: 'default'
        })
      } catch (error) {
        console.error('Error uploading preview video:', error)
        toast({
          title: 'Error',
          description: error instanceof Error ? error.message : 'Failed to upload preview video',
          variant: 'destructive'
        })
      }
    }
  }, [enhancedUploadFile, toast])

  const handleModuleThumbnailChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>, moduleIndex: number) => {
    const file = e.target.files?.[0]
    if (file) {
      try {
        const result = await enhancedUploadFile(file, 'moduleThumbnail', `module-${moduleIndex}-thumbnail`, moduleIndex)
        const updatedModules = [...formData.modules]
        updatedModules[moduleIndex] = {
          ...updatedModules[moduleIndex],
          thumbnailUrl: result.url
        }
        setFormData(prev => ({ ...prev, modules: updatedModules }))
        toast({
          title: 'Success',
          description: 'Module thumbnail uploaded successfully!',
          variant: 'default'
        })
      } catch (error) {
        console.error('Error uploading module thumbnail:', error)
        toast({
          title: 'Error',
          description: error instanceof Error ? error.message : 'Failed to upload module thumbnail',
          variant: 'destructive'
        })
      }
    }
  }, [enhancedUploadFile, formData.modules, toast])

  const handleLessonVideoChange = useCallback(async (
    e: React.ChangeEvent<HTMLInputElement>, 
    moduleIndex: number, 
    chapterIndex: number, 
    lessonIndex: number
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const identifier = `lesson-${moduleIndex}-${chapterIndex}-${lessonIndex}`;
    
    try {
      const result = await enhancedUploadFile(file, 'lessonVideo', identifier, moduleIndex);
      
      // Create proper videoSource structure
      const videoSource = {
        type: 'uploaded' as const,
        videoLibraryId: undefined,
        video: result,
        uploadedAt: new Date().toISOString(),
        uploadedBy: 'current-user-id' // Get from your auth
      };

      setFormData(prev => {
        const updatedModules = [...prev.modules];
        
        if (!updatedModules[moduleIndex]?.chapters[chapterIndex]?.lessons[lessonIndex]) {
          return prev;
        }
        
        updatedModules[moduleIndex] = {
          ...updatedModules[moduleIndex],
          chapters: updatedModules[moduleIndex].chapters.map((chapter, chapIdx) => 
            chapIdx === chapterIndex ? {
              ...chapter,
              lessons: chapter.lessons.map((lesson, lesIdx) => 
                lesIdx === lessonIndex ? {
                  ...lesson,
                  video: result, // Keep for backward compatibility
                  videoSource: videoSource, // Add new structure
                  duration: result.duration || calculateLessonDuration({
                    ...lesson,
                    video: result,
                    videoSource
                  })
                } : lesson
              )
            } : chapter
          )
        };
        
        return { ...prev, modules: updatedModules };
      });
      
      toast({
        title: 'Success',
        description: 'Lesson video uploaded successfully!',
        variant: 'default'
      });
    } catch (error) {
      console.error('Error uploading lesson video:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to upload lesson video',
        variant: 'destructive'
      });
    }
  }, [enhancedUploadFile, toast, calculateLessonDuration]);

  // NEW: Sub-lesson video change handler
  const handleSubLessonVideoChange = useCallback(async (
    e: React.ChangeEvent<HTMLInputElement>, 
    moduleIndex: number, 
    chapterIndex: number, 
    lessonIndex: number,
    subLessonIndex: number
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const identifier = `sublesson-${moduleIndex}-${chapterIndex}-${lessonIndex}-${subLessonIndex}`;
    
    try {
      const result = await enhancedUploadFile(file, 'lessonVideo', identifier, moduleIndex);
      
      // Create proper videoSource structure
      const videoSource = {
        type: 'uploaded' as const,
        videoLibraryId: undefined,
        video: result,
        uploadedAt: new Date().toISOString(),
        uploadedBy: 'current-user-id' // You should get this from auth
      };

      setFormData(prev => {
        const updatedModules = [...prev.modules];
        
        // Safely update the structure
        if (!updatedModules[moduleIndex]?.chapters[chapterIndex]?.lessons[lessonIndex]?.subLessons[subLessonIndex]) {
          return prev;
        }
        
        updatedModules[moduleIndex] = {
          ...updatedModules[moduleIndex],
          chapters: updatedModules[moduleIndex].chapters.map((chapter, chapIdx) => 
            chapIdx === chapterIndex ? {
              ...chapter,
              lessons: chapter.lessons.map((lesson, lesIdx) => 
                lesIdx === lessonIndex ? {
                  ...lesson,
                  subLessons: lesson.subLessons.map((subLesson, subIdx) =>
                    subIdx === subLessonIndex ? {
                      ...subLesson,
                      video: result,
                      videoSource: videoSource,
                      duration: result.duration || 0
                    } : subLesson
                  )
                } : lesson
              )
            } : chapter
          )
        };
        
        return { ...prev, modules: updatedModules };
      });
      
      toast({
        title: 'Success',
        description: 'Sub-lesson video uploaded successfully!',
        variant: 'default'
      });
    } catch (error) {
      console.error('Error uploading sub-lesson video:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to upload sub-lesson video',
        variant: 'destructive'
      });
    }
  }, [enhancedUploadFile, toast]);

  // Device-optimized file selection handler
  const handleDeviceFileSelect = useCallback(async (
    file: File,
    type: 'thumbnail' | 'previewVideo' | 'lessonVideo' | 'moduleThumbnail',
    moduleIndex?: number,
    chapterIndex?: number,
    lessonIndex?: number,
    subLessonIndex?: number
  ) => {
    if (!file) return

    try {
      let result: S3Asset
      
      if (type === 'thumbnail') {
        result = await enhancedUploadFile(file, type, 'thumbnail')
        setFormData(prev => ({ ...prev, thumbnail: result }))
      } else if (type === 'previewVideo') {
        result = await enhancedUploadFile(file, type, 'previewVideo')
        setFormData(prev => ({ ...prev, previewVideo: result }))
      } else if (type === 'moduleThumbnail' && moduleIndex !== undefined) {
        result = await enhancedUploadFile(file, type, `module-${moduleIndex}-thumbnail`, moduleIndex)
        setFormData(prev => {
          const updatedModules = [...prev.modules]
          updatedModules[moduleIndex] = {
            ...updatedModules[moduleIndex],
            thumbnailUrl: result.url
          }
          return { ...prev, modules: updatedModules }
        })
      } else if (type === 'lessonVideo' && moduleIndex !== undefined && chapterIndex !== undefined && lessonIndex !== undefined) {
        if (subLessonIndex !== undefined) {
          // For sub-lesson video
          const identifier = `sublesson-${moduleIndex}-${chapterIndex}-${lessonIndex}-${subLessonIndex}`
          result = await enhancedUploadFile(file, type, identifier, moduleIndex)
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
                      subLessons: lesson.subLessons.map((subLesson, subIdx) =>
                        subIdx === subLessonIndex ? {
                          ...subLesson,
                          video: result,
                          videoSource: {
                            type: 'uploaded',
                            video: result,
                            uploadedAt: new Date().toISOString()
                          }
                        } : subLesson
                      )
                    } : lesson
                  )
                } : chapter
              )
            }
            return { ...prev, modules: updatedModules }
          })
        } else {
          // For lesson video
          const identifier = `lesson-${moduleIndex}-${chapterIndex}-${lessonIndex}`
          result = await enhancedUploadFile(file, type, identifier, moduleIndex)
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
        }
      }
    } catch (error) {
      console.error('Upload failed:', error)
      setMobileUploadNotification({
        show: true,
        message: error instanceof Error ? error.message : 'Upload failed. Please try again.',
        type: 'error'
      })
    }
  }, [enhancedUploadFile])

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
        } else if (identifier.startsWith('sublesson-')) {
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
          const updatedModules = [...formData.modules]
          updatedModules[moduleIndex] = {
            ...updatedModules[moduleIndex],
            thumbnailUrl: result.url
          }
          setFormData(prev => ({ ...prev, modules: updatedModules }))
        } else if (type === 'lessonVideo' && identifier.startsWith('lesson-')) {
          const parts = identifier.split('-')
          const modIdx = parseInt(parts[1])
          const chapIdx = parseInt(parts[2])
          const lesIdx = parseInt(parts[3])
          
          const updatedModules = [...formData.modules]
          if (updatedModules[modIdx]?.chapters[chapIdx]?.lessons[lesIdx]) {
            updatedModules[modIdx] = {
              ...updatedModules[modIdx],
              chapters: updatedModules[modIdx].chapters.map((chapter, cIdx) => 
                cIdx === chapIdx ? {
                  ...chapter,
                  lessons: chapter.lessons.map((lesson, lIdx) => 
                    lIdx === lesIdx ? {
                      ...lesson,
                      video: result
                    } : lesson
                  )
                } : chapter
              )
            }
            setFormData(prev => ({ ...prev, modules: updatedModules }))
          }
        } else if (type === 'lessonVideo' && identifier.startsWith('sublesson-')) {
          const parts = identifier.split('-')
          const modIdx = parseInt(parts[1])
          const chapIdx = parseInt(parts[2])
          const lesIdx = parseInt(parts[3])
          const subIdx = parseInt(parts[4])
          
          const updatedModules = [...formData.modules]
          if (updatedModules[modIdx]?.chapters[chapIdx]?.lessons[lesIdx]?.subLessons[subIdx]) {
            updatedModules[modIdx] = {
              ...updatedModules[modIdx],
              chapters: updatedModules[modIdx].chapters.map((chapter, cIdx) => 
                cIdx === chapIdx ? {
                  ...chapter,
                  lessons: chapter.lessons.map((lesson, lIdx) => 
                    lIdx === lesIdx ? {
                      ...lesson,
                      subLessons: lesson.subLessons.map((subLesson, sIdx) =>
                        sIdx === subIdx ? {
                          ...subLesson,
                          video: result
                        } : subLesson
                      )
                    } : lesson
                  )
                } : chapter
              )
            }
            setFormData(prev => ({ ...prev, modules: updatedModules }))
          }
        }
        
        toast({
          title: 'Success',
          description: 'Upload retry successful!',
          variant: 'default'
        })
      } catch (error) {
        console.error('Retry failed:', error)
        toast({
          title: 'Error',
          description: error instanceof Error ? error.message : 'Retry failed',
          variant: 'destructive'
        })
      }
    }
    
    input.click()
  }, [enhancedUploadFile, uploadProgress, formData.modules, toast])

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
    setFormData(prev => ({ ...prev, modules: updatedModules }))
  }, [formData.modules])

  const removeChapter = useCallback((moduleIndex: number, chapterIndex: number) => {
    const updatedModules = [...formData.modules]
    updatedModules[moduleIndex] = {
      ...updatedModules[moduleIndex],
      chapters: updatedModules[moduleIndex].chapters.filter(
        (_, index) => index !== chapterIndex
      )
    }
    setFormData(prev => ({ ...prev, modules: updatedModules }))
  }, [formData.modules])

  // Lesson management
  const addLesson = useCallback((moduleIndex: number, chapterIndex: number) => {
    setFormData(prev => {
      const updatedModules = [...prev.modules];
      
      if (!updatedModules[moduleIndex]?.chapters[chapterIndex]) {
        return prev;
      }
      
      const chapter = updatedModules[moduleIndex].chapters[chapterIndex];
      const newLesson: Lesson = {
        title: '',
        description: '',
        content: '',
        duration: 0,
        isPreview: false,
        order: chapter.lessons.length,
        resources: [],
        subLessons: [],
        video: undefined,
        videoSource: undefined // Will be set when video is uploaded
      };
      
      updatedModules[moduleIndex] = {
        ...updatedModules[moduleIndex],
        chapters: updatedModules[moduleIndex].chapters.map((chap, chapIdx) => 
          chapIdx === chapterIndex ? {
            ...chap,
            lessons: [...chap.lessons, newLesson]
          } : chap
        )
      };
      
      return { ...prev, modules: updatedModules };
    });
  }, []);

  const removeLesson = useCallback((moduleIndex: number, chapterIndex: number, lessonIndex: number) => {
    const updatedModules = [...formData.modules]
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
    setFormData(prev => ({ ...prev, modules: updatedModules }))
  }, [formData.modules])

  // NEW: Sub-lesson management functions
  const addSubLesson = useCallback((moduleIndex: number, chapterIndex: number, lessonIndex: number) => {
    setFormData(prev => {
      const updatedModules = [...prev.modules];
      
      if (!updatedModules[moduleIndex]?.chapters[chapterIndex]?.lessons[lessonIndex]) {
        return prev;
      }
      
      const lesson = updatedModules[moduleIndex].chapters[chapterIndex].lessons[lessonIndex];
      const newSubLesson: SubLesson = {
        title: '',
        description: '',
        content: '',
        duration: 0,
        isPreview: false,
        order: lesson.subLessons.length,
        resources: [],
        video: undefined,
        videoSource: undefined // Will be set when video is uploaded
      };
      
      updatedModules[moduleIndex] = {
        ...updatedModules[moduleIndex],
        chapters: updatedModules[moduleIndex].chapters.map((chapter, chapIdx) => 
          chapIdx === chapterIndex ? {
            ...chapter,
            lessons: chapter.lessons.map((lesson, lesIdx) => 
              lesIdx === lessonIndex ? {
                ...lesson,
                subLessons: [...lesson.subLessons, newSubLesson]
              } : lesson
            )
          } : chapter
        )
      };
      
      return { ...prev, modules: updatedModules };
    });
  }, []);

  const removeSubLesson = useCallback((moduleIndex: number, chapterIndex: number, lessonIndex: number, subLessonIndex: number) => {
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
                subLessons: lesson.subLessons.filter(
                  (_, index) => index !== subLessonIndex
                )
              } : lesson
            )
          } : chapter
        )
      }
      return { ...prev, modules: updatedModules }
    })
  }, [])

  const addResource = useCallback((moduleIndex: number, chapterIndex: number, lessonIndex: number) => {
    const updatedModules = [...formData.modules]
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
    setFormData(prev => ({ ...prev, modules: updatedModules }))
  }, [formData.modules])

  const removeResource = useCallback((moduleIndex: number, chapterIndex: number, lessonIndex: number, resourceIndex: number) => {
    const updatedModules = [...formData.modules]
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
    setFormData(prev => ({ ...prev, modules: updatedModules }))
  }, [formData.modules])

  // NEW: Sub-lesson resource management
  const addSubLessonResource = useCallback((moduleIndex: number, chapterIndex: number, lessonIndex: number, subLessonIndex: number) => {
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
                subLessons: lesson.subLessons.map((subLesson, subIdx) =>
                  subIdx === subLessonIndex ? {
                    ...subLesson,
                    resources: [...subLesson.resources, {
                      title: '',
                      url: '',
                      type: 'pdf'
                    }]
                  } : subLesson
                )
              } : lesson
            )
          } : chapter
        )
      }
      return { ...prev, modules: updatedModules }
    })
  }, [])

  const removeSubLessonResource = useCallback((moduleIndex: number, chapterIndex: number, lessonIndex: number, subLessonIndex: number, resourceIndex: number) => {
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
                subLessons: lesson.subLessons.map((subLesson, subIdx) =>
                  subIdx === subLessonIndex ? {
                    ...subLesson,
                    resources: subLesson.resources.filter((_, index) => index !== resourceIndex)
                  } : subLesson
                )
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
      toast({
        title: 'Error',
        description: 'Please wait for all uploads to complete before saving',
        variant: 'destructive'
      })
      return
    }

    if (networkStatus === 'offline') {
      toast({
        title: 'Error',
        description: 'You are offline. Please check your internet connection and try again.',
        variant: 'destructive'
      })
      return
    }

    if (!formData.thumbnail) {
      toast({
        title: 'Error',
        description: 'Please upload a course thumbnail',
        variant: 'destructive'
      })
      return
    }

    if (!formData.title.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter a course title',
        variant: 'destructive'
      })
      return
    }

    if (!formData.description.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter a course description',
        variant: 'destructive'
      })
      return
    }

    // Update the missing videos check to include sub-lessons
    const missingVideos = formData.modules.some(module => 
      module.chapters.some(chapter => 
        chapter.lessons.some(lesson => {
          // Check if lesson needs a video (only if no sub-lessons)
          const lessonNeedsVideo = lesson.subLessons.length === 0 && 
                                  !lesson.video && 
                                  !lesson.videoSource?.video;
          
          // Check if any sub-lesson needs a video
          const subLessonsNeedVideo = lesson.subLessons.some(subLesson => 
            !subLesson.video && !subLesson.videoSource?.video
          );
          
          return lessonNeedsVideo || subLessonsNeedVideo;
        })
      )
    );

    if (missingVideos) {
      toast({
        title: 'Error',
        description: 'Each lesson must have either: 1) A lesson video, OR 2) Sub-lessons with videos',
        variant: 'destructive'
      });
      return;
    }

    setSaving(true)

    try {
      // Prepare data with proper structure for the API
      const submitData = {
        ...formData,
        thumbnail: formData.thumbnail ? {
          key: formData.thumbnail.key,
          url: formData.thumbnail.url,
          size: formData.thumbnail.size,
          type: 'image' as const,
          duration: formData.thumbnail.duration,
          width: formData.thumbnail.width,
          height: formData.thumbnail.height,
          uploadedAt: formData.thumbnail.uploadedAt || new Date().toISOString(),
          fileName: formData.thumbnail.fileName || 'thumbnail.jpg'
        } : null,
        previewVideo: formData.previewVideo ? {
          key: formData.previewVideo.key,
          url: formData.previewVideo.url,
          size: formData.previewVideo.size,
          type: 'video' as const,
          duration: formData.previewVideo.duration,
          width: formData.previewVideo.width,
          height: formData.previewVideo.height,
          uploadedAt: formData.previewVideo.uploadedAt || new Date().toISOString(),
          fileName: formData.previewVideo.fileName || 'preview-video.mp4'
        } : null,
        modules: formData.modules.map(module => ({
          _id: module._id || undefined,
          title: module.title,
          description: module.description || undefined,
          thumbnailUrl: module.thumbnailUrl,
          order: module.order,
          chapters: module.chapters.map(chapter => ({
            _id: chapter._id || undefined,
            title: chapter.title,
            description: chapter.description || undefined,
            order: chapter.order,
            // In the submitData preparation, update lessons transformation:
            lessons: chapter.lessons.map(lesson => ({
              _id: lesson._id || undefined,
              title: lesson.title,
              description: lesson.description || undefined,
              content: lesson.content || undefined,
              videoSource: lesson.video ? {
                type: lesson.videoSource?.type || 'uploaded',
                videoLibraryId: lesson.videoSource?.videoLibraryId,
                video: {
                  key: lesson.video.key,
                  url: lesson.video.url,
                  size: lesson.video.size,
                  type: 'video' as const,
                  duration: lesson.video.duration || lesson.duration || 0,
                  width: lesson.video.width,
                  height: lesson.video.height,
                  uploadedAt: lesson.video.uploadedAt || new Date().toISOString(),
                  fileName: lesson.video.fileName || lesson.title
                },
                uploadedAt: lesson.videoSource?.uploadedAt || new Date().toISOString(),
                uploadedBy: lesson.videoSource?.uploadedBy
              } : lesson.videoSource || undefined, // FIX: Return undefined if no video
              duration: calculateLessonDuration(lesson),
              isPreview: lesson.isPreview,
              resources: (lesson.resources || []).map(resource => ({
                _id: resource._id || undefined,
                title: resource.title,
                url: resource.url,
                type: resource.type
              })),
              order: lesson.order,
              subLessons: (lesson.subLessons || []).map(subLesson => ({
                _id: subLesson._id || undefined,
                title: subLesson.title,
                description: subLesson.description,
                content: subLesson.content,
                videoSource: subLesson.video ? {
                  type: subLesson.videoSource?.type || 'uploaded',
                  videoLibraryId: subLesson.videoSource?.videoLibraryId,
                  video: {
                    key: subLesson.video.key,
                    url: subLesson.video.url,
                    size: subLesson.video.size,
                    type: 'video' as const,
                    duration: subLesson.video.duration || subLesson.duration || 0,
                    width: subLesson.video.width,
                    height: subLesson.video.height,
                    uploadedAt: subLesson.video.uploadedAt || new Date().toISOString(),
                    fileName: subLesson.video.fileName || subLesson.title
                  },
                  uploadedAt: subLesson.videoSource?.uploadedAt || new Date().toISOString(),
                  uploadedBy: subLesson.videoSource?.uploadedBy
                } : subLesson.videoSource || undefined, // FIX: Return undefined if no video
                duration: subLesson.duration,
                isPreview: subLesson.isPreview,
                resources: (subLesson.resources || []).map(resource => ({
                  _id: resource._id || undefined,
                  title: resource.title,
                  url: resource.url,
                  type: resource.type
                })),
                order: subLesson.order
              }))
            }))
          }))
        }))
      };

      console.log('📤 Updating course with data:', {
        title: submitData.title,
        modulesCount: submitData.modules.length,
        firstLessonVideoSource: submitData.modules[0]?.chapters[0]?.lessons[0]?.videoSource
      })

      const response = await fetch(`/api/admin/courses/${params.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(submitData),
      })

      if (response.ok) {
        const updatedCourse = await response.json()
        toast({
          title: 'Success',
          description: 'Course updated successfully!',
          variant: 'default'
        })
        router.push('/admin/courses')
        router.refresh()
      } else {
        const error = await response.json()
        console.error('API Error:', error)
        toast({
          title: 'Error',
          description: error.error || error.details || 'Failed to update course',
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
  }, [uploadProgress, networkStatus, formData, params.id, router, toast, calculateLessonDuration])

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

  const viewCourse = () => {
    if (course) {
      router.push(`/courses/${course.slug}`)
    }
  }

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

  if (loading) {
    return <LoadingSkeleton />
  }

  if (!course) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-white dark:from-slate-900 dark:to-slate-950 flex items-center justify-center">
        <div className="text-center max-w-md px-6">
          <div className="p-4 rounded-2xl bg-gradient-to-r from-rose-100 to-pink-100 dark:from-rose-900/30 dark:to-pink-900/30 w-20 h-20 mx-auto mb-6 flex items-center justify-center">
            <AlertCircle className="w-10 h-10 text-rose-600 dark:text-rose-400" />
          </div>
          <h2 className="text-2xl font-bold bg-gradient-to-r from-rose-600 to-pink-600 bg-clip-text text-transparent mb-3">Course Not Found</h2>
          <p className="text-slate-600 dark:text-slate-400 mb-8">
            The course you're trying to edit doesn't exist or you don't have permission to access it.
          </p>
          <Button 
            onClick={() => router.push('/admin/courses')} 
            className="w-full h-12 text-base font-semibold rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-700 hover:to-teal-600 text-white"
          >
            Back to Courses
          </Button>
        </div>
      </div>
    )
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
            <div className="flex items-center justify-between">
              <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-emerald-600 via-teal-500 to-cyan-600 bg-clip-text text-transparent">
                Edit Course
              </h1>
              <Badge variant={formData.isPublished ? "success" : "secondary"} className="rounded-full">
                {formData.isPublished ? 'Published' : 'Draft'}
              </Badge>
            </div>
            <p className="text-slate-600 dark:text-slate-400">
              Update course details and content with 10GB video support
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
                      Files are uploading to AWS S3. You can continue editing while uploads are in progress.
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
                  deviceType={uploadProgress[activeUploads[0]]?.deviceType}
                  networkType={uploadProgress[activeUploads[0]]?.networkType}
                  memoryStatus={uploadProgress[activeUploads[0]]?.memoryStatus}
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
                          value={formData.category || ''}
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
                      onPauseUpload={pauseUpload}
                      onResumeUpload={resumeUpload}
                    />

                    <FileUploadArea
                      type="previewVideo"
                      label="Preview Video (Optional)"
                      acceptedFiles="video/mp4,video/webm,video/ogg,video/quicktime,video/mov"
                      maxSize="10GB"
                      currentFile={formData.previewVideo}
                      onFileChange={handlePreviewVideoChange}
                      onSelectFromLibrary={(video) => handleVideoLibrarySelect(video, { type: 'previewVideo' })}
                      uploadProgress={uploadProgress}
                      onCancelUpload={cancelUpload}
                      onRetryUpload={handleRetryUpload}
                      onPauseUpload={pauseUpload}
                      onResumeUpload={resumeUpload}
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
                                  value={module.description || ''}
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
                                onPauseUpload={pauseUpload}
                                onResumeUpload={resumeUpload}
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
                                              value={chapter.description || ''}
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
                                                    <p className="text-xs text-slate-500">
                                                      {lesson.subLessons.length} sub-lessons
                                                    </p>
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
                                                    value={lesson.description || ''}
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

                                                {/* Sub-lessons */}
                                                <div className="space-y-3">
                                                  <div className="flex items-center justify-between">
                                                    <h6 className="font-medium text-slate-900 dark:text-white">Sub-lessons</h6>
                                                    <Button 
                                                      type="button" 
                                                      onClick={() => addSubLesson(moduleIndex, chapterIndex, lessonIndex)} 
                                                      variant="outline"
                                                      size="sm"
                                                      className="h-8 rounded-lg"
                                                    >
                                                      <Plus className="w-3.5 h-3.5 mr-1" />
                                                      Add Sub-lesson
                                                    </Button>
                                                  </div>
                                                  
                                                  {lesson.subLessons.map((subLesson, subLessonIndex) => (
                                                    <Accordion key={subLessonIndex} type="single" collapsible className="border border-slate-200/50 dark:border-slate-700/50 rounded-lg">
                                                      <AccordionItem value={`sublesson-${moduleIndex}-${chapterIndex}-${lessonIndex}-${subLessonIndex}`} className="border-b-0">
                                                        <AccordionTrigger className="px-3 hover:no-underline">
                                                          <div className="flex items-center gap-2 flex-1 text-left">
                                                            <div className="w-6 h-6 bg-gradient-to-r from-slate-500 to-slate-600 rounded-md flex items-center justify-center text-white font-bold text-xs shadow-sm">
                                                              {subLessonIndex + 1}
                                                            </div>
                                                            <div className="flex-1 min-w-0">
                                                              <p className="font-medium text-slate-900 dark:text-white truncate text-sm">{subLesson.title || `Sub-lesson ${subLessonIndex + 1}`}</p>
                                                            </div>
                                                          </div>
                                                        </AccordionTrigger>
                                                        <AccordionContent className="px-3 pb-3">
                                                          <div className="space-y-3">
                                                            <FormGroup label="Sub-lesson Title" required icon={Feather}>
                                                              <Input
                                                                placeholder="Sub-lesson Title *"
                                                                value={subLesson.title}
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
                                                                            subLessons: les.subLessons.map((subLes, subIdx) =>
                                                                              subIdx === subLessonIndex ? {
                                                                                ...subLes,
                                                                                title: e.target.value
                                                                              } : subLes
                                                                            )
                                                                          } : les
                                                                        )
                                                                      } : chap
                                                                    )
                                                                  }
                                                                  setFormData(prev => ({ ...prev, modules: updatedModules }))
                                                                }}
                                                                className="h-9 rounded-md text-sm"
                                                                required
                                                              />
                                                            </FormGroup>

                                                            <FormGroup label="Sub-lesson Description" icon={FileText}>
                                                              <Textarea
                                                                placeholder="Sub-lesson Description (Optional)"
                                                                value={subLesson.description}
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
                                                                            subLessons: les.subLessons.map((subLes, subIdx) =>
                                                                              subIdx === subLessonIndex ? {
                                                                                ...subLes,
                                                                                description: e.target.value
                                                                              } : subLes
                                                                            )
                                                                          } : les
                                                                        )
                                                                      } : chap
                                                                    )
                                                                  }
                                                                  setFormData(prev => ({ ...prev, modules: updatedModules }))
                                                                }}
                                                                className="min-h-[60px] rounded-md text-sm"
                                                              />
                                                            </FormGroup>

                                                            {/* Video Upload for Sub-lesson */}
                                                            <FileUploadArea
                                                              type="lessonVideo"
                                                              label="Sub-lesson Video * (10GB supported)"
                                                              acceptedFiles="video/mp4,video/webm,video/ogg,video/quicktime,video/mov"
                                                              maxSize="10GB"
                                                              currentFile={subLesson.video || null}
                                                              onFileChange={(e) => handleSubLessonVideoChange(e, moduleIndex, chapterIndex, lessonIndex, subLessonIndex)}
                                                              onSelectFromLibrary={(video) => handleVideoLibrarySelect(video, { 
                                                                type: 'lessonVideo',
                                                                moduleIndex,
                                                                chapterIndex,
                                                                lessonIndex,
                                                                subLessonIndex
                                                              })}
                                                              moduleIndex={moduleIndex}
                                                              chapterIndex={chapterIndex}
                                                              lessonIndex={lessonIndex}
                                                              // FIX: Remove subLessonIndex prop
                                                              uploadProgress={uploadProgress}
                                                              onCancelUpload={cancelUpload}
                                                              onRetryUpload={handleRetryUpload}
                                                              onPauseUpload={pauseUpload}
                                                              onResumeUpload={resumeUpload}
                                                            />

                                                            <FormGroup label="Duration (minutes)" icon={Clock}>
                                                              <Input
                                                                type="number"
                                                                placeholder="e.g., 15"
                                                                value={subLesson.duration}
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
                                                                            subLessons: les.subLessons.map((subLes, subIdx) =>
                                                                              subIdx === subLessonIndex ? {
                                                                                ...subLes,
                                                                                duration: parseInt(e.target.value) || 0
                                                                              } : subLes
                                                                            )
                                                                          } : les
                                                                        )
                                                                      } : chap
                                                                    )
                                                                  }
                                                                  setFormData(prev => ({ ...prev, modules: updatedModules }))
                                                                }}
                                                                className="h-9 rounded-md text-sm"
                                                                min="0"
                                                              />
                                                            </FormGroup>

                                                            <FormGroup label="Sub-lesson Content" icon={BookOpen}>
                                                              <Textarea
                                                                placeholder="Detailed content for this sub-lesson... (Optional)"
                                                                value={subLesson.content}
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
                                                                            subLessons: les.subLessons.map((subLes, subIdx) =>
                                                                              subIdx === subLessonIndex ? {
                                                                                ...subLes,
                                                                                content: e.target.value
                                                                              } : subLes
                                                                            )
                                                                          } : les
                                                                        )
                                                                      } : chap
                                                                    )
                                                                  }
                                                                  setFormData(prev => ({ ...prev, modules: updatedModules }))
                                                                }}
                                                                className="min-h-[80px] rounded-md text-sm"
                                                              />
                                                            </FormGroup>

                                                            <div className="flex items-center gap-3 p-2 bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 rounded-md">
                                                              <input
                                                                type="checkbox"
                                                                checked={subLesson.isPreview}
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
                                                                            subLessons: les.subLessons.map((subLes, subIdx) =>
                                                                              subIdx === subLessonIndex ? {
                                                                                ...subLes,
                                                                                isPreview: e.target.checked
                                                                              } : subLes
                                                                            )
                                                                          } : les
                                                                        )
                                                                      } : chap
                                                                    )
                                                                  }
                                                                  setFormData(prev => ({ ...prev, modules: updatedModules }))
                                                                }}
                                                                className="w-4 h-4 rounded border-slate-300 dark:border-slate-600 text-emerald-600 focus:ring-emerald-500"
                                                              />
                                                              <label className="text-xs font-semibold text-slate-900 dark:text-white">Preview Sub-lesson</label>
                                                              <span className="text-xs text-slate-500">(Free for all students)</span>
                                                            </div>

                                                            {/* Sub-lesson Resources */}
                                                            <div className="space-y-2">
                                                              <div className="flex items-center justify-between">
                                                                <h6 className="text-xs font-medium text-slate-900 dark:text-white">Resources</h6>
                                                                <Button 
                                                                  type="button" 
                                                                  onClick={() => addSubLessonResource(moduleIndex, chapterIndex, lessonIndex, subLessonIndex)} 
                                                                  variant="outline"
                                                                  size="sm"
                                                                  className="h-7 rounded-md text-xs"
                                                                >
                                                                  <Plus className="w-3 h-3 mr-1" />
                                                                  Add Resource
                                                                </Button>
                                                              </div>
                                                              
                                                              {subLesson.resources.map((resource, resourceIndex) => (
                                                                <div key={resourceIndex} className="grid grid-cols-12 gap-1 p-1.5 bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-800/50 dark:to-slate-900/50 rounded-md">
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
                                                                                subLessons: les.subLessons.map((subLes, subIdx) =>
                                                                                  subIdx === subLessonIndex ? {
                                                                                    ...subLes,
                                                                                    resources: subLes.resources.map((res, resIdx) =>
                                                                                      resIdx === resourceIndex ? {
                                                                                        ...res,
                                                                                        title: e.target.value
                                                                                      } : res
                                                                                    )
                                                                                  } : subLes
                                                                                )
                                                                              } : les
                                                                            )
                                                                          } : chap
                                                                        )
                                                                      }
                                                                      setFormData(prev => ({ ...prev, modules: updatedModules }))
                                                                    }}
                                                                    className="col-span-5 rounded h-7 text-xs"
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
                                                                                subLessons: les.subLessons.map((subLes, subIdx) =>
                                                                                  subIdx === subLessonIndex ? {
                                                                                    ...subLes,
                                                                                    resources: subLes.resources.map((res, resIdx) =>
                                                                                      resIdx === resourceIndex ? {
                                                                                        ...res,
                                                                                        url: e.target.value
                                                                                      } : res
                                                                                    )
                                                                                  } : subLes
                                                                                )
                                                                              } : les
                                                                            )
                                                                          } : chap
                                                                        )
                                                                      }
                                                                      setFormData(prev => ({ ...prev, modules: updatedModules }))
                                                                    }}
                                                                    className="col-span-5 rounded h-7 text-xs"
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
                                                                                subLessons: les.subLessons.map((subLes, subIdx) =>
                                                                                  subIdx === subLessonIndex ? {
                                                                                    ...subLes,
                                                                                    resources: subLes.resources.map((res, resIdx) =>
                                                                                      resIdx === resourceIndex ? {
                                                                                        ...res,
                                                                                        type: e.target.value as any
                                                                                      } : res
                                                                                    )
                                                                                  } : subLes
                                                                                )
                                                                              } : les
                                                                            )
                                                                          } : chap
                                                                        )
                                                                      }
                                                                      setFormData(prev => ({ ...prev, modules: updatedModules }))
                                                                    }}
                                                                    className="col-span-1 rounded h-7 text-xs border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
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
                                                                    onClick={() => removeSubLessonResource(moduleIndex, chapterIndex, lessonIndex, subLessonIndex, resourceIndex)}
                                                                    className="col-span-1 h-7 w-7 rounded text-rose-500 hover:text-rose-600 text-xs"
                                                                  >
                                                                    <X className="w-3 h-3" />
                                                                  </Button>
                                                                </div>
                                                              ))}
                                                            </div>

                                                            <div className="flex justify-end pt-2">
                                                              <Button 
                                                                type="button" 
                                                                variant="destructive" 
                                                                size="sm"
                                                                onClick={() => removeSubLesson(moduleIndex, chapterIndex, lessonIndex, subLessonIndex)}
                                                                className="h-7 rounded-md text-xs"
                                                              >
                                                                <X className="w-3 h-3 mr-1" />
                                                                Remove Sub-lesson
                                                              </Button>
                                                            </div>
                                                          </div>
                                                        </AccordionContent>
                                                      </AccordionItem>
                                                    </Accordion>
                                                  ))}
                                                </div>

                                                {/* Lesson Video (always show, even with sub-lessons) */}
                                                <div className="mt-4">
                                                  <FileUploadArea
                                                    type="lessonVideo"
                                                    label="Lesson Video * (10GB supported)"
                                                    acceptedFiles="video/mp4,video/webm,video/ogg,video/quicktime,video/mov"
                                                    maxSize="10GB"
                                                    currentFile={lesson.video || null}
                                                    onFileChange={(e) => handleLessonVideoChange(e, moduleIndex, chapterIndex, lessonIndex)}
                                                    onSelectFromLibrary={(video) => handleVideoLibrarySelect(video, { 
                                                      type: 'lessonVideo',
                                                      moduleIndex,
                                                      chapterIndex,
                                                      lessonIndex
                                                    })}
                                                    moduleIndex={moduleIndex}
                                                    chapterIndex={chapterIndex}
                                                    lessonIndex={lessonIndex}
                                                    uploadProgress={uploadProgress}
                                                    onCancelUpload={cancelUpload}
                                                    onRetryUpload={handleRetryUpload}
                                                    onPauseUpload={pauseUpload}
                                                    onResumeUpload={resumeUpload}
                                                  />
                                                  

                                                  <div className="mt-2 text-sm text-slate-500">
                                                    {lesson.subLessons.length > 0 ? (
                                                      <div className="space-y-1">
                                                        <p>✓ This lesson has {lesson.subLessons.length} sub-lesson(s) with their own videos</p>
                                                        <p className="text-xs">Optional: You can also upload a lesson overview video</p>
                                                      </div>
                                                    ) : (
                                                      <p>✓ This is a standalone lesson video (required)</p>
                                                    )}
                                                  </div>
                                                </div>

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
                                                          } : chapter
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
                                                    value={lesson.content || ''}
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

                                                {/* Lesson Resources - SAFE VERSION */}
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
                                                  
                                                  {/* Safe mapping with fallback to empty array */}
                                                  {((lesson.resources || []) as Resource[]).map((resource, resourceIndex) => (
                                                    <div key={resourceIndex} className="grid grid-cols-12 gap-2 p-2 bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-800/50 dark:to-slate-900/50 rounded-lg">
                                                      <Input
                                                        placeholder="Title"
                                                        value={resource.title || ''}
                                                        onChange={(e) => {
                                                          const updatedModules = [...formData.modules];
                                                          updatedModules[moduleIndex] = {
                                                            ...updatedModules[moduleIndex],
                                                            chapters: updatedModules[moduleIndex].chapters.map((chap, chapIdx) =>
                                                              chapIdx === chapterIndex ? {
                                                                ...chap,
                                                                lessons: chap.lessons.map((les, lesIdx) =>
                                                                  lesIdx === lessonIndex ? {
                                                                    ...les,
                                                                    resources: (les.resources || []).map((res, resIdx) =>
                                                                      resIdx === resourceIndex ? {
                                                                        ...res,
                                                                        title: e.target.value
                                                                      } : res
                                                                    )
                                                                  } : les
                                                                )
                                                              } : chap
                                                            )
                                                          };
                                                          setFormData(prev => ({ ...prev, modules: updatedModules }));
                                                        }}
                                                        className="col-span-5 rounded-md h-9 text-sm"
                                                      />
                                                      <Input
                                                        placeholder="URL"
                                                        value={resource.url || ''}
                                                        onChange={(e) => {
                                                          const updatedModules = [...formData.modules];
                                                          updatedModules[moduleIndex] = {
                                                            ...updatedModules[moduleIndex],
                                                            chapters: updatedModules[moduleIndex].chapters.map((chap, chapIdx) =>
                                                              chapIdx === chapterIndex ? {
                                                                ...chap,
                                                                lessons: chap.lessons.map((les, lesIdx) =>
                                                                  lesIdx === lessonIndex ? {
                                                                    ...les,
                                                                    resources: (les.resources || []).map((res, resIdx) =>
                                                                      resIdx === resourceIndex ? {
                                                                        ...res,
                                                                        url: e.target.value
                                                                      } : res
                                                                    )
                                                                  } : les
                                                                )
                                                              } : chap
                                                            )
                                                          };
                                                          setFormData(prev => ({ ...prev, modules: updatedModules }));
                                                        }}
                                                        className="col-span-5 rounded-md h-9 text-sm"
                                                      />
                                                      <select
                                                        value={resource.type || 'pdf'}
                                                        onChange={(e) => {
                                                          const updatedModules = [...formData.modules];
                                                          updatedModules[moduleIndex] = {
                                                            ...updatedModules[moduleIndex],
                                                            chapters: updatedModules[moduleIndex].chapters.map((chap, chapIdx) =>
                                                              chapIdx === chapterIndex ? {
                                                                ...chap,
                                                                lessons: chap.lessons.map((les, lesIdx) =>
                                                                  lesIdx === lessonIndex ? {
                                                                    ...les,
                                                                    resources: (les.resources || []).map((res, resIdx) =>
                                                                      resIdx === resourceIndex ? {
                                                                        ...res,
                                                                        type: e.target.value as any
                                                                      } : res
                                                                    )
                                                                  } : les
                                                                )
                                                              } : chap
                                                            )
                                                          };
                                                          setFormData(prev => ({ ...prev, modules: updatedModules }));
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
                        <p className="text-xs text-slate-600 dark:text-slate-400">Sub-lessons</p>
                        <p className="text-base font-bold bg-gradient-to-r from-emerald-600 to-green-600 bg-clip-text text-transparent">
                          {totalSubLessons}
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
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-slate-600 dark:text-slate-400">Status</span>
                        <Badge variant={formData.isPublished ? "success" : "secondary"} className="rounded-full">
                          {formData.isPublished ? 'Published' : 'Draft'}
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </FormCard>

                {/* Course Stats */}
                <FormCard>
                  <CardHeader>
                    <SectionHeader 
                      title="Course Stats" 
                      description="Current course statistics"
                      icon={TrendingUp}
                      color="from-rose-500 to-pink-500"
                    />
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-slate-600 dark:text-slate-400">Students</span>
                      <span className="font-semibold flex items-center gap-2">
                        <Users className="w-4 h-4 text-slate-400" />
                        {course.totalStudents || 0}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-slate-600 dark:text-slate-400">Rating</span>
                      <span className="font-semibold flex items-center gap-2">
                        <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                        {course.averageRating?.toFixed(1) || '0.0'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-slate-600 dark:text-slate-400">Created</span>
                      <span className="font-semibold text-xs">
                        {course.createdAt ? new Date(course.createdAt).toLocaleDateString() : 'N/A'}
                      </span>
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
                        value={formData.category || ''}
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

              {/* Course Media - Updated with Video Library */}
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
                      onPauseUpload={pauseUpload}
                      onResumeUpload={resumeUpload}
                    />

                    <FileUploadArea
                      type="previewVideo"
                      label="Preview Video (Optional)"
                      acceptedFiles="video/mp4,video/webm,video/ogg,video/quicktime,video/mov"
                      maxSize="10GB"
                      currentFile={formData.previewVideo}
                      onFileChange={handlePreviewVideoChange}
                      onSelectFromLibrary={(video) => handleVideoLibrarySelect(video, { type: 'previewVideo' })}
                      uploadProgress={uploadProgress}
                      onCancelUpload={cancelUpload}
                      onRetryUpload={handleRetryUpload}
                      onPauseUpload={pauseUpload}
                      onResumeUpload={resumeUpload}
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
                                value={module.description || ''}
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
                              onPauseUpload={pauseUpload}
                              onResumeUpload={resumeUpload}
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
                                            value={chapter.description || ''}
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
                                                  <p className="text-xs text-slate-500">
                                                    {lesson.subLessons.length} sub-lessons
                                                  </p>
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
                                                  value={lesson.description || ''}
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

                                              {/* Sub-lessons */}
                                              <div className="space-y-3">
                                                <div className="flex items-center justify-between">
                                                  <h6 className="font-medium text-slate-900 dark:text-white">Sub-lessons</h6>
                                                  <Button 
                                                    type="button" 
                                                    onClick={() => addSubLesson(moduleIndex, chapterIndex, lessonIndex)} 
                                                    variant="outline"
                                                    size="sm"
                                                    className="h-8 rounded-lg"
                                                  >
                                                    <Plus className="w-3.5 h-3.5 mr-1" />
                                                    Add Sub-lesson
                                                  </Button>
                                                </div>
                                                
                                                {lesson.subLessons.map((subLesson, subLessonIndex) => (
                                                  <Accordion key={subLessonIndex} type="single" collapsible className="border border-slate-200/50 dark:border-slate-700/50 rounded-lg">
                                                    <AccordionItem value={`sublesson-${moduleIndex}-${chapterIndex}-${lessonIndex}-${subLessonIndex}`} className="border-b-0">
                                                      <AccordionTrigger className="px-3 hover:no-underline">
                                                        <div className="flex items-center gap-2 flex-1 text-left">
                                                          <div className="w-6 h-6 bg-gradient-to-r from-slate-500 to-slate-600 rounded-md flex items-center justify-center text-white font-bold text-xs shadow-sm">
                                                            {subLessonIndex + 1}
                                                          </div>
                                                          <div className="flex-1 min-w-0">
                                                            <p className="font-medium text-slate-900 dark:text-white truncate text-sm">{subLesson.title || `Sub-lesson ${subLessonIndex + 1}`}</p>
                                                          </div>
                                                        </div>
                                                      </AccordionTrigger>
                                                      <AccordionContent className="px-3 pb-3">
                                                        <div className="space-y-3">
                                                          <FormGroup label="Sub-lesson Title" required icon={Feather}>
                                                            <Input
                                                              placeholder="Sub-lesson Title *"
                                                              value={subLesson.title}
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
                                                                          subLessons: les.subLessons.map((subLes, subIdx) =>
                                                                            subIdx === subLessonIndex ? {
                                                                              ...subLes,
                                                                              title: e.target.value
                                                                            } : subLes
                                                                          )
                                                                        } : les
                                                                      )
                                                                    } : chap
                                                                  )
                                                                }
                                                                setFormData(prev => ({ ...prev, modules: updatedModules }))
                                                              }}
                                                              className="h-9 rounded-md text-sm"
                                                              required
                                                            />
                                                          </FormGroup>

                                                          <FormGroup label="Sub-lesson Description" icon={FileText}>
                                                            <Textarea
                                                              placeholder="Sub-lesson Description (Optional)"
                                                              value={subLesson.description}
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
                                                                          subLessons: les.subLessons.map((subLes, subIdx) =>
                                                                            subIdx === subLessonIndex ? {
                                                                              ...subLes,
                                                                              description: e.target.value
                                                                            } : subLes
                                                                          )
                                                                        } : les
                                                                      )
                                                                    } : chap
                                                                  )
                                                                }
                                                                setFormData(prev => ({ ...prev, modules: updatedModules }))
                                                              }}
                                                              className="min-h-[60px] rounded-md text-sm"
                                                            />
                                                          </FormGroup>

                                                          {/* Video Upload for Sub-lesson */}
                                                          <FileUploadArea
                                                            type="lessonVideo"
                                                            label="Sub-lesson Video * (10GB supported)"
                                                            acceptedFiles="video/mp4,video/webm,video/ogg,video/quicktime,video/mov"
                                                            maxSize="10GB"
                                                            currentFile={subLesson.video || null}
                                                            onFileChange={(e) => handleSubLessonVideoChange(e, moduleIndex, chapterIndex, lessonIndex, subLessonIndex)}
                                                            onSelectFromLibrary={(video) => handleVideoLibrarySelect(video, { 
                                                              type: 'lessonVideo',
                                                              moduleIndex,
                                                              chapterIndex,
                                                              lessonIndex,
                                                              subLessonIndex
                                                            })}
                                                            moduleIndex={moduleIndex}
                                                            chapterIndex={chapterIndex}
                                                            lessonIndex={lessonIndex}
                                                            // FIX: Remove subLessonIndex prop
                                                            uploadProgress={uploadProgress}
                                                            onCancelUpload={cancelUpload}
                                                            onRetryUpload={handleRetryUpload}
                                                            onPauseUpload={pauseUpload}
                                                            onResumeUpload={resumeUpload}
                                                          />

                                                          <FormGroup label="Duration (minutes)" icon={Clock}>
                                                            <Input
                                                              type="number"
                                                              placeholder="e.g., 15"
                                                              value={subLesson.duration}
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
                                                                          subLessons: les.subLessons.map((subLes, subIdx) =>
                                                                            subIdx === subLessonIndex ? {
                                                                              ...subLes,
                                                                              duration: parseInt(e.target.value) || 0
                                                                            } : subLes
                                                                          )
                                                                        } : les
                                                                      )
                                                                    } : chap
                                                                  )
                                                                }
                                                                setFormData(prev => ({ ...prev, modules: updatedModules }))
                                                              }}
                                                              className="h-9 rounded-md text-sm"
                                                              min="0"
                                                            />
                                                          </FormGroup>

                                                          <FormGroup label="Sub-lesson Content" icon={BookOpen}>
                                                            <Textarea
                                                              placeholder="Detailed content for this sub-lesson... (Optional)"
                                                              value={subLesson.content}
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
                                                                          subLessons: les.subLessons.map((subLes, subIdx) =>
                                                                            subIdx === subLessonIndex ? {
                                                                              ...subLes,
                                                                              content: e.target.value
                                                                            } : subLes
                                                                          )
                                                                        } : les
                                                                      )
                                                                    } : chap
                                                                  )
                                                                }
                                                                setFormData(prev => ({ ...prev, modules: updatedModules }))
                                                              }}
                                                              className="min-h-[80px] rounded-md text-sm"
                                                            />
                                                          </FormGroup>

                                                          <div className="flex items-center gap-3 p-2 bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 rounded-md">
                                                            <input
                                                              type="checkbox"
                                                              checked={subLesson.isPreview}
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
                                                                          subLessons: les.subLessons.map((subLes, subIdx) =>
                                                                            subIdx === subLessonIndex ? {
                                                                              ...subLes,
                                                                              isPreview: e.target.checked
                                                                            } : subLes
                                                                          )
                                                                        } : les
                                                                      )
                                                                    } : chap
                                                                  )
                                                                }
                                                                setFormData(prev => ({ ...prev, modules: updatedModules }))
                                                              }}
                                                              className="w-4 h-4 rounded border-slate-300 dark:border-slate-600 text-emerald-600 focus:ring-emerald-500"
                                                            />
                                                            <label className="text-xs font-semibold text-slate-900 dark:text-white">Preview Sub-lesson</label>
                                                            <span className="text-xs text-slate-500">(Free for all students)</span>
                                                          </div>

                                                          {/* Sub-lesson Resources - SAFE VERSION */}
                                                          <div className="space-y-2">
                                                            <div className="flex items-center justify-between">
                                                              <h6 className="text-xs font-medium text-slate-900 dark:text-white">Resources</h6>
                                                              <Button 
                                                                type="button" 
                                                                onClick={() => addSubLessonResource(moduleIndex, chapterIndex, lessonIndex, subLessonIndex)} 
                                                                variant="outline"
                                                                size="sm"
                                                                className="h-7 rounded-md text-xs"
                                                              >
                                                                <Plus className="w-3 h-3 mr-1" />
                                                                Add Resource
                                                              </Button>
                                                            </div>
                                                            
                                                            {((subLesson.resources || []) as Resource[]).map((resource, resourceIndex) => (
                                                              <div key={resourceIndex} className="grid grid-cols-12 gap-1 p-1.5 bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-800/50 dark:to-slate-900/50 rounded-md">
                                                                <Input
                                                                  placeholder="Title"
                                                                  value={resource.title || ''}
                                                                  onChange={(e) => {
                                                                    const updatedModules = [...formData.modules];
                                                                    updatedModules[moduleIndex] = {
                                                                      ...updatedModules[moduleIndex],
                                                                      chapters: updatedModules[moduleIndex].chapters.map((chap, chapIdx) =>
                                                                        chapIdx === chapterIndex ? {
                                                                          ...chap,
                                                                          lessons: chap.lessons.map((les, lesIdx) =>
                                                                            lesIdx === lessonIndex ? {
                                                                              ...les,
                                                                              subLessons: les.subLessons.map((subLes, subIdx) =>
                                                                                subIdx === subLessonIndex ? {
                                                                                  ...subLes,
                                                                                  resources: (subLes.resources || []).map((res, resIdx) =>
                                                                                    resIdx === resourceIndex ? {
                                                                                      ...res,
                                                                                      title: e.target.value
                                                                                    } : res
                                                                                  )
                                                                                } : subLes
                                                                              )
                                                                            } : les
                                                                          )
                                                                        } : chap
                                                                      )
                                                                    };
                                                                    setFormData(prev => ({ ...prev, modules: updatedModules }));
                                                                  }}
                                                                  className="col-span-5 rounded h-7 text-xs"
                                                                />
                                                                <Input
                                                                  placeholder="URL"
                                                                  value={resource.url || ''}
                                                                  onChange={(e) => {
                                                                    const updatedModules = [...formData.modules];
                                                                    updatedModules[moduleIndex] = {
                                                                      ...updatedModules[moduleIndex],
                                                                      chapters: updatedModules[moduleIndex].chapters.map((chap, chapIdx) =>
                                                                        chapIdx === chapterIndex ? {
                                                                          ...chap,
                                                                          lessons: chap.lessons.map((les, lesIdx) =>
                                                                            lesIdx === lessonIndex ? {
                                                                              ...les,
                                                                              subLessons: les.subLessons.map((subLes, subIdx) =>
                                                                                subIdx === subLessonIndex ? {
                                                                                  ...subLes,
                                                                                  resources: (subLes.resources || []).map((res, resIdx) =>
                                                                                    resIdx === resourceIndex ? {
                                                                                      ...res,
                                                                                      url: e.target.value
                                                                                    } : res
                                                                                  )
                                                                                } : subLes
                                                                              )
                                                                            } : les
                                                                          )
                                                                        } : chap
                                                                      )
                                                                    };
                                                                    setFormData(prev => ({ ...prev, modules: updatedModules }));
                                                                  }}
                                                                  className="col-span-5 rounded h-7 text-xs"
                                                                />
                                                                <select
                                                                  value={resource.type || 'pdf'}
                                                                  onChange={(e) => {
                                                                    const updatedModules = [...formData.modules];
                                                                    updatedModules[moduleIndex] = {
                                                                      ...updatedModules[moduleIndex],
                                                                      chapters: updatedModules[moduleIndex].chapters.map((chap, chapIdx) =>
                                                                        chapIdx === chapterIndex ? {
                                                                          ...chap,
                                                                          lessons: chap.lessons.map((les, lesIdx) =>
                                                                            lesIdx === lessonIndex ? {
                                                                              ...les,
                                                                              subLessons: les.subLessons.map((subLes, subIdx) =>
                                                                                subIdx === subLessonIndex ? {
                                                                                  ...subLes,
                                                                                  resources: (subLes.resources || []).map((res, resIdx) =>
                                                                                    resIdx === resourceIndex ? {
                                                                                      ...res,
                                                                                      type: e.target.value as any
                                                                                    } : res
                                                                                  )
                                                                                } : subLes
                                                                              )
                                                                            } : les
                                                                          )
                                                                        } : chap
                                                                      )
                                                                    };
                                                                    setFormData(prev => ({ ...prev, modules: updatedModules }));
                                                                  }}
                                                                  className="col-span-1 rounded h-7 text-xs border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
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
                                                                  onClick={() => removeSubLessonResource(moduleIndex, chapterIndex, lessonIndex, subLessonIndex, resourceIndex)}
                                                                  className="col-span-1 h-7 w-7 rounded text-rose-500 hover:text-rose-600 text-xs"
                                                                >
                                                                  <X className="w-3 h-3" />
                                                                </Button>
                                                              </div>
                                                            ))}
                                                          </div>
                                                        </div>
                                                      </AccordionContent>
                                                    </AccordionItem>
                                                  </Accordion>
                                                ))}
                                              </div>

                                              {/* Lesson Video - Always show this section */}
                                              <div className="mt-4">
                                                <FileUploadArea
                                                  type="lessonVideo"
                                                  label="Lesson Video * (10GB supported)"
                                                  acceptedFiles="video/mp4,video/webm,video/ogg,video/quicktime,video/mov"
                                                  maxSize="10GB"
                                                  currentFile={lesson.video || null}
                                                  onFileChange={(e) => handleLessonVideoChange(e, moduleIndex, chapterIndex, lessonIndex)}
                                                  onSelectFromLibrary={(video) => handleVideoLibrarySelect(video, { 
                                                    type: 'lessonVideo',
                                                    moduleIndex,
                                                    chapterIndex,
                                                    lessonIndex
                                                  })}
                                                  moduleIndex={moduleIndex}
                                                  chapterIndex={chapterIndex}
                                                  lessonIndex={lessonIndex}
                                                  uploadProgress={uploadProgress}
                                                  onCancelUpload={cancelUpload}
                                                  onRetryUpload={handleRetryUpload}
                                                  onPauseUpload={pauseUpload}
                                                  onResumeUpload={resumeUpload}
                                                />
                                                
                                                <div className="mt-2 text-sm text-slate-500">
                                                  {lesson.subLessons.length > 0 ? (
                                                    <p>✓ This lesson has {lesson.subLessons.length} sub-lesson(s)</p>
                                                  ) : (
                                                    <p>✓ This is a standalone lesson video</p>
                                                  )}
                                                </div>
                                              </div>

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
                                                  value={lesson.content || ''}
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
                                                                      type: e.target.value as any
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
                      <p className="text-xs text-slate-600 dark:text-slate-400">Sub-lessons</p>
                      <p className="text-base font-bold bg-gradient-to-r from-emerald-600 to-green-600 bg-clip-text text-transparent">
                        {totalSubLessons}
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
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-slate-600 dark:text-slate-400">Status</span>
                      <Badge variant={formData.isPublished ? "success" : "secondary"} className="rounded-full">
                        {formData.isPublished ? 'Published' : 'Draft'}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </FormCard>

              {/* Course Stats */}
              <FormCard>
                <CardHeader>
                  <SectionHeader 
                    title="Course Stats" 
                    description="Current course statistics"
                    icon={TrendingUp}
                    color="from-rose-500 to-pink-500"
                  />
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-600 dark:text-slate-400">Students</span>
                    <span className="font-semibold flex items-center gap-2">
                      <Users className="w-4 h-4 text-slate-400" />
                      {course.totalStudents || 0}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-600 dark:text-slate-400">Rating</span>
                    <span className="font-semibold flex items-center gap-2">
                      <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                      {course.averageRating?.toFixed(1) || '0.0'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-600 dark:text-slate-400">Created</span>
                    <span className="font-semibold text-xs">
                      {course.createdAt ? new Date(course.createdAt).toLocaleDateString() : 'N/A'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-600 dark:text-slate-400">Updated</span>
                    <span className="font-semibold text-xs">
                      {course.updatedAt ? new Date(course.updatedAt).toLocaleDateString() : 'N/A'}
                    </span>
                  </div>
                </CardContent>
              </FormCard>
            </div>
          </div>
        </form>

        {/* Sticky Bottom Actions */}
        <StickyActions 
          loading={saving}
          activeUploads={activeUploads}
          networkStatus={networkStatus}
          hasThumbnail={!!formData.thumbnail}
          onSubmit={handleSubmit}
          canSubmit={canSubmit}
          onDelete={deleteCourse}
          onTogglePublish={togglePublish}
          isPublished={formData.isPublished}
          onViewCourse={viewCourse}
        />
      </div>

      {/* Mobile Upload Notification */}
      <MobileUploadNotification
        show={mobileUploadNotification.show}
        message={mobileUploadNotification.message}
        type={mobileUploadNotification.type}
        onClose={() => setMobileUploadNotification(prev => ({ ...prev, show: false }))}
      />

      {/* iOS Upload Notification */}
      <IOSUploadNotification
        show={showIOSNotification}
        uploadProgress={activeIOSUpload}
        onDismiss={() => setShowIOSNotification(false)}
      />
    </div>
  )
}