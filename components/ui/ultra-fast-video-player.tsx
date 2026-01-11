// components/ui/ultra-fast-video-player.tsx
'use client'

import React, { useRef, useState, useEffect, useCallback, useMemo } from 'react'
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
  Shield,
  CloudOff,
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
  onError?: (error: any) => void
  onPlay?: () => void
  onPause?: () => void
  onEnded?: () => void
  onTimeUpdate?: (time: number) => void
  onProgress?: (buffered: number) => void
}

interface VideoQuality {
  id: string
  label: string
  active: boolean
}

// Function to get proper MIME type from URL
const getVideoMimeType = (url: string): string => {
  if (!url) return 'video/mp4'
  
  const extension = url.split('.').pop()?.toLowerCase().split('?')[0] || ''
  
  switch (extension) {
    case 'mp4':
    case 'm4v':
      return 'video/mp4'
    case 'webm':
      return 'video/webm'
    case 'ogg':
    case 'ogv':
      return 'video/ogg'
    case 'mov':
      return 'video/quicktime'
    case 'avi':
      return 'video/x-msvideo'
    case 'wmv':
      return 'video/x-ms-wmv'
    case 'flv':
      return 'video/x-flv'
    case 'mkv':
      return 'video/x-matroska'
    case 'm3u8':
      return 'application/x-mpegURL'
    case 'mpd':
      return 'application/dash+xml'
    default:
      return 'video/mp4'
  }
}

