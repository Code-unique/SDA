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
  Clock,
  Zap,
  RefreshCw,
  Download,
  Smartphone,
  Globe
} from 'lucide-react'
import { Button } from './button'
import { cn } from '@/lib/utils'
import dynamic from 'next/dynamic'

// ==================== TYPES ====================
export interface VideoPlayerProps {
  /** Video source URL or array of URLs for different qualities */
  src: string | string[]
  /** Poster image URL */
  poster?: string
  /** Additional CSS classes */
  className?: string
  /** Auto-play video on load */
  autoplay?: boolean
  /** Preload strategy */
  preload?: 'auto' | 'metadata' | 'none'
  /** Loop video */
  loop?: boolean
  /** Mute video */
  muted?: boolean
  /** Enable inline playback on iOS */
  playsInline?: boolean
  /** Show controls */
  controls?: boolean
  /** Default quality level */
  defaultQuality?: string
  /** Callback when video is ready */
  onReady?: () => void
  /** Callback when error occurs */
  onError?: (error: string) => void
  /** Callback when playback starts */
  onPlay?: () => void
  /** Callback when playback pauses */
  onPause?: () => void
  /** Callback when playback ends */
  onEnded?: () => void
  /** Callback on time update */
  onTimeUpdate?: (time: number) => void
  /** Callback on buffer progress */
  onProgress?: (buffered: number) => void
  /** Callback on fullscreen change */
  onFullscreenChange?: (isFullscreen: boolean) => void
  /** Callback on volume change */
  onVolumeChange?: (volume: number) => void
  /** Callback on quality change */
  onQualityChange?: (quality: string) => void
  /** Callback on playback rate change */
  onPlaybackRateChange?: (rate: number) => void
  /** Aspect ratio (default: 16/9) */
  aspectRatio?: number
  /** Custom styles */
  style?: CSSProperties
  /** Enable HLS.js for streaming (for .m3u8) */
  enableHLS?: boolean
  /** Force specific format conversion (mp4, webm, etc) */
  forceFormat?: string
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
  lastPlayTime: number
  isIOS: boolean
  isSafari: boolean
  isChromeIOS: boolean
  supportsPlaybackRate: boolean
}

interface UIConfig {
  buttonSize: 'sm' | 'md' | 'lg'
  progressHeight: 'sm' | 'md' | 'lg'
  controlPadding: string
  fontSize: string
  centerPlaySize: string
}

interface ScreenInfo {
  isMobile: boolean
  isIOS: boolean
  isSafari: boolean
  isChromeIOS: boolean
  isAndroid: boolean
  isChrome: boolean
  isFirefox: boolean
  supportsPiP: boolean
  supportsFullscreen: boolean
  width: number
}

// Constants
const PLAYBACK_RATES = [0.5, 0.75, 1, 1.25, 1.5, 2] as const
const MOBILE_BREAKPOINT = 768
const DEFAULT_ASPECT_RATIO = 16 / 9

// Helper functions
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

// Browser detection utilities
const detectBrowser = () => {
  if (typeof navigator === 'undefined') {
    return {
      isIOS: false,
      isSafari: false,
      isChromeIOS: false,
      isAndroid: false,
      isChrome: false,
      isFirefox: false,
      userAgent: ''
    }
  }

  const userAgent = navigator.userAgent.toLowerCase()
  
  return {
    isIOS: /iPad|iPhone|iPod/.test(userAgent) && !(window as any).MSStream,
    isSafari: /^((?!chrome|android).)*safari/i.test(userAgent),
    isChromeIOS: /crios/.test(userAgent),
    isAndroid: /android/.test(userAgent),
    isChrome: /chrome/.test(userAgent) && !/edge/.test(userAgent),
    isFirefox: /firefox/.test(userAgent),
    userAgent
  }
}

// MOV format detection and conversion helper
const optimizeVideoUrl = (url: string, forceFormat?: string): string => {
  if (!url) return url
  
  const browser = detectBrowser()
  const urlLower = url.toLowerCase()
  
  // If forceFormat is specified, add it as a query param
  if (forceFormat) {
    const urlObj = new URL(url)
    urlObj.searchParams.set('format', forceFormat)
    return urlObj.toString()
  }
  
  // Handle MOV files for non-Safari browsers
  if (urlLower.endsWith('.mov') && !browser.isSafari) {
    console.warn('MOV format detected on non-Safari browser. Consider converting to MP4 for better compatibility.')
    
    // For Chrome on iOS, we need to handle specially
    if (browser.isChromeIOS) {
      // Try to serve MP4 version if available
      const mp4Url = url.replace(/\.mov$/i, '.mp4')
      return mp4Url
    }
    
    // For other browsers, add quality param
    const urlObj = new URL(url)
    urlObj.searchParams.set('q', 'high')
    return urlObj.toString()
  }
  
  // Add cache busting for iOS to prevent stale video cache
  if (browser.isIOS) {
    const urlObj = new URL(url)
    if (!urlObj.searchParams.has('_')) {
      urlObj.searchParams.set('_', Date.now().toString())
    }
    return urlObj.toString()
  }
  
  return url
}

// Custom hooks
const useScreenInfo = (): ScreenInfo => {
  const [screenInfo, setScreenInfo] = useState<ScreenInfo>({
    isMobile: false,
    isIOS: false,
    isSafari: false,
    isChromeIOS: false,
    isAndroid: false,
    isChrome: false,
    isFirefox: false,
    supportsPiP: false,
    supportsFullscreen: false,
    width: typeof window !== 'undefined' ? window.innerWidth : 1920
  })

  useEffect(() => {
    const updateScreenInfo = () => {
      const browser = detectBrowser()
      const isMobile = window.innerWidth < MOBILE_BREAKPOINT
      
      setScreenInfo({
        isMobile,
        isIOS: browser.isIOS,
        isSafari: browser.isSafari,
        isChromeIOS: browser.isChromeIOS,
        isAndroid: browser.isAndroid,
        isChrome: browser.isChrome,
        isFirefox: browser.isFirefox,
        supportsPiP: 'pictureInPictureEnabled' in document && document.pictureInPictureEnabled,
        supportsFullscreen: 'fullscreenEnabled' in document || 'webkitFullscreenEnabled' in document,
        width: window.innerWidth
      })
    }

    updateScreenInfo()
    window.addEventListener('resize', updateScreenInfo)
    return () => window.removeEventListener('resize', updateScreenInfo)
  }, [])

  return screenInfo
}

