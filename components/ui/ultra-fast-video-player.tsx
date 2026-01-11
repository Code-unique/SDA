// components/ui/ultra-fast-video-player.tsx
'use client'

import React, { 
  useRef, 
  useState, 
  useEffect, 
  useCallback, 
  useMemo,
  memo,
  useId
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
  FileVideo2,
  ChevronUp,
  ChevronDown
} from 'lucide-react'
import { Button } from './button'
import { cn } from '@/lib/utils'

// Types
interface UltraFastVideoPlayerProps {
  src: string | string[]
  poster?: string
  className?: string
  autoplay?: boolean
  preload?: 'auto' | 'metadata' | 'none'
  loop?: boolean
  muted?: boolean
  playsInline?: boolean
  controls?: boolean
  defaultQuality?: string
  onReady?: () => void
  onError?: (error: string) => void
  onPlay?: () => void
  onPause?: () => void
  onEnded?: () => void
  onTimeUpdate?: (time: number) => void
  onProgress?: (buffered: number) => void
  onFullscreenChange?: (isFullscreen: boolean) => void
  onVolumeChange?: (volume: number) => void
  onQualityChange?: (quality: string) => void
  onPlaybackRateChange?: (rate: number) => void
}

interface VideoQuality {
  id: string
  label: string
  src: string
  width: number
  height: number
  bitrate?: number
}

interface ScreenInfo {
  isMobile: boolean
  isTablet: boolean
  isDesktop: boolean
  isLargeDesktop: boolean
  isUltrawide: boolean
  pixelRatio: number
  width: number
  height: number
  isIOS: boolean
  isSafari: boolean
  isChromeIOS: boolean
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
  activeQuality: string
  error: string | null
}

// Constants
const QUALITIES: VideoQuality[] = [
  { id: 'auto', label: 'Auto', src: '', width: 0, height: 0 },
  { id: '2160p', label: '4K (2160p)', src: '', width: 3840, height: 2160 },
  { id: '1440p', label: 'QHD (1440p)', src: '', width: 2560, height: 1440 },
  { id: '1080p', label: 'FHD (1080p)', src: '', width: 1920, height: 1080 },
  { id: '720p', label: 'HD (720p)', src: '', width: 1280, height: 720 },
  { id: '480p', label: 'SD (480p)', src: '', width: 854, height: 480 }
]

const PLAYBACK_RATES = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2, 3, 4]

const MOBILE_BREAKPOINT = 768
const TABLET_BREAKPOINT = 1024
const LARGE_DESKTOP_BREAKPOINT = 1920
const ULTRAWIDE_BREAKPOINT = 2560

