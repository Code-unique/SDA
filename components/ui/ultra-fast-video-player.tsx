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
  PictureInPicture
} from 'lucide-react'
import { Button } from './button'
import { cn } from '@/lib/utils'

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
const isIOS = (): boolean => {
  if (typeof navigator === 'undefined') return false
  return /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream
}

const isSafari = (): boolean => {
  if (typeof navigator === 'undefined') return false
  return /^((?!chrome|android).)*safari/i.test(navigator.userAgent)
}

const isChromeIOS = (): boolean => {
  if (typeof navigator === 'undefined') return false
  return /CriOS/.test(navigator.userAgent)
}

// Custom hooks
const useScreenInfo = (): ScreenInfo => {
  const [screenInfo, setScreenInfo] = useState<ScreenInfo>({
    isMobile: false,
    isIOS: false,
    isSafari: false,
    isChromeIOS: false,
    width: typeof window !== 'undefined' ? window.innerWidth : 1920
  })

  useEffect(() => {
    const updateScreenInfo = () => {
      setScreenInfo({
        isMobile: window.innerWidth < MOBILE_BREAKPOINT,
        isIOS: isIOS(),
        isSafari: isSafari(),
        isChromeIOS: isChromeIOS(),
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
                     (document as any).webkitFullscreenElement)
      setIsFullscreen(isFs)
      onFullscreenChange?.(isFs)
    }

    document.addEventListener('fullscreenchange', handleChange)
    document.addEventListener('webkitfullscreenchange', handleChange)

    return () => {
      document.removeEventListener('fullscreenchange', handleChange)
      document.removeEventListener('webkitfullscreenchange', handleChange)
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

  const toggle = useCallback(async (): Promise<void> => {
    if (isPictureInPicture) {
      await exit()
    } else {
      await enter()
    }
  }, [isPictureInPicture, enter, exit])

  useEffect(() => {
    const handleEnter = () => setIsPictureInPicture(true)
    const handleLeave = () => setIsPictureInPicture(false)

    const video = videoRef.current
    if (video) {
      video.addEventListener('enterpictureinpicture', handleEnter)
      video.addEventListener('leavepictureinpicture', handleLeave)
    }

    return () => {
      if (video) {
        video.removeEventListener('enterpictureinpicture', handleEnter)
        video.removeEventListener('leavepictureinpicture', handleLeave)
      }
    }
  }, [videoRef])

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
        "bg-black/60 hover:bg-black/80 text-white rounded-full p-0 transition-all active:scale-95",
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
          "bg-black/60 hover:bg-black/80 text-white rounded-full p-0 transition-all active:scale-95",
          sizes[size]
        )}
        aria-label={isMuted ? "Unmute" : "Mute"}
        type="button"
      >
        {isMuted || volume === 0 ? (
          <VolumeX className={iconSizes[size]} />
        ) : (
          <Volume2 className={iconSizes[size]} />
        )}
      </Button>
      
      <div 
        ref={sliderRef}
        className="w-20 h-1.5 bg-white/30 rounded-full cursor-pointer relative hidden group-hover/volume:block"
        onClick={handleClick}
        role="slider"
        aria-label="Volume"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={isMuted ? 0 : volume * 100}
        tabIndex={0}
      >
        <div 
          className="absolute top-0 left-0 h-full bg-gradient-to-r from-blue-500 to-cyan-400 rounded-full transition-all"
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
    sm: 'h-1',
    md: 'h-1.5',
    lg: 'h-2'
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
    <div className="relative mb-1">
      <div 
        ref={barRef}
        className={cn(
          "relative w-full rounded-full overflow-hidden cursor-pointer",
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
          className="absolute inset-0 bg-white/40 transition-all duration-300"
          style={{ width: `${bufferProgress}%` }}
        />
        
        <div 
          className="absolute inset-0 bg-gradient-to-r from-blue-500 to-cyan-400 transition-all duration-150"
          style={{ width: `${percentage}%` }}
        />
      </div>
      
      <div className="flex justify-between text-xs text-white/70 mt-0.5">
        <span>{formatTime(currentTime)}</span>
        <span>{formatTime(duration)}</span>
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
}

const SettingsMenu = memo(({
  playbackRate,
  playbackRates,
  onPlaybackRateChange,
  onClose
}: SettingsMenuProps) => {
  return (
    <div className="absolute bottom-full right-0 mb-2 bg-black/95 backdrop-blur-md rounded-lg p-3 w-48 border border-white/20 shadow-xl z-50">
      <div className="flex items-center justify-between mb-2">
        <div className="text-xs text-white/70">Playback Speed</div>
        <button
          onClick={onClose}
          className="p-1 hover:bg-white/10 rounded transition-colors"
          aria-label="Close settings"
          type="button"
        >
          <X className="w-3 h-3 text-white/70" />
        </button>
      </div>

      <div className="space-y-1">
        {playbackRates.map(rate => (
          <button
            key={rate}
            onClick={() => onPlaybackRateChange(rate)}
            className={cn(
              "w-full text-left px-3 py-2 rounded text-sm transition-colors flex items-center justify-between",
              playbackRate === rate
                ? 'bg-gradient-to-r from-blue-500/20 to-cyan-400/20 text-white'
                : 'text-white/70 hover:text-white hover:bg-white/10'
            )}
            type="button"
          >
            <span>{rate === 1 ? 'Normal' : `${rate}x`}</span>
            {playbackRate === rate && <Check className="w-4 h-4" />}
          </button>
        ))}
      </div>
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
  style
}: VideoPlayerProps) => {
  // Refs
  const videoRef = useRef<HTMLVideoElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  
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
    error: null
  })
  
  const [showControls, setShowControls] = useState(true)
  const [showSettings, setShowSettings] = useState(false)
  const controlsTimerRef = useRef<NodeJS.Timeout | null>(null)
  
  // Hooks
  const screenInfo = useScreenInfo()
  const { isFullscreen: fsState, toggle: toggleFullscreen } = useFullscreen(containerRef, onFullscreenChange)
  const { isPictureInPicture: pipState, toggle: togglePictureInPicture } = usePictureInPicture(videoRef)
  
  // Get the video source
  const videoSrc = useMemo(() => {
    if (Array.isArray(src)) return src[0]
    return src
  }, [src])
  
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
  
  // Auto-hide controls
  useEffect(() => {
    if (!showControls || state.isLoading || state.error || !state.isPlaying || showSettings) return
    
    if (controlsTimerRef.current) {
      clearTimeout(controlsTimerRef.current)
    }
    
    controlsTimerRef.current = setTimeout(() => {
      setShowControls(false)
    }, 2000)
    
    return () => {
      if (controlsTimerRef.current) {
        clearTimeout(controlsTimerRef.current)
      }
    }
  }, [showControls, state.isLoading, state.error, state.isPlaying, showSettings])
  
  // Sync fullscreen state
  useEffect(() => {
    setState(prev => ({ 
      ...prev, 
      isFullscreen: fsState
    }))
  }, [fsState])
  
  // Sync PiP state
  useEffect(() => {
    setState(prev => ({
      ...prev,
      isPictureInPicture: pipState
    }))
  }, [pipState])
  
  // Event handlers
  const handlePlay = useCallback(async (): Promise<void> => {
    try {
      const video = videoRef.current
      if (!video) return
      
      await video.play()
      
      setState(prev => ({ 
        ...prev, 
        isPlaying: true,
        isBuffering: false,
        error: null 
      }))
      onPlay?.()
    } catch (err) {
      console.error('Play failed:', err)
      const errorMsg = err instanceof Error ? err.message : 'Playback failed. Tap to retry.'
      setState(prev => ({ 
        ...prev, 
        error: errorMsg,
        isPlaying: false 
      }))
    }
  }, [onPlay])
  
  const handlePause = useCallback((): void => {
    const video = videoRef.current
    if (!video) return
    
    video.pause()
    setState(prev => ({ ...prev, isPlaying: false }))
    onPause?.()
  }, [onPause])
  
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
    
    const newMutedState = !video.muted
    video.muted = newMutedState
    
    // If unmuting and volume is 0, set to default volume
    if (newMutedState === false && video.volume === 0) {
      video.volume = 0.7
      setState(prev => ({ 
        ...prev, 
        isMuted: false,
        volume: 0.7
      }))
    } else {
      setState(prev => ({ 
        ...prev, 
        isMuted: newMutedState 
      }))
    }
    
    onVolumeChange?.(video.volume)
  }, [onVolumeChange])
  
  const handleSeek = useCallback((percentage: number): void => {
    const video = videoRef.current
    if (!video || !state.duration) return
    
    const time = state.duration * Math.max(0, Math.min(1, percentage))
    video.currentTime = time
    setState(prev => ({ ...prev, currentTime: time }))
  }, [state.duration])
  
  const handleSkip = useCallback((seconds: number): void => {
    const video = videoRef.current
    if (!video) return
    
    const newTime = Math.max(0, Math.min(state.duration, video.currentTime + seconds))
    video.currentTime = newTime
    setState(prev => ({ ...prev, currentTime: newTime }))
  }, [state.duration])
  
  const handlePlaybackRateChange = useCallback((rate: number): void => {
    const video = videoRef.current
    if (!video) return
    
    const newRate = Math.max(0.5, Math.min(2, rate))
    
    // iOS Chrome doesn't support playbackRate
    if (screenInfo.isChromeIOS) {
      console.warn('iOS Chrome does not support playbackRate changes')
      return
    }
    
    video.playbackRate = newRate
    setState(prev => ({ ...prev, playbackRate: newRate }))
    setShowSettings(false)
    onPlaybackRateChange?.(newRate)
  }, [onPlaybackRateChange, screenInfo.isChromeIOS])
  
  const handleRetry = useCallback((): void => {
    const video = videoRef.current
    if (!video) return
    
    setState(prev => ({ 
      ...prev, 
      error: null, 
      isLoading: true 
    }))
    
    video.load()
    video.play().catch(() => {
      // Silent catch for retry
    })
  }, [])
  
  // Setup video element - ONE TIME SETUP
  useEffect(() => {
    const video = videoRef.current
    if (!video || !videoSrc) return
    
    // Set source and poster (only once)
    video.src = videoSrc
    if (poster) video.poster = poster
    
    // Basic video setup (only once)
    video.preload = preload
    video.playsInline = playsInline
    video.loop = loop
    video.muted = state.isMuted
    video.volume = state.volume
    video.playbackRate = state.playbackRate
    
    // iOS specific
    if (screenInfo.isIOS) {
      video.setAttribute('webkit-playsinline', 'true')
      video.setAttribute('playsinline', 'true')
    }
    
    // Android specific
    if (/Android/.test(navigator.userAgent)) {
      video.setAttribute('x5-video-player-type', 'h5')
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
      setState(prev => ({ 
        ...prev, 
        duration: video.duration || 0,
        isLoading: false
      }))
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
        // iOS requires muted autoplay
        if (screenInfo.isIOS) {
          video.muted = true
          video.play().catch(() => {
            // Silent fail for iOS autoplay restrictions
          })
        } else {
          video.play().catch(() => {
            // Silent fail for autoplay
          })
        }
      }
    }
    
    const handlePlaying = (): void => {
      setState(prev => ({ 
        ...prev, 
        isPlaying: true, 
        isBuffering: false 
      }))
    }
    
    const handlePauseEvent = (): void => {
      setState(prev => ({ ...prev, isPlaying: false }))
      onPause?.()
    }
    
    const handleTimeUpdate = (): void => {
      setState(prev => ({ 
        ...prev, 
        currentTime: video.currentTime 
      }))
      onTimeUpdate?.(video.currentTime)
    }
    
    const handleWaiting = (): void => {
      setState(prev => ({ ...prev, isBuffering: true }))
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
      if (!screenInfo.isSafari && videoSrc.includes('.mov')) {
        errorMsg = 'MOV format may require conversion for optimal playback'
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
      onVolumeChange?.(video.volume)
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
    
    // Load the video
    video.load()
    
    return () => {
      // Cleanup
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
    }
  }, [videoSrc]) // Only depend on videoSrc to prevent re-creation
  
  // Update video properties when state changes (without reloading)
  useEffect(() => {
    const video = videoRef.current
    if (!video) return
    
    video.muted = state.isMuted
    video.volume = state.volume
    video.playbackRate = state.playbackRate
  }, [state.isMuted, state.volume, state.playbackRate])
  
  // Handle user interaction
  const handleInteraction = useCallback((): void => {
    setShowControls(true)
  }, [])
  
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
    return (
      <div 
        ref={containerRef}
        className={cn(
          "relative bg-black rounded-xl overflow-hidden flex items-center justify-center",
          state.isFullscreen && "fixed inset-0 z-50",
          className
        )}
        style={{
          aspectRatio,
          ...style
        }}
      >
        <div className="text-center p-4 max-w-md">
          <div className="w-12 h-12 bg-black/50 rounded-xl flex items-center justify-center mx-auto mb-3">
            <AlertTriangle className="w-6 h-6 text-amber-400" />
          </div>
          
          <h3 className="text-white text-base font-bold mb-2">
            {state.error.includes('MOV') ? 'Format Notice' : 'Playback Error'}
          </h3>
          
          <p className="text-white/70 text-xs mb-4">
            {state.error}
          </p>
          
          <div className="space-y-2">
            <Button
              onClick={handleRetry}
              className="bg-blue-600 hover:bg-blue-700 text-white text-sm w-full"
              type="button"
            >
              <RotateCw className="w-3 h-3 mr-2" />
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
        "relative bg-black rounded-xl overflow-hidden group focus:outline-none",
        state.isFullscreen && "fixed inset-0 z-50",
        className
      )}
      style={{
        aspectRatio,
        ...style
      }}
      onMouseMove={handleInteraction}
      onTouchStart={handleInteraction}
      onClick={(e) => {
        handleInteraction()
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
        className="w-full h-full object-contain"
        playsInline={playsInline}
        controls={false}
        preload={preload}
        poster={poster}
        muted={state.isMuted}
        autoPlay={autoplay}
        aria-label="Video content"
      />
      
      {/* Loading overlay */}
      {state.isLoading && (
        <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center">
          <Loader2 className="w-8 h-8 text-white animate-spin" />
          <div className="text-white text-xs mt-3">Loading video...</div>
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
            "bg-black/60 backdrop-blur-sm rounded-full flex items-center justify-center transition-all hover:scale-110 active:scale-95 cursor-pointer",
            uiConfig.centerPlaySize
          )}>
            <Play className="w-6 h-6 text-white ml-1" />
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
          <div className="absolute top-0 left-0 right-0 h-20 bg-gradient-to-b from-black/80 to-transparent" />
          
          {/* Bottom controls */}
          <div 
            data-controls="true"
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
                      "bg-black/60 hover:bg-black/80 text-white rounded-full p-0 transition-all active:scale-95",
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
                      "bg-black/60 hover:bg-black/80 text-white rounded-full p-0 transition-all active:scale-95",
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
                  <div className={cn("text-white/70 hidden sm:block", uiConfig.fontSize)}>
                    {formatTime(state.currentTime)} / {formatTime(state.duration)}
                  </div>
                </div>
                
                {/* Right side */}
                <div className="flex items-center gap-2">
                  {/* Settings */}
                  {!screenInfo.isChromeIOS && (
                    <div className="relative">
                      <Button
                        onClick={() => setShowSettings(!showSettings)}
                        className={cn(
                          "bg-black/60 hover:bg-black/80 text-white rounded-full p-0 transition-all active:scale-95",
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
                        />
                      )}
                    </div>
                  )}
                  
                  {/* Picture in Picture */}
                  {'pictureInPictureEnabled' in document && document.pictureInPictureEnabled && (
                    <Button
                      onClick={togglePictureInPicture}
                      className={cn(
                        "bg-black/60 hover:bg-black/80 text-white rounded-full p-0 transition-all active:scale-95",
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
                  <Button
                    onClick={toggleFullscreen}
                    className={cn(
                      "bg-black/60 hover:bg-black/80 text-white rounded-full p-0 transition-all active:scale-95",
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
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Buffer indicator */}
      {state.isBuffering && (
        <div className="absolute bottom-20 left-1/2 -translate-x-1/2 bg-black/80 backdrop-blur-sm rounded-lg px-3 py-2">
          <div className="flex items-center gap-2">
            <Loader2 className="w-4 h-4 text-white animate-spin" />
            <span className="text-white text-sm">Buffering...</span>
          </div>
        </div>
      )}
      
      {/* Mobile tap hint */}
      {screenInfo.isMobile && !state.isPlaying && !state.isLoading && !state.error && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/60 backdrop-blur-sm rounded-full px-3 py-1">
          <p className="text-white text-xs flex items-center gap-1">
            <Play className="w-3 h-3" />
            Tap to play
          </p>
        </div>
      )}
    </div>
  )
})

UltraFastVideoPlayer.displayName = 'UltraFastVideoPlayer'

export { UltraFastVideoPlayer }
export default UltraFastVideoPlayer