interface FullscreenHook {
  isFullscreen: boolean
  enter: () => Promise<boolean>
  exit: () => Promise<void>
  toggle: () => Promise<void>
}

const useFullscreen = (
  containerRef: React.RefObject<HTMLDivElement | null>, 
  onFullscreenChange?: (isFullscreen: boolean) => void
): FullscreenHook => {
  const [isFullscreen, setIsFullscreen] = useState(false)

  const enter = useCallback(async (): Promise<boolean> => {
    const element = containerRef.current
    if (!element) return false

    try {
      if ((element as any).webkitRequestFullscreen) {
        await (element as any).webkitRequestFullscreen()
        return true
      } else if ((element as any).mozRequestFullScreen) {
        await (element as any).mozRequestFullScreen()
        return true
      } else if ((element as any).msRequestFullscreen) {
        await (element as any).msRequestFullscreen()
        return true
      } else if (element.requestFullscreen) {
        await element.requestFullscreen()
        return true
      }
    } catch (err) {
      console.warn('Fullscreen error:', err)
    }
    return false
  }, [containerRef])

  const exit = useCallback(async (): Promise<void> => {
    try {
      if ((document as any).webkitExitFullscreen) {
        await (document as any).webkitExitFullscreen()
      } else if ((document as any).mozCancelFullScreen) {
        await (document as any).mozCancelFullScreen()
      } else if ((document as any).msExitFullscreen) {
        await (document as any).msExitFullscreen()
      } else if (document.exitFullscreen) {
        await document.exitFullscreen()
      }
    } catch (err) {
      console.warn('Fullscreen exit error:', err)
    }
  }, [])

  const toggle = useCallback(async (): Promise<void> => {
    if (isFullscreen) {
      await exit()
    } else {
      await enter()
    }
  }, [isFullscreen, enter, exit])

  useEffect(() => {
    const handleChange = () => {
      const isFs = !!(document.fullscreenElement || 
                     (document as any).webkitFullscreenElement ||
                     (document as any).mozFullScreenElement ||
                     (document as any).msFullscreenElement)
      setIsFullscreen(isFs)
      onFullscreenChange?.(isFs)
    }

    document.addEventListener('fullscreenchange', handleChange)
    document.addEventListener('webkitfullscreenchange', handleChange)
    document.addEventListener('mozfullscreenchange', handleChange)
    document.addEventListener('MSFullscreenChange', handleChange)

    return () => {
      document.removeEventListener('fullscreenchange', handleChange)
      document.removeEventListener('webkitfullscreenchange', handleChange)
      document.removeEventListener('mozfullscreenchange', handleChange)
      document.removeEventListener('MSFullscreenChange', handleChange)
    }
  }, [onFullscreenChange])

  return { isFullscreen, enter, exit, toggle }
}

interface PictureInPictureHook {
  isPictureInPicture: boolean
  toggle: () => void
}

