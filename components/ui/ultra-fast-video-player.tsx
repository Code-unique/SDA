// components/ui/ultra-fast-video-player.tsx
'use client'

import React, { 
  useRef, 
  useState, 
  useEffect, 
  useCallback, 
  useMemo,
  memo,
  CSSProperties,
  MouseEvent
} from 'react'
import { 
  Play, 
  Pause, 
  Volume2, 
  VolumeX, 
  Loader2, 
  AlertTriangle, 
  RotateCw,
  Settings,
  SkipForward,
  SkipBack,
  Check,
  X,
  Expand,
  Minimize2,
  PictureInPicture,
  Maximize2,
  Airplay,
  ExternalLink
} from 'lucide-react'
import { Button } from './button'
import { cn } from '@/lib/utils'
import Hls from 'hls.js'

// Dynamically import flv.js only on client side
let flvjs: any = null;
if (typeof window !== 'undefined') {
  import('flv.js').then(module => {
    flvjs = module.default;
  }).catch(() => {
    console.warn('flv.js failed to load');
  });
}

// ==================== TYPES ====================
export interface VideoPlayerProps {
  src: string | string[]
  poster?: string
  className?: string
  autoplay?: boolean
  preload?: 'auto' | 'metadata' | 'none'
  loop?: boolean
  muted?: boolean
  playsInline?: boolean
  controls?: boolean
  onReady?: () => void
  onError?: (error: string) => void
  onPlay?: () => void
  onPause?: () => void
  onEnded?: () => void
  onTimeUpdate?: (time: number) => void
  onProgress?: (buffered: number) => void
  onFullscreenChange?: (isFullscreen: boolean) => void
  onVolumeChange?: (volume: number) => void
  onPlaybackRateChange?: (rate: number) => void
  onAspectRatioChange?: (ratio: number) => void
  aspectRatio?: 'auto' | number
  style?: CSSProperties
  videoKey?: string | number // Changed from 'key' to avoid React special prop
}

interface PlayerState {
  isLoading: boolean
  isPlaying: boolean
  isBuffering: boolean
  isFullscreen: boolean
  isPictureInPicture: boolean
  isMuted: boolean
  currentTime: number
  duration: number
  volume: number
  playbackRate: number
  bufferProgress: number
  error: string | null
  naturalAspectRatio: number
  videoDimensions: { width: number; height: number }
}

// Safari-specific type extensions
interface SafariVideoElement extends HTMLVideoElement {
  webkitEnterFullscreen?: () => Promise<void>;
  webkitRequestFullscreen?: () => Promise<void>;
  webkitSupportsFullscreen?: boolean;
  webkitDisplayingFullscreen?: boolean;
  webkitExitFullscreen?: () => Promise<void>;
}

interface SafariDocument extends Document {
  webkitExitFullscreen?: () => Promise<void>;
  webkitFullscreenElement?: Element | null;
  webkitFullscreenEnabled?: boolean;
}

const PLAYBACK_RATES = [0.5, 0.75, 1, 1.25, 1.5, 2] as const
const MOBILE_BREAKPOINT = 768
const DEFAULT_ASPECT_RATIO = 16 / 9
const ASPECT_RATIO_THRESHOLD = 0.1

// Progressive loading chunk size (in MB)
const CHUNK_SIZE = 2 * 1024 * 1024 // 2MB chunks
const MAX_BUFFER_SIZE = 50 * 1024 * 1024 // 50MB max buffer

