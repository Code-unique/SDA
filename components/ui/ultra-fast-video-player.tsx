// components/ui/ultra-fast-video-player.tsx
'use client'

import React, { 
  useRef, 
  useState, 
  useEffect, 
  useCallback, 
  useMemo,
  memo,
  CSSProperties
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
  style
}: VideoPlayerProps) => {
  // Refs
  const videoRef = useRef<HTMLVideoElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const hlsRef = useRef<Hls | null>(null)
  const playAttemptRef = useRef<number>(0)
  const isMountedRef = useRef(true)
  const controlsTimerRef = useRef<NodeJS.Timeout | null>(null)
  const lastInteractionRef = useRef<number>(Date.now())
  const resizeObserverRef = useRef<ResizeObserver | null>(null)
  const rafRef = useRef<number | null>(null)
  const smoothTimeUpdateRef = useRef<number>(0)
  const fullscreenChangeListenerRef = useRef<(() => void) | null>(null)
  
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

  // Get the video source
  const videoSrc = useMemo(() => {
    if (Array.isArray(src)) return src[0]
    return src
  }, [src])

  // Check if source is HLS
  const isHLS = useMemo(() => {
    if (!videoSrc) return false
    return videoSrc.includes('.m3u8') || videoSrc.includes('.m3u')
  }, [videoSrc])

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
    if (!videoRef.current || !isHLS || !Hls.isSupported()) return
    
    const hls = new Hls({
      enableWorker: true,
      lowLatencyMode: true,
      backBufferLength: 60,
      maxBufferLength: 30,
      maxMaxBufferLength: 60,
      maxBufferSize: 60 * 1000 * 1000,
      maxLoadingDelay: 4,
      manifestLoadingTimeOut: 10000,
      manifestLoadingMaxRetry: 3,
      manifestLoadingRetryDelay: 500,
      levelLoadingTimeOut: 10000,
      levelLoadingMaxRetry: 3,
      levelLoadingRetryDelay: 500,
      fragLoadingTimeOut: 20000,
      fragLoadingMaxRetry: 6,
      fragLoadingRetryDelay: 500,
      startFragPrefetch: true,
      testBandwidth: true,
      progressive: true,
    })
    
    hlsRef.current = hls
    
    hls.on(Hls.Events.ERROR, (event, data) => {
      if (data.fatal) {
        switch (data.type) {
          case Hls.ErrorTypes.NETWORK_ERROR:
            hls.startLoad()
            break
          case Hls.ErrorTypes.MEDIA_ERROR:
            hls.recoverMediaError()
            break
          default:
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
    
    hls.loadSource(videoSrc)
    hls.attachMedia(videoRef.current!)
    
    return hls
  }, [videoSrc, isHLS])

  // Smooth time update using requestAnimationFrame
  const updateSmoothTime = useCallback(() => {
    if (!isMountedRef.current || !state.isPlaying || !videoRef.current) return
    
    const video = videoRef.current
    const currentTime = video.currentTime
    
    // Smooth interpolation
    smoothTimeUpdateRef.current += (currentTime - smoothTimeUpdateRef.current) * 0.3
    
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
    if (playAttemptRef.current > 5) {
      playAttemptRef.current = 0
      return
    }
    
    playAttemptRef.current++
    
    try {
      // Check if video is ready to play
      if (video.readyState < 2) {
        // Wait for video to be ready
        await new Promise<void>((resolve) => {
          const handleCanPlay = () => {
            video.removeEventListener('canplay', handleCanPlay)
            resolve()
          }
          
          video.addEventListener('canplay', handleCanPlay)
          
          // Timeout after 5 seconds
          setTimeout(() => {
            video.removeEventListener('canplay', handleCanPlay)
            resolve()
          }, 5000)
        })
      }
      
      // For iOS Safari, we need to handle muted autoplay
      if (isIOS && video.muted === false) {
        video.muted = true
        setState(prev => ({ ...prev, isMuted: true, volume: 0 }))
      }
      
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
        errorMsg = 'Tap to play. Browser requires user interaction.'
      } else if (err.name === 'NotSupportedError') {
        errorMsg = 'Video format not supported.'
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
  }, [onPlay, onError, updateSmoothTime])

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

  const togglePlay = useCallback((): void => {
    lastInteractionRef.current = Date.now()
    setShowControls(true)
    
    if (state.isPlaying) {
      handlePause()
    } else {
      handlePlay()
    }
  }, [state.isPlaying, handlePause, handlePlay])

  const handleVolumeChange = useCallback((value: number): void => {
    const video = videoRef.current
    if (!video || !isMountedRef.current) return
    
    const newVolume = Math.max(0, Math.min(1, value))
    video.volume = newVolume
    video.muted = newVolume === 0
    
    if (isMountedRef.current) {
      setState(prev => ({ 
        ...prev, 
        volume: newVolume, 
        isMuted: newVolume === 0 
      }))
      onVolumeChange?.(newVolume)
    }
  }, [onVolumeChange])

  const toggleMute = useCallback((): void => {
    lastInteractionRef.current = Date.now()
    const video = videoRef.current
    if (!video || !isMountedRef.current) return
    
    const newMutedState = !video.muted
    video.muted = newMutedState
    
    if (isMountedRef.current) {
      setState(prev => ({ 
        ...prev, 
        isMuted: newMutedState,
        volume: newMutedState ? 0 : Math.max(0.1, prev.volume)
      }))
      onVolumeChange?.(video.volume)
    }
  }, [onVolumeChange])

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

  // iOS Fullscreen handling - FIXED
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
          
          // iOS doesn't trigger fullscreenchange event reliably, so we set state manually
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
      // Fallback for iOS Safari that doesn't support programmatic fullscreen
      if (isIOS && err instanceof TypeError) {
        // iOS Safari may require user gesture for fullscreen
        // We'll show a message or use a different approach
        setState(prev => ({ 
          ...prev, 
          error: 'Fullscreen requires a direct tap. Use the native fullscreen button in iOS.' 
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
    if (!video || !videoSrc) return
    
    // Clean up previous HLS instance
    if (hlsRef.current) {
      hlsRef.current.destroy()
      hlsRef.current = null
    }
    
    // Set video properties
    video.autoplay = autoplay
    video.loop = loop
    video.playsInline = playsInline
    video.preload = preload
    video.muted = muted
    video.volume = muted ? 0 : 0.7
    video.poster = poster || ''
    
    // Add CSS for smooth playback
    video.style.transform = 'translateZ(0)'
    video.style.backfaceVisibility = 'hidden'
    video.style.perspective = '1000px'
    video.style.willChange = 'transform'
    video.style.webkitTransform = 'translateZ(0)' // For iOS
    
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
      }
    }
    
    const handleWaiting = () => {
      if (isMountedRef.current) {
        setState(prev => ({ ...prev, isBuffering: true }))
      }
    }
    
    const handleProgress = () => {
      if (video.buffered.length > 0 && state.duration > 0) {
        const bufferedEnd = video.buffered.end(video.buffered.length - 1)
        const bufferedPercent = (bufferedEnd / state.duration) * 100
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
    
    // Initialize HLS if needed, otherwise set src directly
    if (isHLS && Hls.isSupported()) {
      initHLS()
    } else {
      // For iOS, we need to handle MP4 format specifically
      if (isIOS && videoSrc.includes('.mp4')) {
        // iOS prefers direct src for MP4
        video.src = videoSrc
      } else {
        video.src = videoSrc
      }
    }
    
    // Set up resize observer
    resizeObserverRef.current = new ResizeObserver(handleResize)
    if (containerRef.current) {
      resizeObserverRef.current.observe(containerRef.current)
    }
    
    // Handle autoplay
    if (autoplay) {
      // Small delay to ensure everything is set up
      setTimeout(() => {
        if (isMountedRef.current && videoRef.current) {
          video.play().catch(() => {
            // Silent catch for autoplay restrictions
          })
        }
      }, 100)
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
      
      // Clean up resize observer
      if (resizeObserverRef.current) {
        resizeObserverRef.current.disconnect()
      }
      
      // Clean up timer and RAF
      if (controlsTimerRef.current) {
        clearTimeout(controlsTimerRef.current)
      }
      
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current)
      }
      
      // Clean up fullscreen listener ref
      if (fullscreenChangeListenerRef.current) {
        fullscreenChangeListenerRef.current = null
      }
    }
  }, [
    videoSrc,
    poster,
    autoplay,
    preload,
    loop,
    muted,
    playsInline,
    isHLS,
    initHLS,
    onReady,
    onPause,
    onTimeUpdate,
    onProgress,
    onEnded,
    onError,
    onAspectRatioChange,
    calculateOptimalAspectRatio,
    calculatedAspectRatio,
    setupFullscreenListeners
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
      if (Date.now() - lastInteractionRef.current > 2000) {
        setShowControls(false)
      }
    }
    
    if (controlsTimerRef.current) {
      clearTimeout(controlsTimerRef.current)
    }
    
    controlsTimerRef.current = setTimeout(hideControls, 3000)
    
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
      onClick={(e) => {
        // Prevent play/pause when clicking on controls
        if ((e.target as HTMLElement).closest('[data-controls]')) return
        togglePlay()
      }}
      tabIndex={0}
      role="region"
      aria-label="Video player"
    >
      {/* Video element */}
      <video
        ref={videoRef}
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
        webkit-playsinline="true" // iOS specific
        x-webkit-airplay="allow" // iOS AirPlay
      />
      
      {/* Loading overlay */}
      {state.isLoading && (
        <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center">
          <div className="relative">
            <Loader2 className="w-10 h-10 text-white animate-spin" />
            <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-cyan-500 blur-xl opacity-30"></div>
          </div>
          <div className="text-white text-sm mt-4">Loading video...</div>
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
            onClick={(e) => e.stopPropagation()}
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
                    onClick={() => handleSkip(-10)}
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
                    onClick={() => handleSkip(10)}
                    className={cn(
                      "bg-black/70 hover:bg-black/90 text-white rounded-full p-0 transition-all active:scale-95",
                      isMobile ? "h-8 w-8" : "h-9 w-9"
                    )}
                    aria-label="Skip forward 10 seconds"
                    type="button"
                  >
                    <SkipForward className={isMobile ? "h-3.5 w-3.5" : "h-4 w-4"} />
                  </Button>
                  
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
                </div>
                
                {/* Right side */}
                <div className="flex items-center gap-2">
                  {/* Settings */}
                  <div className="relative">
                    <Button
                      onClick={() => setShowSettings(!showSettings)}
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
                            onClick={() => setShowSettings(false)}
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
                              onClick={() => {
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
                    onClick={toggleFullscreen}
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
    </div>
  )
})

UltraFastVideoPlayer.displayName = 'UltraFastVideoPlayer'

export { UltraFastVideoPlayer }
export default UltraFastVideoPlayer