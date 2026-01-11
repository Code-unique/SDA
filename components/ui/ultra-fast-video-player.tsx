// components/ui/ultra-fast-video-player.tsx
'use client'

import React, { 
  useRef, 
  useState, 
  useEffect, 
  useCallback, 
  useMemo,
  MouseEvent,
  TouchEvent,
  WheelEvent
} from 'react'
import { 
  Play, 
  Pause, 
  Volume2, 
  VolumeX, 
  Maximize, 
  Minimize,
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
  FastForward,
  Rewind,
  Home,
  Clock,
  Zap,
  Captions,
  Airplay,
  PictureInPicture,
  Gauge,
  FileVideo2
} from 'lucide-react'
import { Button } from './button'
import { cn } from '@/lib/utils'

interface UltraFastVideoPlayerProps {
  src: string
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
}

interface VideoQuality {
  id: string
  label: string
  width: number
  height: number
}

interface ScreenSize {
  isMobile: boolean
  isTablet: boolean
  isDesktop: boolean
  isLargeDesktop: boolean
  isUltrawide: boolean
  pixelRatio: number
  width: number
  height: number
}

// Simple MIME type detection
const getVideoMimeType = (url: string): string => {
  if (!url) return 'video/mp4'
  
  const extension = url.split('.').pop()?.toLowerCase().split(/[?#]/)[0] || ''
  
  switch (extension) {
    case 'webm':
      return 'video/webm'
    case 'ogg':
    case 'ogv':
      return 'video/ogg'
    case 'm3u8':
      return 'application/x-mpegURL'
    case 'mpd':
      return 'application/dash+xml'
    default:
      return 'video/mp4'
  }
}

// URL optimization with quality parameters
const optimizeVideoUrl = (url: string, quality?: string): string => {
  if (!url) return url
  
  try {
    const urlObj = new URL(url)
    
    // Add cache busting for CDN URLs
    if (url.includes('amazonaws.com') || url.includes('cloudfront') || url.includes('cdn')) {
      if (!urlObj.searchParams.has('_')) {
        urlObj.searchParams.set('_', Date.now().toString().slice(-6))
      }
    }
    
    // Add quality parameter if provided
    if (quality && quality !== 'auto') {
      urlObj.searchParams.set('q', quality)
    }
    
    return urlObj.toString()
  } catch {
    return url
  }
}

// Detect screen size and type
const useScreenSize = (): ScreenSize => {
  const [screenSize, setScreenSize] = useState<ScreenSize>({
    isMobile: false,
    isTablet: false,
    isDesktop: false,
    isLargeDesktop: false,
    isUltrawide: false,
    pixelRatio: 1,
    width: 1920,
    height: 1080
  })

  useEffect(() => {
    const updateScreenSize = () => {
      const width = window.innerWidth
      const height = window.innerHeight
      const pixelRatio = window.devicePixelRatio || 1
      const isMobile = width < 768
      const isTablet = width >= 768 && width < 1024
      const isDesktop = width >= 1024 && width < 1920
      const isLargeDesktop = width >= 1920 && width < 2560
      const isUltrawide = width >= 2560

      setScreenSize({
        isMobile,
        isTablet,
        isDesktop,
        isLargeDesktop,
        isUltrawide,
        pixelRatio,
        width,
        height
      })
    }

    updateScreenSize()
    window.addEventListener('resize', updateScreenSize)
    window.addEventListener('orientationchange', updateScreenSize)

    return () => {
      window.removeEventListener('resize', updateScreenSize)
      window.removeEventListener('orientationchange', updateScreenSize)
    }
  }, [])

  return screenSize
}

// Fullscreen API helpers with better browser support
const requestFullscreen = (element: HTMLElement): Promise<void> => {
  if (element.requestFullscreen) {
    return element.requestFullscreen()
  } else if ((element as any).webkitRequestFullscreen) {
    return (element as any).webkitRequestFullscreen()
  } else if ((element as any).webkitEnterFullscreen) {
    return (element as any).webkitEnterFullscreen()
  } else if ((element as any).msRequestFullscreen) {
    return (element as any).msRequestFullscreen()
  } else if ((element as any).mozRequestFullScreen) {
    return (element as any).mozRequestFullScreen()
  }
  return Promise.reject(new Error('Fullscreen API not supported'))
}

const exitFullscreen = (): Promise<void> => {
  if (document.exitFullscreen) {
    return document.exitFullscreen()
  } else if ((document as any).webkitExitFullscreen) {
    return (document as any).webkitExitFullscreen()
  } else if ((document as any).webkitCancelFullScreen) {
    return (document as any).webkitCancelFullScreen()
  } else if ((document as any).msExitFullscreen) {
    return (document as any).msExitFullscreen()
  } else if ((document as any).mozCancelFullScreen) {
    return (document as any).mozCancelFullScreen()
  }
  return Promise.reject(new Error('Fullscreen API not supported'))
}

const getFullscreenElement = (): Element | null => {
  return document.fullscreenElement || 
         (document as any).webkitFullscreenElement ||
         (document as any).webkitCurrentFullScreenElement ||
         (document as any).msFullscreenElement ||
         (document as any).mozFullScreenElement
}

// Picture-in-Picture support
const enterPictureInPicture = async (video: HTMLVideoElement): Promise<void> => {
  if (document.pictureInPictureEnabled && !document.pictureInPictureElement) {
    await video.requestPictureInPicture()
  }
}

const exitPictureInPicture = async (): Promise<void> => {
  if (document.pictureInPictureElement) {
    await document.exitPictureInPicture()
  }
}

const UltraFastVideoPlayer: React.FC<UltraFastVideoPlayerProps> = ({
  src,
  poster,
  className = '',
  autoplay = false,
  preload = 'auto',
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
}) => {
  // Refs
  const videoRef = useRef<HTMLVideoElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const progressBarRef = useRef<HTMLDivElement>(null)
  const volumeBarRef = useRef<HTMLDivElement>(null)
  const hideControlsTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const touchStartRef = useRef<number>(0)
  const touchStartXRef = useRef<number>(0)
  const touchStartYRef = useRef<number>(0)
  const lastTapRef = useRef<number>(0)
  const volumeSliderTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  
  // State
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [showControls, setShowControls] = useState(true)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [isMuted, setIsMuted] = useState(muted)
  const [volume, setVolume] = useState(1)
  const [playbackRate, setPlaybackRate] = useState(1)
  const [isBuffering, setIsBuffering] = useState(false)
  const [bufferProgress, setBufferProgress] = useState(0)
  const [showSettings, setShowSettings] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [isPictureInPicture, setIsPictureInPicture] = useState(false)
  const [aspectRatio, setAspectRatio] = useState<number>(16/9)
  const [qualities] = useState<VideoQuality[]>([
    { id: 'auto', label: 'Auto', width: 0, height: 0 },
    { id: '2160p', label: '4K (2160p)', width: 3840, height: 2160 },
    { id: '1440p', label: 'QHD (1440p)', width: 2560, height: 1440 },
    { id: '1080p', label: 'FHD (1080p)', width: 1920, height: 1080 },
    { id: '720p', label: 'HD (720p)', width: 1280, height: 720 },
    { id: '480p', label: 'SD (480p)', width: 854, height: 480 }
  ])
  const [activeQuality, setActiveQuality] = useState<string>('auto')
  const [retryCount, setRetryCount] = useState(0)
  const [showSkipFeedback, setShowSkipFeedback] = useState<number | null>(null)
  const [playbackRates] = useState([0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2, 3, 4])
  const [showVolumeSlider, setShowVolumeSlider] = useState(false)
  const [showQualitySelector, setShowQualitySelector] = useState(false)
  const [showPlaybackRateSelector, setShowPlaybackRateSelector] = useState(false)
  const [isDraggingProgress, setIsDraggingProgress] = useState(false)
  const [isDraggingVolume, setIsDraggingVolume] = useState(false)
  const [previewTime, setPreviewTime] = useState<number | null>(null)
  const [previewPosition, setPreviewPosition] = useState<number>(0)
  const [hasPosterError, setHasPosterError] = useState(false)
  
  // Screen size detection
  const screenSize = useScreenSize()
  
  // Optimized URLs with quality
  const optimizedSrc = useMemo(() => {
    const quality = activeQuality !== 'auto' ? activeQuality : undefined
    return optimizeVideoUrl(src, quality)
  }, [src, activeQuality])
  
  const mimeType = useMemo(() => getVideoMimeType(optimizedSrc), [optimizedSrc])

  // Calculate optimal UI sizes based on screen
  const uiSizes = useMemo(() => {
    if (screenSize.isMobile) {
      return {
        buttonSize: 'h-10 w-10',
        iconSize: 'h-5 w-5',
        progressHeight: 'h-1',
        volumeSliderWidth: 'w-32',
        controlPadding: 'p-3',
        fontSize: 'text-sm',
        centerPlaySize: 'h-16 w-16'
      }
    } else if (screenSize.isTablet) {
      return {
        buttonSize: 'h-12 w-12',
        iconSize: 'h-6 w-6',
        progressHeight: 'h-1.5',
        volumeSliderWidth: 'w-40',
        controlPadding: 'p-4',
        fontSize: 'text-base',
        centerPlaySize: 'h-20 w-20'
      }
    } else if (screenSize.isLargeDesktop) {
      return {
        buttonSize: 'h-16 w-16',
        iconSize: 'h-8 w-8',
        progressHeight: 'h-2',
        volumeSliderWidth: 'w-48',
        controlPadding: 'p-6',
        fontSize: 'text-lg',
        centerPlaySize: 'h-24 w-24'
      }
    } else if (screenSize.isUltrawide) {
      return {
        buttonSize: 'h-20 w-20',
        iconSize: 'h-10 w-10',
        progressHeight: 'h-2.5',
        volumeSliderWidth: 'w-56',
        controlPadding: 'p-8',
        fontSize: 'text-xl',
        centerPlaySize: 'h-28 w-28'
      }
    } else {
      // Desktop
      return {
        buttonSize: 'h-14 w-14',
        iconSize: 'h-7 w-7',
        progressHeight: 'h-1.5',
        volumeSliderWidth: 'w-44',
        controlPadding: 'p-5',
        fontSize: 'text-base',
        centerPlaySize: 'h-22 w-22'
      }
    }
  }, [screenSize])

  // Handle poster loading errors
  const handlePosterError = useCallback(() => {
    setHasPosterError(true)
  }, [])

  // Initialize video with proper poster handling
  useEffect(() => {
    if (!optimizedSrc) {
      setError('No video source provided')
      return
    }

    const video = videoRef.current
    if (!video) {
      setError('Video element not found')
      return
    }

    let isMounted = true

    const handleLoadStart = () => {
      if (isMounted) {
        setIsLoading(true)
        setError(null)
        setHasPosterError(false)
      }
    }

    const handleLoadedMetadata = () => {
      if (isMounted && video) {
        const newDuration = video.duration || 0
        setDuration(newDuration)
        
        // Calculate aspect ratio from video dimensions
        const width = video.videoWidth || 1920
        const height = video.videoHeight || 1080
        const newAspectRatio = width / height
        setAspectRatio(newAspectRatio)
        
        // Auto-select optimal quality based on screen size
        if (isMounted) {
          let optimalQuality = 'auto'
          if (screenSize.isMobile) {
            optimalQuality = '720p'
          } else if (screenSize.isTablet) {
            optimalQuality = '1080p'
          } else if (screenSize.isLargeDesktop) {
            optimalQuality = '1440p'
          } else if (screenSize.isUltrawide) {
            optimalQuality = '2160p'
          } else {
            optimalQuality = '1080p'
          }
          setActiveQuality(optimalQuality)
        }
      }
    }

    const handleCanPlay = () => {
      if (isMounted) {
        setIsLoading(false)
        setIsBuffering(false)
        onReady?.()
        
        if (autoplay) {
          video.play().catch(err => {
            console.debug('Autoplay prevented:', err.message)
            if (isMounted) setIsLoading(false)
          })
        }
      }
    }

    const handlePlaying = () => {
      if (isMounted) {
        setIsPlaying(true)
        setIsBuffering(false)
        onPlay?.()
      }
    }

    const handlePause = () => {
      if (isMounted) {
        setIsPlaying(false)
        onPause?.()
      }
    }

    const handleTimeUpdate = () => {
      if (isMounted && video && !isDraggingProgress) {
        setCurrentTime(video.currentTime)
        onTimeUpdate?.(video.currentTime)
      }
    }

    const handleVolumeChange = () => {
      if (isMounted && video) {
        const newMuted = video.muted
        const newVolume = video.volume
        setIsMuted(newMuted)
        setVolume(newVolume)
        onVolumeChange?.(newVolume)
      }
    }

    const handleWaiting = () => {
      if (isMounted) {
        setIsBuffering(true)
      }
    }

    const handleProgress = () => {
      if (isMounted && video && video.buffered.length > 0 && duration > 0) {
        const bufferedEnd = video.buffered.end(video.buffered.length - 1)
        const bufferedPercent = (bufferedEnd / duration) * 100
        setBufferProgress(bufferedPercent)
        onProgress?.(bufferedPercent)
      }
    }

    const handleError = (e: Event) => {
      if (!isMounted) return
      
      const videoElement = e.target as HTMLVideoElement
      const videoError = videoElement.error
      
      let errorMessage = 'Failed to load video'
      
      if (videoError) {
        switch (videoError.code) {
          case 2:
            errorMessage = 'Network error. Please check your connection.'
            break
          case 3:
            errorMessage = 'Video decoding error'
            break
          case 4:
            errorMessage = 'Video format not supported'
            break
        }
      }
      
      setError(errorMessage)
      setIsLoading(false)
      onError?.(errorMessage)
    }

    const handleEnded = () => {
      if (isMounted) {
        setIsPlaying(false)
        onEnded?.()
      }
    }

    const handleFullscreenChange = () => {
      const fullscreen = !!getFullscreenElement()
      setIsFullscreen(fullscreen)
      onFullscreenChange?.(fullscreen)
    }

    const handlePictureInPictureChange = () => {
      setIsPictureInPicture(!!document.pictureInPictureElement)
    }

    // Setup event listeners
    const events = [
      ['loadstart', handleLoadStart],
      ['loadedmetadata', handleLoadedMetadata],
      ['canplay', handleCanPlay],
      ['playing', handlePlaying],
      ['pause', handlePause],
      ['timeupdate', handleTimeUpdate],
      ['volumechange', handleVolumeChange],
      ['waiting', handleWaiting],
      ['progress', handleProgress],
      ['error', handleError],
      ['ended', handleEnded]
    ] as const

    events.forEach(([event, handler]) => {
      video.addEventListener(event, handler as EventListener)
    })

    document.addEventListener('fullscreenchange', handleFullscreenChange)
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange)
    document.addEventListener('MSFullscreenChange', handleFullscreenChange)
    document.addEventListener('mozfullscreenchange', handleFullscreenChange)
    
    // Picture-in-Picture events
    video.addEventListener('enterpictureinpicture', handlePictureInPictureChange)
    video.addEventListener('leavepictureinpicture', handlePictureInPictureChange)

    // Configure video
    video.src = optimizedSrc
    
    // Handle poster properly with error handling
    if (poster && !hasPosterError) {
      video.poster = poster
      video.addEventListener('error', handlePosterError, { once: true })
    } else {
      video.poster = ''
    }
    
    video.preload = preload
    video.playsInline = playsInline
    video.loop = loop
    video.muted = muted
    video.defaultPlaybackRate = 1.0
    video.playbackRate = playbackRate
    
    // Set crossOrigin for CORS
    try {
      const url = new URL(optimizedSrc)
      if (url.hostname !== window.location.hostname) {
        video.crossOrigin = 'anonymous'
      }
    } catch {
      // Invalid URL, skip crossOrigin
    }

    // Cleanup
    return () => {
      isMounted = false
      
      // Clear timeouts
      if (hideControlsTimeoutRef.current) {
        clearTimeout(hideControlsTimeoutRef.current)
        hideControlsTimeoutRef.current = null
      }
      
      if (volumeSliderTimeoutRef.current) {
        clearTimeout(volumeSliderTimeoutRef.current)
        volumeSliderTimeoutRef.current = null
      }
      
      // Remove event listeners
      events.forEach(([event, handler]) => {
        video.removeEventListener(event, handler as EventListener)
      })
      
      video.removeEventListener('error', handlePosterError)
      
      document.removeEventListener('fullscreenchange', handleFullscreenChange)
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange)
      document.removeEventListener('MSFullscreenChange', handleFullscreenChange)
      document.removeEventListener('mozfullscreenchange', handleFullscreenChange)
      
      video.removeEventListener('enterpictureinpicture', handlePictureInPictureChange)
      video.removeEventListener('leavepictureinPicture', handlePictureInPictureChange)
      
      // Reset video
      video.src = ''
      video.load()
    }
  }, [optimizedSrc, poster, autoplay, preload, loop, muted, playsInline, retryCount, screenSize, hasPosterError, handlePosterError])

  // Auto-hide controls
  useEffect(() => {
    if (!showControls || isLoading || error || !isPlaying || showSettings || isDraggingProgress) return
    
    hideControlsTimeoutRef.current = setTimeout(() => {
      setShowControls(false)
    }, screenSize.isMobile ? 1500 : 2000)
    
    return () => {
      if (hideControlsTimeoutRef.current) {
        clearTimeout(hideControlsTimeoutRef.current)
        hideControlsTimeoutRef.current = null
      }
    }
  }, [showControls, isPlaying, isLoading, error, showSettings, isDraggingProgress, screenSize])

  // Control functions
  const togglePlay = useCallback(async (e?: MouseEvent) => {
    if (e) e.stopPropagation()
    
    const video = videoRef.current
    if (!video) return
    
    try {
      if (isPlaying) {
        video.pause()
      } else {
        await video.play()
      }
    } catch (err) {
      console.debug('Playback error:', err)
    }
  }, [isPlaying])

  const toggleMute = useCallback((e: MouseEvent) => {
    e.stopPropagation()
    const video = videoRef.current
    if (!video) return
    
    video.muted = !video.muted
    
    // Show volume slider briefly when toggling mute
    setShowVolumeSlider(true)
    if (volumeSliderTimeoutRef.current) {
      clearTimeout(volumeSliderTimeoutRef.current)
    }
    volumeSliderTimeoutRef.current = setTimeout(() => {
      setShowVolumeSlider(false)
    }, 1000)
  }, [])

  const setVideoVolume = useCallback((value: number) => {
    const video = videoRef.current
    if (!video) return
    const newVolume = Math.max(0, Math.min(1, value))
    video.volume = newVolume
    video.muted = newVolume === 0
    setVolume(newVolume)
    
    // Show volume slider
    setShowVolumeSlider(true)
    if (volumeSliderTimeoutRef.current) {
      clearTimeout(volumeSliderTimeoutRef.current)
    }
    volumeSliderTimeoutRef.current = setTimeout(() => {
      setShowVolumeSlider(false)
    }, 1000)
  }, [])

  const seek = useCallback((time: number) => {
    const video = videoRef.current
    if (!video) return
    const newTime = Math.max(0, Math.min(duration, time))
    video.currentTime = newTime
    setCurrentTime(newTime)
  }, [duration])

  const seekToPercentage = useCallback((percentage: number) => {
    if (!duration) return
    const newTime = duration * Math.max(0, Math.min(1, percentage))
    seek(newTime)
  }, [duration, seek])

  const skip = useCallback((seconds: number, e?: MouseEvent) => {
    if (e) e.stopPropagation()
    const video = videoRef.current
    if (!video) return
    
    const newTime = video.currentTime + seconds
    seek(newTime)
    
    // Show feedback
    setShowSkipFeedback(seconds)
    setTimeout(() => setShowSkipFeedback(null), 600)
  }, [seek])

  const changePlaybackRate = useCallback((rate: number) => {
    const video = videoRef.current
    if (!video) return
    const newRate = Math.max(0.125, Math.min(8, rate))
    video.playbackRate = newRate
    setPlaybackRate(newRate)
    setShowPlaybackRateSelector(false)
  }, [])

  const toggleFullscreen = useCallback(async (e?: MouseEvent) => {
    if (e) e.stopPropagation()
    
    if (!containerRef.current) return
    
    try {
      if (!getFullscreenElement()) {
        await requestFullscreen(containerRef.current)
      } else {
        await exitFullscreen()
      }
    } catch (err) {
      console.debug('Fullscreen error:', err)
      // Fallback: use CSS fullscreen
      if (!isFullscreen) {
        containerRef.current.classList.add('fixed', 'inset-0', 'z-50', 'bg-black')
        setIsFullscreen(true)
      } else {
        containerRef.current.classList.remove('fixed', 'inset-0', 'z-50', 'bg-black')
        setIsFullscreen(false)
      }
    }
  }, [isFullscreen])

  const togglePictureInPicture = useCallback(async () => {
    const video = videoRef.current
    if (!video) return
    
    try {
      if (document.pictureInPictureElement) {
        await exitPictureInPicture()
      } else {
        await enterPictureInPicture(video)
      }
    } catch (err) {
      console.debug('Picture-in-Picture error:', err)
    }
  }, [])

  const changeQuality = useCallback((qualityId: string) => {
    setActiveQuality(qualityId)
    setShowQualitySelector(false)
  }, [])

  const retryPlayback = useCallback(() => {
    setError(null)
    setHasPosterError(false)
    setRetryCount(prev => prev + 1)
    setIsLoading(true)
    
    const video = videoRef.current
    if (video) {
      video.load()
      video.play().catch(console.debug)
    }
  }, [])

  const formatTime = useCallback((seconds: number) => {
    const hours = Math.floor(seconds / 3600)
    const mins = Math.floor((seconds % 3600) / 60)
    const secs = Math.floor(seconds % 60)
    
    if (hours > 0) {
      return `${hours}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }, [])

  // Handle mouse movement for controls
  const handleMouseMove = useCallback(() => {
    if (showSettings || showQualitySelector || showPlaybackRateSelector) return
    
    setShowControls(true)
    
    if (hideControlsTimeoutRef.current) {
      clearTimeout(hideControlsTimeoutRef.current)
    }
    
    if (isPlaying) {
      hideControlsTimeoutRef.current = setTimeout(() => {
        setShowControls(false)
      }, screenSize.isMobile ? 1500 : 2000)
    }
  }, [isPlaying, showSettings, showQualitySelector, showPlaybackRateSelector, screenSize])

  // Handle touch events for mobile
  const handleTouchStart = useCallback((e: TouchEvent) => {
    const touch = e.touches[0]
    touchStartRef.current = Date.now()
    touchStartXRef.current = touch.clientX
    touchStartYRef.current = touch.clientY
    
    // Show controls on touch
    setShowControls(true)
  }, [])

  const handleTouchEnd = useCallback((e: TouchEvent) => {
    const touch = e.changedTouches[0]
    const touchDuration = Date.now() - touchStartRef.current
    const deltaX = Math.abs(touch.clientX - touchStartXRef.current)
    const deltaY = Math.abs(touch.clientY - touchStartYRef.current)
    
    // Single tap: toggle play/pause (if short touch and not swipe)
    if (touchDuration < 300 && deltaX < 10 && deltaY < 10) {
      const now = Date.now()
      const timeSinceLastTap = now - lastTapRef.current
      
      if (timeSinceLastTap < 300) {
        // Double tap - seek
        const video = videoRef.current
        if (video) {
          const rect = video.getBoundingClientRect()
          const tapX = touch.clientX
          const isLeftHalf = tapX < rect.left + rect.width / 2
          skip(isLeftHalf ? -10 : 10)
        }
      } else {
        // Single tap - toggle play/pause
        togglePlay()
      }
      
      lastTapRef.current = now
    }
  }, [togglePlay, skip])

  // Handle progress bar interaction
  const handleProgressMouseDown = useCallback((e: MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDraggingProgress(true)
    
    const progressBar = progressBarRef.current
    if (!progressBar || !duration) return
    
    const handleMouseMove = (e: MouseEvent) => {
      const rect = progressBar.getBoundingClientRect()
      const percentage = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
      const previewTime = duration * percentage
      setPreviewTime(previewTime)
      setPreviewPosition(e.clientX - rect.left)
    }
    
    const handleMouseUp = (e: MouseEvent) => {
      const rect = progressBar.getBoundingClientRect()
      const percentage = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
      seekToPercentage(percentage)
      setIsDraggingProgress(false)
      setPreviewTime(null)
      
      document.removeEventListener('mousemove', handleMouseMove as any)
      document.removeEventListener('mouseup', handleMouseUp as any)
    }
    
    handleMouseMove(e)
    
    document.addEventListener('mousemove', handleMouseMove as any)
    document.addEventListener('mouseup', handleMouseUp as any)
  }, [duration, seekToPercentage])

  // Handle volume bar interaction
  const handleVolumeMouseDown = useCallback((e: MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDraggingVolume(true)
    
    const volumeBar = volumeBarRef.current
    if (!volumeBar) return
    
    const handleMouseMove = (e: MouseEvent) => {
      const rect = volumeBar.getBoundingClientRect()
      const percentage = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
      setVideoVolume(percentage)
    }
    
    const handleMouseUp = () => {
      setIsDraggingVolume(false)
      document.removeEventListener('mousemove', handleMouseMove as any)
      document.removeEventListener('mouseup', handleMouseUp as any)
    }
    
    handleMouseMove(e)
    
    document.addEventListener('mousemove', handleMouseMove as any)
    document.addEventListener('mouseup', handleMouseUp as any)
  }, [setVideoVolume])

  // Handle wheel for volume control
  const handleWheel = useCallback((e: WheelEvent) => {
    if (!showControls) return
    
    const video = videoRef.current
    if (!video) return
    
    const delta = e.deltaY > 0 ? -0.1 : 0.1
    const newVolume = Math.max(0, Math.min(1, volume + delta))
    setVideoVolume(newVolume)
  }, [volume, setVideoVolume, showControls])

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only handle if video is focused or we're in fullscreen
      if (!containerRef.current?.contains(document.activeElement) && !isFullscreen) return
      
      const video = videoRef.current
      if (!video) return
      
      switch (e.key.toLowerCase()) {
        case ' ':
        case 'k':
          e.preventDefault()
          togglePlay()
          break
        case 'm':
          e.preventDefault()
          video.muted = !video.muted
          break
        case 'f':
          e.preventDefault()
          toggleFullscreen()
          break
        case 'arrowleft':
          e.preventDefault()
          skip(-5)
          break
        case 'arrowright':
          e.preventDefault()
          skip(5)
          break
        case 'arrowup':
          e.preventDefault()
          setVideoVolume(Math.min(1, volume + 0.1))
          break
        case 'arrowdown':
          e.preventDefault()
          setVideoVolume(Math.max(0, volume - 0.1))
          break
        case '>':
        case '.':
          e.preventDefault()
          skip(10)
          break
        case '<':
        case ',':
          e.preventDefault()
          skip(-10)
          break
        case 't':
          e.preventDefault()
          togglePictureInPicture()
          break
        case '0':
        case '1':
        case '2':
        case '3':
        case '4':
        case '5':
        case '6':
        case '7':
        case '8':
        case '9':
          e.preventDefault()
          const percentage = parseInt(e.key) / 10
          seekToPercentage(percentage)
          break
      }
    }
    
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [togglePlay, toggleFullscreen, skip, setVideoVolume, volume, seekToPercentage, isFullscreen, togglePictureInPicture])

  // Skip feedback component
  const SkipFeedback = useMemo(() => {
    if (!showSkipFeedback) return null
    
    return (
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-30">
        <div className="bg-black/80 backdrop-blur-md rounded-2xl p-6 sm:p-8 flex items-center gap-4 sm:gap-6 animate-in fade-in zoom-in-95">
          {showSkipFeedback > 0 ? (
            <FastForward className="w-12 h-12 sm:w-16 sm:h-16 text-white" />
          ) : (
            <Rewind className="w-12 h-12 sm:w-16 sm:h-16 text-white" />
          )}
          <div className="text-white text-2xl sm:text-3xl font-bold">
            {showSkipFeedback > 0 ? '+' : ''}{showSkipFeedback}s
          </div>
        </div>
      </div>
    )
  }, [showSkipFeedback, screenSize])

  // Preview time tooltip
  const PreviewTooltip = useMemo(() => {
    if (!previewTime || !duration || !isDraggingProgress) return null
    
    const progressBar = progressBarRef.current
    if (!progressBar) return null
    
    const rect = progressBar.getBoundingClientRect()
    const position = Math.max(0, Math.min(rect.width, previewPosition))
    
    return (
      <div 
        className="absolute bottom-full mb-2 -translate-x-1/2 bg-black/90 backdrop-blur-sm rounded-lg px-3 py-2 border border-white/20 shadow-2xl z-50"
        style={{ left: `${position}px` }}
      >
        <div className="text-white text-sm font-medium whitespace-nowrap">
          {formatTime(previewTime)} / {formatTime(duration)}
        </div>
      </div>
    )
  }, [previewTime, previewPosition, duration, formatTime, isDraggingProgress])

  // Error state
  if (error) {
    return (
      <div 
        className={cn(
          "relative bg-black overflow-hidden flex items-center justify-center",
          isFullscreen ? "fixed inset-0 z-50" : "rounded-2xl",
          className
        )}
        style={!isFullscreen ? { aspectRatio } : undefined}
        ref={containerRef}
      >
        <div className="text-center p-8 max-w-2xl">
          <div className="w-24 h-24 bg-gradient-to-br from-red-500/20 to-orange-500/20 rounded-3xl flex items-center justify-center mx-auto mb-6 backdrop-blur-sm">
            <AlertTriangle className="w-12 h-12 text-amber-400" />
          </div>
          
          <h3 className="text-white text-2xl sm:text-3xl font-bold mb-4">
            Playback Error
          </h3>
          
          <p className="text-white/70 text-base sm:text-lg mb-6">{error}</p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              onClick={retryPlayback}
              className="bg-gradient-to-r from-red-600 to-orange-500 hover:from-red-700 hover:to-orange-600 text-white font-medium px-8 py-3 text-lg"
            >
              <RotateCw className="w-5 h-5 mr-2" />
              Retry Playback
            </Button>
            
            <Button
              onClick={() => window.location.reload()}
              variant="outline"
              className="border-white/30 text-white hover:bg-white/10 px-8 py-3 text-lg"
            >
              <Home className="w-5 h-5 mr-2" />
              Reload Page
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
        "relative bg-black overflow-hidden group select-none focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:ring-offset-black",
        isFullscreen ? "fixed inset-0 z-50" : "rounded-2xl",
        className
      )}
      style={!isFullscreen ? { aspectRatio } : undefined}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => {
        if (!isPlaying && !isLoading && !error) return
        hideControlsTimeoutRef.current = setTimeout(() => {
          setShowControls(false)
        }, 1000)
      }}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onWheel={handleWheel}
      tabIndex={0}
    >
      {/* Video element with proper poster handling */}
      <video
        ref={videoRef}
        className="w-full h-full object-contain"
        playsInline
        controls={false}
        preload={preload}
        poster={poster && !hasPosterError ? poster : undefined}
        onError={handlePosterError}
      />
      
      {/* Skip feedback */}
      {SkipFeedback}
      
      {/* Preview tooltip */}
      {PreviewTooltip}
      
      {/* Loading overlay */}
      {(isLoading || isBuffering) && (
        <div className="absolute inset-0 bg-black/90 flex flex-col items-center justify-center z-20">
          <div className="relative">
            <Loader2 className="w-16 h-16 sm:w-20 sm:h-20 text-white animate-spin" />
          </div>
          <p className="text-white/80 text-sm sm:text-base mt-6">
            {isBuffering ? 'Buffering...' : 'Loading video...'}
          </p>
          {bufferProgress > 0 && (
            <div className={cn(
              "mt-6",
              screenSize.isMobile ? "w-48" : "w-64"
            )}>
              <div className="w-full h-2 bg-white/20 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-red-500 via-orange-500 to-yellow-500 transition-all duration-300"
                  style={{ width: `${bufferProgress}%` }}
                />
              </div>
              <div className="flex justify-between text-xs text-white/60 mt-2">
                <span>Buffered</span>
                <span>{bufferProgress.toFixed(0)}%</span>
              </div>
            </div>
          )}
        </div>
      )}
      
      {/* Center play button (when paused) */}
      {!isPlaying && !isLoading && !error && (
        <div 
          className="absolute inset-0 flex items-center justify-center z-20"
          onClick={(e) => {
            e.stopPropagation()
            togglePlay(e)
          }}
        >
          <div className={cn(
            "bg-white/20 backdrop-blur-lg rounded-full flex items-center justify-center transition-all duration-300 hover:scale-110 active:scale-95 hover:bg-white/30 cursor-pointer",
            uiSizes.centerPlaySize
          )}>
            <Play className={cn(
              "text-white ml-1",
              screenSize.isMobile ? "w-8 h-8" :
              screenSize.isTablet ? "w-10 h-10" :
              screenSize.isLargeDesktop ? "w-12 h-12" :
              screenSize.isUltrawide ? "w-14 h-14" : "w-11 h-11"
            )} />
          </div>
        </div>
      )}
      
      {/* Controls overlay */}
      {controls && (
        <div 
          className={cn(
            "absolute inset-0 transition-all duration-300 pointer-events-none",
            showControls ? "opacity-100" : "opacity-0"
          )}
        >
          {/* Top gradient */}
          <div className="absolute top-0 left-0 right-0 h-48 bg-gradient-to-b from-black/90 via-black/40 to-transparent pointer-events-none" />
          
          {/* Bottom controls */}
          <div 
            className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/95 via-black/80 to-transparent pointer-events-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className={uiSizes.controlPadding}>
              {/* Progress bar */}
              <div className="mb-4 sm:mb-6 relative">
                {/* Buffer progress */}
                <div 
                  className={cn(
                    "absolute top-0 left-0 w-full bg-white/20 rounded-full overflow-hidden cursor-pointer",
                    uiSizes.progressHeight
                  )}
                  ref={progressBarRef}
                  onMouseDown={handleProgressMouseDown}
                >
                  <div 
                    className="h-full bg-white/40 transition-all"
                    style={{ width: `${bufferProgress}%` }}
                  />
                </div>
                
                {/* Playback progress */}
                <div 
                  className={cn(
                    "absolute top-0 left-0 bg-gradient-to-r from-red-500 via-orange-500 to-yellow-500 rounded-full cursor-pointer",
                    uiSizes.progressHeight
                  )}
                  style={{ width: `${(currentTime / Math.max(duration, 1)) * 100}%` }}
                  onMouseDown={handleProgressMouseDown}
                >
                  <div className={cn(
                    "absolute bg-white rounded-full shadow-lg transition-transform hover:scale-125",
                    screenSize.isMobile ? "-right-1 -top-0.5 w-3 h-3" :
                    screenSize.isLargeDesktop ? "-right-2 -top-1 w-5 h-5" :
                    screenSize.isUltrawide ? "-right-3 -top-1.5 w-6 h-6" : "-right-1.5 -top-0.5 w-4 h-4"
                  )} />
                </div>
                
                {/* Time labels */}
                <div className={cn(
                  "flex justify-between text-white/70 mt-3",
                  uiSizes.fontSize
                )}>
                  <span>{formatTime(currentTime)}</span>
                  <span>{formatTime(duration)}</span>
                </div>
              </div>
              
              {/* Control buttons */}
              <div className="flex items-center justify-between">
                {/* Left controls */}
                <div className="flex items-center gap-2 sm:gap-4">
                  {/* Play/Pause */}
                  <Button
                    onClick={togglePlay}
                    className={cn(
                      "bg-white/10 backdrop-blur-sm hover:bg-white/20 text-white rounded-full p-0 flex items-center justify-center transition-all duration-200 hover:scale-110 active:scale-95",
                      uiSizes.buttonSize
                    )}
                  >
                    {isPlaying ? (
                      <Pause className={uiSizes.iconSize} />
                    ) : (
                      <Play className={cn(uiSizes.iconSize, "ml-0.5")} />
                    )}
                  </Button>
                  
                  {/* Skip backward */}
                  <Button
                    onClick={(e) => skip(-10, e)}
                    className={cn(
                      "bg-white/10 backdrop-blur-sm hover:bg-white/20 text-white rounded-full p-0 flex items-center justify-center transition-all duration-200 hover:scale-110 active:scale-95",
                      uiSizes.buttonSize
                    )}
                  >
                    <SkipBack className={uiSizes.iconSize} />
                  </Button>
                  
                  {/* Skip forward */}
                  <Button
                    onClick={(e) => skip(10, e)}
                    className={cn(
                      "bg-white/10 backdrop-blur-sm hover:bg-white/20 text-white rounded-full p-0 flex items-center justify-center transition-all duration-200 hover:scale-110 active:scale-95",
                      uiSizes.buttonSize
                    )}
                  >
                    <SkipForward className={uiSizes.iconSize} />
                  </Button>
                  
                  {/* Volume */}
                  <div className="flex items-center gap-3 relative group/volume">
                    <Button
                      onClick={toggleMute}
                      className={cn(
                        "bg-white/10 backdrop-blur-sm hover:bg-white/20 text-white rounded-full p-0 flex items-center justify-center transition-all duration-200 hover:scale-110 active:scale-95",
                        uiSizes.buttonSize
                      )}
                      onMouseEnter={() => !screenSize.isMobile && setShowVolumeSlider(true)}
                      onMouseLeave={() => {
                        if (!screenSize.isMobile && !isDraggingVolume) {
                          setTimeout(() => setShowVolumeSlider(false), 500)
                        }
                      }}
                    >
                      {isMuted || volume === 0 ? (
                        <VolumeX className={uiSizes.iconSize} />
                      ) : (
                        <Volume2 className={uiSizes.iconSize} />
                      )}
                    </Button>
                    
                    {/* Volume slider - shown on hover or when changing */}
                    {(showVolumeSlider || isDraggingVolume) && !screenSize.isMobile && (
                      <div 
                        className={cn(
                          "absolute left-full ml-3 h-1.5 bg-white/30 rounded-full cursor-pointer transition-opacity duration-300 z-50",
                          uiSizes.volumeSliderWidth
                        )}
                        ref={volumeBarRef}
                        onMouseDown={handleVolumeMouseDown}
                        onMouseEnter={() => setShowVolumeSlider(true)}
                        onMouseLeave={() => {
                          if (!isDraggingVolume) {
                            setTimeout(() => setShowVolumeSlider(false), 300)
                          }
                        }}
                      >
                        <div 
                          className="absolute top-0 left-0 h-full bg-gradient-to-r from-red-500 to-orange-400 rounded-full"
                          style={{ width: `${volume * 100}%` }}
                        >
                          <div className="absolute -right-1.5 -top-0.5 w-3 h-3 bg-white rounded-full shadow-lg hover:w-4 hover:h-4 transition-all" />
                        </div>
                      </div>
                    )}
                  </div>
                  
                  {/* Time elapsed */}
                  <div className={cn(
                    "text-white/70 ml-2 hidden sm:block",
                    uiSizes.fontSize
                  )}>
                    <Clock className="inline-block w-4 h-4 mr-2" />
                    {formatTime(currentTime)} / {formatTime(duration)}
                  </div>
                </div>
                
                {/* Right controls */}
                <div className="flex items-center gap-2 sm:gap-4">
                  {/* Settings menu */}
                  <div className="relative">
                    <Button
                      onClick={() => {
                        setShowSettings(!showSettings)
                        setShowQualitySelector(false)
                        setShowPlaybackRateSelector(false)
                      }}
                      className={cn(
                        "bg-white/10 backdrop-blur-sm hover:bg-white/20 text-white rounded-full p-0 flex items-center justify-center transition-all duration-200 hover:scale-110 active:scale-95",
                        uiSizes.buttonSize
                      )}
                    >
                      <Settings className={uiSizes.iconSize} />
                    </Button>
                    
                    {/* Settings dropdown */}
                    {showSettings && (
                      <div 
                        className="absolute bottom-full right-0 mb-3 bg-black/95 backdrop-blur-md rounded-xl p-4 min-w-[200px] sm:min-w-[240px] border border-white/20 shadow-2xl z-50"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="flex justify-between items-center mb-4">
                          <h3 className="text-white font-medium">Settings</h3>
                          <Button
                            onClick={() => setShowSettings(false)}
                            className="w-8 h-8 p-0 hover:bg-white/10"
                            variant="ghost"
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                        
                        {/* Playback speed */}
                        <div className="mb-4">
                          <button
                            onClick={() => {
                              setShowPlaybackRateSelector(!showPlaybackRateSelector)
                              setShowQualitySelector(false)
                            }}
                            className="w-full flex items-center justify-between px-3 py-2 rounded-lg hover:bg-white/10 text-white/80 hover:text-white transition-colors"
                          >
                            <div className="flex items-center gap-2">
                              <Gauge className="w-4 h-4" />
                              <span>Playback Speed</span>
                            </div>
                            <span className="font-medium">{playbackRate}x</span>
                          </button>
                          
                          {showPlaybackRateSelector && (
                            <div className="mt-2 grid grid-cols-5 gap-1">
                              {playbackRates.map(rate => (
                                <button
                                  key={rate}
                                  onClick={() => changePlaybackRate(rate)}
                                  className={cn(
                                    "px-2 py-1.5 rounded text-xs transition-all",
                                    playbackRate === rate
                                      ? 'bg-gradient-to-r from-red-500 to-orange-400 text-white scale-105'
                                      : 'bg-white/10 text-white/70 hover:bg-white/20 hover:text-white'
                                  )}
                                >
                                  {rate === 1 ? '1x' : `${rate}x`}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                        
                        {/* Quality selector */}
                        <div className="mb-4">
                          <button
                            onClick={() => {
                              setShowQualitySelector(!showQualitySelector)
                              setShowPlaybackRateSelector(false)
                            }}
                            className="w-full flex items-center justify-between px-3 py-2 rounded-lg hover:bg-white/10 text-white/80 hover:text-white transition-colors"
                          >
                            <div className="flex items-center gap-2">
                              <FileVideo2 className="w-4 h-4" />
                              <span>Quality</span>
                            </div>
                            <span className="font-medium">{activeQuality}</span>
                          </button>
                          
                          {showQualitySelector && (
                            <div className="mt-2 space-y-1">
                              {qualities.map(quality => (
                                <button
                                  key={quality.id}
                                  onClick={() => changeQuality(quality.id)}
                                  className={cn(
                                    "w-full flex items-center justify-between px-3 py-2 rounded text-sm transition-colors",
                                    activeQuality === quality.id
                                      ? 'bg-gradient-to-r from-red-500/20 to-orange-400/20 text-white'
                                      : 'text-white/70 hover:bg-white/10 hover:text-white'
                                  )}
                                >
                                  <span>{quality.label}</span>
                                  {activeQuality === quality.id && (
                                    <Check className="w-4 h-4" />
                                  )}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                        
                        {/* Additional features */}
                        <div className="space-y-1 border-t border-white/10 pt-4">
                          {document.pictureInPictureEnabled && (
                            <button
                              onClick={togglePictureInPicture}
                              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-white/10 text-white/80 hover:text-white transition-colors"
                            >
                              <PictureInPicture className="w-4 h-4" />
                              <span>Picture-in-Picture</span>
                            </button>
                          )}
                          
                          <button
                            onClick={() => {
                              // Implement captions toggle
                            }}
                            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-white/10 text-white/80 hover:text-white transition-colors"
                          >
                            <Captions className="w-4 h-4" />
                            <span>Subtitles</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                  
                  {/* Picture-in-Picture button */}
                  {document.pictureInPictureEnabled && (
                    <Button
                      onClick={togglePictureInPicture}
                      className={cn(
                        "bg-white/10 backdrop-blur-sm hover:bg-white/20 text-white rounded-full p-0 flex items-center justify-center transition-all duration-200 hover:scale-110 active:scale-95",
                        uiSizes.buttonSize
                      )}
                    >
                      <Airplay className={uiSizes.iconSize} />
                    </Button>
                  )}
                  
                  {/* Fullscreen */}
                  <Button
                    onClick={toggleFullscreen}
                    className={cn(
                      "bg-white/10 backdrop-blur-sm hover:bg-white/20 text-white rounded-full p-0 flex items-center justify-center transition-all duration-200 hover:scale-110 active:scale-95",
                      uiSizes.buttonSize
                    )}
                  >
                    {isFullscreen ? (
                      <Minimize2 className={uiSizes.iconSize} />
                    ) : (
                      <Expand className={uiSizes.iconSize} />
                    )}
                  </Button>
                </div>
              </div>
              
              {/* Mobile volume slider */}
              {screenSize.isMobile && (showVolumeSlider || isDraggingVolume) && (
                <div className="mt-4 pt-4 border-t border-white/20">
                  <div className="flex items-center gap-3">
                    {isMuted || volume === 0 ? (
                      <VolumeX className="w-5 h-5 text-white/70" />
                    ) : (
                      <Volume2 className="w-5 h-5 text-white/70" />
                    )}
                    <div 
                      className="flex-1 h-2 bg-white/30 rounded-full cursor-pointer relative"
                      ref={volumeBarRef}
                      onTouchStart={(e) => {
                        const touch = e.touches[0]
                        const rect = e.currentTarget.getBoundingClientRect()
                        const percentage = Math.max(0, Math.min(1, (touch.clientX - rect.left) / rect.width))
                        setVideoVolume(percentage)
                        setIsDraggingVolume(true)
                      }}
                      onTouchMove={(e) => {
                        if (!isDraggingVolume) return
                        const touch = e.touches[0]
                        const rect = e.currentTarget.getBoundingClientRect()
                        const percentage = Math.max(0, Math.min(1, (touch.clientX - rect.left) / rect.width))
                        setVideoVolume(percentage)
                      }}
                      onTouchEnd={() => setIsDraggingVolume(false)}
                    >
                      <div 
                        className="absolute top-0 left-0 h-full bg-gradient-to-r from-red-500 to-orange-400 rounded-full"
                        style={{ width: `${volume * 100}%` }}
                      >
                        <div className="absolute -right-1 -top-0.5 w-4 h-4 bg-white rounded-full shadow-lg" />
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
          
          {/* Double tap zones for mobile */}
          {screenSize.isMobile && !showControls && isPlaying && (
            <>
              <div 
                className="absolute left-0 top-0 bottom-0 w-1/3 opacity-0 active:opacity-20 transition-opacity"
                onTouchStart={() => skip(-10)}
              />
              <div 
                className="absolute right-0 top-0 bottom-0 w-1/3 opacity-0 active:opacity-20 transition-opacity"
                onTouchStart={() => skip(10)}
              />
            </>
          )}
        </div>
      )}
      
      {/* Keyboard shortcut hints (shown briefly on first interaction) */}
      {!screenSize.isMobile && showControls && (
        <div className="absolute top-4 right-4 bg-black/50 backdrop-blur-sm rounded-lg px-3 py-1.5 text-white/60 text-xs font-medium z-10 animate-in fade-in">
          Press <kbd className="px-1.5 py-0.5 bg-white/10 rounded">Space</kbd> to play/pause
        </div>
      )}
    </div>
  )
}

export default UltraFastVideoPlayer