const formatTime = (seconds: number): string => {
  if (isNaN(seconds) || !isFinite(seconds)) return '0:00'
  
  const hrs = Math.floor(seconds / 3600)
  const mins = Math.floor((seconds % 3600) / 60)
  const secs = Math.floor(seconds % 60)
  
  if (hrs > 0) {
    return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

// Browser detection
const isSafari = typeof window !== 'undefined' && 
  /^((?!chrome|android).)*safari/i.test(navigator.userAgent)

const isIOS = typeof window !== 'undefined' && 
  /iPad|iPhone|iPod/.test(navigator.userAgent) &&
  !(window as any).MSStream

const isIOSSafari = isIOS && isSafari

// Video format detection
const getVideoFormat = (url: string): 'mp4' | 'mov' | 'hls' | 'flv' | 'other' => {
  if (!url) return 'other'
  
  const lowerUrl = url.toLowerCase()
  
  if (lowerUrl.includes('.m3u8') || lowerUrl.includes('.m3u')) return 'hls'
  if (lowerUrl.includes('.flv')) return 'flv'
  if (lowerUrl.includes('.mov')) return 'mov'
  if (lowerUrl.includes('.mp4')) return 'mp4'
  
  return 'other'
}

// Optimized video URL for iOS
const getOptimizedSourceForIOS = (url: string): string => {
  const format = getVideoFormat(url)
  
  // iOS has specific requirements for smooth playback
  if (isIOS) {
    // For MOV files on iOS, we need to ensure proper encoding
    if (format === 'mov') {
      // iOS handles MOV natively but needs H.264 codec
      return url
    }
    
    // For MP4 on iOS, ensure it's H.264 encoded
    if (format === 'mp4') {
      return url
    }
    
    // iOS doesn't support FLV, convert to MP4 or use HLS
    if (format === 'flv') {
      console.warn('FLV format not supported on iOS. Convert to MP4 or HLS.')
      return url // Fallback, but will likely fail
    }
  }
  
  return url
}

// Progressive video loader for large files
class ProgressiveVideoLoader {
  private video: HTMLVideoElement
  private url: string
  private isDownloading: boolean = false
  private abortController: AbortController | null = null
  private startByte: number = 0
  private totalBytes: number = 0
  private buffer: ArrayBuffer[] = []
  
  constructor(video: HTMLVideoElement, url: string) {
    this.video = video
    this.url = url
  }
  
  async load() {
    try {
      // First, get file size
      await this.getFileSize()
      
      // Start progressive loading
      await this.loadChunk(0, CHUNK_SIZE)
      
      // Continue loading in background
      this.continueLoading()
      
    } catch (error) {
      console.error('Progressive loading failed:', error)
      throw error
    }
  }
  
  private async getFileSize(): Promise<void> {
    const response = await fetch(this.url, { method: 'HEAD' })
    this.totalBytes = parseInt(response.headers.get('Content-Length') || '0')
  }
  
  private async loadChunk(start: number, length: number): Promise<void> {
    if (this.isDownloading) return
    
    this.isDownloading = true
    this.abortController = new AbortController()
    
    try {
      const end = Math.min(start + length - 1, this.totalBytes - 1)
      
      const response = await fetch(this.url, {
        headers: {
          'Range': `bytes=${start}-${end}`
        },
        signal: this.abortController.signal
      })
      
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      
      const arrayBuffer = await response.arrayBuffer()
      this.buffer.push(arrayBuffer)
      
      // Update video source if first chunk
      if (start === 0) {
        const blob = new Blob([arrayBuffer], { type: 'video/mp4' })
        const blobUrl = URL.createObjectURL(blob)
        this.video.src = blobUrl
      }
      
      this.startByte = end + 1
      
    } finally {
      this.isDownloading = false
    }
  }
  
  private async continueLoading(): Promise<void> {
    while (this.startByte < this.totalBytes) {
      await this.loadChunk(this.startByte, CHUNK_SIZE)
      
      // Wait for video to play and buffer to be consumed
      if (this.video.readyState >= 3) {
        // Check if we need more buffer
        const buffered = this.video.buffered
        const currentTime = this.video.currentTime
        
        if (buffered.length > 0) {
          const bufferedEnd = buffered.end(buffered.length - 1)
          const bufferRemaining = bufferedEnd - currentTime
          
          // If buffer is running low, load next chunk
          if (bufferRemaining < 30) { // 30 seconds threshold
            await this.loadChunk(this.startByte, CHUNK_SIZE)
          }
        }
      }
      
      // Small delay to prevent overwhelming the network
      await new Promise(resolve => setTimeout(resolve, 100))
    }
  }
  
  abort() {
    if (this.abortController) {
      this.abortController.abort()
    }
    this.isDownloading = false
  }
  
  cleanup() {
    this.abort()
    this.buffer = []
    if (this.video.src.startsWith('blob:')) {
      URL.revokeObjectURL(this.video.src)
    }
  }
}

// ==================== MAIN COMPONENT ====================
const UltraFastVideoPlayer = memo(({
  src,
  poster,
  className = '',
  autoplay = false,
  preload = 'metadata',
  loop = false,
  muted = false,
  playsInline = true,
  controls = true,
  onReady,
  onError,
  onPlay,
  onPause,
  onEnded,
  onTimeUpdate,
  onProgress,
  onFullscreenChange,
  onVolumeChange,
  onPlaybackRateChange,
  onAspectRatioChange,
  aspectRatio = 'auto',
  style,
  videoKey // Changed from 'key' to avoid React special prop
}: VideoPlayerProps) => {
  // Refs
  const videoRef = useRef<HTMLVideoElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const hlsRef = useRef<Hls | null>(null)
  const flvRef = useRef<any>(null)
  const loaderRef = useRef<ProgressiveVideoLoader | null>(null)
  const playAttemptRef = useRef<number>(0)
  const isMountedRef = useRef(true)
  const controlsTimerRef = useRef<NodeJS.Timeout | null>(null)
  const lastInteractionRef = useRef<number>(Date.now())
  const resizeObserverRef = useRef<ResizeObserver | null>(null)
  const rafRef = useRef<number | null>(null)
  const smoothTimeUpdateRef = useRef<number>(0)
  const fullscreenChangeListenerRef = useRef<(() => void) | null>(null)
  const videoUrlRef = useRef<string>('')
  
  // State
  const [state, setState] = useState<PlayerState>({
    isLoading: true,
    isPlaying: false,
    isBuffering: false,
    isFullscreen: false,
    isPictureInPicture: false,
    isMuted: muted,
    currentTime: 0,
    duration: 0,
    volume: muted ? 0 : 0.7,
    playbackRate: 1,
    bufferProgress: 0,
    error: null,
    naturalAspectRatio: DEFAULT_ASPECT_RATIO,
    videoDimensions: { width: 0, height: 0 }
  })
  
  const [showControls, setShowControls] = useState(true)
  const [showSettings, setShowSettings] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [calculatedAspectRatio, setCalculatedAspectRatio] = useState<number>(
    typeof aspectRatio === 'number' ? aspectRatio : DEFAULT_ASPECT_RATIO
  )
  const [videoFormat, setVideoFormat] = useState<'mp4' | 'mov' | 'hls' | 'flv' | 'other'>('other')

  // Get the video source
  const videoSrc = useMemo(() => {
    if (Array.isArray(src)) return src[0]
    return src
  }, [src])

  // Optimize source for iOS
  const optimizedSrc = useMemo(() => {
    return getOptimizedSourceForIOS(videoSrc)
  }, [videoSrc])

  // Detect video format
  useEffect(() => {
    const format = getVideoFormat(optimizedSrc)
    setVideoFormat(format)
    videoUrlRef.current = optimizedSrc
  }, [optimizedSrc])

  // Calculate optimal aspect ratio
  const calculateOptimalAspectRatio = useCallback(() => {
    if (aspectRatio !== 'auto' && typeof aspectRatio === 'number') {
      return aspectRatio
    }
    
    const { naturalAspectRatio } = state
    const containerWidth = containerRef.current?.clientWidth || window.innerWidth
    const containerHeight = containerRef.current?.clientHeight || window.innerHeight
    const containerRatio = containerWidth / containerHeight
    
    // For portrait videos (9:16), use container's full height
    if (naturalAspectRatio < 1) {
      // Portrait video
      if (containerRatio > 1) {
        // Landscape container
        return Math.min(naturalAspectRatio, containerRatio)
      } else {
        // Portrait container
        return naturalAspectRatio
      }
    } else {
      // Landscape video
      if (containerRatio < 1) {
        // Portrait container
        return Math.max(naturalAspectRatio, containerRatio)
      } else {
        // Landscape container
        return naturalAspectRatio
      }
    }
  }, [aspectRatio, state.naturalAspectRatio])

  // Initialize HLS if needed
  const initHLS = useCallback(() => {
    if (!videoRef.current || !Hls.isSupported() || videoFormat !== 'hls') return
    
    // Clean up existing HLS instance
    if (hlsRef.current) {
      hlsRef.current.destroy()
      hlsRef.current = null
    }
    
    const hls = new Hls({
  enableWorker: true,
  lowLatencyMode: true,
  backBufferLength: 90,
  maxBufferLength: 30,
  maxMaxBufferLength: 60,
  maxBufferSize: 60 * 1000 * 1000,
  maxLoadingDelay: 4,
  manifestLoadingTimeOut: 10000,
  manifestLoadingMaxRetry: 4,
  manifestLoadingRetryDelay: 1000,
  levelLoadingTimeOut: 10000,
  levelLoadingMaxRetry: 4,
  levelLoadingRetryDelay: 1000,
  fragLoadingTimeOut: 20000,
  fragLoadingMaxRetry: 6,
  fragLoadingRetryDelay: 500,
  startFragPrefetch: true,
  testBandwidth: true,
  progressive: true,
  maxBufferHole: 0.5,
  maxFragLookUpTolerance: 0.25,
  liveSyncDurationCount: 3,
  liveMaxLatencyDurationCount: 10,
  enableCEA708Captions: true,
  captionsTextTrack1Label: 'English',
  captionsTextTrack1LanguageCode: 'en',
  stretchShortVideoTrack: true,
  maxAudioFramesDrift: 1,
  autoStartLoad: true,
  startPosition: -1,
  defaultAudioCodec: 'mp4a.40.2',
  enableWebVTT: true,
  enableIMSC1: true,
  // Remove or comment out this line:
  // enableManifestMerging: false,
  audioStreamController: undefined,
  timelineController: undefined,
  audioTrackSelection: true,
  subtitleTrackSelection: true,
  seekHoleDelta: 0.5,
  seekHoleLimit: 2.0,
} as any) // Type assertion if needed
    
    hlsRef.current = hls
    
    // Error handling
    hls.on(Hls.Events.ERROR, (event, data) => {
      console.error('HLS Error:', data)
      
      if (data.fatal) {
        switch (data.type) {
          case Hls.ErrorTypes.NETWORK_ERROR:
            console.log('Network error, trying to recover...')
            hls.startLoad()
            break
          case Hls.ErrorTypes.MEDIA_ERROR:
            console.log('Media error, trying to recover...')
            hls.recoverMediaError()
            break
          default:
            console.log('Fatal HLS error, destroying...')
            hls.destroy()
            if (isMountedRef.current) {
              setState(prev => ({ 
                ...prev, 
                error: 'Video playback error. Please try again.',
                isLoading: false 
              }))
            }
            break
        }
      }
    })
    
    // Load source
    hls.loadSource(optimizedSrc)
    hls.attachMedia(videoRef.current!)
    
    return hls
  }, [optimizedSrc, videoFormat])

  // Initialize FLV if needed
  const initFLV = useCallback(() => {
    if (!videoRef.current || !flvjs || !flvjs.isSupported() || videoFormat !== 'flv') return
    
    // Clean up existing FLV instance
    if (flvRef.current) {
      flvRef.current.destroy()
      flvRef.current = null
    }
    
    const flvPlayer = flvjs.createPlayer({
      type: 'flv',
      url: optimizedSrc,
      isLive: false,
      hasAudio: true,
      hasVideo: true,
      enableStashBuffer: true,
      stashInitialSize: 384,
      enableWorker: true,
      enableCache: true,
    })
    
    flvRef.current = flvPlayer
    
    flvPlayer.attachMediaElement(videoRef.current!)
    flvPlayer.load()
    
    // Add type annotations for FLV.js error handler parameters
    flvPlayer.on(flvjs.Events.ERROR, (errorType: any, errorDetail: any) => {
      console.error('FLV Error:', errorType, errorDetail)
      if (isMountedRef.current) {
        setState(prev => ({ 
          ...prev, 
          error: 'FLV playback error. Please try again.',
          isLoading: false 
        }))
      }
    })
    
    return flvPlayer
  }, [optimizedSrc, videoFormat])

  // Smooth time update using requestAnimationFrame
  const updateSmoothTime = useCallback(() => {
    if (!isMountedRef.current || !state.isPlaying || !videoRef.current) return
    
    const video = videoRef.current
    const currentTime = video.currentTime
    
    // Smooth interpolation for better UX
    smoothTimeUpdateRef.current += (currentTime - smoothTimeUpdateRef.current) * 0.2
    
    setState(prev => ({ 
      ...prev, 
      currentTime: smoothTimeUpdateRef.current 
    }))
    onTimeUpdate?.(smoothTimeUpdateRef.current)
    
    rafRef.current = requestAnimationFrame(updateSmoothTime)
  }, [state.isPlaying, onTimeUpdate])

  // Handle play function with better error handling
  const handlePlay = useCallback(async (): Promise<void> => {
    if (!isMountedRef.current) return
    
    const video = videoRef.current
    if (!video) return
    
    // Reset play attempt counter if it gets too high
    if (playAttemptRef.current > 3) {
      playAttemptRef.current = 0
      return
    }
    
    playAttemptRef.current++
    
    try {
      // Check if video is ready to play
      if (video.readyState < 2) {
        // Wait for video to be ready with timeout
        await new Promise<void>((resolve, reject) => {
          const handleCanPlay = () => {
            video.removeEventListener('canplay', handleCanPlay)
            video.removeEventListener('error', handleError)
            resolve()
          }
          
          const handleError = () => {
            video.removeEventListener('canplay', handleCanPlay)
            video.removeEventListener('error', handleError)
            reject(new Error('Video failed to load'))
          }
          
          video.addEventListener('canplay', handleCanPlay)
          video.addEventListener('error', handleError)
          
          // Timeout after 10 seconds
          setTimeout(() => {
            video.removeEventListener('canplay', handleCanPlay)
            video.removeEventListener('error', handleError)
            resolve() // Continue anyway
          }, 10000)
        })
      }
      
      // For iOS, we need to handle playback carefully
      if (isIOS) {
        // iOS requires muted autoplay for most cases
        if (!video.muted) {
          video.muted = true
          setState(prev => ({ ...prev, isMuted: true, volume: 0 }))
        }
        
        // iOS specific: ensure playsInline is set
        video.playsInline = true
        
        // iOS specific: set webkit-playsinline attribute
        video.setAttribute('webkit-playsinline', 'true')
        video.setAttribute('x-webkit-airplay', 'allow')
      }
      
      // Try to play
      const playPromise = video.play()
      
      if (playPromise !== undefined) {
        await playPromise
        
        if (isMountedRef.current) {
          setState(prev => ({ 
            ...prev, 
            isPlaying: true,
            isBuffering: false,
            error: null 
          }))
          onPlay?.()
          
          // Start smooth time update
          smoothTimeUpdateRef.current = video.currentTime
          if (rafRef.current) cancelAnimationFrame(rafRef.current)
          rafRef.current = requestAnimationFrame(updateSmoothTime)
        }
      }
      
      playAttemptRef.current = 0 // Reset on success
    } catch (err: any) {
      console.error('Play failed:', err)
      
      // Handle specific errors
      let errorMsg = 'Playback failed. Tap to retry.'
      
      if (err.name === 'NotAllowedError') {
        if (isIOS) {
          errorMsg = 'Tap to play. iOS requires user interaction for video playback.'
        } else {
          errorMsg = 'Tap to play. Browser requires user interaction.'
        }
      } else if (err.name === 'NotSupportedError') {
        if (videoFormat === 'mov') {
          errorMsg = 'MOV format may not be supported. Try MP4 format for better compatibility.'
        } else {
          errorMsg = 'Video format not supported.'
        }
      } else if (err.name === 'AbortError') {
        // Silently handle abort errors
        return
      }
      
      if (isMountedRef.current) {
        setState(prev => ({ 
          ...prev, 
          error: errorMsg,
          isPlaying: false 
        }))
        onError?.(errorMsg)
      }
    }
  }, [onPlay, onError, updateSmoothTime, videoFormat])

  const handlePause = useCallback((): void => {
    const video = videoRef.current
    if (!video || !isMountedRef.current) return
    
    video.pause()
    
    if (isMountedRef.current) {
      setState(prev => ({ ...prev, isPlaying: false }))
      onPause?.()
      
      // Stop smooth time update
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current)
        rafRef.current = null
      }
    }
  }, [onPause])

  const togglePlay = useCallback((e?: React.MouseEvent): void => {
    if (e) {
      e.stopPropagation(); // Prevent event from bubbling up
    }
    
    lastInteractionRef.current = Date.now()
    setShowControls(true)
    
    if (state.isPlaying) {
      handlePause()
    } else {
      handlePlay()
    }
  }, [state.isPlaying, handlePause, handlePlay])

  // Volume control with debounce
  const volumeChangeTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  
  const handleVolumeChange = useCallback((value: number): void => {
    const video = videoRef.current
    if (!video || !isMountedRef.current) return
    
    const newVolume = Math.max(0, Math.min(1, value))
    
    // Update video properties
    video.volume = newVolume
    video.muted = newVolume === 0
    
    // Clear previous timeout
    if (volumeChangeTimeoutRef.current) {
      clearTimeout(volumeChangeTimeoutRef.current)
    }
    
    // Debounce state update
    volumeChangeTimeoutRef.current = setTimeout(() => {
      if (isMountedRef.current) {
        setState(prev => ({ 
          ...prev, 
          volume: newVolume, 
          isMuted: newVolume === 0 
        }))
        onVolumeChange?.(newVolume)
      }
    }, 100)
  }, [onVolumeChange])

  const toggleMute = useCallback((e: React.MouseEvent): void => {
    e.stopPropagation(); // Prevent event from bubbling to parent container
    
    lastInteractionRef.current = Date.now()
    const video = videoRef.current
    if (!video || !isMountedRef.current) return
    
    const newMutedState = !state.isMuted
    video.muted = newMutedState
    
    if (isMountedRef.current) {
      setState(prev => ({ 
        ...prev, 
        isMuted: newMutedState,
        volume: newMutedState ? 0 : Math.max(0.1, prev.volume)
      }))
      onVolumeChange?.(video.volume)
    }
  }, [state.isMuted, onVolumeChange])

  const handleSeek = useCallback((percentage: number): void => {
    lastInteractionRef.current = Date.now()
    const video = videoRef.current
    if (!video || !state.duration || !isMountedRef.current) return
    
    const time = state.duration * Math.max(0, Math.min(1, percentage))
    video.currentTime = time
    smoothTimeUpdateRef.current = time
    
    if (isMountedRef.current) {
      setState(prev => ({ ...prev, currentTime: time }))
    }
  }, [state.duration])

  const handleSkip = useCallback((seconds: number): void => {
    lastInteractionRef.current = Date.now()
    const video = videoRef.current
    if (!video || !isMountedRef.current) return
    
    const newTime = Math.max(0, Math.min(state.duration, video.currentTime + seconds))
    video.currentTime = newTime
    smoothTimeUpdateRef.current = newTime
    
    if (isMountedRef.current) {
      setState(prev => ({ ...prev, currentTime: newTime }))
    }
  }, [state.duration])

  // iOS Fullscreen handling - OPTIMIZED
  const toggleFullscreen = useCallback(async (): Promise<void> => {
    if (!isMountedRef.current || !containerRef.current) return
    
    try {
      // iOS specific handling
      if (isIOS) {
        const video = videoRef.current as SafariVideoElement | null
        if (!video) return
        
        const safariDoc = document as SafariDocument
        
        if (!state.isFullscreen) {
          // iOS requires calling webkitEnterFullscreen on the video element
          if (video.webkitEnterFullscreen) {
            await video.webkitEnterFullscreen()
          } else if (video.webkitRequestFullscreen) {
            await video.webkitRequestFullscreen()
          } else if (video.requestFullscreen) {
            await video.requestFullscreen()
          }
          
          // iOS doesn't trigger fullscreenchange event reliably
          setTimeout(() => {
            if (isMountedRef.current) {
              setState(prev => ({ ...prev, isFullscreen: true }))
              onFullscreenChange?.(true)
            }
          }, 100)
        } else {
          // Exit fullscreen for iOS
          if (safariDoc.webkitExitFullscreen) {
            await safariDoc.webkitExitFullscreen()
          } else if (document.exitFullscreen) {
            await document.exitFullscreen()
          }
        }
      } else {
        // Standard fullscreen API for non-iOS
        if (!document.fullscreenElement) {
          await containerRef.current.requestFullscreen()
        } else {
          await document.exitFullscreen()
        }
      }
    } catch (err) {
      console.error('Fullscreen error:', err)
      // Fallback for iOS Safari
      if (isIOS && err instanceof TypeError) {
        setState(prev => ({ 
          ...prev, 
          error: 'Fullscreen may not be supported. Try landscape mode.' 
        }))
      }
    }
  }, [state.isFullscreen, onFullscreenChange])

  // Check if element is in fullscreen mode
  const checkFullscreenElement = useCallback((): Element | null => {
    const doc = document as SafariDocument
    return document.fullscreenElement || 
           doc.webkitFullscreenElement || 
           (document as any).mozFullScreenElement ||
           (document as any).msFullscreenElement
  }, [])

  // Setup fullscreen change listener
  const setupFullscreenListeners = useCallback(() => {
    const handleFullscreenChange = () => {
      const isFullscreen = !!checkFullscreenElement()
      
      if (isMountedRef.current) {
        setState(prev => ({ ...prev, isFullscreen }))
        onFullscreenChange?.(isFullscreen)
      }
    }
    
    // Store reference for cleanup
    fullscreenChangeListenerRef.current = handleFullscreenChange
    
    // Add all fullscreen change listeners
    document.addEventListener('fullscreenchange', handleFullscreenChange)
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange)
    document.addEventListener('mozfullscreenchange', handleFullscreenChange)
    document.addEventListener('MSFullscreenChange', handleFullscreenChange)
    
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange)
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange)
      document.removeEventListener('mozfullscreenchange', handleFullscreenChange)
      document.removeEventListener('MSFullscreenChange', handleFullscreenChange)
      
      // Clear the ref
      fullscreenChangeListenerRef.current = null
    }
  }, [checkFullscreenElement, onFullscreenChange])

  // Setup video element
  useEffect(() => {
    isMountedRef.current = true
    
    const video = videoRef.current
    if (!video || !optimizedSrc) return
    
    // Clean up previous instances
    if (hlsRef.current) {
      hlsRef.current.destroy()
      hlsRef.current = null
    }
    
    if (flvRef.current) {
      flvRef.current.destroy()
      flvRef.current = null
    }
    
    if (loaderRef.current) {
      loaderRef.current.cleanup()
      loaderRef.current = null
    }
    
    // Set video properties
    video.autoplay = autoplay
    video.loop = loop
    video.playsInline = playsInline
    video.preload = preload
    video.muted = muted
    video.volume = muted ? 0 : 0.7
    video.poster = poster || ''
    
    // Add CSS for smooth playback on iOS
    video.style.transform = 'translateZ(0)'
    video.style.backfaceVisibility = 'hidden'
    video.style.perspective = '1000px'
    video.style.willChange = 'transform'
    video.style.webkitTransform = 'translateZ(0)'
    video.style.webkitBackfaceVisibility = 'hidden'
    video.style.webkitPerspective = '1000px'
    
    // iOS specific attributes
    if (isIOS) {
      video.setAttribute('webkit-playsinline', 'true')
      video.setAttribute('playsinline', 'true')
      video.setAttribute('x-webkit-airplay', 'allow')
      video.setAttribute('x-airplay', 'allow')
      
      // Disable PiP for iOS
      video.disablePictureInPicture = true
    }
    
    // Event handlers
    const handleLoadStart = () => {
      if (isMountedRef.current) {
        setState(prev => ({ 
          ...prev, 
          isLoading: true, 
          error: null 
        }))
      }
    }
    
    const handleLoadedMetadata = () => {
      if (!video.videoWidth || !video.videoHeight) return
      
      const naturalAspectRatio = video.videoWidth / video.videoHeight
      const newAspectRatio = calculateOptimalAspectRatio()
      
      if (isMountedRef.current) {
        setState(prev => ({ 
          ...prev, 
          duration: video.duration || 0,
          isLoading: false,
          naturalAspectRatio,
          videoDimensions: {
            width: video.videoWidth,
            height: video.videoHeight
          }
        }))
        
        setCalculatedAspectRatio(newAspectRatio)
        onAspectRatioChange?.(newAspectRatio)
      }
    }
    
    const handleCanPlay = () => {
      if (isMountedRef.current) {
        setState(prev => ({ 
          ...prev, 
          isLoading: false, 
          isBuffering: false 
        }))
        onReady?.()
      }
    }
    
    const handlePlaying = () => {
      if (isMountedRef.current) {
        setState(prev => ({ 
          ...prev, 
          isPlaying: true, 
          isBuffering: false 
        }))
        
        // Start smooth time update
        if (rafRef.current) cancelAnimationFrame(rafRef.current)
        smoothTimeUpdateRef.current = video.currentTime
        rafRef.current = requestAnimationFrame(updateSmoothTime)
      }
    }
    
    const handlePauseEvent = () => {
      if (isMountedRef.current) {
        setState(prev => ({ ...prev, isPlaying: false }))
        onPause?.()
        
        // Stop smooth time update
        if (rafRef.current) {
          cancelAnimationFrame(rafRef.current)
          rafRef.current = null
        }
      }
    }
    
    const handleTimeUpdate = () => {
      // Using smoothTimeUpdateRef for smoother updates
      if (!rafRef.current && isMountedRef.current) {
        setState(prev => ({ 
          ...prev, 
          currentTime: video.currentTime 
        }))
        onTimeUpdate?.(video.currentTime)
      }
    }
    
    const handleWaiting = () => {
      if (isMountedRef.current) {
        setState(prev => ({ ...prev, isBuffering: true }))
      }
    }
    
    const handleProgress = () => {
      if (video.buffered.length > 0 && video.duration > 0) {
        const bufferedEnd = video.buffered.end(video.buffered.length - 1)
        const bufferedPercent = (bufferedEnd / video.duration) * 100
        if (isMountedRef.current) {
          setState(prev => ({ 
            ...prev, 
            bufferProgress: bufferedPercent 
          }))
          onProgress?.(bufferedPercent)
        }
      }
    }
    
    const handleEnded = () => {
      if (isMountedRef.current) {
        setState(prev => ({ ...prev, isPlaying: false }))
        onEnded?.()
        
        // Stop smooth time update
        if (rafRef.current) {
          cancelAnimationFrame(rafRef.current)
          rafRef.current = null
        }
      }
    }
    
    const handleError = () => {
      const error = video.error
      let errorMsg = 'Failed to load video'
      
      if (error) {
        switch (error.code) {
          case 1: errorMsg = 'Video loading aborted'; break
          case 2: errorMsg = 'Network error'; break
          case 3: errorMsg = 'Decoding error'; break
          case 4: errorMsg = 'Unsupported format'; break
        }
      }
      
      if (isMountedRef.current) {
        setState(prev => ({ 
          ...prev, 
          error: errorMsg, 
          isLoading: false 
        }))
        onError?.(errorMsg)
      }
    }
    
    const handleResize = () => {
      if (video.videoWidth && video.videoHeight) {
        const newAspectRatio = calculateOptimalAspectRatio()
        if (Math.abs(newAspectRatio - calculatedAspectRatio) > ASPECT_RATIO_THRESHOLD) {
          setCalculatedAspectRatio(newAspectRatio)
          onAspectRatioChange?.(newAspectRatio)
        }
      }
    }
    
    // Add event listeners
    video.addEventListener('loadstart', handleLoadStart)
    video.addEventListener('loadedmetadata', handleLoadedMetadata)
    video.addEventListener('canplay', handleCanPlay)
    video.addEventListener('playing', handlePlaying)
    video.addEventListener('pause', handlePauseEvent)
    video.addEventListener('timeupdate', handleTimeUpdate)
    video.addEventListener('waiting', handleWaiting)
    video.addEventListener('progress', handleProgress)
    video.addEventListener('ended', handleEnded)
    video.addEventListener('error', handleError)
    video.addEventListener('resize', handleResize)
    
    // Setup fullscreen listeners
    const cleanupFullscreenListeners = setupFullscreenListeners()
    
    // Initialize appropriate player based on format
    if (videoFormat === 'hls' && Hls.isSupported()) {
      initHLS()
    } else if (videoFormat === 'flv' && flvjs && flvjs.isSupported()) {
      initFLV()
    } else {
      // For MP4, MOV, or other formats
      video.src = optimizedSrc
      
      // For large files, use progressive loading
      const fileSizeMatch = optimizedSrc.match(/\.(mp4|mov)$/i)
      if (fileSizeMatch && !isIOS) {
        // Don't use progressive loading on iOS as it handles large files well natively
        console.log('Using direct src for video')
      }
    }
    
    // Set up resize observer
    resizeObserverRef.current = new ResizeObserver(handleResize)
    if (containerRef.current) {
      resizeObserverRef.current.observe(containerRef.current)
    }
    
    // Handle autoplay
    if (autoplay) {
      // Delay for iOS to ensure everything is set up
      setTimeout(() => {
        if (isMountedRef.current && videoRef.current) {
          video.play().catch(() => {
            // Silent catch for autoplay restrictions
          })
        }
      }, isIOS ? 300 : 100)
    }
    
    return () => {
      isMountedRef.current = false
      
      // Clean up event listeners
      if (video) {
        video.removeEventListener('loadstart', handleLoadStart)
        video.removeEventListener('loadedmetadata', handleLoadedMetadata)
        video.removeEventListener('canplay', handleCanPlay)
        video.removeEventListener('playing', handlePlaying)
        video.removeEventListener('pause', handlePauseEvent)
        video.removeEventListener('timeupdate', handleTimeUpdate)
        video.removeEventListener('waiting', handleWaiting)
        video.removeEventListener('progress', handleProgress)
        video.removeEventListener('ended', handleEnded)
        video.removeEventListener('error', handleError)
        video.removeEventListener('resize', handleResize)
        
        // Pause and cleanup
        video.pause()
        video.src = ''
        video.load()
      }
      
      // Clean up fullscreen listeners
      cleanupFullscreenListeners()
      
      // Clean up HLS
      if (hlsRef.current) {
        hlsRef.current.destroy()
        hlsRef.current = null
      }
      
      // Clean up FLV
      if (flvRef.current) {
        flvRef.current.destroy()
        flvRef.current = null
      }
      
      // Clean up loader
      if (loaderRef.current) {
        loaderRef.current.cleanup()
        loaderRef.current = null
      }
      
      // Clean up resize observer
      if (resizeObserverRef.current) {
        resizeObserverRef.current.disconnect()
      }
      
      // Clean up timers and RAF
      if (controlsTimerRef.current) {
        clearTimeout(controlsTimerRef.current)
      }
      
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current)
      }
      
      if (volumeChangeTimeoutRef.current) {
        clearTimeout(volumeChangeTimeoutRef.current)
      }
      
      // Clean up fullscreen listener ref
      if (fullscreenChangeListenerRef.current) {
        fullscreenChangeListenerRef.current = null
      }
    }
  }, [
    optimizedSrc,
    poster,
    autoplay,
    preload,
    loop,
    muted,
    playsInline,
    videoFormat,
    initHLS,
    initFLV,
    onReady,
    onPause,
    onTimeUpdate,
    onProgress,
    onEnded,
    onError,
    onAspectRatioChange,
    calculateOptimalAspectRatio,
    calculatedAspectRatio,
    setupFullscreenListeners,
    videoKey // Add videoKey to dependencies to trigger re-initialization when it changes
  ])

  // Handle screen size changes
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)
    }
    
    checkMobile()
    window.addEventListener('resize', checkMobile)
    
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // Auto-hide controls
  useEffect(() => {
    if (!showControls || state.isLoading || state.error || !state.isPlaying || showSettings) {
      return
    }
    
    const hideControls = () => {
      if (Date.now() - lastInteractionRef.current > 3000) {
        setShowControls(false)
      }
    }
    
    if (controlsTimerRef.current) {
      clearTimeout(controlsTimerRef.current)
    }
    
    controlsTimerRef.current = setTimeout(hideControls, 4000)
    
    return () => {
      if (controlsTimerRef.current) {
        clearTimeout(controlsTimerRef.current)
      }
    }
  }, [showControls, state.isLoading, state.error, state.isPlaying, showSettings])

  // Calculate video object fit based on aspect ratio
  const getVideoObjectFit = useMemo(() => {
    if (aspectRatio === 'auto') {
      return state.naturalAspectRatio < 1 ? 'contain' : 'cover'
    }
    return typeof aspectRatio === 'number' && aspectRatio < 1 ? 'contain' : 'cover'
  }, [aspectRatio, state.naturalAspectRatio])

  // Error state
  if (state.error) {
    return (
      <div 
        ref={containerRef}
        className={cn(
          "relative bg-black rounded-xl overflow-hidden flex items-center justify-center",
          className
        )}
        style={{
          aspectRatio: calculatedAspectRatio,
          ...style
        }}
      >
        <div className="text-center p-6 max-w-md">
          <div className="w-16 h-16 bg-black/50 rounded-xl flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="w-8 h-8 text-amber-400" />
          </div>
          
          <h3 className="text-white text-lg font-bold mb-3">
            Playback Error
          </h3>
          
          <p className="text-white/70 text-sm mb-6 leading-relaxed">
            {state.error}
          </p>
          
          <div className="space-y-3">
            <Button
              onClick={() => {
                setState(prev => ({ 
                  ...prev, 
                  error: null, 
                  isLoading: true 
                }))
                setTimeout(() => handlePlay(), 100)
              }}
              className="bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-700 hover:to-cyan-600 text-white text-sm w-full py-3 rounded-xl font-medium"
              type="button"
            >
              <RotateCw className="w-4 h-4 mr-2" />
              Retry Playback
            </Button>
            
            {isIOS && videoFormat === 'mov' && (
              <p className="text-xs text-white/50 mt-3">
                Tip: MOV files work best on iOS Safari. Ensure video uses H.264 codec.
              </p>
            )}
          </div>
        </div>
      </div>
    )
  }
  
  return (
    <div 
      ref={containerRef}
      className={cn(
        "relative bg-black rounded-xl overflow-hidden group focus:outline-none select-none",
        state.isFullscreen && "fixed inset-0 z-50",
        className
      )}
      style={{
        aspectRatio: calculatedAspectRatio,
        ...style
      }}
      onMouseMove={() => {
        lastInteractionRef.current = Date.now()
        setShowControls(true)
      }}
      onTouchStart={() => {
        lastInteractionRef.current = Date.now()
        setShowControls(true)
      }}
      onClick={togglePlay}
      tabIndex={0}
      role="region"
      aria-label="Video player"
    >
      {/* Video element */}
      <video
        ref={videoRef}
        key={videoKey || videoUrlRef.current} // Use videoKey prop
        className={cn(
          "w-full h-full",
          getVideoObjectFit === 'contain' ? 'object-contain' : 'object-cover'
        )}
        playsInline={playsInline}
        controls={false}
        preload={preload}
        poster={poster}
        muted={state.isMuted}
        autoPlay={autoplay}
        loop={loop}
        aria-label="Video content"
        webkit-playsinline="true"
        x-webkit-airplay="allow"
        x-airplay="allow"
        onClick={(e) => {
          e.stopPropagation(); // Prevent double triggering
          togglePlay();
        }}
      />
      
      {/* Loading overlay */}
      {state.isLoading && (
        <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center">
          <div className="relative">
            <Loader2 className="w-10 h-10 text-white animate-spin" />
            <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-cyan-500 blur-xl opacity-30"></div>
          </div>
          <div className="text-white text-sm mt-4">Loading video...</div>
          {videoFormat === 'mov' && (
            <div className="text-xs text-white/50 mt-2">Optimizing for smooth playback...</div>
          )}
        </div>
      )}
      
      {/* Center play button */}
      {!state.isPlaying && !state.isLoading && !state.error && (
        <div 
          className="absolute inset-0 flex items-center justify-center"
          onClick={togglePlay}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              togglePlay()
            }
          }}
          aria-label="Play video"
        >
          <div className={cn(
            "bg-black/70 backdrop-blur-sm rounded-full flex items-center justify-center transition-all hover:scale-110 active:scale-95 cursor-pointer shadow-2xl",
            isMobile ? "h-14 w-14" : "h-20 w-20"
          )}>
            <Play className="w-8 h-8 text-white ml-1" />
          </div>
        </div>
      )}
      
      {/* Controls */}
      {controls && (
        <div 
          className={cn(
            "absolute inset-0 transition-opacity duration-300 pointer-events-none",
            showControls ? "opacity-100" : "opacity-0",
            "group-hover:opacity-100"
          )}
        >
          {/* Top gradient */}
          <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-black/90 via-black/50 to-transparent pointer-events-none" />
          
          {/* Bottom controls */}
          <div 
            data-controls="true"
            className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/95 via-black/80 to-transparent pointer-events-auto"
            onClick={(e: React.MouseEvent) => e.stopPropagation()}
          >
            <div className={isMobile ? "p-3" : "p-4"}>
              {/* Progress bar */}
              <div className="mb-3">
                <div className="relative">
                  <div 
                    className="relative w-full h-2 rounded-full overflow-hidden cursor-pointer touch-none bg-white/20"
                    onClick={(e) => {
                      e.stopPropagation()
                      if (!state.duration) return
                      const rect = e.currentTarget.getBoundingClientRect()
                      const clickX = e.clientX - rect.left
                      const percentage = Math.max(0, Math.min(1, clickX / rect.width))
                      handleSeek(percentage)
                    }}
                  >
                    <div 
                      className="absolute inset-0 bg-white/30 transition-all duration-300"
                      style={{ width: `${state.bufferProgress}%` }}
                    />
                    
                    <div 
                      className="absolute inset-0 bg-gradient-to-r from-blue-500 to-cyan-400 transition-all duration-150"
                      style={{ width: `${state.duration > 0 ? (state.currentTime / state.duration) * 100 : 0}%` }}
                    />
                    
                    <div 
                      className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full shadow-lg transition-all duration-150"
                      style={{ 
                        left: `calc(${state.duration > 0 ? (state.currentTime / state.duration) * 100 : 0}% - 6px)` 
                      }}
                    />
                  </div>
                  
                  <div className="flex justify-between text-xs text-white/80 mt-1.5">
                    <span>{formatTime(state.currentTime)}</span>
                    <span>{formatTime(state.duration)}</span>
                  </div>
                </div>
              </div>
              
              {/* Control buttons */}
              <div className="flex items-center justify-between">
                {/* Left side */}
                <div className="flex items-center gap-2">
                  <Button
                    onClick={togglePlay}
                    className={cn(
                      "bg-black/70 hover:bg-black/90 text-white rounded-full p-0 transition-all active:scale-95 shadow-lg",
                      isMobile ? "h-8 w-8" : "h-10 w-10"
                    )}
                    aria-label={state.isPlaying ? "Pause" : "Play"}
                    type="button"
                  >
                    {state.isPlaying ? (
                      <Pause className={isMobile ? "h-4 w-4" : "h-5 w-5"} />
                    ) : (
                      <Play className={cn(isMobile ? "h-4 w-4" : "h-5 w-5", "ml-0.5")} />
                    )}
                  </Button>
                  
                  <Button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSkip(-10);
                    }}
                    className={cn(
                      "bg-black/70 hover:bg-black/90 text-white rounded-full p-0 transition-all active:scale-95",
                      isMobile ? "h-8 w-8" : "h-9 w-9"
                    )}
                    aria-label="Skip back 10 seconds"
                    type="button"
                  >
                    <SkipBack className={isMobile ? "h-3.5 w-3.5" : "h-4 w-4"} />
                  </Button>
                  
                  <Button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSkip(10);
                    }}
                    className={cn(
                      "bg-black/70 hover:bg-black/90 text-white rounded-full p-0 transition-all active:scale-95",
                      isMobile ? "h-8 w-8" : "h-9 w-9"
                    )}
                    aria-label="Skip forward 10 seconds"
                    type="button"
                  >
                    <SkipForward className={isMobile ? "h-3.5 w-3.5" : "h-4 w-4"} />
                  </Button>
                  
                  <div className="relative group/volume">
                    <Button
                      onClick={toggleMute}
                      className={cn(
                        "bg-black/70 hover:bg-black/90 text-white rounded-full p-0 transition-all active:scale-95",
                        isMobile ? "h-8 w-8" : "h-9 w-9"
                      )}
                      aria-label={state.isMuted ? "Unmute" : "Mute"}
                      type="button"
                    >
                      {state.isMuted || state.volume === 0 ? (
                        <VolumeX className={isMobile ? "h-4 w-4" : "h-4 w-4"} />
                      ) : (
                        <Volume2 className={isMobile ? "h-4 w-4" : "h-4 w-4"} />
                      )}
                    </Button>
                    
                    {/* Volume slider */}
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-black/90 backdrop-blur-md rounded-lg p-2 w-24 opacity-0 invisible group-hover/volume:opacity-100 group-hover/volume:visible transition-all duration-200">
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.1"
                        value={state.volume}
                        onChange={(e) => {
                          e.stopPropagation();
                          handleVolumeChange(parseFloat(e.target.value))
                        }}
                        className="w-full h-1.5 bg-white/20 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-moz-range-thumb]:h-3 [&::-moz-range-thumb]:w-3 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-white"
                        aria-label="Volume control"
                      />
                    </div>
                  </div>
                </div>
                
                {/* Right side */}
                <div className="flex items-center gap-2">
                  {/* Settings */}
                  <div className="relative">
                    <Button
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowSettings(!showSettings);
                      }}
                      className={cn(
                        "bg-black/70 hover:bg-black/90 text-white rounded-full p-0 transition-all active:scale-95",
                        isMobile ? "h-8 w-8" : "h-9 w-9"
                      )}
                      aria-label="Settings"
                      type="button"
                    >
                      <Settings className={isMobile ? "h-3.5 w-3.5" : "h-4 w-4"} />
                    </Button>
                    
                    {showSettings && (
                      <div className="absolute bottom-full right-0 mb-2 bg-black/95 backdrop-blur-md rounded-lg p-3 w-48 border border-white/20 shadow-xl z-50">
                        <div className="flex items-center justify-between mb-2">
                          <div className="text-xs text-white/70">Playback Speed</div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setShowSettings(false);
                            }}
                            className="p-1 hover:bg-white/10 rounded transition-colors"
                            aria-label="Close settings"
                            type="button"
                          >
                            <X className="w-3 h-3 text-white/70" />
                          </button>
                        </div>

                        <div className="space-y-1">
                          {PLAYBACK_RATES.map(rate => (
                            <button
                              key={rate}
                              onClick={(e) => {
                                e.stopPropagation();
                                const video = videoRef.current
                                if (video) {
                                  video.playbackRate = rate
                                  setState(prev => ({ ...prev, playbackRate: rate }))
                                  setShowSettings(false)
                                  onPlaybackRateChange?.(rate)
                                }
                              }}
                              className={cn(
                                "w-full text-left px-3 py-2 rounded text-sm transition-colors flex items-center justify-between",
                                state.playbackRate === rate
                                  ? 'bg-gradient-to-r from-blue-500/20 to-cyan-400/20 text-white'
                                  : 'text-white/70 hover:text-white hover:bg-white/10'
                              )}
                              type="button"
                            >
                              <span>{rate === 1 ? 'Normal' : `${rate}x`}</span>
                              {state.playbackRate === rate && <Check className="w-4 h-4" />}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                  
                  {/* Fullscreen */}
                  <Button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleFullscreen();
                    }}
                    className={cn(
                      "bg-black/70 hover:bg-black/90 text-white rounded-full p-0 transition-all active:scale-95",
                      isMobile ? "h-8 w-8" : "h-9 w-9"
                    )}
                    aria-label={state.isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
                    type="button"
                  >
                    {state.isFullscreen ? (
                      <Minimize2 className={isMobile ? "h-3.5 w-3.5" : "h-4 w-4"} />
                    ) : (
                      <Expand className={isMobile ? "h-3.5 w-3.5" : "h-4 w-4"} />
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Buffer indicator */}
      {state.isBuffering && (
        <div className="absolute bottom-20 left-1/2 -translate-x-1/2 bg-black/90 backdrop-blur-sm rounded-xl px-4 py-3 shadow-2xl">
          <div className="flex items-center gap-3">
            <Loader2 className="w-5 h-5 text-white animate-spin" />
            <span className="text-white text-sm font-medium">Buffering...</span>
          </div>
        </div>
      )}
      
      {/* Format indicator for debugging */}
      {process.env.NODE_ENV === 'development' && (
        <div className="absolute top-2 right-2 bg-black/50 text-white text-xs px-2 py-1 rounded">
          {videoFormat.toUpperCase()} {isIOS ? 'iOS' : ''}
        </div>
      )}
    </div>
  )
})

UltraFastVideoPlayer.displayName = 'UltraFastVideoPlayer'

export { UltraFastVideoPlayer }
export default UltraFastVideoPlayer