// Helper functions
const formatTime = (seconds: number): string => {
  const hrs = Math.floor(seconds / 3600)
  const mins = Math.floor((seconds % 3600) / 60)
  const secs = Math.floor(seconds % 60)
  
  if (hrs > 0) {
    return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

const getMimeType = (url: string): string => {
  const ext = url.split('.').pop()?.toLowerCase().split(/[?#]/)[0] || ''
  
  const mimeMap: Record<string, string> = {
    'webm': 'video/webm',
    'ogg': 'video/ogg',
    'ogv': 'video/ogg',
    'm3u8': 'application/x-mpegURL',
    'mpd': 'application/dash+xml',
    'mov': 'video/quicktime',
    'avi': 'video/x-msvideo'
  }
  
  return mimeMap[ext] || 'video/mp4'
}

const optimizeUrl = (url: string, quality?: string): string => {
  if (!url) return url
  
  try {
    const urlObj = new URL(url)
    
    // Add optimization params
    if (url.includes('amazonaws.com') || url.includes('cloudfront') || url.includes('cdn')) {
      urlObj.searchParams.set('_', Date.now().toString().slice(-6))
    }
    
    if (quality && quality !== 'auto') {
      urlObj.searchParams.set('q', quality)
    }
    
    return urlObj.toString()
  } catch {
    return url
  }
}

// Detect iOS and browser type
const isIOS = () => {
  if (typeof navigator === 'undefined') return false
  return /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream
}

const isSafari = () => {
  if (typeof navigator === 'undefined') return false
  return /^((?!chrome|android).)*safari/i.test(navigator.userAgent)
}

const isChromeIOS = () => {
  if (typeof navigator === 'undefined') return false
  return /CriOS/.test(navigator.userAgent)
}

// Custom hooks
const useScreenInfo = (): ScreenInfo => {
  const [screenInfo, setScreenInfo] = useState<ScreenInfo>({
    isMobile: false,
    isTablet: false,
    isDesktop: false,
    isLargeDesktop: false,
    isUltrawide: false,
    pixelRatio: 1,
    width: 1920,
    height: 1080,
    isIOS: false,
    isSafari: false,
    isChromeIOS: false
  })

  useEffect(() => {
    const updateScreenInfo = () => {
      const width = window.innerWidth
      const height = window.innerHeight
      const pixelRatio = window.devicePixelRatio || 1
      const userAgent = navigator.userAgent
      
      setScreenInfo({
        isMobile: width < MOBILE_BREAKPOINT,
        isTablet: width >= MOBILE_BREAKPOINT && width < TABLET_BREAKPOINT,
        isDesktop: width >= TABLET_BREAKPOINT && width < LARGE_DESKTOP_BREAKPOINT,
        isLargeDesktop: width >= LARGE_DESKTOP_BREAKPOINT && width < ULTRAWIDE_BREAKPOINT,
        isUltrawide: width >= ULTRAWIDE_BREAKPOINT,
        pixelRatio,
        width,
        height,
        isIOS: /iPad|iPhone|iPod/.test(userAgent) && !(window as any).MSStream,
        isSafari: /^((?!chrome|android).)*safari/i.test(userAgent),
        isChromeIOS: /CriOS/.test(userAgent)
      })
    }

    updateScreenInfo()
    
    const debouncedUpdate = debounce(updateScreenInfo, 100)
    window.addEventListener('resize', debouncedUpdate)
    window.addEventListener('orientationchange', debouncedUpdate)

    return () => {
      window.removeEventListener('resize', debouncedUpdate)
      window.removeEventListener('orientationchange', debouncedUpdate)
    }
  }, [])

  return screenInfo
}

const useFullscreen = () => {
  const [isFullscreen, setIsFullscreen] = useState(false)

  const enter = useCallback(async (element: HTMLElement) => {
    try {
      if (element.requestFullscreen) await element.requestFullscreen()
      else if ((element as any).webkitRequestFullscreen) await (element as any).webkitRequestFullscreen()
      else if ((element as any).msRequestFullscreen) await (element as any).msRequestFullscreen()
    } catch (err) {
      console.warn('Fullscreen error:', err)
    }
  }, [])

  const exit = useCallback(async () => {
    try {
      if (document.exitFullscreen) await document.exitFullscreen()
      else if ((document as any).webkitExitFullscreen) await (document as any).webkitExitFullscreen()
      else if ((document as any).msExitFullscreen) await (document as any).msExitFullscreen()
    } catch (err) {
      console.warn('Fullscreen exit error:', err)
    }
  }, [])

  useEffect(() => {
    const handleChange = () => {
      const isFs = !!(document.fullscreenElement || 
                     (document as any).webkitFullscreenElement ||
                     (document as any).msFullscreenElement)
      setIsFullscreen(isFs)
    }

    document.addEventListener('fullscreenchange', handleChange)
    document.addEventListener('webkitfullscreenchange', handleChange)
    document.addEventListener('MSFullscreenChange', handleChange)

    return () => {
      document.removeEventListener('fullscreenchange', handleChange)
      document.removeEventListener('webkitfullscreenchange', handleChange)
      document.removeEventListener('MSFullscreenChange', handleChange)
    }
  }, [])

  return { isFullscreen, enter, exit, toggle: (element: HTMLElement) => 
    isFullscreen ? exit() : enter(element) 
  }
}

// Update the usePictureInPicture hook definition to accept nullable ref
const usePictureInPicture = (videoRef: React.RefObject<HTMLVideoElement | null>) => {
  const [isPictureInPicture, setIsPictureInPicture] = useState(false)

  const enter = useCallback(async () => {
    if (videoRef.current && document.pictureInPictureEnabled) {
      try {
        await videoRef.current.requestPictureInPicture()
      } catch (err) {
        console.warn('PiP error:', err)
      }
    }
  }, [videoRef])

  const exit = useCallback(async () => {
    if (document.pictureInPictureElement) {
      try {
        await document.exitPictureInPicture()
      } catch (err) {
        console.warn('PiP exit error:', err)
      }
    }
  }, [])

  const toggle = useCallback(() => {
    isPictureInPicture ? exit() : enter()
  }, [isPictureInPicture, enter, exit])

  useEffect(() => {
    const handleEnter = () => setIsPictureInPicture(true)
    const handleLeave = () => setIsPictureInPicture(false)

    document.addEventListener('enterpictureinpicture', handleEnter)
    document.addEventListener('leavepictureinpicture', handleLeave)

    return () => {
      document.removeEventListener('enterpictureinpicture', handleEnter)
      document.removeEventListener('leavepictureinpicture', handleLeave)
    }
  }, [])

  return { isPictureInPicture, enter, exit, toggle }
}

const debounce = <T extends (...args: any[]) => any>(
  func: T,
  wait: number
): ((...args: Parameters<T>) => void) => {
  let timeout: NodeJS.Timeout | null = null
  
  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout)
    timeout = setTimeout(() => func(...args), wait)
  }
}

// Memoized Components
const PlayPauseButton = memo(({
  isPlaying,
  onClick,
  size = 'md'
}: {
  isPlaying: boolean
  onClick: () => void
  size?: 'sm' | 'md' | 'lg' | 'xl'
}) => {
  const sizes = {
    sm: 'h-10 w-10',
    md: 'h-12 w-12',
    lg: 'h-14 w-14',
    xl: 'h-16 w-16'
  }
  
  const iconSizes = {
    sm: 'h-5 w-5',
    md: 'h-6 w-6',
    lg: 'h-7 w-7',
    xl: 'h-8 w-8'
  }

  return (
    <Button
      onClick={onClick}
      className={cn(
        "bg-white/10 backdrop-blur-sm hover:bg-white/20 text-white rounded-full p-0 transition-all hover:scale-110 active:scale-95",
        sizes[size]
      )}
      aria-label={isPlaying ? "Pause" : "Play"}
    >
      {isPlaying ? (
        <Pause className={iconSizes[size]} />
      ) : (
        <Play className={cn(iconSizes[size], "ml-0.5")} />
      )}
    </Button>
  )
})

PlayPauseButton.displayName = 'PlayPauseButton'

const VolumeControl = memo(({
  volume,
  isMuted,
  onVolumeChange,
  onToggleMute,
  showSlider,
  size = 'md'
}: {
  volume: number
  isMuted: boolean
  onVolumeChange: (value: number) => void
  onToggleMute: () => void
  showSlider: boolean
  size?: 'sm' | 'md' | 'lg' | 'xl'
}) => {
  const sliderRef = useRef<HTMLDivElement>(null)
  const [isDragging, setIsDragging] = useState(false)
  
  const sizes = {
    sm: 'h-9 w-9',
    md: 'h-10 w-10',
    lg: 'h-12 w-12',
    xl: 'h-14 w-14'
  }
  
  const iconSizes = {
    sm: 'h-4 w-4',
    md: 'h-5 w-5',
    lg: 'h-6 w-6',
    xl: 'h-7 w-7'
  }

  const handleSliderClick = useCallback((e: React.MouseEvent) => {
    const rect = sliderRef.current?.getBoundingClientRect()
    if (!rect) return
    
    const percentage = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
    onVolumeChange(percentage)
  }, [onVolumeChange])

  const handleMouseDown = useCallback(() => {
    setIsDragging(true)
    
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging || !sliderRef.current) return
      const rect = sliderRef.current.getBoundingClientRect()
      const percentage = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
      onVolumeChange(percentage)
    }
    
    const handleMouseUp = () => {
      setIsDragging(false)
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
    
    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
  }, [isDragging, onVolumeChange])

  return (
    <div className="flex items-center gap-2 relative group/volume">
      <Button
        onClick={onToggleMute}
        className={cn(
          "bg-white/10 backdrop-blur-sm hover:bg-white/20 text-white rounded-full p-0 transition-all hover:scale-110 active:scale-95",
          sizes[size]
        )}
        aria-label={isMuted ? "Unmute" : "Mute"}
      >
        {isMuted || volume === 0 ? (
          <VolumeX className={iconSizes[size]} />
        ) : (
          <Volume2 className={iconSizes[size]} />
        )}
      </Button>
      
      {showSlider && (
        <div 
          ref={sliderRef}
          className="w-32 h-1.5 bg-white/30 rounded-full cursor-pointer relative"
          onClick={handleSliderClick}
          onMouseDown={handleMouseDown}
        >
          <div 
            className="absolute top-0 left-0 h-full bg-gradient-to-r from-red-500 to-orange-400 rounded-full transition-all"
            style={{ width: `${isMuted ? 0 : volume * 100}%` }}
          >
            <div className="absolute -right-1.5 -top-0.5 w-3 h-3 bg-white rounded-full shadow-lg hover:scale-125 transition-transform" />
          </div>
        </div>
      )}
    </div>
  )
})

VolumeControl.displayName = 'VolumeControl'

const ProgressBar = memo(({
  currentTime,
  duration,
  bufferProgress,
  onSeek,
  height = 'md'
}: {
  currentTime: number
  duration: number
  bufferProgress: number
  onSeek: (percentage: number) => void
  height?: 'sm' | 'md' | 'lg'
}) => {
  const barRef = useRef<HTMLDivElement>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [previewTime, setPreviewTime] = useState<number | null>(null)
  const [previewPosition, setPreviewPosition] = useState(0)

  const heights = {
    sm: 'h-1',
    md: 'h-1.5',
    lg: 'h-2'
  }

  const percentage = duration > 0 ? (currentTime / duration) * 100 : 0

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
    
    const handleMouseMove = (e: MouseEvent) => {
      if (!barRef.current || !duration) return
      const rect = barRef.current.getBoundingClientRect()
      const percentage = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
      setPreviewTime(duration * percentage)
      setPreviewPosition(e.clientX - rect.left)
    }
    
    const handleMouseUp = (e: MouseEvent) => {
      if (!barRef.current || !duration) return
      const rect = barRef.current.getBoundingClientRect()
      const percentage = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
      onSeek(percentage)
      setIsDragging(false)
      setPreviewTime(null)
      
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
    
    handleMouseMove(e.nativeEvent)
    
    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
  }, [duration, onSeek])

  return (
    <div className="relative mb-2">
      {/* Preview tooltip */}
      {previewTime !== null && (
        <div 
          className="absolute bottom-full mb-2 -translate-x-1/2 bg-black/90 backdrop-blur-sm rounded px-2 py-1 border border-white/20 shadow-lg z-50"
          style={{ left: `${previewPosition}px` }}
        >
          <div className="text-white text-xs font-medium whitespace-nowrap">
            {formatTime(previewTime)}
          </div>
        </div>
      )}
      
      {/* Buffer progress */}
      <div 
        ref={barRef}
        className={cn(
          "relative w-full rounded-full overflow-hidden cursor-pointer group",
          heights[height]
        )}
        onMouseDown={handleMouseDown}
      >
        <div className="absolute inset-0 bg-white/20" />
        <div 
          className="absolute inset-0 bg-white/40 transition-all"
          style={{ width: `${bufferProgress}%` }}
        />
        
        {/* Playback progress */}
        <div 
          className="absolute inset-0 bg-gradient-to-r from-red-500 via-orange-500 to-yellow-500 transition-all"
          style={{ width: `${percentage}%` }}
        >
          <div className="absolute -right-1.5 -top-0.5 w-3 h-3 bg-white rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
        
        {/* Dragging indicator */}
        {isDragging && (
          <div 
            className="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-white rounded-full shadow-lg"
            style={{ left: `${previewPosition}px` }}
          />
        )}
      </div>
      
      {/* Time labels */}
      <div className="flex justify-between text-xs text-white/70 mt-1">
        <span>{formatTime(currentTime)}</span>
        <span>{formatTime(duration)}</span>
      </div>
    </div>
  )
})