// Function to fix CORS issues with S3 URLs
const fixS3CorsUrl = (url: string): string => {
  if (!url) return url
  
  // For S3 URLs, add cache-busting parameter
  if (url.includes('s3.amazonaws.com') || url.includes('s3.')) {
    try {
      const urlObj = new URL(url)
      urlObj.searchParams.set('t', Date.now().toString())
      return urlObj.toString()
    } catch {
      return url
    }
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
  const hideControlsTimeoutRef = useRef<NodeJS.Timeout | null>(null) // FIXED: Added initial value
  
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
  const [networkSpeed, setNetworkSpeed] = useState<number | null>(null)
  const [showSettings, setShowSettings] = useState(false)
  const [showInfoPanel, setShowInfoPanel] = useState(false) // Consolidated info panel
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [playbackRates] = useState([0.5, 0.75, 1, 1.25, 1.5, 2])
  const [qualities] = useState<VideoQuality[]>([
    { id: 'auto', label: 'Auto', active: true },
    { id: '1080p', label: '1080p', active: false },
    { id: '720p', label: '720p', active: false },
    { id: '480p', label: '480p', active: false },
  ])
  const [activeQuality, setActiveQuality] = useState<string>('auto')
  const [retryCount, setRetryCount] = useState(0)
  const [isOffline, setIsOffline] = useState(false)
  const [batteryLevel, setBatteryLevel] = useState<number | null>(null)
  const [isBatteryCharging, setIsBatteryCharging] = useState(false)
  const [currentFormat, setCurrentFormat] = useState<string>('')
  const [hasCorsIssue, setHasCorsIssue] = useState(false)

  // Fix URLs
  const fixedSrc = useMemo(() => fixS3CorsUrl(src), [src])
  const mimeType = useMemo(() => getVideoMimeType(fixedSrc), [fixedSrc])

  // Network speed detection
  const detectNetworkSpeed = useCallback(async () => {
    try {
      if ('connection' in navigator) {
        const connection = (navigator as any).connection
        if (connection?.downlink) {
          setNetworkSpeed(Math.round(connection.downlink * 100) / 100)
          return
        }
      }
      
      setNetworkSpeed(5) // Default to average speed
    } catch {
      setNetworkSpeed(3)
    }
  }, [])

  // Battery level detection
  useEffect(() => {
    if ('getBattery' in navigator) {
      ;(navigator as any).getBattery().then((battery: any) => {
        setBatteryLevel(battery.level * 100)
        setIsBatteryCharging(battery.charging)
        
        battery.addEventListener('levelchange', () => {
          setBatteryLevel(battery.level * 100)
        })
        
        battery.addEventListener('chargingchange', () => {
          setIsBatteryCharging(battery.charging)
        })
      })
    }
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
    
    if (format === 'QUICKTIME' && !videoRef.current?.canPlayType('video/quicktime')) {
      console.warn('MOV files may not be supported in all browsers')
    }
  }, [mimeType])

  // Video initialization
  useEffect(() => {
    if (!fixedSrc) {
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
      }
    }

    const handleCanPlay = () => {
      if (isMounted) {
        setIsLoading(false)
        setIsBuffering(false)
        onReady?.()
        
        if (autoplay) {
          video.play().catch(err => {
            console.log('Autoplay prevented:', err.message)
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
        const current = video.currentTime
        setCurrentTime(current)
        onTimeUpdate?.(current)
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
        detectNetworkSpeed()
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
      
      const video = e.target as HTMLVideoElement
      const videoError = video.error
      
      let errorMessage = 'Failed to load video'
      let isCorsError = false
      
      if (videoError) {
        switch (videoError.code) {
          case 1:
            errorMessage = 'Video loading was aborted'
            break
          case 2:
            errorMessage = 'Network error. Please check your connection.'
            isCorsError = true
            break
          case 3:
            errorMessage = 'Video format not supported'
            break
          case 4:
            errorMessage = 'This video format is not supported'
            break
        }
      }
      
      // Check for CORS issues
      if (video.networkState === video.NETWORK_IDLE && !video.error && video.readyState < 2) {
        errorMessage = 'CORS issue: Video cannot be loaded'
        isCorsError = true
      }
      
      // Check if it's an S3 URL
      if (video.src.includes('s3.amazonaws.com') || video.src.includes('s3.')) {
        isCorsError = true
      }
      
      setHasCorsIssue(isCorsError)
      setError(errorMessage)
      setIsLoading(false)
      
      if (onError) {
        onError(errorMessage)
      }
      
      // Auto-retry for network errors
      if (isCorsError && retryCount < 2) {
        setTimeout(() => {
          if (isMounted) {
            setRetryCount(prev => prev + 1)
            video.load()
          }
        }, 2000 * (retryCount + 1))
      }
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

    // Set up event listeners
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
      video.addEventListener(event, handler as any)
    })

    // Global events
    document.addEventListener('fullscreenchange', handleFullscreenChange)

    // Configure video element
    video.src = fixedSrc
    video.poster = poster || ''
    video.preload = preload
    video.playsInline = true
    
    // Don't set crossorigin for S3 URLs
    if (!fixedSrc.includes('s3.')) {
      video.crossOrigin = 'anonymous'
    }
    
    video.defaultPlaybackRate = 1.0
    video.playbackRate = playbackRate

    // Apply network optimization
    if (networkSpeed !== null && networkSpeed < 1) {
      video.preload = 'metadata'
    }

    // Initial network speed detection
    detectNetworkSpeed()

    // Cleanup function
    return () => {
      isMounted = false
      
      // Clear timeouts
      if (hideControlsTimeoutRef.current) {
        clearTimeout(hideControlsTimeoutRef.current)
      }
      
      // Remove event listeners
      events.forEach(([event, handler]) => {
        video.removeEventListener(event, handler as any)
      })
      
      document.removeEventListener('fullscreenchange', handleFullscreenChange)
      
      // Reset video
      video.src = ''
      video.load()
    }
  }, [fixedSrc, poster, autoplay, preload, retryCount, mimeType])

  // Auto-hide controls
  useEffect(() => {
    if (!showControls || isLoading || error) return
    
    const hideControls = () => {
      if (isPlaying) {
        setShowControls(false)
      }
    }
    
    hideControlsTimeoutRef.current = setTimeout(hideControls, 3000)
    
    return () => {
      if (hideControlsTimeoutRef.current) {
        clearTimeout(hideControlsTimeoutRef.current)
      }
    }
  }, [showControls, isPlaying, isLoading, error])

  // Control functions
  const togglePlay = useCallback(() => {
    if (!videoRef.current) return
    
    if (isPlaying) {
      videoRef.current.pause()
    } else {
      videoRef.current.play().catch(err => {
        console.error('Play failed:', err.message)
        setError('Unable to play video. Please click the play button.')
      })
    }
  }, [isPlaying])

  const toggleMute = useCallback(() => {
    if (!videoRef.current) return
    videoRef.current.muted = !videoRef.current.muted
  }, [])

  const setVideoVolume = useCallback((value: number) => {
    if (!videoRef.current) return
    const newVolume = Math.max(0, Math.min(1, value))
    videoRef.current.volume = newVolume
    videoRef.current.muted = newVolume === 0
  }, [])

  const seek = useCallback((time: number) => {
    if (!videoRef.current) return
    const newTime = Math.max(0, Math.min(duration, time))
    videoRef.current.currentTime = newTime
    setCurrentTime(newTime)
  }, [duration])

  const seekToPercentage = useCallback((percentage: number) => {
    if (!videoRef.current || !duration) return
    const newTime = duration * Math.max(0, Math.min(1, percentage))
    seek(newTime)
  }, [duration, seek])

  const skip = useCallback((seconds: number) => {
    if (!videoRef.current) return
    seek(videoRef.current.currentTime + seconds)
  }, [seek])

  const changePlaybackRate = useCallback((rate: number) => {
    if (!videoRef.current) return
    const newRate = Math.max(0.25, Math.min(4, rate))
    videoRef.current.playbackRate = newRate
    setPlaybackRate(newRate)
  }, [])

  const toggleFullscreen = useCallback(async () => {
    if (!containerRef.current) return
    
    try {
      if (!document.fullscreenElement) {
        await containerRef.current.requestFullscreen()
      } else {
        await document.exitFullscreen()
      }
    } catch (err) {
      console.error('Fullscreen error:', err)
    }
  }, [])

  const toggleInfoPanel = useCallback(() => {
    setShowInfoPanel(prev => !prev)
    setShowSettings(false)
  }, [])

  const changeQuality = useCallback((qualityId: string) => {
    setActiveQuality(qualityId)
    setShowSettings(false)
  }, [])

  const retryPlayback = useCallback(() => {
    setError(null)
    setRetryCount(0)
    setHasCorsIssue(false)
    setIsLoading(true)
    
    if (videoRef.current) {
      videoRef.current.load()
      videoRef.current.play().catch(console.error)
    }
  }, [])

  const formatTime = useCallback((seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }, [])

  // Handle mouse movement for controls
  const handleMouseMove = useCallback(() => {
    setShowControls(true)
    
    if (hideControlsTimeoutRef.current) {
      clearTimeout(hideControlsTimeoutRef.current)
    }
    
    if (isPlaying) {
      hideControlsTimeoutRef.current = setTimeout(() => {
        setShowControls(false)
      }, 3000)
    }
  }, [isPlaying])

  // Handle progress bar click
  const handleProgressClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!progressBarRef.current || !duration) return
    
    const rect = progressBarRef.current.getBoundingClientRect()
    const percentage = (e.clientX - rect.left) / rect.width
    seekToPercentage(percentage)
  }, [duration, seekToPercentage])

  // Handle volume bar click
  const handleVolumeClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!volumeBarRef.current) return
    
    const rect = volumeBarRef.current.getBoundingClientRect()
    const percentage = (e.clientX - rect.left) / rect.width
    setVideoVolume(percentage)
  }, [setVideoVolume])

  // Consolidated Info Panel Component
  const InfoPanel = useMemo(() => {
    if (!showInfoPanel) return null

    const getNetworkStatus = () => {
      if (!networkSpeed) return { label: 'Unknown', color: 'text-gray-400', icon: <Wifi className="w-4 h-4" /> }
      if (networkSpeed < 1) return { label: 'Poor', color: 'text-red-400', icon: <WifiOff className="w-4 h-4" /> }
      if (networkSpeed < 3) return { label: 'Fair', color: 'text-yellow-400', icon: <Wifi className="w-4 h-4" /> }
      if (networkSpeed < 10) return { label: 'Good', color: 'text-blue-400', icon: <Wifi className="w-4 h-4" /> }
      return { label: 'Excellent', color: 'text-green-400', icon: <Wifi className="w-4 h-4" /> }
    }

    const networkStatus = getNetworkStatus()

    return (
      <div className="absolute top-20 right-4 bg-black/90 backdrop-blur-sm rounded-lg p-4 w-64 border border-white/10 shadow-2xl z-50">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-white flex items-center gap-2">
            <Info className="w-4 h-4" />
            Video Information
          </h3>
          <button
            onClick={() => setShowInfoPanel(false)}
            className="text-white/60 hover:text-white"
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
              {networkSpeed ? `${networkSpeed} Mbps` : 'Unknown'}
            </span>
          </div>

          {/* Battery */}
          {batteryLevel !== null && (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {isBatteryCharging ? (
                  <BatteryCharging className="w-4 h-4 text-green-400" />
                ) : (
                  <Battery className="w-4 h-4" />
                )}
                <span className="text-xs text-white/70">Battery</span>
              </div>
              <span className="text-xs text-white">
                {Math.round(batteryLevel)}%{isBatteryCharging ? ' (Charging)' : ''}
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

          {/* Security */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4" />
              <span className="text-xs text-white/70">Security</span>
            </div>
            <span className="text-xs text-green-400">Protected</span>
          </div>

          {/* Quality */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4" />
              <span className="text-xs text-white/70">Quality</span>
            </div>
            <span className="text-xs text-white">{activeQuality}</span>
          </div>

          {/* Offline Status */}
          {isOffline && (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CloudOff className="w-4 h-4 text-red-400" />
                <span className="text-xs text-white/70">Status</span>
              </div>
              <span className="text-xs text-red-400">Offline</span>
            </div>
          )}

          {/* Buffer Progress */}
          {bufferProgress > 0 && (
            <div className="pt-3 border-t border-white/10">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-white/70">Buffer</span>
                <span className="text-xs text-white">{bufferProgress.toFixed(1)}%</span>
              </div>
              <div className="w-full h-1 bg-white/20 rounded-full overflow-hidden">
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
  }, [showInfoPanel, networkSpeed, batteryLevel, isBatteryCharging, currentFormat, activeQuality, isOffline, bufferProgress])

  // Top Info Button Component
  const TopInfoButton = useMemo(() => {
    const getStatusColor = () => {
      if (isOffline) return 'bg-red-600'
      if (hasCorsIssue) return 'bg-amber-600'
      if (networkSpeed && networkSpeed > 5) return 'bg-green-600'
      return 'bg-black/60'
    }

    const getStatusIcon = () => {
      if (isOffline) return <CloudOff className="w-3 h-3" />
      if (hasCorsIssue) return <AlertCircle className="w-3 h-3" />
      if (networkSpeed && networkSpeed > 5) return <Zap className="w-3 h-3" />
      return <Shield className="w-3 h-3" />
    }

    const getStatusText = () => {
      if (isOffline) return 'Offline'
      if (hasCorsIssue) return 'CORS Issue'
      if (networkSpeed && networkSpeed > 5) return 'Turbo'
      return 'Protected'
    }

    return (
      <button
        onClick={toggleInfoPanel}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg backdrop-blur-sm text-white transition-all hover:scale-105 ${getStatusColor()}`}
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
  }, [isOffline, hasCorsIssue, networkSpeed, showInfoPanel, toggleInfoPanel])

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
                <span className="font-semibold">CORS Solution:</span>
              </p>
              <ul className="text-amber-200/80 text-xs space-y-1 text-left">
                <li>• Check S3 bucket CORS configuration</li>
                <li>• Make sure CORS config is properly saved</li>
                <li>• Clear browser cache and try again</li>
              </ul>
            </div>
          )}
          
          <div className="flex flex-col gap-3">
            <Button
              onClick={retryPlayback}
              className="bg-gradient-to-r from-red-600 to-orange-500 hover:from-red-700 hover:to-orange-600 text-white font-medium"
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
      className={`relative w-full aspect-video bg-black rounded-2xl overflow-hidden group ${className}`}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setShowControls(true)}
      onMouseLeave={() => {
        if (isPlaying) {
          setShowControls(false)
        }
      }}
      onClick={togglePlay}
      onDoubleClick={toggleFullscreen}
    >
      {/* Video element */}
      <video
        ref={videoRef}
        className="w-full h-full object-contain"
        playsInline
        controls={false}
        disablePictureInPicture={false}
        disableRemotePlayback={true}
        crossOrigin={fixedSrc.includes('s3.') ? undefined : 'anonymous'}
      />
      
      {/* Consolidated Top Info Button */}
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
            <div className="absolute inset-0 bg-gradient-to-r from-red-500/20 to-orange-500/20 blur-xl rounded-full" />
          </div>
          <p className="text-white/80 text-sm mt-4">
            {isBuffering ? 'Buffering...' : 'Loading video...'}
          </p>
          {bufferProgress > 0 && (
            <div className="w-48 mt-2">
              <div className="w-full h-1 bg-white/30 rounded-full overflow-hidden">
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
          className="absolute inset-0 flex items-center justify-center cursor-pointer z-20"
          onClick={(e) => {
            e.stopPropagation()
            togglePlay()
          }}
        >
          <div className="w-24 h-24 bg-white/10 backdrop-blur-sm rounded-full flex items-center justify-center hover:scale-110 transition-transform group-hover:opacity-100 opacity-80">
            <Play className="w-12 h-12 text-white ml-2" />
          </div>
        </div>
      )}
      
      {/* Controls overlay */}
      {(showControls || isLoading || error) && (
        <>
          {/* Top gradient */}
          <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-black/90 via-black/50 to-transparent pointer-events-none z-10" />
          
          {/* Bottom controls */}
          <div 
            className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/95 via-black/80 to-transparent p-4 z-10"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Progress bar */}
            <div className="mb-4 relative">
              {/* Buffer progress */}
              <div 
                className="absolute top-0 left-0 w-full h-1.5 bg-white/20 rounded-full overflow-hidden cursor-pointer"
                ref={progressBarRef}
                onClick={handleProgressClick}
              >
                <div 
                  className="h-full bg-white/40 transition-all duration-300"
                  style={{ width: `${bufferProgress}%` }}
                />
              </div>
              
              {/* Playback progress */}
              <div 
                className="absolute top-0 left-0 h-1.5 bg-gradient-to-r from-red-600 to-orange-500 rounded-full cursor-pointer transition-all duration-300"
                style={{ width: `${(currentTime / duration) * 100}%` }}
                onClick={handleProgressClick}
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
                  className="w-10 h-10 bg-white/10 backdrop-blur-sm hover:bg-white/20 text-white rounded-full p-0 flex items-center justify-center hover:scale-105 transition-transform"
                  aria-label={isPlaying ? 'Pause' : 'Play'}
                >
                  {isPlaying ? (
                    <Pause className="w-5 h-5" />
                  ) : (
                    <Play className="w-5 h-5 ml-0.5" />
                  )}
                </Button>
                
                {/* Skip backward */}
                <Button
                  onClick={() => skip(-10)}
                  className="w-9 h-9 bg-white/10 backdrop-blur-sm hover:bg-white/20 text-white rounded-full p-0 flex items-center justify-center hover:scale-105 transition-transform"
                  aria-label="Skip back 10 seconds"
                >
                  <SkipBack className="w-4 h-4" />
                </Button>
                
                {/* Skip forward */}
                <Button
                  onClick={() => skip(10)}
                  className="w-9 h-9 bg-white/10 backdrop-blur-sm hover:bg-white/20 text-white rounded-full p-0 flex items-center justify-center hover:scale-105 transition-transform"
                  aria-label="Skip forward 10 seconds"
                >
                  <SkipForward className="w-4 h-4" />
                </Button>
                
                {/* Volume */}
                <div className="flex items-center gap-2 ml-2">
                  <Button
                    onClick={toggleMute}
                    className="w-9 h-9 bg-white/10 backdrop-blur-sm hover:bg-white/20 text-white rounded-full p-0 flex items-center justify-center hover:scale-105 transition-transform"
                    aria-label={isMuted ? 'Unmute' : 'Mute'}
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
                    onClick={handleVolumeClick}
                  >
                    <div 
                      className="absolute top-0 left-0 h-full bg-gradient-to-r from-red-600 to-orange-500 rounded-full"
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
                    onClick={() => setShowSettings(!showSettings)}
                    className="w-9 h-9 bg-white/10 backdrop-blur-sm hover:bg-white/20 text-white rounded-full p-0 flex items-center justify-center hover:scale-105 transition-transform"
                    aria-label="Settings"
                  >
                    <Settings className="w-4 h-4" />
                  </Button>
                  
                  {/* Settings dropdown */}
                  {showSettings && (
                    <div className="absolute bottom-full right-0 mb-2 bg-black/90 backdrop-blur-sm rounded-lg p-3 min-w-[180px] border border-white/10 shadow-2xl z-50">
                      {/* Playback speed */}
                      <div className="mb-3">
                        <h4 className="text-xs font-semibold text-white/70 mb-2">PLAYBACK SPEED</h4>
                        <div className="grid grid-cols-2 gap-1">
                          {playbackRates.map(rate => (
                            <button
                              key={rate}
                              onClick={() => {
                                changePlaybackRate(rate)
                                setShowSettings(false)
                              }}
                              className={`px-2 py-1.5 rounded text-xs flex items-center justify-center ${
                                playbackRate === rate
                                  ? 'bg-gradient-to-r from-red-600 to-orange-500 text-white'
                                  : 'bg-white/10 text-white/70 hover:bg-white/20'
                              }`}
                            >
                              {rate === 1 ? 'Normal' : `${rate}x`}
                            </button>
                          ))}
                        </div>
                      </div>
                      
                      {/* Quality selector */}
                      <div className="mb-3">
                        <h4 className="text-xs font-semibold text-white/70 mb-2">QUALITY</h4>
                        <div className="space-y-1">
                          {qualities.map(quality => (
                            <button
                              key={quality.id}
                              onClick={() => changeQuality(quality.id)}
                              className={`w-full text-left px-2 py-1.5 rounded text-xs flex items-center justify-between hover:bg-white/10 ${
                                activeQuality === quality.id
                                  ? 'bg-gradient-to-r from-red-600/20 to-orange-500/20 text-white'
                                  : 'text-white/70'
                              }`}
                            >
                              <span>{quality.label}</span>
                              {activeQuality === quality.id && (
                                <Check className="w-3 h-3" />
                              )}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                
                {/* Current playback rate indicator */}
                {playbackRate !== 1 && (
                  <div className="px-2 py-1 bg-white/10 backdrop-blur-sm rounded text-xs text-white/80">
                    {playbackRate.toFixed(2)}x
                  </div>
                )}
                
                {/* Fullscreen */}
                <Button
                  onClick={toggleFullscreen}
                  className="w-9 h-9 bg-white/10 backdrop-blur-sm hover:bg-white/20 text-white rounded-full p-0 flex items-center justify-center hover:scale-105 transition-transform"
                  aria-label={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
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