// components/video/CloudFrontVideoPlayer.tsx
'use client'

import React, { useRef, useEffect, useState, useCallback } from 'react'
import { Play, Pause, Volume2, VolumeX, Maximize2, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface CloudFrontVideoPlayerProps {
  videoKey: string // e.g., "courses/lessonVideos/12345-video.mov"
  poster?: string
  className?: string
  autoplay?: boolean
  muted?: boolean
  loop?: boolean
  controls?: boolean
  playsInline?: boolean
  onReady?: () => void
  onError?: (error: string) => void
  onPlay?: () => void
  onPause?: () => void
}

const CLOUDFRONT_DOMAIN = 'd2c1y2391adh81.cloudfront.net'

export function CloudFrontVideoPlayer({
  videoKey,
  poster,
  className = '',
  autoplay = false,
  muted = false,
  loop = false,
  controls = true,
  playsInline = true,
  onReady,
  onError,
  onPlay,
  onPause
}: CloudFrontVideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showControls, setShowControls] = useState(true)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [isMuted, setIsMuted] = useState(muted)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  
  // Build CloudFront URL
  const videoUrl = `https://${CLOUDFRONT_DOMAIN}/${videoKey}`
  
  // Format time
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }
  
  // Initialize video
  const initializeVideo = useCallback(() => {
    const video = videoRef.current
    if (!video || !videoKey) return
    
    setIsLoading(true)
    setError(null)
    
    // Reset video
    video.src = ''
    video.load()
    
    // Direct CloudFront URL
    video.src = videoUrl
    video.poster = poster || ''
    video.autoplay = autoplay
    video.muted = muted
    video.loop = loop
    video.playsInline = playsInline
    video.preload = 'metadata'
    video.controls = false // We'll use custom controls
    video.crossOrigin = 'anonymous'
    
    // iOS specific attributes
    if (/iPad|iPhone|iPod/.test(navigator.userAgent)) {
      video.setAttribute('webkit-playsinline', 'true')
      video.setAttribute('playsinline', 'true')
      video.setAttribute('x-webkit-airplay', 'allow')
      
      // For .mov files on iOS
      if (videoKey.endsWith('.mov')) {
        video.preload = 'auto'
      }
    }
    
    console.log('🎬 Video initialized with URL:', videoUrl)
  }, [videoKey, videoUrl, poster, autoplay, muted, loop, playsInline])
  
  // Event handlers
  const handleLoadedData = useCallback(() => {
    setIsLoading(false)
    onReady?.()
    
    // Auto play if requested
    if (autoplay && videoRef.current) {
      videoRef.current.play().catch(() => {
        // Silent fail for autoplay restrictions
      })
    }
  }, [autoplay, onReady])
  
  const handlePlaying = useCallback(() => {
    setIsPlaying(true)
    onPlay?.()
  }, [onPlay])
  
  const handlePauseEvent = useCallback(() => {
    setIsPlaying(false)
    onPause?.()
  }, [onPause])
  
  const handleTimeUpdate = useCallback(() => {
    const video = videoRef.current
    if (video) {
      setCurrentTime(video.currentTime)
      setDuration(video.duration || 0)
    }
  }, [])
  
  const handleError = useCallback((e: any) => {
    console.error('Video error:', e)
    setIsLoading(false)
    
    const video = videoRef.current
    let errorMsg = 'Failed to load video'
    
    if (video?.error) {
      switch (video.error.code) {
        case 1: errorMsg = 'Video loading aborted'; break
        case 2: errorMsg = 'Network error'; break
        case 3: errorMsg = 'Video format not supported'; break
        case 4: errorMsg = 'Video corrupted or invalid'; break
      }
    }
    
    // Special .mov handling
    if (videoKey.endsWith('.mov')) {
      if (/iPad|iPhone|iPod/.test(navigator.userAgent)) {
        errorMsg = 'MOV format may require QuickTime. Try MP4 for best iOS support.'
      }
    }
    
    setError(errorMsg)
    onError?.(errorMsg)
  }, [videoKey, onError])
  
  // Play/pause toggle
  const togglePlay = useCallback(() => {
    const video = videoRef.current
    if (!video) return
    
    setShowControls(true)
    
    if (isPlaying) {
      video.pause()
    } else {
      video.play().catch(err => {
        console.log('Play failed, trying muted:', err)
        if (/iPad|iPhone|iPod/.test(navigator.userAgent)) {
          video.muted = true
          video.play().catch(console.error)
        }
      })
    }
  }, [isPlaying])
  
  // Seek handler
  const handleSeek = useCallback((percentage: number) => {
    const video = videoRef.current
    if (!video || !duration) return
    
    const time = duration * Math.max(0, Math.min(1, percentage))
    video.currentTime = time
    setCurrentTime(time)
  }, [duration])
  
  // Fullscreen
  const toggleFullscreen = useCallback(async () => {
    if (!containerRef.current) return
    
    try {
      if (!document.fullscreenElement) {
        await containerRef.current.requestFullscreen()
        setIsFullscreen(true)
      } else {
        await document.exitFullscreen()
        setIsFullscreen(false)
      }
    } catch (err) {
      console.error('Fullscreen error:', err)
    }
  }, [])
  
  // Mute toggle
  const toggleMute = useCallback(() => {
    const video = videoRef.current
    if (!video) return
    
    video.muted = !isMuted
    setIsMuted(!isMuted)
  }, [isMuted])
  
  // Initialize on mount
  useEffect(() => {
    initializeVideo()
    
    const video = videoRef.current
    if (!video) return
    
    // Add event listeners
    video.addEventListener('loadeddata', handleLoadedData)
    video.addEventListener('playing', handlePlaying)
    video.addEventListener('pause', handlePauseEvent)
    video.addEventListener('timeupdate', handleTimeUpdate)
    video.addEventListener('error', handleError)
    video.addEventListener('ended', () => setIsPlaying(false))
    
    // Fullscreen listener
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement)
    }
    document.addEventListener('fullscreenchange', handleFullscreenChange)
    
    return () => {
      video.removeEventListener('loadeddata', handleLoadedData)
      video.removeEventListener('playing', handlePlaying)
      video.removeEventListener('pause', handlePauseEvent)
      video.removeEventListener('timeupdate', handleTimeUpdate)
      video.removeEventListener('error', handleError)
      video.removeEventListener('ended', () => setIsPlaying(false))
      document.removeEventListener('fullscreenchange', handleFullscreenChange)
    }
  }, [initializeVideo, handleLoadedData, handlePlaying, handlePauseEvent, handleTimeUpdate, handleError])
  
  // Auto-hide controls
  useEffect(() => {
    if (!showControls || isLoading || error) return
    
    const timer = setTimeout(() => {
      setShowControls(false)
    }, 3000)
    
    return () => clearTimeout(timer)
  }, [showControls, isLoading, error])
  
  // Show controls on interaction
  const handleInteraction = useCallback(() => {
    setShowControls(true)
  }, [])
  
  // Error state
  if (error) {
    return (
      <div className={cn("relative bg-black rounded-xl overflow-hidden flex items-center justify-center aspect-video", className)}>
        <div className="text-center p-6">
          <div className="text-red-400 mb-4 text-2xl">⚠️</div>
          <p className="text-white mb-4">{error}</p>
          <button
            onClick={initializeVideo}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }
  
  return (
    <div
      ref={containerRef}
      className={cn(
        "relative bg-black rounded-xl overflow-hidden group aspect-video",
        isFullscreen && "fixed inset-0 z-50",
        className
      )}
      onMouseMove={handleInteraction}
      onTouchStart={handleInteraction}
      onClick={(e) => {
        if ((e.target as HTMLElement).closest('[data-controls]')) return
        togglePlay()
        handleInteraction()
      }}
    >
      {/* Video element */}
      <video
        ref={videoRef}
        className="w-full h-full object-contain"
        playsInline={playsInline}
        webkit-playsinline="true"
        x-webkit-airplay="allow"
      />
      
      {/* Loading overlay */}
      {isLoading && (
        <div className="absolute inset-0 bg-black/80 flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-white animate-spin" />
        </div>
      )}
      
      {/* Center play button */}
      {!isPlaying && !isLoading && !error && (
        <div className="absolute inset-0 flex items-center justify-center">
          <button
            onClick={togglePlay}
            className="w-16 h-16 bg-black/60 rounded-full flex items-center justify-center hover:bg-black/80 transition-colors"
          >
            <Play className="w-8 h-8 text-white ml-1" />
          </button>
        </div>
      )}
      
      {/* Controls */}
      {controls && showControls && (
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 to-transparent p-4">
          {/* Progress bar */}
          <div className="mb-3">
            <div className="flex items-center gap-2 text-white/80 text-sm mb-1">
              <span>{formatTime(currentTime)}</span>
              <div 
                className="flex-1 h-1.5 bg-white/20 rounded-full overflow-hidden cursor-pointer"
                onClick={(e) => {
                  if (!duration) return
                  const rect = e.currentTarget.getBoundingClientRect()
                  const clickX = e.clientX - rect.left
                  const percentage = Math.max(0, Math.min(1, clickX / rect.width))
                  handleSeek(percentage)
                }}
              >
                <div 
                  className="h-full bg-blue-500 transition-all duration-150"
                  style={{ width: `${duration > 0 ? (currentTime / duration) * 100 : 0}%` }}
                />
              </div>
              <span>{formatTime(duration)}</span>
            </div>
          </div>
          
          {/* Control buttons */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={togglePlay}
                className="w-10 h-10 rounded-full bg-black/60 flex items-center justify-center hover:bg-black/80"
                data-controls
              >
                {isPlaying ? (
                  <Pause className="w-5 h-5 text-white" />
                ) : (
                  <Play className="w-5 h-5 text-white ml-0.5" />
                )}
              </button>
              
              <button
                onClick={toggleMute}
                className="w-8 h-8 rounded-full bg-black/60 flex items-center justify-center hover:bg-black/80"
                data-controls
              >
                {isMuted ? (
                  <VolumeX className="w-4 h-4 text-white" />
                ) : (
                  <Volume2 className="w-4 h-4 text-white" />
                )}
              </button>
            </div>
            
            <button
              onClick={toggleFullscreen}
              className="w-8 h-8 rounded-full bg-black/60 flex items-center justify-center hover:bg-black/80"
              data-controls
            >
              <Maximize2 className="w-4 h-4 text-white" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}