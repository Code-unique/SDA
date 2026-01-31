// components/video/CloudFrontVideoPlayer.tsx - FINAL FIXED VERSION
'use client'

import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react'
import { 
  Play, Pause, Volume2, VolumeX, Maximize2, Minimize2, Loader2,
  SkipBack, SkipForward
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface CloudFrontVideoPlayerProps {
  videoKey: string
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
  onProgress?: (progress: number) => void
  onEnded?: () => void
  onTimeUpdate?: (time: number) => void
  onLoadedMetadata?: (duration: number) => void
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
  onPause,
  onProgress,
  onEnded,
  onTimeUpdate,
  onLoadedMetadata
}: CloudFrontVideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  
  // State that doesn't affect video element
  const [showControls, setShowControls] = useState(true)
  const [hasUserInteracted, setHasUserInteracted] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  
  // Video state - derived from video element, not React state
  const [uiState, setUiState] = useState({
    isLoading: false,
    error: null as string | null,
    currentTime: 0,
    duration: 0,
    volume: muted ? 0 : 1,
    buffered: 0
  })
  
  // Build video URL
  const videoUrl = useMemo(() => {
    if (!videoKey) return ''
    
    let url = ''
    
    if (videoKey.startsWith('http')) {
      url = videoKey
    } else {
      url = `https://${CLOUDFRONT_DOMAIN}/${videoKey}`
    }
    
    // Convert .mov to .mp4
    if (url.toLowerCase().includes('.mov')) {
      url = url.replace(/\.mov($|\?)/i, '.mp4$1')
    }
    
    return url
  }, [videoKey])
  
  // Check device
  const isSafari = useMemo(() => {
    return typeof window !== 'undefined' && /^((?!chrome|android).)*safari/i.test(navigator.userAgent)
  }, [])
  
  const isIOS = useMemo(() => {
    return typeof window !== 'undefined' && /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream
  }, [])
  
  // Format time helper
  const formatTime = useCallback((seconds: number): string => {
    const hrs = Math.floor(seconds / 3600)
    const mins = Math.floor((seconds % 3600) / 60)
    const secs = Math.floor(seconds % 60)
    
    if (hrs > 0) {
      return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }, [])
  
  // Initialize video - SIMPLIFIED
  useEffect(() => {
    const video = videoRef.current
    if (!video || !videoUrl) return
    
    console.log('Initializing video player')
    
    // Set up video element once
    video.poster = poster || ''
    video.loop = loop
    video.playsInline = true
    video.preload = 'metadata'
    video.crossOrigin = 'anonymous'
    video.muted = muted || isIOS || isSafari
    
    // iOS/Safari attributes
    if (isIOS || isSafari) {
      video.setAttribute('webkit-playsinline', 'true')
      video.setAttribute('x-webkit-airplay', 'allow')
    }
    
    // Set source
    if (video.src !== videoUrl) {
      video.src = videoUrl
    }
    
    // Event handlers
    const handleLoadedData = () => {
      setUiState(prev => ({ ...prev, isLoading: false }))
      onReady?.()
    }
    
    const handleCanPlay = () => {
      setUiState(prev => ({ ...prev, isLoading: false }))
    }
    
    const handlePlaying = () => {
      onPlay?.()
    }
    
    const handlePause = () => {
      onPause?.()
    }
    
    const handleTimeUpdate = () => {
      const time = video.currentTime
      const duration = video.duration || 0
      
      setUiState(prev => ({
        ...prev,
        currentTime: time,
        duration: duration
      }))
      
      onTimeUpdate?.(time)
      if (duration > 0) {
        onProgress?.(time / duration)
        
        // Calculate buffered
        if (video.buffered.length > 0 && duration > 0) {
          const bufferedEnd = video.buffered.end(video.buffered.length - 1)
          const bufferedPercent = (bufferedEnd / duration) * 100
          setUiState(prev => ({ ...prev, buffered: bufferedPercent }))
        }
      }
    }
    
    const handleEnded = () => {
      onEnded?.()
    }
    
    const handleError = () => {
      const videoError = video.error
      let errorMsg = 'Failed to load video'
      
      if (videoError) {
        switch (videoError.code) {
          case 1: errorMsg = 'Video loading aborted'; break
          case 2: errorMsg = 'Network error'; break
          case 3: errorMsg = 'Video format not supported'; break
          case 4: errorMsg = 'Video corrupted or invalid'; break
        }
      }
      
      setUiState(prev => ({ ...prev, error: errorMsg, isLoading: false }))
      onError?.(errorMsg)
    }
    
    const handleLoadedMetadata = () => {
      setUiState(prev => ({ ...prev, duration: video.duration || 0 }))
      onLoadedMetadata?.(video.duration || 0)
    }
    
    const handleVolumeChange = () => {
      setUiState(prev => ({ ...prev, volume: video.volume }))
    }
    
    // Add listeners
    video.addEventListener('loadeddata', handleLoadedData)
    video.addEventListener('canplay', handleCanPlay)
    video.addEventListener('playing', handlePlaying)
    video.addEventListener('pause', handlePause)
    video.addEventListener('timeupdate', handleTimeUpdate)
    video.addEventListener('ended', handleEnded)
    video.addEventListener('error', handleError)
    video.addEventListener('loadedmetadata', handleLoadedMetadata)
    video.addEventListener('volumechange', handleVolumeChange)
    
    // Start loading
    setUiState(prev => ({ ...prev, isLoading: true, error: null }))
    video.load()
    
    // Attempt autoplay if allowed
    if (autoplay && !isIOS && !isSafari) {
      const playPromise = video.play()
      if (playPromise !== undefined) {
        playPromise.catch(() => {
          // Autoplay failed, that's okay
        })
      }
    }
    
    // Cleanup
    return () => {
      console.log('Cleaning up listeners')
      video.removeEventListener('loadeddata', handleLoadedData)
      video.removeEventListener('canplay', handleCanPlay)
      video.removeEventListener('playing', handlePlaying)
      video.removeEventListener('pause', handlePause)
      video.removeEventListener('timeupdate', handleTimeUpdate)
      video.removeEventListener('ended', handleEnded)
      video.removeEventListener('error', handleError)
      video.removeEventListener('loadedmetadata', handleLoadedMetadata)
      video.removeEventListener('volumechange', handleVolumeChange)
    }
  }, [videoUrl, poster, loop, muted, autoplay, isIOS, isSafari, onReady, onPlay, onPause, onTimeUpdate, onProgress, onEnded, onError, onLoadedMetadata])
  
  // Handle fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement)
    }
    
    document.addEventListener('fullscreenchange', handleFullscreenChange)
    
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange)
    }
  }, [])
  
  // Play/Pause - DIRECT VIDEO CONTROL
  const togglePlay = useCallback(() => {
    const video = videoRef.current
    if (!video) return
    
    setHasUserInteracted(true)
    setShowControls(true)
    
    // Direct control, no async/await
    if (video.paused) {
      video.play().catch(err => {
        console.log('Play failed:', err)
        // If autoplay restricted, try muted
        if (err.name === 'NotAllowedError') {
          video.muted = true
          video.play().catch(() => {})
        }
      })
    } else {
      video.pause()
    }
  }, [])
  
  // Seek handler
  const handleSeek = useCallback((percentage: number) => {
    const video = videoRef.current
    if (!video || !uiState.duration) return
    
    const time = uiState.duration * Math.max(0, Math.min(1, percentage))
    video.currentTime = time
    setUiState(prev => ({ ...prev, currentTime: time }))
    setShowControls(true)
    setHasUserInteracted(true)
  }, [uiState.duration])
  
  // Volume control
  const handleVolumeChange = useCallback((newVolume: number) => {
    const video = videoRef.current
    if (!video) return
    
    const volumeValue = Math.max(0, Math.min(1, newVolume))
    video.volume = volumeValue
    video.muted = volumeValue === 0
    setUiState(prev => ({ ...prev, volume: volumeValue }))
    setShowControls(true)
  }, [])
  
  // Fullscreen
  const toggleFullscreen = useCallback(() => {
    if (!containerRef.current) return
    
    try {
      if (!document.fullscreenElement) {
        containerRef.current.requestFullscreen()
        setIsFullscreen(true)
      } else {
        document.exitFullscreen()
        setIsFullscreen(false)
      }
    } catch (err) {
      console.error('Fullscreen error:', err)
    }
    setShowControls(true)
  }, [])
  
  // Skip forward/backward
  const skip = useCallback((seconds: number) => {
    const video = videoRef.current
    if (!video || !uiState.duration) return
    
    const newTime = Math.max(0, Math.min(uiState.duration, video.currentTime + seconds))
    video.currentTime = newTime
    setUiState(prev => ({ ...prev, currentTime: newTime }))
    setShowControls(true)
  }, [uiState.duration])
  
  // Handle container click for play/pause
  const handleContainerClick = useCallback((e: React.MouseEvent) => {
    // Don't trigger if clicking on controls
    if ((e.target as HTMLElement).closest('.video-controls')) {
      return
    }
    
    const video = videoRef.current
    if (!video) return
    
    if (video.paused) {
      video.play().catch(() => {})
    } else {
      video.pause()
    }
    setShowControls(true)
    setHasUserInteracted(true)
  }, [])
  
  // Controls auto-hide
  useEffect(() => {
    if (!controls) return
    
    const video = videoRef.current
    if (!video) return
    
    let hideTimeout: NodeJS.Timeout
    
    const resetHideTimeout = () => {
      clearTimeout(hideTimeout)
      setShowControls(true)
      
      if (!video.paused) {
        hideTimeout = setTimeout(() => {
          setShowControls(false)
        }, 3000)
      }
    }
    
    // Initial timeout
    if (!video.paused) {
      hideTimeout = setTimeout(() => {
        setShowControls(false)
      }, 3000)
    }
    
    // Add listeners for interaction
    const handleMouseMove = () => {
      resetHideTimeout()
    }
    
    const handleTouchStart = () => {
      resetHideTimeout()
    }
    
    containerRef.current?.addEventListener('mousemove', handleMouseMove)
    containerRef.current?.addEventListener('touchstart', handleTouchStart)
    
    return () => {
      clearTimeout(hideTimeout)
      containerRef.current?.removeEventListener('mousemove', handleMouseMove)
      containerRef.current?.removeEventListener('touchstart', handleTouchStart)
    }
  }, [controls, uiState.currentTime])
  
  // Error state
  if (uiState.error) {
    return (
      <div 
        ref={containerRef}
        className={cn("relative bg-black rounded-xl overflow-hidden flex flex-col items-center justify-center aspect-video p-6", className)}
      >
        <div className="text-center space-y-4">
          <div className="text-red-400 mb-4 text-4xl">⚠️</div>
          <h3 className="text-white text-lg font-semibold mb-2">Video Error</h3>
          <p className="text-white/80 mb-6 max-w-md">{uiState.error}</p>
          <button
            onClick={() => {
              setUiState(prev => ({ ...prev, error: null, isLoading: true }))
              if (videoRef.current) {
                videoRef.current.load()
              }
            }}
            className="px-4 py-2 bg-gradient-to-r from-red-600 to-orange-500 text-white rounded-lg hover:from-red-700 hover:to-orange-600 transition-colors"
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
      onClick={handleContainerClick}
    >
      {/* Video element - NO KEY PROP */}
      <video
        ref={videoRef}
        className="w-full h-full object-contain"
        playsInline={true}
        webkit-playsinline="true"
        x-webkit-airplay="allow"
        preload="metadata"
        disablePictureInPicture
        controls={false}
      />
      
      {/* Loading overlay */}
      {uiState.isLoading && (
        <div className="absolute inset-0 bg-black/80 flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="w-12 h-12 text-white animate-spin mx-auto mb-4" />
            <p className="text-white/80">Loading video...</p>
          </div>
        </div>
      )}
      
      {/* Center play button overlay */}
      {!uiState.isLoading && !uiState.error && videoRef.current?.paused && (
        <div className="absolute inset-0 flex items-center justify-center">
          <button
            onClick={togglePlay}
            className="w-20 h-20 bg-black/60 rounded-full flex items-center justify-center hover:bg-black/80 transition-all hover:scale-105 z-20"
          >
            <Play className="w-10 h-10 text-white ml-1" />
          </button>
        </div>
      )}
      
      {/* Custom Controls */}
      {controls && showControls && (
        <>
          {/* Top gradient overlay */}
          <div className="absolute top-0 left-0 right-0 h-20 bg-gradient-to-b from-black/90 to-transparent pointer-events-none" />
          
          {/* Bottom controls */}
          <div 
            className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/95 via-black/80 to-transparent p-4 pt-6 video-controls"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Progress bar */}
            <div className="mb-4">
              <div className="relative h-2 bg-white/20 rounded-full overflow-hidden mb-1">
                {/* Buffered progress */}
                <div 
                  className="absolute top-0 left-0 h-full bg-white/30 transition-all duration-300"
                  style={{ width: `${uiState.buffered}%` }}
                />
                {/* Played progress */}
                <div 
                  className="absolute top-0 left-0 h-full bg-gradient-to-r from-red-500 to-orange-500"
                  style={{ width: `${uiState.duration ? (uiState.currentTime / uiState.duration) * 100 : 0}%` }}
                />
                {/* Seekable track */}
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={uiState.duration ? (uiState.currentTime / uiState.duration) * 100 : 0}
                  onChange={(e) => handleSeek(parseFloat(e.target.value) / 100)}
                  className="absolute top-0 left-0 w-full h-full opacity-0 cursor-pointer z-10"
                />
              </div>
              <div className="flex justify-between text-sm text-white/80">
                <span>{formatTime(uiState.currentTime)}</span>
                <span>{formatTime(uiState.duration)}</span>
              </div>
            </div>
            
            {/* Control buttons */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => skip(-10)}
                  className="p-2 rounded-lg hover:bg-white/10 text-white transition-colors"
                  title="Skip -10s"
                >
                  <SkipBack className="w-5 h-5" />
                </button>
                <button
                  onClick={togglePlay}
                  className="p-3 rounded-full bg-white hover:bg-white/90 text-black transition-all hover:scale-105 z-20"
                >
                  {videoRef.current?.paused ? (
                    <Play className="w-6 h-6 ml-0.5" />
                  ) : (
                    <Pause className="w-6 h-6" />
                  )}
                </button>
                <button
                  onClick={() => skip(10)}
                  className="p-2 rounded-lg hover:bg-white/10 text-white transition-colors"
                  title="Skip +10s"
                >
                  <SkipForward className="w-5 h-5" />
                </button>
                
                {/* Volume control */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleVolumeChange(uiState.volume === 0 ? 0.5 : 0)}
                    className="p-2 rounded-lg hover:bg-white/10 text-white transition-colors"
                  >
                    {uiState.volume === 0 ? (
                      <VolumeX className="w-5 h-5" />
                    ) : (
                      <Volume2 className="w-5 h-5" />
                    )}
                  </button>
                  <div className="w-20 hidden sm:block">
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={uiState.volume * 100}
                      onChange={(e) => handleVolumeChange(parseFloat(e.target.value) / 100)}
                      className="w-full accent-red-500"
                    />
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                {/* Speed control */}
                {!isIOS && (
                  <select 
                    className="bg-white/10 text-white text-sm rounded-lg px-2 py-1 border border-white/20 hover:bg-white/20 transition-colors"
                    onChange={(e) => {
                      const video = videoRef.current
                      if (video) {
                        video.playbackRate = parseFloat(e.target.value)
                      }
                    }}
                    defaultValue="1"
                  >
                    <option value="0.5">0.5x</option>
                    <option value="0.75">0.75x</option>
                    <option value="1">1x</option>
                    <option value="1.25">1.25x</option>
                    <option value="1.5">1.5x</option>
                    <option value="2">2x</option>
                  </select>
                )}
                
                <button
                  onClick={toggleFullscreen}
                  className="p-2 rounded-lg hover:bg-white/10 text-white transition-colors"
                >
                  {isFullscreen ? (
                    <Minimize2 className="w-5 h-5" />
                  ) : (
                    <Maximize2 className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>
          </div>
        </>
      )}
      
      {/* iOS/Safari autoplay hint */}
      {(isIOS || isSafari) && !hasUserInteracted && videoRef.current?.paused && !uiState.isLoading && (
        <div className="absolute bottom-20 left-1/2 transform -translate-x-1/2 px-4 py-2 bg-black/80 text-white text-sm rounded-lg backdrop-blur-sm">
          Tap video to play
        </div>
      )}
    </div>
  )
}