const usePictureInPicture = (videoRef: React.RefObject<HTMLVideoElement | null>): PictureInPictureHook => {
  const [isPictureInPicture, setIsPictureInPicture] = useState(false)

  const enter = useCallback(async (): Promise<void> => {
    const video = videoRef.current
    if (video && 'pictureInPictureEnabled' in document && document.pictureInPictureEnabled) {
      try {
        await video.requestPictureInPicture()
      } catch (err) {
        console.warn('PiP error:', err)
      }
    }
  }, [videoRef])

  const exit = useCallback(async (): Promise<void> => {
    if (document.pictureInPictureElement) {
      try {
        await document.exitPictureInPicture()
      } catch (err) {
        console.warn('PiP exit error:', err)
      }
    }
  }, [])

  const toggle = useCallback((): void => {
    if (isPictureInPicture) {
      exit()
    } else {
      enter()
    }
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

  return { isPictureInPicture, toggle }
}

// ==================== MEMOIZED COMPONENTS ====================
interface PlayPauseButtonProps {
  isPlaying: boolean
  onClick: () => void
  size?: 'sm' | 'md' | 'lg'
}

const PlayPauseButton = memo(({
  isPlaying,
  onClick,
  size = 'md'
}: PlayPauseButtonProps) => {
  const sizes = {
    sm: 'h-8 w-8',
    md: 'h-10 w-10',
    lg: 'h-12 w-12'
  } as const
  
  const iconSizes = {
    sm: 'h-4 w-4',
    md: 'h-5 w-5',
    lg: 'h-6 w-6'
  } as const

  return (
    <Button
      onClick={onClick}
      className={cn(
        "bg-black/70 hover:bg-black/90 text-white rounded-full p-0 transition-all duration-200 active:scale-95 shadow-lg",
        sizes[size]
      )}
      aria-label={isPlaying ? "Pause" : "Play"}
      type="button"
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

interface VolumeControlProps {
  volume: number
  isMuted: boolean
  onVolumeChange: (value: number) => void
  onToggleMute: () => void
  size?: 'sm' | 'md' | 'lg'
}

const VolumeControl = memo(({
  volume,
  isMuted,
  onVolumeChange,
  onToggleMute,
  size = 'md'
}: VolumeControlProps) => {
  const sliderRef = useRef<HTMLDivElement>(null)
  
  const sizes = {
    sm: 'h-8 w-8',
    md: 'h-9 w-9',
    lg: 'h-10 w-10'
  } as const
  
  const iconSizes = {
    sm: 'h-4 w-4',
    md: 'h-4 w-4',
    lg: 'h-5 w-5'
  } as const

  const handleClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const rect = sliderRef.current?.getBoundingClientRect()
    if (!rect) return
    
    const percentage = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
    onVolumeChange(percentage)
  }, [onVolumeChange])

  return (
    <div className="flex items-center gap-2 group/volume">
      <Button
        onClick={onToggleMute}
        className={cn(
          "bg-black/70 hover:bg-black/90 text-white rounded-full p-0 transition-all duration-200 active:scale-95 shadow-lg",
          sizes[size]
        )}
        aria-label={isMuted ? "Unmute" : "Mute"}
        type="button"
      >
        {isMuted || volume === 0 ? (
          <VolumeX className={iconSizes[size]} />
        ) : volume < 0.5 ? (
          <Volume2 className={cn(iconSizes[size], "text-white/80")} />
        ) : (
          <Volume2 className={iconSizes[size]} />
        )}
      </Button>
      
      <div 
        ref={sliderRef}
        className="w-20 h-1.5 bg-white/30 rounded-full cursor-pointer relative opacity-0 group-hover/volume:opacity-100 transition-opacity duration-200"
        onClick={handleClick}
        role="slider"
        aria-label="Volume"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={isMuted ? 0 : volume * 100}
        tabIndex={0}
      >
        <div 
          className="absolute top-0 left-0 h-full bg-gradient-to-r from-blue-500 to-cyan-400 rounded-full transition-all duration-150"
          style={{ width: `${isMuted ? 0 : volume * 100}%` }}
        >
          <div className="absolute -right-1 -top-0.5 w-3 h-3 bg-white rounded-full shadow" />
        </div>
      </div>
    </div>
  )
})

VolumeControl.displayName = 'VolumeControl'

interface ProgressBarProps {
  currentTime: number
  duration: number
  bufferProgress: number
  onSeek: (percentage: number) => void
  height?: 'sm' | 'md' | 'lg'
}

const ProgressBar = memo(({
  currentTime,
  duration,
  bufferProgress,
  onSeek,
  height = 'md'
}: ProgressBarProps) => {
  const barRef = useRef<HTMLDivElement>(null)

  const heights = {
    sm: 'h-1.5',
    md: 'h-2',
    lg: 'h-2.5'
  } as const

  const percentage = duration > 0 ? (currentTime / duration) * 100 : 0

  const handleClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!barRef.current || !duration) return
    const rect = barRef.current.getBoundingClientRect()
    const clickX = e.clientX - rect.left
    const percentage = Math.max(0, Math.min(1, clickX / rect.width))
    onSeek(percentage)
  }, [duration, onSeek])

  return (
    <div className="relative mb-1.5">
      <div 
        ref={barRef}
        className={cn(
          "relative w-full rounded-full overflow-hidden cursor-pointer group",
          heights[height]
        )}
        onClick={handleClick}
        role="slider"
        aria-label="Progress"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percentage}
        tabIndex={0}
      >
        <div className="absolute inset-0 bg-white/20" />
        <div 
          className="absolute inset-0 bg-white/30 transition-all duration-300"
          style={{ width: `${bufferProgress}%` }}
        />
        
        <div 
          className="absolute inset-0 bg-gradient-to-r from-blue-500 via-cyan-400 to-teal-400 transition-all duration-150"
          style={{ width: `${percentage}%` }}
        />
        
        {/* Hover thumb */}
        <div 
          className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200"
          style={{ left: `${percentage}%`, marginLeft: '-6px' }}
        />
      </div>
      
      <div className="flex justify-between text-xs text-white/80 mt-1.5">
        <span className="font-medium">{formatTime(currentTime)}</span>
        <span className="font-medium">{formatTime(duration)}</span>
      </div>
    </div>
  )
})

ProgressBar.displayName = 'ProgressBar'

interface SettingsMenuProps {
  playbackRate: number
  playbackRates: readonly number[]
  onPlaybackRateChange: (rate: number) => void
  onClose: () => void
  isIOS: boolean
  isChromeIOS: boolean
}

const SettingsMenu = memo(({
  playbackRate,
  playbackRates,
  onPlaybackRateChange,
  onClose,
  isIOS,
  isChromeIOS
}: SettingsMenuProps) => {
  const canChangePlaybackRate = !isChromeIOS && (!isIOS || playbackRates.includes(1))

  return (
    <div className="absolute bottom-full right-0 mb-2 bg-black/95 backdrop-blur-xl rounded-xl p-3 w-48 border border-white/10 shadow-2xl z-50 animate-in fade-in slide-in-from-bottom-2">
      <div className="flex items-center justify-between mb-2">
        <div className="text-xs text-white/70 flex items-center gap-1.5">
          <Zap className="w-3 h-3" />
          Playback Speed
        </div>
        <button
          onClick={onClose}
          className="p-1 hover:bg-white/10 rounded-lg transition-colors duration-150"
          aria-label="Close settings"
          type="button"
        >
          <X className="w-3.5 h-3.5 text-white/70" />
        </button>
      </div>

      <div className="space-y-1">
        {playbackRates.map(rate => (
          <button
            key={rate}
            onClick={() => canChangePlaybackRate && onPlaybackRateChange(rate)}
            disabled={!canChangePlaybackRate}
            className={cn(
              "w-full text-left px-3 py-2 rounded-lg text-sm transition-all duration-200 flex items-center justify-between disabled:opacity-50 disabled:cursor-not-allowed",
              playbackRate === rate
                ? 'bg-gradient-to-r from-blue-500/30 to-cyan-400/30 text-white shadow-inner'
                : 'text-white/70 hover:text-white hover:bg-white/10 active:scale-95'
            )}
            type="button"
          >
            <div className="flex items-center gap-2">
              <span>{rate === 1 ? 'Normal' : `${rate}x`}</span>
              {!canChangePlaybackRate && rate !== 1 && (
                <span className="text-xs text-amber-400/70">(iOS)</span>
              )}
            </div>
            {playbackRate === rate && <Check className="w-4 h-4" />}
          </button>
        ))}
      </div>
      
      {!canChangePlaybackRate && (
        <div className="mt-2 pt-2 border-t border-white/10">
          <p className="text-xs text-white/50 text-center">
            Playback speed changes limited on iOS
          </p>
        </div>
      )}
    </div>
  )
})

