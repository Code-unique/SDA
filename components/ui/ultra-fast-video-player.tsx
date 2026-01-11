// components/ui/ultra-fast-video-player.tsx
'use client'

import React, { 
  useRef, 
  useState, 
  useEffect, 
  useCallback, 
  useMemo,
  MouseEvent,
  TouchEvent
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
  Zap,
  Wifi,
  WifiOff,
  Check,
  SkipForward,
  SkipBack,
  Battery,
  BatteryCharging,
  FileVideo,
  Globe,
  AlertCircle,
  Info,
  ChevronDown,
  ChevronUp,
  X
} from 'lucide-react'
import { Button } from './button'

interface UltraFastVideoPlayerProps {
  src: string
  poster?: string
  className?: string
  autoplay?: boolean
  preload?: 'auto' | 'metadata' | 'none'
  onReady?: () => void
  onError?: (error: string) => void
  onPlay?: () => void
  onPause?: () => void
  onEnded?: () => void
  onTimeUpdate?: (time: number) => void
  onProgress?: (buffered: number) => void
}

interface VideoQuality {
  id: string
  label: string
  bitrate?: number
}

interface BatteryInfo {
  level: number | null
  charging: boolean
}

interface NetworkInfo {
  speed: number | null
  type: string | null
  effectiveType: string | null
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

// Simple URL optimization
const optimizeVideoUrl = (url: string): string => {
  if (!url) return url
  
  try {
    // Add cache busting parameter for S3 URLs
    if (url.includes('s3.amazonaws.com') || url.includes('s3.')) {
      const urlObj = new URL(url)
      urlObj.searchParams.set('_t', Date.now().toString().slice(-8))
      return urlObj.toString()
    }
  } catch {
    // If URL parsing fails, return original
  }
  
  return url
}

const UltraFastVideoPlayer: React.FC<UltraFastVideoPlayerProps> = ({
  src,
  poster,
  className = '',
  autoplay = false,
  preload = 'auto',
  onReady,
  onError,
  onPlay,
  onPause,
  onEnded,
  onTimeUpdate,
  onProgress,
}) => {
  // Refs
  const videoRef = useRef<HTMLVideoElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const progressBarRef = useRef<HTMLDivElement>(null)
  const volumeBarRef = useRef<HTMLDivElement>(null)
  const hideControlsTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const clickTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  
  // State
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [showControls, setShowControls] = useState(true)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [isMuted, setIsMuted] = useState(false)
  const [volume, setVolume] = useState(1)
  const [playbackRate, setPlaybackRate] = useState(1)
  const [isBuffering, setIsBuffering] = useState(false)
  const [bufferProgress, setBufferProgress] = useState(0)
  const [networkInfo, setNetworkInfo] = useState<NetworkInfo>({ 
    speed: null, 
    type: null, 
    effectiveType: null 
  })
  const [showSettings, setShowSettings] = useState(false)
  const [showInfoPanel, setShowInfoPanel] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [playbackRates] = useState([0.5, 0.75, 1, 1.25, 1.5, 2])
  const [qualities] = useState<VideoQuality[]>([
    { id: 'auto', label: 'Auto (Best)' },
    { id: '1080p', label: '1080p HD' },
    { id: '720p', label: '720p HD' },
    { id: '480p', label: '480p SD' },
  ])
  const [activeQuality, setActiveQuality] = useState<string>('auto')
  const [retryCount, setRetryCount] = useState(0)
  const [isOffline, setIsOffline] = useState(false)
  const [batteryInfo, setBatteryInfo] = useState<BatteryInfo>({ level: null, charging: false })
  const [currentFormat, setCurrentFormat] = useState<string>('')
  const [hasCorsIssue, setHasCorsIssue] = useState(false)
  const [isSeeking, setIsSeeking] = useState(false)
  const [isClickable, setIsClickable] = useState(true)

  // Optimized URLs
  const optimizedSrc = useMemo(() => optimizeVideoUrl(src), [src])
  const mimeType = useMemo(() => getVideoMimeType(optimizedSrc), [optimizedSrc])

  // Network detection
  const detectNetworkInfo = useCallback(() => {
    try {
      const connection = (navigator as any).connection
      if (connection) {
        setNetworkInfo({
          speed: connection.downlink || null,
          type: connection.type || null,
          effectiveType: connection.effectiveType || null
        })
      }
    } catch {
      // Network API not supported
    }
  }, [])

  // Battery detection
  useEffect(() => {
    const updateBatteryInfo = async () => {
      try {
        if ('getBattery' in navigator) {
          const battery = await (navigator as any).getBattery()
          setBatteryInfo({
            level: battery.level * 100,
            charging: battery.charging
          })
        }
      } catch {
        // Battery API not supported
      }
    }
    
    updateBatteryInfo()
  }, [])

  // Offline detection
  useEffect(() => {
    const handleOnline = () => setIsOffline(false)
    const handleOffline = () => setIsOffline(true)
    
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    
    setIsOffline(!navigator.onLine)
    
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  // Check format support
  useEffect(() => {
    const format = mimeType.split('/').pop()?.toUpperCase() || 'MP4'
    setCurrentFormat(format)
  }, [mimeType])

  // Video initialization
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
        setHasCorsIssue(false)
      }
    }

    const handleLoadedMetadata = () => {
      if (isMounted && video) {
        setDuration(video.duration || 0)
        detectNetworkInfo()
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
      if (isMounted && video) {
        setCurrentTime(video.currentTime)
        onTimeUpdate?.(video.currentTime)
      }
    }

    const handleVolumeChange = () => {
      if (isMounted && video) {
        setIsMuted(video.muted)
        setVolume(video.volume)
      }
    }

    const handleWaiting = () => {
      if (isMounted) {
        setIsBuffering(true)
        detectNetworkInfo()
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
      let isCorsError = false
      
      if (videoError) {
        switch (videoError.code) {
          case 2:
            errorMessage = 'Network error. Please check your connection.'
            isCorsError = true
            break
          case 3:
            errorMessage = 'Video decoding error'
            break
          case 4:
            errorMessage = 'Video format not supported'
            break
        }
      }
      
      setHasCorsIssue(isCorsError)
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
      setIsFullscreen(!!document.fullscreenElement)
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

    // Configure video
    video.src = optimizedSrc
    video.poster = poster || ''
    video.preload = preload
    video.playsInline = true
    video.defaultPlaybackRate = 1.0
    video.playbackRate = playbackRate
    
    if (!optimizedSrc.includes('s3.')) {
      video.crossOrigin = 'anonymous'
    }

    // Cleanup
    return () => {
      isMounted = false
      
      // Clear timeouts
      if (hideControlsTimeoutRef.current) {
        clearTimeout(hideControlsTimeoutRef.current)
        hideControlsTimeoutRef.current = null
      }
      
      if (clickTimeoutRef.current) {
        clearTimeout(clickTimeoutRef.current)
        clickTimeoutRef.current = null
      }
      
      // Remove event listeners
      events.forEach(([event, handler]) => {
        video.removeEventListener(event, handler as EventListener)
      })
      
      document.removeEventListener('fullscreenchange', handleFullscreenChange)
      
      // Reset video
      video.src = ''
      video.load()
    }
  }, [optimizedSrc, poster, autoplay, preload])

  // Auto-hide controls
  useEffect(() => {
    if (!showControls || isLoading || error || !isPlaying || showSettings || showInfoPanel) return
    
    hideControlsTimeoutRef.current = setTimeout(() => {
      setShowControls(false)
    }, 3000)
    
    return () => {
      if (hideControlsTimeoutRef.current) {
        clearTimeout(hideControlsTimeoutRef.current)
        hideControlsTimeoutRef.current = null
      }
    }
  }, [showControls, isPlaying, isLoading, error, showSettings, showInfoPanel])

  // Control functions with click debouncing
  const togglePlay = useCallback(async (e?: MouseEvent) => {
    if (e) {
      e.stopPropagation()
    }
    
    if (!isClickable) return
    setIsClickable(false)
    
    const video = videoRef.current
    if (!video) {
      setIsClickable(true)
      return
    }
    
    try {
      if (isPlaying) {
        video.pause()
      } else {
        await video.play()
      }
    } catch (err) {
      console.debug('Playback error:', err)
    }
    
    // Re-enable clicking after short delay
    if (clickTimeoutRef.current) {
      clearTimeout(clickTimeoutRef.current)
    }
    clickTimeoutRef.current = setTimeout(() => {
      setIsClickable(true)
    }, 300)
  }, [isPlaying, isClickable])

  const toggleMute = useCallback((e: MouseEvent) => {
    e.stopPropagation()
    const video = videoRef.current
    if (!video) return
    video.muted = !video.muted
  }, [])

  const setVideoVolume = useCallback((value: number) => {
    const video = videoRef.current
    if (!video) return
    const newVolume = Math.max(0, Math.min(1, value))
    video.volume = newVolume
    video.muted = newVolume === 0
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

  const skip = useCallback((seconds: number, e: MouseEvent) => {
    e.stopPropagation()
    const video = videoRef.current
    if (!video) return
    seek(video.currentTime + seconds)
  }, [seek])

  const changePlaybackRate = useCallback((rate: number) => {
    const video = videoRef.current
    if (!video) return
    const newRate = Math.max(0.25, Math.min(4, rate))
    video.playbackRate = newRate
    setPlaybackRate(newRate)
  }, [])

  const toggleFullscreen = useCallback(async (e?: MouseEvent) => {
    if (e) {
      e.stopPropagation()
    }
    
    if (!containerRef.current) return
    
    try {
      if (!document.fullscreenElement) {
        await containerRef.current.requestFullscreen()
      } else {
        await document.exitFullscreen()
      }
    } catch (err) {
      console.debug('Fullscreen error:', err)
    }
  }, [])

  const toggleInfoPanel = useCallback((e: MouseEvent) => {
    e.stopPropagation()
    setShowInfoPanel(prev => !prev)
    setShowSettings(false)
  }, [])

  const changeQuality = useCallback((qualityId: string) => {
    setActiveQuality(qualityId)
    setShowSettings(false)
  }, [])

  const retryPlayback = useCallback(() => {
    setError(null)
    setRetryCount(prev => prev + 1)
    setIsLoading(true)
    
    const video = videoRef.current
    if (video) {
      video.load()
      video.play().catch(console.debug)
    }
  }, [])

  const formatTime = useCallback((seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }, [])

  // Handle mouse movement for controls
  const handleMouseMove = useCallback(() => {
    if (showSettings || showInfoPanel) return
    
    setShowControls(true)
    
    if (hideControlsTimeoutRef.current) {
      clearTimeout(hideControlsTimeoutRef.current)
      hideControlsTimeoutRef.current = null
    }
    
    if (isPlaying) {
      hideControlsTimeoutRef.current = setTimeout(() => {
        setShowControls(false)
      }, 3000)
    }
  }, [isPlaying, showSettings, showInfoPanel])

  // Handle progress bar interaction
  const handleProgressInteraction = useCallback((e: MouseEvent<HTMLDivElement>) => {
    e.stopPropagation()
    const progressBar = progressBarRef.current
    if (!progressBar || !duration || isSeeking) return
    
    setIsSeeking(true)
    
    const rect = progressBar.getBoundingClientRect()
    const percentage = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
    seekToPercentage(percentage)
    
    // Small delay before allowing next seek
    setTimeout(() => setIsSeeking(false), 100)
  }, [duration, seekToPercentage, isSeeking])

  // Handle volume bar interaction
  const handleVolumeInteraction = useCallback((e: MouseEvent<HTMLDivElement>) => {
    e.stopPropagation()
    const volumeBar = volumeBarRef.current
    if (!volumeBar) return
    
    const rect = volumeBar.getBoundingClientRect()
    const percentage = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
    setVideoVolume(percentage)
  }, [setVideoVolume])

  // Handle container click - only toggle play if clicking on video itself
  const handleContainerClick = useCallback((e: MouseEvent) => {
    // Don't trigger if clicking on controls or panels
    const target = e.target as HTMLElement
    if (
      target.closest('.controls') || 
      target.closest('.settings-panel') || 
      target.closest('.info-panel') ||
      target.closest('.play-button') ||
      target.closest('.info-button')
    ) {
      return
    }
    
    togglePlay(e)
  }, [togglePlay])

  // Info Panel Component
  const InfoPanel = useMemo(() => {
    if (!showInfoPanel) return null

    const getNetworkStatus = () => {
      const { speed } = networkInfo
      if (!speed) return { label: 'Unknown', color: 'text-gray-400', icon: <Wifi className="w-4 h-4" /> }
      if (speed < 1) return { label: 'Poor', color: 'text-red-400', icon: <WifiOff className="w-4 h-4" /> }
      if (speed < 3) return { label: 'Fair', color: 'text-yellow-400', icon: <Wifi className="w-4 h-4" /> }
      return { label: 'Good', color: 'text-green-400', icon: <Wifi className="w-4 h-4" /> }
    }

    const networkStatus = getNetworkStatus()

    return (
      <div className="absolute top-20 right-4 bg-black/95 backdrop-blur-sm rounded-lg p-4 w-64 border border-white/10 shadow-2xl z-50 info-panel">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-white flex items-center gap-2">
            <Info className="w-4 h-4" />
            Video Info
          </h3>
          <button
            onClick={(e) => {
              e.stopPropagation()
              setShowInfoPanel(false)
            }}
            className="text-white/60 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-3">
          {/* Network Status */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {networkStatus.icon}
              <span className="text-xs text-white/70">Network</span>
            </div>
            <span className={`text-xs font-medium ${networkStatus.color}`}>
              {networkInfo.speed ? `${networkInfo.speed} Mbps` : 'Unknown'}
            </span>
          </div>

          {/* Battery */}
          {batteryInfo.level !== null && (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {batteryInfo.charging ? (
                  <BatteryCharging className="w-4 h-4 text-green-400" />
                ) : (
                  <Battery className="w-4 h-4" />
                )}
                <span className="text-xs text-white/70">Battery</span>
              </div>
              <span className="text-xs text-white">
                {Math.round(batteryInfo.level)}%{batteryInfo.charging ? ' ⚡' : ''}
              </span>
            </div>
          )}

          {/* Format */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileVideo className="w-4 h-4" />
              <span className="text-xs text-white/70">Format</span>
            </div>
            <span className="text-xs text-white">{currentFormat}</span>
          </div>

          {/* Quality */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4" />
              <span className="text-xs text-white/70">Quality</span>
            </div>
            <span className="text-xs text-white">{activeQuality}</span>
          </div>

          {/* Buffer Progress */}
          {bufferProgress > 0 && (
            <div className="pt-3 border-t border-white/10">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-white/70">Buffer</span>
                <span className="text-xs text-white">{bufferProgress.toFixed(0)}%</span>
              </div>
              <div className="w-full h-1.5 bg-white/20 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-blue-500 to-cyan-400 transition-all duration-300"
                  style={{ width: `${bufferProgress}%` }}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    )
  }, [showInfoPanel, networkInfo, batteryInfo, currentFormat, activeQuality, bufferProgress])

  // Top Info Button Component
  const TopInfoButton = useMemo(() => {
    const getStatusColor = () => {
      if (isOffline) return 'bg-gradient-to-r from-red-600 to-red-700'
      if (hasCorsIssue) return 'bg-gradient-to-r from-amber-600 to-amber-700'
      if (networkInfo.speed && networkInfo.speed > 5) return 'bg-gradient-to-r from-green-600 to-emerald-700'
      return 'bg-gradient-to-r from-blue-600 to-blue-700'
    }

    const getStatusIcon = () => {
      if (isOffline) return <WifiOff className="w-3 h-3" />
      if (hasCorsIssue) return <AlertCircle className="w-3 h-3" />
      return <Zap className="w-3 h-3" />
    }

    const getStatusText = () => {
      if (isOffline) return 'Offline'
      if (hasCorsIssue) return 'CORS'
      return networkInfo.speed && networkInfo.speed > 5 ? 'Fast' : 'Normal'
    }

    return (
      <button
        onClick={toggleInfoPanel}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg backdrop-blur-sm text-white transition-all hover:scale-105 info-button ${getStatusColor()}`}
      >
        {getStatusIcon()}
        <span className="text-xs font-medium">{getStatusText()}</span>
        {showInfoPanel ? (
          <ChevronUp className="w-3 h-3 ml-1" />
        ) : (
          <ChevronDown className="w-3 h-3 ml-1" />
        )}
      </button>
    )
  }, [isOffline, hasCorsIssue, networkInfo.speed, showInfoPanel, toggleInfoPanel])

  // Error state
  if (error) {
    return (
      <div className={`relative w-full aspect-video bg-black rounded-2xl overflow-hidden flex items-center justify-center ${className}`}>
        <div className="text-center p-6 max-w-md">
          <div className="w-20 h-20 bg-gradient-to-br from-red-500/20 to-orange-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4 backdrop-blur-sm">
            {hasCorsIssue ? (
              <Globe className="w-10 h-10 text-amber-400" />
            ) : (
              <AlertTriangle className="w-10 h-10 text-amber-400" />
            )}
          </div>
          
          <h3 className="text-white text-xl font-bold mb-2">
            {hasCorsIssue ? 'CORS Issue Detected' : 'Playback Error'}
          </h3>
          
          <p className="text-white/70 text-sm mb-4">{error}</p>
          
          {hasCorsIssue && (
            <div className="mb-4 p-3 bg-amber-900/30 rounded-lg border border-amber-700/50">
              <p className="text-amber-300 text-xs mb-2 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                <span className="font-semibold">Quick Fix:</span>
              </p>
              <ul className="text-amber-200/80 text-xs space-y-1 text-left">
                <li>• Ensure CORS is enabled on your S3/CDN</li>
                <li>• Try loading in incognito mode</li>
                <li>• Check video URL accessibility</li>
              </ul>
            </div>
          )}
          
          <Button
            onClick={retryPlayback}
            className="bg-gradient-to-r from-red-600 to-orange-500 hover:from-red-700 hover:to-orange-600 text-white font-medium"
          >
            <RotateCw className="w-4 h-4 mr-2" />
            Retry Playback
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div 
      ref={containerRef}
      className={`relative w-full aspect-video bg-black rounded-2xl overflow-hidden group ${className}`}
      onMouseMove={handleMouseMove}
      onClick={handleContainerClick}
      onDoubleClick={toggleFullscreen}
    >
      {/* Video element */}
      <video
        ref={videoRef}
        className="w-full h-full object-contain"
        playsInline
        controls={false}
        preload={preload}
        crossOrigin={optimizedSrc.includes('s3.') ? undefined : 'anonymous'}
      />
      
      {/* Top Info Button */}
      <div className="absolute top-4 right-4 z-40">
        {TopInfoButton}
      </div>
      
      {/* Info Panel */}
      {InfoPanel}
      
      {/* Loading overlay */}
      {(isLoading || isBuffering) && (
        <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center z-30">
          <div className="relative">
            <Loader2 className="w-16 h-16 text-white animate-spin" />
          </div>
          <p className="text-white/80 text-sm mt-4">
            {isBuffering ? 'Buffering...' : 'Loading...'}
          </p>
          {bufferProgress > 0 && (
            <div className="w-48 mt-4">
              <div className="w-full h-1.5 bg-white/20 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-blue-500 to-cyan-400 transition-all duration-300"
                  style={{ width: `${bufferProgress}%` }}
                />
              </div>
            </div>
          )}
        </div>
      )}
      
      {/* Center play button (when paused) */}
      {!isPlaying && !isLoading && !error && (
        <div 
          className="absolute inset-0 flex items-center justify-center z-20 play-button"
          onClick={(e) => {
            e.stopPropagation()
            togglePlay(e)
          }}
        >
          <div className="w-20 h-20 bg-white/10 backdrop-blur-sm rounded-full flex items-center justify-center hover:scale-110 transition-transform">
            <Play className="w-10 h-10 text-white ml-1" />
          </div>
        </div>
      )}
      
      {/* Controls overlay */}
      {(showControls || isLoading || error) && (
        <>
          {/* Top gradient */}
          <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-black/80 via-black/40 to-transparent pointer-events-none z-10" />
          
          {/* Bottom controls */}
          <div 
            className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/95 via-black/70 to-transparent p-4 z-10 controls"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Progress bar */}
            <div className="mb-4 relative">
              {/* Buffer progress */}
              <div 
                className="absolute top-0 left-0 w-full h-1.5 bg-white/20 rounded-full overflow-hidden"
                ref={progressBarRef}
              />
              
              {/* Playback progress */}
              <div 
                className="absolute top-0 left-0 h-1.5 bg-gradient-to-r from-red-500 to-orange-400 rounded-full cursor-pointer"
                style={{ width: `${(currentTime / Math.max(duration, 1)) * 100}%` }}
                onClick={handleProgressInteraction}
                onMouseDown={(e) => {
                  e.stopPropagation()
                  handleProgressInteraction(e)
                }}
              >
                <div className="absolute -right-1 -top-0.5 w-3 h-3 bg-white rounded-full shadow-lg" />
              </div>
              
              {/* Time labels */}
              <div className="flex justify-between text-xs text-white/70 mt-2">
                <span>{formatTime(currentTime)}</span>
                <span>{formatTime(duration)}</span>
              </div>
            </div>
            
            {/* Control buttons */}
            <div className="flex items-center justify-between">
              {/* Left controls */}
              <div className="flex items-center gap-2">
                {/* Play/Pause */}
                <Button
                  onClick={togglePlay}
                  className="w-10 h-10 bg-white/10 backdrop-blur-sm hover:bg-white/20 text-white rounded-full p-0 flex items-center justify-center"
                >
                  {isPlaying ? (
                    <Pause className="w-5 h-5" />
                  ) : (
                    <Play className="w-5 h-5 ml-0.5" />
                  )}
                </Button>
                
                {/* Skip backward */}
                <Button
                  onClick={(e) => skip(-10, e)}
                  className="w-9 h-9 bg-white/10 backdrop-blur-sm hover:bg-white/20 text-white rounded-full p-0 flex items-center justify-center"
                >
                  <SkipBack className="w-4 h-4" />
                </Button>
                
                {/* Skip forward */}
                <Button
                  onClick={(e) => skip(10, e)}
                  className="w-9 h-9 bg-white/10 backdrop-blur-sm hover:bg-white/20 text-white rounded-full p-0 flex items-center justify-center"
                >
                  <SkipForward className="w-4 h-4" />
                </Button>
                
                {/* Volume */}
                <div className="flex items-center gap-2 ml-2">
                  <Button
                    onClick={toggleMute}
                    className="w-9 h-9 bg-white/10 backdrop-blur-sm hover:bg-white/20 text-white rounded-full p-0 flex items-center justify-center"
                  >
                    {isMuted || volume === 0 ? (
                      <VolumeX className="w-4 h-4" />
                    ) : (
                      <Volume2 className="w-4 h-4" />
                    )}
                  </Button>
                  
                  {/* Volume slider */}
                  <div 
                    className="w-20 h-1.5 bg-white/30 rounded-full cursor-pointer relative"
                    ref={volumeBarRef}
                    onClick={handleVolumeInteraction}
                    onMouseDown={(e) => {
                      e.stopPropagation()
                      handleVolumeInteraction(e)
                    }}
                  >
                    <div 
                      className="absolute top-0 left-0 h-full bg-gradient-to-r from-red-500 to-orange-400 rounded-full"
                      style={{ width: `${volume * 100}%` }}
                    >
                      <div className="absolute -right-1 -top-0.5 w-3 h-3 bg-white rounded-full shadow-lg" />
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Right controls */}
              <div className="flex items-center gap-2">
                {/* Settings */}
                <div className="relative">
                  <Button
                    onClick={(e) => {
                      e.stopPropagation()
                      setShowSettings(!showSettings)
                    }}
                    className="w-9 h-9 bg-white/10 backdrop-blur-sm hover:bg-white/20 text-white rounded-full p-0 flex items-center justify-center"
                  >
                    <Settings className="w-4 h-4" />
                  </Button>
                  
                  {/* Settings dropdown */}
                  {showSettings && (
                    <div 
                      className="absolute bottom-full right-0 mb-2 bg-black/95 backdrop-blur-sm rounded-lg p-3 min-w-[180px] border border-white/10 shadow-2xl z-50 settings-panel"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {/* Playback speed */}
                      <div className="mb-3">
                        <h4 className="text-xs font-semibold text-white/70 mb-2">SPEED</h4>
                        <div className="grid grid-cols-3 gap-1">
                          {playbackRates.map(rate => (
                            <button
                              key={rate}
                              onClick={() => {
                                changePlaybackRate(rate)
                                setShowSettings(false)
                              }}
                              className={`px-2 py-1.5 rounded text-xs ${
                                playbackRate === rate
                                  ? 'bg-gradient-to-r from-red-500 to-orange-400 text-white'
                                  : 'bg-white/10 text-white/70 hover:bg-white/20'
                              }`}
                            >
                              {rate === 1 ? '1x' : `${rate}x`}
                            </button>
                          ))}
                        </div>
                      </div>
                      
                      {/* Quality selector */}
                      <div>
                        <h4 className="text-xs font-semibold text-white/70 mb-2">QUALITY</h4>
                        <div className="space-y-1">
                          {qualities.map(quality => (
                            <button
                              key={quality.id}
                              onClick={() => changeQuality(quality.id)}
                              className={`w-full text-left px-2 py-1.5 rounded text-xs ${
                                activeQuality === quality.id
                                  ? 'bg-gradient-to-r from-red-500/20 to-orange-400/20 text-white'
                                  : 'text-white/70 hover:bg-white/10'
                              }`}
                            >
                              {quality.label}
                              {activeQuality === quality.id && (
                                <Check className="w-3 h-3 float-right" />
                              )}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                
                {/* Fullscreen */}
                <Button
                  onClick={(e) => {
                    e.stopPropagation()
                    toggleFullscreen(e)
                  }}
                  className="w-9 h-9 bg-white/10 backdrop-blur-sm hover:bg-white/20 text-white rounded-full p-0 flex items-center justify-center"
                >
                  {isFullscreen ? (
                    <Minimize className="w-4 h-4" />
                  ) : (
                    <Maximize className="w-4 h-4" />
                  )}
                </Button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

export default UltraFastVideoPlayer