ProgressBar.displayName = 'ProgressBar'

const SettingsMenu = memo(({
  playbackRate,
  activeQuality,
  qualities,
  playbackRates,
  onPlaybackRateChange,
  onQualityChange,
  onClose
}: {
  playbackRate: number
  activeQuality: string
  qualities: VideoQuality[]
  playbackRates: number[]
  onPlaybackRateChange: (rate: number) => void
  onQualityChange: (quality: string) => void
  onClose: () => void
}) => {
  const [activeTab, setActiveTab] = useState<'speed' | 'quality' | 'more'>('speed')

  return (
    <div className="absolute bottom-full right-0 mb-2 bg-black/95 backdrop-blur-md rounded-lg p-3 w-64 border border-white/20 shadow-xl z-50">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex gap-1">
          <button
            onClick={() => setActiveTab('speed')}
            className={cn(
              "px-2 py-1 text-xs rounded transition-colors",
              activeTab === 'speed' 
                ? 'bg-white/20 text-white' 
                : 'text-white/70 hover:text-white hover:bg-white/10'
            )}
          >
            Speed
          </button>
          <button
            onClick={() => setActiveTab('quality')}
            className={cn(
              "px-2 py-1 text-xs rounded transition-colors",
              activeTab === 'quality' 
                ? 'bg-white/20 text-white' 
                : 'text-white/70 hover:text-white hover:bg-white/10'
            )}
          >
            Quality
          </button>
        </div>
        <button
          onClick={onClose}
          className="p-1 hover:bg-white/10 rounded transition-colors"
          aria-label="Close settings"
        >
          <X className="w-4 h-4 text-white/70" />
        </button>
      </div>

      {/* Content */}
      <div className="max-h-60 overflow-y-auto">
        {activeTab === 'speed' && (
          <div className="space-y-2">
            <div className="text-xs text-white/70 mb-1">Playback Speed</div>
            {playbackRates.map(rate => (
              <button
                key={rate}
                onClick={() => onPlaybackRateChange(rate)}
                className={cn(
                  "w-full text-left px-3 py-2 rounded text-sm transition-colors flex items-center justify-between",
                  playbackRate === rate
                    ? 'bg-gradient-to-r from-red-500/20 to-orange-400/20 text-white'
                    : 'text-white/70 hover:text-white hover:bg-white/10'
                )}
              >
                <span>{rate === 1 ? 'Normal' : `${rate}x`}</span>
                {playbackRate === rate && <Check className="w-4 h-4" />}
              </button>
            ))}
          </div>
        )}

        {activeTab === 'quality' && (
          <div className="space-y-2">
            <div className="text-xs text-white/70 mb-1">Quality</div>
            {qualities.map(quality => (
              <button
                key={quality.id}
                onClick={() => onQualityChange(quality.id)}
                className={cn(
                  "w-full text-left px-3 py-2 rounded text-sm transition-colors flex items-center justify-between",
                  activeQuality === quality.id
                    ? 'bg-gradient-to-r from-red-500/20 to-orange-400/20 text-white'
                    : 'text-white/70 hover:text-white hover:bg-white/10'
                )}
              >
                <span>{quality.label}</span>
                {activeQuality === quality.id && <Check className="w-4 h-4" />}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
})

SettingsMenu.displayName = 'SettingsMenu'

// Main Component
const UltraFastVideoPlayer = memo(({
  src,
  poster,
  className = '',
  autoplay = false,
  preload = 'auto',
  loop = false,
  muted = false,
  playsInline = true,
  controls = true,
  defaultQuality = 'auto',
  onReady,
  onError,
  onPlay,
  onPause,
  onEnded,
  onTimeUpdate,
  onProgress,
  onFullscreenChange,
  onVolumeChange,
  onQualityChange,
  onPlaybackRateChange,
}: UltraFastVideoPlayerProps) => {
  // Refs
  const videoRef = useRef<HTMLVideoElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const playerId = useId()
  
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
    volume: 1,
    playbackRate: 1,
    bufferProgress: 0,
    activeQuality: defaultQuality,
    error: null
  })
  
  const [showControls, setShowControls] = useState(true)
  const [showSettings, setShowSettings] = useState(false)
  const [showVolumeSlider, setShowVolumeSlider] = useState(false)
  const [aspectRatio, setAspectRatio] = useState(16/9)
  const [retryCount, setRetryCount] = useState(0)
  const [isIOS, setIsIOS] = useState(false)
  
  // Hooks
  const screenInfo = useScreenInfo()
  const { isFullscreen: fsState, toggle: toggleFullscreen } = useFullscreen()
  const { isPictureInPicture: pipState, toggle: togglePictureInPicture } = usePictureInPicture(videoRef)
  
  // Check iOS on mount
  useEffect(() => {
    setIsIOS(/iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream)
  }, [])
  
  // Derived values
  const optimizedSrc = useMemo(() => {
    const srcString = Array.isArray(src) ? src[0] : src
    return optimizeUrl(srcString, state.activeQuality)
  }, [src, state.activeQuality])
  
  const uiConfig = useMemo(() => {
    if (screenInfo.isMobile) {
      return {
        buttonSize: 'sm' as const,
        progressHeight: 'sm' as const,
        controlPadding: 'p-3',
        fontSize: 'text-xs',
        centerPlaySize: 'h-16 w-16'
      }
    } else if (screenInfo.isTablet) {
      return {
        buttonSize: 'md' as const,
        progressHeight: 'md' as const,
        controlPadding: 'p-4',
        fontSize: 'text-sm',
        centerPlaySize: 'h-20 w-20'
      }
    } else if (screenInfo.isLargeDesktop) {
      return {
        buttonSize: 'lg' as const,
        progressHeight: 'lg' as const,
        controlPadding: 'p-5',
        fontSize: 'text-base',
        centerPlaySize: 'h-24 w-24'
      }
    } else if (screenInfo.isUltrawide) {
      return {
        buttonSize: 'xl' as const,
        progressHeight: 'lg' as const,
        controlPadding: 'p-6',
        fontSize: 'text-lg',
        centerPlaySize: 'h-28 w-28'
      }
    } else {
      return {
        buttonSize: 'lg' as const,
        progressHeight: 'md' as const,
        controlPadding: 'p-5',
        fontSize: 'text-sm',
        centerPlaySize: 'h-22 w-22'
      }
    }
  }, [screenInfo])
  
  // Auto-hide controls
  useEffect(() => {
    if (!showControls || 
        state.isLoading || 
        state.error || 
        !state.isPlaying || 
        showSettings || 
        state.isBuffering) return
    
    const timer = setTimeout(() => {
      setShowControls(false)
    }, screenInfo.isMobile ? 1500 : 2000)
    
    return () => clearTimeout(timer)
  }, [showControls, state.isLoading, state.error, state.isPlaying, showSettings, state.isBuffering, screenInfo.isMobile])
  
  // Sync state with hooks
  useEffect(() => {
    setState(prev => ({ ...prev, isFullscreen: fsState, isPictureInPicture: pipState }))
  }, [fsState, pipState])
  
  // Event handlers
  const handlePlay = useCallback(async () => {
    try {
      if (videoRef.current) {
        // iOS requires user interaction before play()
        if (isIOS) {
          videoRef.current.play().catch(err => {
            console.warn('iOS play failed:', err)
            setState(prev => ({ ...prev, error: 'Tap to play (iOS restriction)' }))
          })
        } else {
          await videoRef.current.play()
        }
      }
    } catch (err) {
      console.warn('Play failed:', err)
      setState(prev => ({ ...prev, error: 'Failed to play video' }))
    }
  }, [isIOS])
  
  const handlePause = useCallback(() => {
    videoRef.current?.pause()
  }, [])
  
  const togglePlay = useCallback(() => {
    if (state.isPlaying) {
      handlePause()
    } else {
      handlePlay()
    }
  }, [state.isPlaying, handlePause, handlePlay])
  
  const handleVolumeChange = useCallback((value: number) => {
    if (!videoRef.current) return
    const newVolume = Math.max(0, Math.min(1, value))
    videoRef.current.volume = newVolume
    videoRef.current.muted = newVolume === 0
    setState(prev => ({ ...prev, volume: newVolume, isMuted: newVolume === 0 }))
    onVolumeChange?.(newVolume)
    setShowVolumeSlider(true)
  }, [onVolumeChange])
  
  const toggleMute = useCallback(() => {
    if (!videoRef.current) return
    videoRef.current.muted = !videoRef.current.muted
    setState(prev => ({ ...prev, isMuted: videoRef.current!.muted }))
    setShowVolumeSlider(true)
  }, [])
  
  const handleSeek = useCallback((percentage: number) => {
    if (!videoRef.current || !state.duration) return
    const time = state.duration * Math.max(0, Math.min(1, percentage))
    videoRef.current.currentTime = time
    setState(prev => ({ ...prev, currentTime: time }))
  }, [state.duration])
  
  const handleSkip = useCallback((seconds: number) => {
    if (!videoRef.current) return
    const newTime = Math.max(0, Math.min(state.duration, videoRef.current.currentTime + seconds))
    videoRef.current.currentTime = newTime
    setState(prev => ({ ...prev, currentTime: newTime }))
  }, [state.duration])
  
  const handlePlaybackRateChange = useCallback((rate: number) => {
    if (!videoRef.current) return
    const newRate = Math.max(0.125, Math.min(8, rate))
    
    // iOS Safari doesn't support playbackRate change
    if (isIOS) {
      console.warn('iOS Safari does not support playbackRate changes')
      return
    }
    
    videoRef.current.playbackRate = newRate
    setState(prev => ({ ...prev, playbackRate: newRate }))
    setShowSettings(false)
    onPlaybackRateChange?.(newRate)
  }, [onPlaybackRateChange, isIOS])
  
  const handleQualityChange = useCallback((quality: string) => {
    setState(prev => ({ ...prev, activeQuality: quality }))
    setShowSettings(false)
    onQualityChange?.(quality)
  }, [onQualityChange])
  
  const handleRetry = useCallback(() => {
    setState(prev => ({ ...prev, error: null, isLoading: true }))
    setRetryCount(prev => prev + 1)
    
    if (videoRef.current) {
      videoRef.current.load()
      if (!isIOS) {
        videoRef.current.play().catch(() => {})
      }
    }
  }, [isIOS])
  
  // Video event handlers
  const handleVideoEvents = useCallback(() => {
    const video = videoRef.current
    if (!video) return
    
    const events = {
      loadstart: () => setState(prev => ({ ...prev, isLoading: true, error: null })),
      loadedmetadata: () => {
        const width = video.videoWidth || 1920
        const height = video.videoHeight || 1080
        setAspectRatio(width / height)
        setState(prev => ({ 
          ...prev, 
          duration: video.duration || 0 
        }))
      },
      canplay: () => {
        setState(prev => ({ ...prev, isLoading: false, isBuffering: false }))
        onReady?.()
        if (autoplay && !isIOS) {
          handlePlay()
        }
      },
      playing: () => {
        setState(prev => ({ ...prev, isPlaying: true, isBuffering: false }))
        onPlay?.()
      },
      pause: () => {
        setState(prev => ({ ...prev, isPlaying: false }))
        onPause?.()
      },
      timeupdate: () => {
        setState(prev => ({ ...prev, currentTime: video.currentTime }))
        onTimeUpdate?.(video.currentTime)
      },
      waiting: () => {
        setState(prev => ({ ...prev, isBuffering: true }))
      },
      progress: () => {
        if (video.buffered.length > 0 && state.duration > 0) {
          const bufferedEnd = video.buffered.end(video.buffered.length - 1)
          const bufferedPercent = (bufferedEnd / state.duration) * 100
          setState(prev => ({ ...prev, bufferProgress: bufferedPercent }))
          onProgress?.(bufferedPercent)
        }
      },
      ended: () => {
        setState(prev => ({ ...prev, isPlaying: false }))
        onEnded?.()
      },
      error: () => {
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
        
        setState(prev => ({ ...prev, error: errorMsg, isLoading: false }))
        onError?.(errorMsg)
      },
      volumechange: () => {
        setState(prev => ({ 
          ...prev, 
          volume: video.volume,
          isMuted: video.muted 
        }))
      }
    }
    
    // Add event listeners
    Object.entries(events).forEach(([event, handler]) => {
      video.addEventListener(event, handler as EventListener)
    })
    
    return () => {
      Object.entries(events).forEach(([event, handler]) => {
        video.removeEventListener(event, handler as EventListener)
      })
    }
  }, [
    autoplay, handlePlay, onReady, onPlay, onPause, 
    onTimeUpdate, onProgress, onEnded, onError, state.duration, isIOS
  ])
  
  // Initialize video
  useEffect(() => {
    const video = videoRef.current
    if (!video || !optimizedSrc) return
    
    // Configure video for iOS
    video.setAttribute('playsinline', 'true')
    video.setAttribute('webkit-playsinline', 'true')
    video.setAttribute('x-webkit-airplay', 'allow')
    video.setAttribute('x5-video-player-type', 'h5-page')
    video.setAttribute('x5-video-orientation', 'landscape|portrait')
    video.setAttribute('preload', preload)
    
    // iOS specific settings
    if (isIOS) {
      video.defaultMuted = true
      video.muted = true
      setState(prev => ({ ...prev, isMuted: true }))
    } else {
      video.muted = state.isMuted
      video.volume = state.volume
    }
    
    video.src = optimizedSrc
    video.poster = poster || ''
    video.loop = loop
    video.playbackRate = state.playbackRate
    
    // Set crossOrigin for external URLs
    try {
      const url = new URL(optimizedSrc)
      if (url.hostname !== window.location.hostname) {
        video.crossOrigin = 'anonymous'
      }
    } catch {}
    
    // Setup event listeners
    const cleanup = handleVideoEvents()
    
    // Load video
    video.load()
    
    // iOS autoplay workaround
    if (autoplay && !isIOS) {
      const playPromise = video.play()
      if (playPromise !== undefined) {
        playPromise.catch(() => {
          // Auto-play was prevented
          console.log('Autoplay prevented')
        })
      }
    }
    
    return () => {
      cleanup?.()
      video.src = ''
      video.removeAttribute('src')
    }
  }, [optimizedSrc, poster, preload, loop, retryCount, handleVideoEvents, autoplay, isIOS])
  
  // Keyboard shortcuts - disable for iOS
  useEffect(() => {
    if (isIOS) return // iOS doesn't support keyboard events in video
    
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!containerRef.current?.contains(document.activeElement) && !state.isFullscreen) return
      
      switch (e.key.toLowerCase()) {
        case ' ':
        case 'k':
          e.preventDefault()
          togglePlay()
          break
        case 'm':
          e.preventDefault()
          toggleMute()
          break
        case 'f':
          e.preventDefault()
          if (containerRef.current) toggleFullscreen(containerRef.current)
          break
        case 'arrowleft':
          e.preventDefault()
          handleSkip(-5)
          break
        case 'arrowright':
          e.preventDefault()
          handleSkip(5)
          break
        case 'arrowup':
          e.preventDefault()
          handleVolumeChange(state.volume + 0.1)
          break
        case 'arrowdown':
          e.preventDefault()
          handleVolumeChange(state.volume - 0.1)
          break
        case '>':
        case '.':
          e.preventDefault()
          handleSkip(10)
          break
        case '<':
        case ',':
          e.preventDefault()
          handleSkip(-10)
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
          handleSeek(parseInt(e.key) / 10)
          break
      }
    }
    
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [togglePlay, toggleMute, toggleFullscreen, handleSkip, handleVolumeChange, 
      handleSeek, togglePictureInPicture, state.volume, state.isFullscreen, isIOS])
  
  // Handle user interaction
  const handleInteraction = useCallback(() => {
    setShowControls(true)
    if (showVolumeSlider) {
      const timer = setTimeout(() => setShowVolumeSlider(false), 2000)
      return () => clearTimeout(timer)
    }
  }, [showVolumeSlider])
  
  // Error state
  if (state.error) {
    return (
      <div 
        ref={containerRef}
        className={cn(
          "relative bg-black rounded-2xl overflow-hidden flex items-center justify-center",
          state.isFullscreen && "fixed inset-0 z-50 rounded-none",
          className
        )}
        style={!state.isFullscreen ? { aspectRatio } : undefined}
      >
        <div className="text-center p-6 max-w-md">
          <div className="w-16 h-16 bg-gradient-to-br from-red-500/20 to-orange-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="w-8 h-8 text-amber-400" />
          </div>
          
          <h3 className="text-white text-lg font-bold mb-2">
            Playback Error
          </h3>
          
          <p className="text-white/70 text-sm mb-4">{state.error}</p>
          
          <Button
            onClick={handleRetry}
            className="bg-gradient-to-r from-red-600 to-orange-500 hover:from-red-700 hover:to-orange-600 text-white"
          >
            <RotateCw className="w-4 h-4 mr-2" />
            Retry
          </Button>
          
          {isIOS && (
            <p className="text-white/50 text-xs mt-4">
              iOS may require user interaction to play video
            </p>
          )}
        </div>
      </div>
    )
  }
  
  return (
    <div 
      ref={containerRef}
      className={cn(
        "relative bg-black rounded-2xl overflow-hidden group focus:outline-none",
        state.isFullscreen && "fixed inset-0 z-50 rounded-none",
        className
      )}
      style={!state.isFullscreen ? { aspectRatio } : undefined}
      onMouseMove={handleInteraction}
      onTouchStart={handleInteraction}
      onClick={handleInteraction}
      tabIndex={0}
      role="region"
      aria-label="Video player"
    >
      {/* Video element */}
      <video
        ref={videoRef}
        className="w-full h-full object-contain"
        playsInline={playsInline}
        controls={false}
        preload={preload}
        poster={poster}
        aria-label="Video content"
        muted={state.isMuted}
      />
      
      {/* Loading overlay */}
      {state.isLoading && (
        <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center">
          <Loader2 className="w-12 h-12 text-white animate-spin" />
          {state.bufferProgress > 0 && (
            <div className="w-48 mt-4">
              <div className="w-full h-1.5 bg-white/20 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-blue-500 to-cyan-400 transition-all"
                  style={{ width: `${state.bufferProgress}%` }}
                />
              </div>
            </div>
          )}
        </div>
      )}
      
      {/* Center play button - always show for iOS if not playing */}
      {(!state.isPlaying || (isIOS && !state.isPlaying)) && !state.isLoading && !state.error && (
        <div 
          className="absolute inset-0 flex items-center justify-center"
          onClick={togglePlay}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === 'Enter' && togglePlay()}
        >
          <div className={cn(
            "bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center transition-all hover:scale-110 cursor-pointer",
            uiConfig.centerPlaySize
          )}>
            <Play className="w-8 h-8 text-white ml-1" />
          </div>
        </div>
      )}
      
      {/* Controls */}
      {controls && (
        <div 
          className={cn(
            "absolute inset-0 transition-opacity duration-200",
            showControls ? "opacity-100" : "opacity-0",
            "pointer-events-none"
          )}
        >
          {/* Top gradient */}
          <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-black/80 to-transparent" />
          
          {/* Bottom controls */}
          <div 
            className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/95 via-black/70 to-transparent pointer-events-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className={uiConfig.controlPadding}>
              {/* Progress bar */}
              <ProgressBar
                currentTime={state.currentTime}
                duration={state.duration}
                bufferProgress={state.bufferProgress}
                onSeek={handleSeek}
                height={uiConfig.progressHeight}
              />
              
              {/* Control buttons */}
              <div className="flex items-center justify-between">
                {/* Left side */}
                <div className="flex items-center gap-2">
                  <PlayPauseButton
                    isPlaying={state.isPlaying}
                    onClick={togglePlay}
                    size={uiConfig.buttonSize}
                  />
                  
                  <Button
                    onClick={() => handleSkip(-10)}
                    className={cn(
                      "bg-white/10 backdrop-blur-sm hover:bg-white/20 text-white rounded-full p-0 transition-all hover:scale-110 active:scale-95",
                      uiConfig.buttonSize === 'sm' ? 'h-9 w-9' :
                      uiConfig.buttonSize === 'md' ? 'h-10 w-10' :
                      uiConfig.buttonSize === 'lg' ? 'h-12 w-12' : 'h-14 w-14'
                    )}
                    aria-label="Skip back 10 seconds"
                  >
                    <SkipBack className={
                      uiConfig.buttonSize === 'sm' ? 'h-4 w-4' :
                      uiConfig.buttonSize === 'md' ? 'h-5 w-5' :
                      uiConfig.buttonSize === 'lg' ? 'h-6 w-6' : 'h-7 w-7'
                    } />
                  </Button>
                  
                  <Button
                    onClick={() => handleSkip(10)}
                    className={cn(
                      "bg-white/10 backdrop-blur-sm hover:bg-white/20 text-white rounded-full p-0 transition-all hover:scale-110 active:scale-95",
                      uiConfig.buttonSize === 'sm' ? 'h-9 w-9' :
                      uiConfig.buttonSize === 'md' ? 'h-10 w-10' :
                      uiConfig.buttonSize === 'lg' ? 'h-12 w-12' : 'h-14 w-14'
                    )}
                    aria-label="Skip forward 10 seconds"
                  >
                    <SkipForward className={
                      uiConfig.buttonSize === 'sm' ? 'h-4 w-4' :
                      uiConfig.buttonSize === 'md' ? 'h-5 w-5' :
                      uiConfig.buttonSize === 'lg' ? 'h-6 w-6' : 'h-7 w-7'
                    } />
                  </Button>
                  
                  <VolumeControl
                    volume={state.volume}
                    isMuted={state.isMuted}
                    onVolumeChange={handleVolumeChange}
                    onToggleMute={toggleMute}
                    showSlider={showVolumeSlider && !screenInfo.isMobile}
                    size={uiConfig.buttonSize}
                  />
                  
                  {/* Time display */}
                  <div className={cn("text-white/70 hidden sm:block", uiConfig.fontSize)}>
                    {formatTime(state.currentTime)} / {formatTime(state.duration)}
                  </div>
                </div>
                
                {/* Right side */}
                <div className="flex items-center gap-2">
                  {/* Settings - disable playback rate for iOS */}
                  {!isIOS && (
                    <div className="relative">
                      <Button
                        onClick={() => setShowSettings(!showSettings)}
                        className={cn(
                          "bg-white/10 backdrop-blur-sm hover:bg-white/20 text-white rounded-full p-0 transition-all hover:scale-110 active:scale-95",
                          uiConfig.buttonSize === 'sm' ? 'h-9 w-9' :
                          uiConfig.buttonSize === 'md' ? 'h-10 w-10' :
                          uiConfig.buttonSize === 'lg' ? 'h-12 w-12' : 'h-14 w-14'
                        )}
                        aria-label="Settings"
                      >
                        <Settings className={
                          uiConfig.buttonSize === 'sm' ? 'h-4 w-4' :
                          uiConfig.buttonSize === 'md' ? 'h-5 w-5' :
                          uiConfig.buttonSize === 'lg' ? 'h-6 w-6' : 'h-7 w-7'
                        } />
                      </Button>
                      
                      {showSettings && (
                        <SettingsMenu
                          playbackRate={state.playbackRate}
                          activeQuality={state.activeQuality}
                          qualities={QUALITIES}
                          playbackRates={PLAYBACK_RATES}
                          onPlaybackRateChange={handlePlaybackRateChange}
                          onQualityChange={handleQualityChange}
                          onClose={() => setShowSettings(false)}
                        />
                      )}
                    </div>
                  )}
                  
                  {/* Picture in Picture */}
                  {document.pictureInPictureEnabled && !isIOS && (
                    <Button
                      onClick={togglePictureInPicture}
                      className={cn(
                        "bg-white/10 backdrop-blur-sm hover:bg-white/20 text-white rounded-full p-0 transition-all hover:scale-110 active:scale-95",
                        uiConfig.buttonSize === 'sm' ? 'h-9 w-9' :
                        uiConfig.buttonSize === 'md' ? 'h-10 w-10' :
                        uiConfig.buttonSize === 'lg' ? 'h-12 w-12' : 'h-14 w-14'
                      )}
                      aria-label="Picture in Picture"
                    >
                      <PictureInPicture className={
                        uiConfig.buttonSize === 'sm' ? 'h-4 w-4' :
                        uiConfig.buttonSize === 'md' ? 'h-5 w-5' :
                        uiConfig.buttonSize === 'lg' ? 'h-6 w-6' : 'h-7 w-7'
                      } />
                    </Button>
                  )}
                  
                  {/* Fullscreen */}
                  <Button
                    onClick={() => containerRef.current && toggleFullscreen(containerRef.current)}
                    className={cn(
                      "bg-white/10 backdrop-blur-sm hover:bg-white/20 text-white rounded-full p-0 transition-all hover:scale-110 active:scale-95",
                      uiConfig.buttonSize === 'sm' ? 'h-9 w-9' :
                      uiConfig.buttonSize === 'md' ? 'h-10 w-10' :
                      uiConfig.buttonSize === 'lg' ? 'h-12 w-12' : 'h-14 w-14'
                    )}
                    aria-label={state.isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
                  >
                    {state.isFullscreen ? (
                      <Minimize2 className={
                        uiConfig.buttonSize === 'sm' ? 'h-4 w-4' :
                        uiConfig.buttonSize === 'md' ? 'h-5 w-5' :
                        uiConfig.buttonSize === 'lg' ? 'h-6 w-6' : 'h-7 w-7'
                      } />
                    ) : (
                      <Expand className={
                        uiConfig.buttonSize === 'sm' ? 'h-4 w-4' :
                        uiConfig.buttonSize === 'md' ? 'h-5 w-5' :
                        uiConfig.buttonSize === 'lg' ? 'h-6 w-6' : 'h-7 w-7'
                      } />
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Mobile volume slider */}
      {screenInfo.isMobile && showVolumeSlider && (
        <div className="absolute bottom-20 left-1/2 -translate-x-1/2 bg-black/90 backdrop-blur-sm rounded-lg p-3 w-48">
          <div className="flex items-center gap-3">
            {state.isMuted || state.volume === 0 ? (
              <VolumeX className="w-5 h-5 text-white/70" />
            ) : (
              <Volume2 className="w-5 h-5 text-white/70" />
            )}
            <div 
              className="flex-1 h-2 bg-white/30 rounded-full cursor-pointer relative"
              onClick={(e) => {
                const rect = e.currentTarget.getBoundingClientRect()
                const percentage = (e.clientX - rect.left) / rect.width
                handleVolumeChange(percentage)
              }}
            >
              <div 
                className="absolute top-0 left-0 h-full bg-gradient-to-r from-red-500 to-orange-400 rounded-full"
                style={{ width: `${state.isMuted ? 0 : state.volume * 100}%` }}
              >
                <div className="absolute -right-1 -top-0.5 w-4 h-4 bg-white rounded-full shadow-lg" />
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* iOS specific message */}
      {isIOS && !state.isPlaying && !state.isLoading && !state.error && (
        <div className="absolute bottom-24 left-1/2 -translate-x-1/2 bg-black/80 backdrop-blur-sm rounded-lg px-4 py-2">
          <p className="text-white text-sm text-center">Tap to play</p>
        </div>
      )}
    </div>
  )
})

UltraFastVideoPlayer.displayName = 'UltraFastVideoPlayer'

export default UltraFastVideoPlayer