SettingsMenu.displayName = 'SettingsMenu'

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
  aspectRatio = DEFAULT_ASPECT_RATIO,
  style,
  forceFormat
}: VideoPlayerProps) => {
  // Refs
  const videoRef = useRef<HTMLVideoElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const lastPlayPositionRef = useRef<number>(0)
  const isSeekingRef = useRef<boolean>(false)
  const playAttemptsRef = useRef<number>(0)
  
  // Get browser info once
  const browserInfo = useMemo(() => detectBrowser(), [])
  
  // State
  const [state, setState] = useState<PlayerState>(() => ({
    isLoading: true,
    isPlaying: false,
    isBuffering: false,
    isFullscreen: false,
    isPictureInPicture: false,
    isMuted: muted,
    currentTime: 0,
    duration: 0,
    volume: 0.7,
    playbackRate: 1,
    bufferProgress: 0,
    error: null,
    lastPlayTime: 0,
    isIOS: browserInfo.isIOS,
    isSafari: browserInfo.isSafari,
    isChromeIOS: browserInfo.isChromeIOS,
    supportsPlaybackRate: !browserInfo.isChromeIOS && (!browserInfo.isIOS || browserInfo.isSafari)
  }))
  
  const [showControls, setShowControls] = useState(true)
  const [showSettings, setShowSettings] = useState(false)
  const [isHovering, setIsHovering] = useState(false)
  const controlsTimerRef = useRef<NodeJS.Timeout | null>(null)
  const bufferTimerRef = useRef<NodeJS.Timeout | null>(null)
  const retryCountRef = useRef<number>(0)
  
  // Hooks
  const screenInfo = useScreenInfo()
  const { isFullscreen: fsState, toggle: toggleFullscreen } = useFullscreen(containerRef, onFullscreenChange)
  const { isPictureInPicture: pipState, toggle: togglePictureInPicture } = usePictureInPicture(videoRef)
  
  // Get the optimized video source
  const videoSrc = useMemo(() => {
    if (Array.isArray(src)) {
      // For iOS, prefer MP4 format if available
      if (state.isIOS || state.isSafari) {
        const mp4Src = src.find(s => s.toLowerCase().endsWith('.mp4'))
        return optimizeVideoUrl(mp4Src || src[0], forceFormat)
      }
      return optimizeVideoUrl(src[0], forceFormat)
    }
    return optimizeVideoUrl(src, forceFormat)
  }, [src, forceFormat, state.isIOS, state.isSafari])
  
  const uiConfig = useMemo((): UIConfig => {
    if (screenInfo.isMobile) {
      return {
        buttonSize: 'sm',
        progressHeight: 'sm',
        controlPadding: 'p-3',
        fontSize: 'text-xs',
        centerPlaySize: 'h-14 w-14'
      }
    } else {
      return {
        buttonSize: 'md',
        progressHeight: 'md',
        controlPadding: 'p-4',
        fontSize: 'text-sm',
        centerPlaySize: 'h-16 w-16'
      }
    }
  }, [screenInfo.isMobile])
  
  // Reset controls timer
  const resetControlsTimer = useCallback(() => {
    if (controlsTimerRef.current) {
      clearTimeout(controlsTimerRef.current)
    }
    
    if (state.isPlaying && !showSettings && !isHovering) {
      controlsTimerRef.current = setTimeout(() => {
        setShowControls(false)
      }, 3000)
    }
  }, [state.isPlaying, showSettings, isHovering])
  
  // Auto-hide controls
  useEffect(() => {
    resetControlsTimer()
    
    return () => {
      if (controlsTimerRef.current) {
        clearTimeout(controlsTimerRef.current)
      }
    }
  }, [resetControlsTimer])
  
  // Sync state
  useEffect(() => {
    setState(prev => ({ 
      ...prev, 
      isFullscreen: fsState, 
      isPictureInPicture: pipState 
    }))
  }, [fsState, pipState])
  
  // Save last play position
  const saveLastPosition = useCallback((time: number) => {
    lastPlayPositionRef.current = time
    if (typeof window !== 'undefined' && videoSrc) {
      try {
        const key = `video_pos_${btoa(videoSrc).substring(0, 50)}`
        localStorage.setItem(key, time.toString())
      } catch (e) {
        // Silent fail for localStorage
      }
    }
  }, [videoSrc])
  
  // Load last play position
  const loadLastPosition = useCallback(() => {
    if (typeof window !== 'undefined' && videoSrc) {
      try {
        const key = `video_pos_${btoa(videoSrc).substring(0, 50)}`
        const saved = localStorage.getItem(key)
        if (saved) {
          const time = parseFloat(saved)
          if (!isNaN(time) && time > 0) {
            return time
          }
        }
      } catch (e) {
        // Silent fail for localStorage
      }
    }
    return 0
  }, [videoSrc])
  
  // Event handlers
  const handlePlay = useCallback(async (forcePosition?: number): Promise<void> => {
    try {
      const video = videoRef.current
      if (!video) return
      
      // iOS specific: Set currentTime BEFORE playing to prevent buffering issues
      if (state.isIOS && !isSeekingRef.current) {
        const targetTime = forcePosition !== undefined ? forcePosition : lastPlayPositionRef.current
        if (targetTime > 0 && targetTime < video.duration) {
          video.currentTime = targetTime
        }
      }
      
      const playPromise = video.play()
      
      if (playPromise !== undefined) {
        await playPromise
        setState(prev => ({ 
          ...prev, 
          isPlaying: true,
          isBuffering: false,
          error: null 
        }))
        onPlay?.()
        playAttemptsRef.current = 0
        
        // Save successful play time
        saveLastPosition(video.currentTime)
      }
    } catch (err) {
      console.error('Play failed:', err)
      
      // iOS fallback: Try with muted autoplay
      if (state.isIOS && playAttemptsRef.current < 2) {
        playAttemptsRef.current++
        const video = videoRef.current
        if (video) {
          video.muted = true
          setTimeout(() => handlePlay(forcePosition), 100)
          return
        }
      }
      
      const errorMsg = err instanceof Error ? err.message : 'Playback failed. Tap to retry.'
      setState(prev => ({ 
        ...prev, 
        error: errorMsg,
        isPlaying: false 
      }))
      onError?.(errorMsg)
    }
  }, [state.isIOS, onPlay, onError, saveLastPosition])
  
  const handlePause = useCallback((): void => {
    const video = videoRef.current
    if (!video) return
    
    // Save position before pausing
    saveLastPosition(video.currentTime)
    
    video.pause()
    setState(prev => ({ ...prev, isPlaying: false }))
    onPause?.()
  }, [onPause, saveLastPosition])
  
  const togglePlay = useCallback((): void => {
    if (state.isPlaying) {
      handlePause()
    } else {
      handlePlay()
    }
  }, [state.isPlaying, handlePause, handlePlay])
  
  const handleVolumeChange = useCallback((value: number): void => {
    const video = videoRef.current
    if (!video) return
    
    const newVolume = Math.max(0, Math.min(1, value))
    video.volume = newVolume
    video.muted = newVolume === 0
    
    setState(prev => ({ 
      ...prev, 
      volume: newVolume, 
      isMuted: newVolume === 0 
    }))
    onVolumeChange?.(newVolume)
  }, [onVolumeChange])
  
  const toggleMute = useCallback((): void => {
    const video = videoRef.current
    if (!video) return
    
    video.muted = !video.muted
    setState(prev => ({ 
      ...prev, 
      isMuted: video.muted 
    }))
  }, [])
  
  const handleSeek = useCallback((percentage: number): void => {
    const video = videoRef.current
    if (!video || !state.duration) return
    
    isSeekingRef.current = true
    const time = state.duration * Math.max(0, Math.min(1, percentage))
    video.currentTime = time
    setState(prev => ({ ...prev, currentTime: time }))
    
    // Reset seeking flag after a delay
    setTimeout(() => {
      isSeekingRef.current = false
    }, 100)
  }, [state.duration])
  
  const handleSkip = useCallback((seconds: number): void => {
    const video = videoRef.current
    if (!video) return
    
    const newTime = Math.max(0, Math.min(state.duration, video.currentTime + seconds))
    video.currentTime = newTime
    setState(prev => ({ ...prev, currentTime: newTime }))
    saveLastPosition(newTime)
  }, [state.duration, saveLastPosition])
  
  const handlePlaybackRateChange = useCallback((rate: number): void => {
    const video = videoRef.current
    if (!video) return
    
    const newRate = Math.max(0.5, Math.min(2, rate))
    
    // iOS Chrome doesn't support playbackRate
    if (state.isChromeIOS) {
      console.warn('iOS Chrome does not support playbackRate changes')
      return
    }
    
    // iOS Safari has limited support
    if (state.isIOS && !state.isSafari) {
      console.warn('iOS non-Safari browsers have limited playbackRate support')
      return
    }
    
    video.playbackRate = newRate
    setState(prev => ({ ...prev, playbackRate: newRate }))
    setShowSettings(false)
    onPlaybackRateChange?.(newRate)
  }, [onPlaybackRateChange, state.isChromeIOS, state.isIOS, state.isSafari])
  
  const handleRetry = useCallback(async (): Promise<void> => {
    const video = videoRef.current
    if (!video) return
    
    retryCountRef.current++
    
    // For iOS, try different strategies
    if (state.isIOS && retryCountRef.current > 1) {
      // Try with MP4 format if we're using MOV
      if (videoSrc.includes('.mov')) {
        const mp4Url = videoSrc.replace(/\.mov$/i, '.mp4')
        if (mp4Url !== videoSrc) {
          console.log('Retrying with MP4 format for iOS...')
          window.location.href = mp4Url
          return
        }
      }
    }
    
    setState(prev => ({ 
      ...prev, 
      error: null, 
      isLoading: true 
    }))
    
    // Clear video src and reload
    video.pause()
    video.src = ''
    video.load()
    
    // Wait a moment then set new src
    setTimeout(() => {
      video.src = videoSrc
      if (poster) video.poster = poster
      video.load()
      
      // Try to restore position
      const savedPosition = loadLastPosition()
      if (savedPosition > 0) {
        video.currentTime = savedPosition
      }
      
      // Try to play
      handlePlay(savedPosition).catch(() => {
        // Silent catch
      })
    }, 100)
  }, [videoSrc, poster, state.isIOS, handlePlay, loadLastPosition])
  
  // Setup video element
  useEffect(() => {
    const video = videoRef.current
    if (!video || !videoSrc) return
    
    // Basic video setup
    video.preload = preload
    video.playsInline = playsInline
    video.loop = loop
    video.muted = state.isMuted
    video.volume = state.volume
    
    // iOS specific: Limit playback rate to 1 for non-Safari
    if (state.isIOS && !state.isSafari) {
      video.playbackRate = 1
    } else {
      video.playbackRate = state.playbackRate
    }
    
    // iOS specific attributes
    if (state.isIOS) {
      video.setAttribute('webkit-playsinline', 'true')
      video.setAttribute('playsinline', 'true')
      video.setAttribute('x-webkit-airplay', 'allow')
    }
    
    // Android specific
    if (screenInfo.isAndroid) {
      video.setAttribute('x5-video-player-type', 'h5-page')
      video.setAttribute('x5-video-player-fullscreen', 'true')
      video.setAttribute('x5-video-orientation', 'portrait')
    }
    
    // Event handlers
    const handleLoadStart = (): void => {
      setState(prev => ({ 
        ...prev, 
        isLoading: true, 
        error: null 
      }))
    }
    
    const handleLoadedMetadata = (): void => {
      const duration = video.duration || 0
      setState(prev => ({ 
        ...prev, 
        duration
      }))
      
      // Restore last position for Android to prevent buffering from start
      if (screenInfo.isAndroid && !isSeekingRef.current) {
        const savedPosition = loadLastPosition()
        if (savedPosition > 0 && savedPosition < duration) {
          video.currentTime = savedPosition
        }
      }
    }
    
    const handleCanPlay = (): void => {
      setState(prev => ({ 
        ...prev, 
        isLoading: false, 
        isBuffering: false 
      }))
      onReady?.()
      
      // Auto-play if requested
      if (autoplay) {
        // iOS requires user interaction for autoplay
        if (state.isIOS) {
          video.muted = true
          setTimeout(() => {
            video.play().catch(() => {
              // Silent fail for iOS autoplay restrictions
            })
          }, 300)
        } else {
          setTimeout(() => {
            video.play().catch(() => {
              // Silent fail for autoplay
            })
          }, 100)
        }
      }
    }
    
    const handlePlaying = (): void => {
      setState(prev => ({ 
        ...prev, 
        isPlaying: true, 
        isBuffering: false 
      }))
      onPlay?.()
      
      // Save play time
      saveLastPosition(video.currentTime)
    }
    
    const handlePauseEvent = (): void => {
      setState(prev => ({ ...prev, isPlaying: false }))
      onPause?.()
      
      // Save pause time
      saveLastPosition(video.currentTime)
    }
    
    const handleTimeUpdate = (): void => {
      if (!isSeekingRef.current) {
        setState(prev => ({ 
          ...prev, 
          currentTime: video.currentTime 
        }))
        onTimeUpdate?.(video.currentTime)
        
        // Periodically save position (every 5 seconds)
        if (Math.floor(video.currentTime) % 5 === 0) {
          saveLastPosition(video.currentTime)
        }
      }
    }
    
    const handleWaiting = (): void => {
      setState(prev => ({ ...prev, isBuffering: true }))
      
      // Auto-resume after buffering on Android
      if (screenInfo.isAndroid && state.isPlaying) {
        if (bufferTimerRef.current) {
          clearTimeout(bufferTimerRef.current)
        }
        bufferTimerRef.current = setTimeout(() => {
          if (video.paused && state.isPlaying) {
            video.play().catch(() => {
              // Silent catch
            })
          }
        }, 500)
      }
    }
    
    const handleProgress = (): void => {
      if (video.buffered.length > 0 && state.duration > 0) {
        const bufferedEnd = video.buffered.end(video.buffered.length - 1)
        const bufferedPercent = (bufferedEnd / state.duration) * 100
        setState(prev => ({ 
          ...prev, 
          bufferProgress: bufferedPercent 
        }))
        onProgress?.(bufferedPercent)
      }
    }
    
    const handleEnded = (): void => {
      setState(prev => ({ ...prev, isPlaying: false }))
      onEnded?.()
      
      // Clear saved position
      lastPlayPositionRef.current = 0
      if (typeof window !== 'undefined' && videoSrc) {
        try {
          const key = `video_pos_${btoa(videoSrc).substring(0, 50)}`
          localStorage.removeItem(key)
        } catch (e) {
          // Silent fail
        }
      }
    }
    
    const handleErrorEvent = (): void => {
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
      
      // Check for .mov format on non-Safari browsers
      if (!state.isSafari && videoSrc.includes('.mov')) {
        errorMsg = 'MOV format detected. For best results on this browser, convert to MP4 format.'
      }
      
      setState(prev => ({ 
        ...prev, 
        error: errorMsg, 
        isLoading: false 
      }))
      onError?.(errorMsg)
    }
    
    const handleVolumeChangeEvent = (): void => {
      setState(prev => ({ 
        ...prev, 
        volume: video.volume,
        isMuted: video.muted 
      }))
    }
    
    const handleSeeked = (): void => {
      isSeekingRef.current = false
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
    video.addEventListener('error', handleErrorEvent)
    video.addEventListener('volumechange', handleVolumeChangeEvent)
    video.addEventListener('seeked', handleSeeked)
    
    // Set source AFTER adding event listeners
    video.src = videoSrc
    if (poster) video.poster = poster
    
    // Load the video
    video.load()
    
    // Pre-load saved position
    const savedPosition = loadLastPosition()
    if (savedPosition > 0) {
      setTimeout(() => {
        if (video.readyState >= 1) {
          video.currentTime = savedPosition
        }
      }, 100)
    }
    
    return () => {
      // Cleanup
      if (bufferTimerRef.current) {
        clearTimeout(bufferTimerRef.current)
      }
      
      video.removeEventListener('loadstart', handleLoadStart)
      video.removeEventListener('loadedmetadata', handleLoadedMetadata)
      video.removeEventListener('canplay', handleCanPlay)
      video.removeEventListener('playing', handlePlaying)
      video.removeEventListener('pause', handlePauseEvent)
      video.removeEventListener('timeupdate', handleTimeUpdate)
      video.removeEventListener('waiting', handleWaiting)
      video.removeEventListener('progress', handleProgress)
      video.removeEventListener('ended', handleEnded)
      video.removeEventListener('error', handleErrorEvent)
      video.removeEventListener('volumechange', handleVolumeChangeEvent)
      video.removeEventListener('seeked', handleSeeked)
      
      // Save position before cleanup
      saveLastPosition(video.currentTime)
      
      video.pause()
      video.removeAttribute('src')
      video.load()
    }
  }, [
    videoSrc, 
    poster, 
    preload, 
    loop, 
    autoplay, 
    playsInline,
    onReady, 
    onPlay, 
    onPause, 
    onTimeUpdate, 
    onProgress, 
    onEnded, 
    onError, 
    state.isMuted, 
    state.volume, 
    state.playbackRate,
    state.isIOS,
    state.isSafari,
    screenInfo.isAndroid,
    loadLastPosition,
    saveLastPosition
  ])
  
  // Handle user interaction
  const handleInteraction = useCallback((): void => {
    setShowControls(true)
    setIsHovering(true)
    resetControlsTimer()
    
    // Auto-hide hover after delay
    setTimeout(() => {
      setIsHovering(false)
    }, 2000)
  }, [resetControlsTimer])
  
  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent): void => {
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
          toggleFullscreen()
          break
        case 'arrowleft':
          e.preventDefault()
          handleSkip(-5)
          break
        case 'arrowright':
          e.preventDefault()
          handleSkip(5)
          break
        case 'escape':
          if (state.isFullscreen) {
            toggleFullscreen()
          }
          break
      }
    }
    
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [
    togglePlay, 
    toggleMute, 
    toggleFullscreen, 
    handleSkip, 
    state.isFullscreen
  ])
  
  // Error state
  if (state.error) {
    const isMovError = state.error.includes('MOV') || videoSrc.includes('.mov')
    
    return (
      <div 
        ref={containerRef}
        className={cn(
          "relative bg-gradient-to-br from-slate-900 to-black rounded-xl overflow-hidden flex items-center justify-center",
          state.isFullscreen && "fixed inset-0 z-50",
          className
        )}
        style={{
          aspectRatio,
          ...style
        }}
      >
        <div className="text-center p-6 max-w-md">
          <div className="w-16 h-16 bg-gradient-to-br from-red-500/20 to-orange-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4 backdrop-blur-sm">
            {isMovError ? (
              <AlertTriangle className="w-8 h-8 text-amber-400" />
            ) : (
              <AlertTriangle className="w-8 h-8 text-red-400" />
            )}
          </div>
          
          <h3 className="text-white text-lg font-bold mb-2">
            {isMovError ? 'Format Compatibility Notice' : 'Playback Error'}
          </h3>
          
          <p className="text-white/70 text-sm mb-6 leading-relaxed">
            {state.error}
            {isMovError && (
              <span className="block mt-2 text-xs">
                MOV files work best in Safari on iOS/Mac. For other browsers, MP4 format is recommended.
              </span>
            )}
          </p>
          
          <div className="space-y-3">
            <Button
              onClick={handleRetry}
              className="bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-700 hover:to-cyan-600 text-white text-sm w-full py-2.5 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300"
              type="button"
            >
              <RotateCw className="w-4 h-4 mr-2" />
              Retry Playback
            </Button>
            
            {isMovError && (
              <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-2">
                  <Smartphone className="w-4 h-4 text-amber-400" />
                  <span className="text-xs font-medium text-amber-300">iOS Compatibility Tip</span>
                </div>
                <p className="text-xs text-amber-200/80">
                  For smooth playback on iOS Chrome, use Safari browser or convert MOV files to MP4 format.
                </p>
              </div>
            )}
            
            {state.isIOS && !isMovError && (
              <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-2">
                  <Globe className="w-4 h-4 text-blue-400" />
                  <span className="text-xs font-medium text-blue-300">iOS Browser Tip</span>
                </div>
                <p className="text-xs text-blue-200/80">
                  Try using Safari browser for the best video playback experience on iOS.
                </p>
              </div>
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
        state.isFullscreen && "fixed inset-0 z-50 bg-black",
        className
      )}
      style={{
        aspectRatio,
        ...style
      }}
      onMouseMove={handleInteraction}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
      onTouchStart={handleInteraction}
      onClick={handleInteraction}
      tabIndex={0}
      role="region"
      aria-label="Video player"
    >
      {/* Video element */}
      <video
        ref={videoRef}
        className="w-full h-full object-contain bg-black"
        playsInline={playsInline}
        controls={false}
        preload={preload}
        poster={poster}
        muted={state.isMuted}
        autoPlay={autoplay}
        aria-label="Video content"
        disablePictureInPicture={state.isIOS && !state.isSafari}
        webkit-playsinline="true"
        x5-playsinline="true"
      />
      
      {/* Loading overlay */}
      {state.isLoading && (
        <div className="absolute inset-0 bg-black/90 flex flex-col items-center justify-center backdrop-blur-sm">
          <div className="relative">
            <Loader2 className="w-10 h-10 text-white animate-spin" />
            <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 to-cyan-400/20 blur-xl rounded-full"></div>
          </div>
          <div className="text-white text-sm mt-4 font-medium">
            Loading video...
            {state.isIOS && (
              <span className="block text-xs text-white/60 mt-1">
                Optimizing for iOS playback
              </span>
            )}
          </div>
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
            "bg-gradient-to-r from-blue-600/90 to-cyan-500/90 backdrop-blur-md rounded-full flex items-center justify-center transition-all duration-300 hover:scale-110 active:scale-95 cursor-pointer shadow-2xl hover:shadow-3xl",
            uiConfig.centerPlaySize,
            "border-2 border-white/20"
          )}>
            <Play className="w-7 h-7 text-white ml-1" />
          </div>
        </div>
      )}
      
      {/* Controls */}
      {controls && (
        <div 
          className={cn(
            "absolute inset-0 transition-all duration-300 ease-out",
            showControls ? "opacity-100" : "opacity-0",
            "pointer-events-none"
          )}
        >
          {/* Top gradient */}
          <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-black/90 via-black/50 to-transparent" />
          
          {/* Bottom controls */}
          <div 
            className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/95 via-black/80 to-transparent pointer-events-auto backdrop-blur-sm"
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
                      "bg-black/70 hover:bg-black/90 text-white rounded-full p-0 transition-all duration-200 active:scale-95 shadow-lg",
                      uiConfig.buttonSize === 'sm' ? 'h-8 w-8' :
                      uiConfig.buttonSize === 'md' ? 'h-9 w-9' :
                      'h-10 w-10'
                    )}
                    aria-label="Skip back 10 seconds"
                    type="button"
                  >
                    <SkipBack className={
                      uiConfig.buttonSize === 'sm' ? 'h-3 w-3' :
                      uiConfig.buttonSize === 'md' ? 'h-4 w-4' :
                      'h-4 w-4'
                    } />
                  </Button>
                  
                  <Button
                    onClick={() => handleSkip(10)}
                    className={cn(
                      "bg-black/70 hover:bg-black/90 text-white rounded-full p-0 transition-all duration-200 active:scale-95 shadow-lg",
                      uiConfig.buttonSize === 'sm' ? 'h-8 w-8' :
                      uiConfig.buttonSize === 'md' ? 'h-9 w-9' :
                      'h-10 w-10'
                    )}
                    aria-label="Skip forward 10 seconds"
                    type="button"
                  >
                    <SkipForward className={
                      uiConfig.buttonSize === 'sm' ? 'h-3 w-3' :
                      uiConfig.buttonSize === 'md' ? 'h-4 w-4' :
                      'h-4 w-4'
                    } />
                  </Button>
                  
                  <VolumeControl
                    volume={state.volume}
                    isMuted={state.isMuted}
                    onVolumeChange={handleVolumeChange}
                    onToggleMute={toggleMute}
                    size={uiConfig.buttonSize}
                  />
                  
                  {/* Time display */}
                  <div className={cn("text-white/90 font-medium hidden sm:block", uiConfig.fontSize)}>
                    {formatTime(state.currentTime)} / {formatTime(state.duration)}
                  </div>
                </div>
                
                {/* Right side */}
                <div className="flex items-center gap-2">
                  {/* Settings */}
                  {state.supportsPlaybackRate && (
                    <div className="relative">
                      <Button
                        onClick={() => setShowSettings(!showSettings)}
                        className={cn(
                          "bg-black/70 hover:bg-black/90 text-white rounded-full p-0 transition-all duration-200 active:scale-95 shadow-lg",
                          uiConfig.buttonSize === 'sm' ? 'h-8 w-8' :
                          uiConfig.buttonSize === 'md' ? 'h-9 w-9' :
                          'h-10 w-10'
                        )}
                        aria-label="Settings"
                        type="button"
                      >
                        <Settings className={
                          uiConfig.buttonSize === 'sm' ? 'h-3 w-3' :
                          uiConfig.buttonSize === 'md' ? 'h-4 w-4' :
                          'h-4 w-4'
                        } />
                      </Button>
                      
                      {showSettings && (
                        <SettingsMenu
                          playbackRate={state.playbackRate}
                          playbackRates={PLAYBACK_RATES}
                          onPlaybackRateChange={handlePlaybackRateChange}
                          onClose={() => setShowSettings(false)}
                          isIOS={state.isIOS}
                          isChromeIOS={state.isChromeIOS}
                        />
                      )}
                    </div>
                  )}
                  
                  {/* Picture in Picture */}
                  {screenInfo.supportsPiP && !state.isIOS && (
                    <Button
                      onClick={togglePictureInPicture}
                      className={cn(
                        "bg-black/70 hover:bg-black/90 text-white rounded-full p-0 transition-all duration-200 active:scale-95 shadow-lg",
                        uiConfig.buttonSize === 'sm' ? 'h-8 w-8' :
                        uiConfig.buttonSize === 'md' ? 'h-9 w-9' :
                        'h-10 w-10'
                      )}
                      aria-label="Picture in Picture"
                      type="button"
                    >
                      <PictureInPicture className={
                        uiConfig.buttonSize === 'sm' ? 'h-3 w-3' :
                        uiConfig.buttonSize === 'md' ? 'h-4 w-4' :
                        'h-4 w-4'
                      } />
                    </Button>
                  )}
                  
                  {/* Fullscreen */}
                  {screenInfo.supportsFullscreen && (
                    <Button
                      onClick={toggleFullscreen}
                      className={cn(
                        "bg-black/70 hover:bg-black/90 text-white rounded-full p-0 transition-all duration-200 active:scale-95 shadow-lg",
                        uiConfig.buttonSize === 'sm' ? 'h-8 w-8' :
                        uiConfig.buttonSize === 'md' ? 'h-9 w-9' :
                        'h-10 w-10'
                      )}
                      aria-label={state.isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
                      type="button"
                    >
                      {state.isFullscreen ? (
                        <Minimize2 className={
                          uiConfig.buttonSize === 'sm' ? 'h-3 w-3' :
                          uiConfig.buttonSize === 'md' ? 'h-4 w-4' :
                          'h-4 w-4'
                        } />
                      ) : (
                        <Expand className={
                          uiConfig.buttonSize === 'sm' ? 'h-3 w-3' :
                          uiConfig.buttonSize === 'md' ? 'h-4 w-4' :
                          'h-4 w-4'
                        } />
                      )}
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Buffer indicator */}
      {state.isBuffering && (
        <div className="absolute bottom-24 left-1/2 -translate-x-1/2 bg-black/80 backdrop-blur-xl rounded-xl px-4 py-2.5 shadow-2xl animate-pulse">
          <div className="flex items-center gap-3">
            <Loader2 className="w-5 h-5 text-white animate-spin" />
            <div>
              <span className="text-white text-sm font-medium">Buffering...</span>
              <div className="text-xs text-white/70 mt-0.5">
                {Math.round(state.bufferProgress)}% loaded
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Mobile tap hint */}
      {screenInfo.isMobile && !state.isPlaying && !state.isLoading && !state.error && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-gradient-to-r from-black/80 to-black/60 backdrop-blur-xl rounded-full px-4 py-2 shadow-2xl border border-white/10">
          <p className="text-white text-xs font-medium flex items-center gap-2">
            <Play className="w-3.5 h-3.5" />
            Tap to play video
          </p>
        </div>
      )}
      
      {/* iOS Compatibility Badge */}
      {state.isIOS && videoSrc.includes('.mov') && (
        <div className="absolute top-4 right-4 bg-gradient-to-r from-amber-500/20 to-orange-500/20 backdrop-blur-md rounded-lg px-3 py-1.5 border border-amber-500/30">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-amber-400 rounded-full animate-pulse"></div>
            <span className="text-xs font-medium text-amber-300">MOV Format</span>
          </div>
        </div>
      )}
    </div>
  )
})

UltraFastVideoPlayer.displayName = 'UltraFastVideoPlayer'

// Dynamic import for better performance
export default dynamic(() => Promise.resolve(UltraFastVideoPlayer), {
  ssr: false
})