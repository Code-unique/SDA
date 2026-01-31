// components/video/CloudFrontVideoPlayer.tsx - FIXED VERSION
'use client'

import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react'
import { 
  Play, Pause, Volume2, VolumeX, Maximize2, Minimize2, Loader2,
  SkipBack, SkipForward, RotateCw
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
  
  const [isPlaying, setIsPlaying] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [volume, setVolume] = useState(muted ? 0 : 1)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [buffered, setBuffered] = useState(0)
  const [showControls, setShowControls] = useState(true)
  const [hasUserInteracted, setHasUserInteracted] = useState(false)
  const [isVideoLoaded, setIsVideoLoaded] = useState(false)
  
  // Check if Safari
  const isSafari = useMemo(() => {
    return typeof window !== 'undefined' && /^((?!chrome|android).)*safari/i.test(navigator.userAgent)
  }, [])
  
  // Check if iOS
  const isIOS = useMemo(() => {
    return typeof window !== 'undefined' && /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream
  }, [])
  
  // Build video URL with .mov to .mp4 conversion
  const videoUrl = useMemo(() => {
    if (!videoKey) return ''
    
    let url = ''
    
    // If already a URL
    if (videoKey.startsWith('http')) {
      url = videoKey
    } else {
      // CloudFront URL
      url = `https://${CLOUDFRONT_DOMAIN}/${videoKey}`
    }
    
    // FORCE .mov to .mp4 conversion for Safari compatibility
    if (url.toLowerCase().includes('.mov')) {
      url = url.replace(/\.mov($|\?)/i, '.mp4$1')
      
      // Also check if the key has .mov and replace it
      if (videoKey.toLowerCase().includes('.mov')) {
        const fixedKey = videoKey.replace(/\.mov($|\?)/i, '.mp4$1')
        url = `https://${CLOUDFRONT_DOMAIN}/${fixedKey}`
      }
    }
    
    return url
  }, [videoKey])
  
  // Format time
  const formatTime = useCallback((seconds: number): string => {
    const hrs = Math.floor(seconds / 3600)
    const mins = Math.floor((seconds % 3600) / 60)
    const secs = Math.floor(seconds % 60)
    
    if (hrs > 0) {
      return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }, [])
  
  // Initialize video with proper event handling
  useEffect(() => {
    // Skip if no video element or URL
    if (!videoRef.current || !videoUrl) {
      return
    }
    
    setIsLoading(true)
    setError(null)
    
    const video = videoRef.current
    let isMounted = true
    
    // Store initial muted state for Safari workaround
    const initialMuted = muted || isSafari || isIOS
    
    // CRITICAL: Set video attributes BEFORE setting src
    video.poster = poster || ''
    video.loop = loop
    video.playsInline = true
    video.preload = 'metadata'
    video.crossOrigin = 'anonymous'
    video.muted = initialMuted
    
    // Safari specific attributes
    if (isIOS || isSafari) {
      video.setAttribute('webkit-playsinline', 'true')
      video.setAttribute('playsinline', 'true')
      video.setAttribute('x-webkit-airplay', 'allow')
      video.setAttribute('preload', 'auto')
    }
    
    // Event handlers
    const handleLoadedMetadata = () => {
      if (!isMounted) return
      console.log('Video metadata loaded, duration:', video.duration)
      setDuration(video.duration || 0)
      onLoadedMetadata?.(video.duration || 0)
    }
    
    const handleLoadedData = () => {
      if (!isMounted) return
      console.log('Video data loaded')
      setIsLoading(false)
      setIsVideoLoaded(true)
      onReady?.()
    }
    
    const handleCanPlay = () => {
      if (!isMounted) return
      console.log('Video can play')
    }
    
    const handlePlaying = () => {
      if (!isMounted) return
      setIsPlaying(true)
      onPlay?.()
    }
    
    const handlePauseEvent = () => {
      if (!isMounted) return
      setIsPlaying(false)
      onPause?.()
    }
    
    const handleTimeUpdate = () => {
      if (!isMounted || !video) return
      const time = video.currentTime
      setCurrentTime(time)
      onTimeUpdate?.(time)
      
      if (video.duration > 0) {
        onProgress?.(time / video.duration)
        
        // Calculate buffered amount
        if (video.buffered.length > 0) {
          const bufferedEnd = video.buffered.end(video.buffered.length - 1)
          setBuffered((bufferedEnd / video.duration) * 100)
        }
      }
    }
    
    const handleEnded = () => {
      if (!isMounted) return
      setIsPlaying(false)
      onEnded?.()
    }
    
    const handleError = (e: Event) => {
      if (!isMounted) return
      console.error('Video error:', e)
      setIsLoading(false)
      setIsVideoLoaded(false)
      
      const videoError = video.error
      let errorMsg = 'Failed to load video'
      
      if (videoError) {
        switch (videoError.code) {
          case 1: errorMsg = 'Video loading aborted'; break
          case 2: errorMsg = 'Network error. Please check your connection.'; break
          case 3: errorMsg = 'Video format not supported'; break
          case 4: errorMsg = 'Video corrupted or invalid'; break
        }
      }
      
      setError(errorMsg)
      onError?.(errorMsg)
    }
    
    const handleVolumeChange = () => {
      if (!isMounted) return
      setVolume(video.volume)
    }
    
    // Add event listeners
    video.addEventListener('loadedmetadata', handleLoadedMetadata)
    video.addEventListener('loadeddata', handleLoadedData)
    video.addEventListener('canplay', handleCanPlay)
    video.addEventListener('playing', handlePlaying)
    video.addEventListener('pause', handlePauseEvent)
    video.addEventListener('timeupdate', handleTimeUpdate)
    video.addEventListener('ended', handleEnded)
    video.addEventListener('error', handleError)
    video.addEventListener('volumechange', handleVolumeChange)
    
    // Set src LAST, after event listeners are attached
    video.src = videoUrl
    
    // Auto-hide controls
    let controlsTimer: NodeJS.Timeout
    const resetControlsTimer = () => {
      clearTimeout(controlsTimer)
      setShowControls(true)
      if (isPlaying) {
        controlsTimer = setTimeout(() => setShowControls(false), 3000)
      }
    }
    
    containerRef.current?.addEventListener('mousemove', resetControlsTimer)
    containerRef.current?.addEventListener('touchstart', resetControlsTimer)
    
    // Add click handler for user interaction
    const handleContainerClick = () => {
      setHasUserInteracted(true)
      resetControlsTimer()
    }
    
    containerRef.current?.addEventListener('click', handleContainerClick)
    
    // Fullscreen change listener
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement)
    }
    
    document.addEventListener('fullscreenchange', handleFullscreenChange)
    
    // Cleanup function - PROPERLY CLEAN UP
    return () => {
      console.log('Cleaning up video player')
      isMounted = false
      
      // Remove event listeners from video
      video.removeEventListener('loadedmetadata', handleLoadedMetadata)
      video.removeEventListener('loadeddata', handleLoadedData)
      video.removeEventListener('canplay', handleCanPlay)
      video.removeEventListener('playing', handlePlaying)
      video.removeEventListener('pause', handlePauseEvent)
      video.removeEventListener('timeupdate', handleTimeUpdate)
      video.removeEventListener('ended', handleEnded)
      video.removeEventListener('error', handleError)
      video.removeEventListener('volumechange', handleVolumeChange)
      
      // Remove container event listeners
      containerRef.current?.removeEventListener('mousemove', resetControlsTimer)
      containerRef.current?.removeEventListener('touchstart', resetControlsTimer)
      containerRef.current?.removeEventListener('click', handleContainerClick)
      
      // Remove fullscreen listener
      document.removeEventListener('fullscreenchange', handleFullscreenChange)
      
      clearTimeout(controlsTimer)
      
      // IMPORTANT: Don't pause or clear src if we're just toggling controls
      // Only pause if we're actually unmounting the component
      // This prevents black screen when clicking controls
      
      // Keep the video element alive - don't clear src
      // This is key to preventing black screen
    }
  }, [videoUrl, poster, autoplay, loop, isSafari, isIOS, muted, onReady, onPlay, onPause, onProgress, onEnded, onError, onTimeUpdate, onLoadedMetadata])
  
  // Handle autoplay/muted changes separately - FIXED
  useEffect(() => {
    const video = videoRef.current
    if (!video || !isVideoLoaded) return
    
    // For Safari/iOS, we need muted for autoplay
    if ((isSafari || isIOS) && autoplay) {
      video.muted = true
    } else {
      video.muted = muted
    }
    
    // Only attempt autoplay if we have user interaction or it's specifically allowed
    if (autoplay && (hasUserInteracted || !isSafari) && !isPlaying) {
      const playPromise = video.play()
      if (playPromise !== undefined) {
        playPromise.catch(err => {
          console.log('Autoplay prevented:', err)
          // Don't show error for autoplay restrictions
        })
      }
    }
  }, [autoplay, muted, isVideoLoaded, hasUserInteracted, isPlaying, isSafari, isIOS])
  
  // Play/Pause toggle with proper error handling
  const togglePlay = useCallback(async () => {
    const video = videoRef.current
    if (!video) return
    
    setHasUserInteracted(true)
    setShowControls(true)
    
    if (isPlaying) {
      video.pause()
    } else {
      try {
        // For Safari/iOS, ensure video is muted for first play
        if ((isSafari || isIOS) && video.muted === false) {
          video.muted = true
        }
        
        await video.play()
        
        // After successful play on Safari/iOS, we can try to unmute
        if ((isSafari || isIOS) && !muted) {
          setTimeout(() => {
            if (video) video.muted = false
          }, 1000)
        }
      } catch (err: any) {
        console.error('Play failed:', err)
        
        // Try with muted if autoplay restriction
        if (err.name === 'NotAllowedError' || err.name === 'AbortError') {
          video.muted = true
          video.play().catch(console.error)
          setError('Autoplay blocked. Video is muted. Click unmute after playback starts.')
        } else {
          setError(err.message || 'Failed to play video')
        }
      }
    }
  }, [isPlaying, muted, isSafari, isIOS])
  
  // Seek handler - FIXED
  const handleSeek = useCallback((percentage: number) => {
    const video = videoRef.current
    if (!video || !duration) return
    
    const time = duration * Math.max(0, Math.min(1, percentage))
    video.currentTime = time
    setCurrentTime(time)
    setShowControls(true)
    setHasUserInteracted(true)
  }, [duration])
  
  // Volume control - FIXED
  const handleVolumeChange = useCallback((newVolume: number) => {
    const video = videoRef.current
    if (!video) return
    
    const volumeValue = Math.max(0, Math.min(1, newVolume))
    video.volume = volumeValue
    video.muted = volumeValue === 0
    setVolume(volumeValue)
    setShowControls(true)
    setHasUserInteracted(true)
  }, [])
  
  // Fullscreen - FIXED VERSION
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
      // Fallback for browsers that don't support fullscreen API
      if (videoRef.current) {
        if (!videoRef.current.classList.contains('fullscreen')) {
          videoRef.current.classList.add('fullscreen')
          containerRef.current.classList.add('fullscreen')
          setIsFullscreen(true)
        } else {
          videoRef.current.classList.remove('fullscreen')
          containerRef.current.classList.remove('fullscreen')
          setIsFullscreen(false)
        }
      }
    }
    setShowControls(true)
    setHasUserInteracted(true)
  }, [])
  
  // Skip forward/backward
  const skip = useCallback((seconds: number) => {
    const video = videoRef.current
    if (!video || !duration) return
    
    const newTime = Math.max(0, Math.min(duration, video.currentTime + seconds))
    video.currentTime = newTime
    setCurrentTime(newTime)
    setShowControls(true)
    setHasUserInteracted(true)
  }, [duration])
  
  // Retry loading
  const retryLoad = useCallback(() => {
    const video = videoRef.current
    if (!video || !videoUrl) return
    
    setError(null)
    setIsLoading(true)
    setIsVideoLoaded(false)
    setHasUserInteracted(true)
    
    // Force reload
    video.load()
  }, [videoUrl])
  
  // Handle container click for play/pause
  const handleContainerClick = useCallback((e: React.MouseEvent) => {
    // Don't trigger if clicking on controls
    if ((e.target as HTMLElement).closest('.video-controls')) {
      return
    }
    
    if (!isPlaying) {
      togglePlay()
    }
    setShowControls(true)
  }, [isPlaying, togglePlay])
  
  // Error state
  if (error) {
    return (
      <div 
        ref={containerRef}
        className={cn("relative bg-black rounded-xl overflow-hidden flex flex-col items-center justify-center aspect-video p-6", className)}
      >
        <div className="text-center space-y-4">
          <div className="w-16 h-16 bg-gradient-to-br from-red-500/20 to-orange-500/20 rounded-full flex items-center justify-center mx-auto">
            <div className="text-red-400 text-2xl">⚠️</div>
          </div>
          <div>
            <h3 className="text-white text-lg font-semibold mb-2">Video Error</h3>
            <p className="text-white/80 mb-4 max-w-md text-sm">{error}</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={retryLoad}
              className="px-4 py-2 bg-gradient-to-r from-red-600 to-orange-500 text-white rounded-lg hover:from-red-700 hover:to-orange-600 transition-colors text-sm font-medium"
            >
              <RotateCw className="w-4 h-4 inline mr-2" />
              Retry
            </button>
          </div>
        </div>
      </div>
    )
  }
  
  return (
    <div
      ref={containerRef}
      className={cn(
        "relative bg-black rounded-xl overflow-hidden group aspect-video cursor-pointer",
        isFullscreen && "fixed inset-0 z-50",
        className
      )}
      onClick={handleContainerClick}
      onMouseMove={() => {
        setShowControls(true)
        setHasUserInteracted(true)
      }}
      onMouseLeave={() => {
        if (isPlaying) setTimeout(() => setShowControls(false), 2000)
      }}
    >
      {/* SINGLE video element - don't recreate on re-render */}
      <video
        ref={videoRef}
        className="w-full h-full object-contain"
        playsInline={true}
        webkit-playsinline="true"
        x-webkit-airplay="allow"
        preload="metadata"
        disablePictureInPicture
        controls={false}
        onDoubleClick={toggleFullscreen}
      />
      
      {/* Loading overlay */}
      {isLoading && (
        <div className="absolute inset-0 bg-black/80 flex items-center justify-center">
          <div className="text-center space-y-3">
            <div className="relative">
              <Loader2 className="w-10 h-10 text-white animate-spin mx-auto" />
              <div className="absolute inset-0 bg-gradient-to-r from-red-500 to-orange-500 blur-xl opacity-20"></div>
            </div>
            <p className="text-white/80 text-sm">Loading video...</p>
          </div>
        </div>
      )}
      
      {/* Center play button overlay (for non-playing state) */}
      {!isPlaying && !isLoading && !error && (
        <div className="absolute inset-0 flex items-center justify-center">
          <button
            onClick={togglePlay}
            className="w-20 h-20 bg-black/60 rounded-full flex items-center justify-center hover:bg-black/80 transition-all hover:scale-105 z-20"
          >
            <div className="relative">
              <Play className="w-10 h-10 text-white ml-1" />
              <div className="absolute inset-0 bg-gradient-to-r from-red-500 to-orange-500 blur-xl opacity-0 group-hover:opacity-30 transition-opacity"></div>
            </div>
          </button>
        </div>
      )}
      
      {/* Custom Controls */}
      {controls && showControls && (
        <>
          {/* Top gradient overlay */}
          <div className="absolute top-0 left-0 right-0 h-20 bg-gradient-to-b from-black/90 to-transparent pointer-events-none" />
          
          {/* Bottom controls */}
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/95 via-black/80 to-transparent p-4 pt-6 video-controls">
            {/* Progress bar */}
            <div className="mb-4">
              <div className="relative h-2 bg-white/20 rounded-full overflow-hidden mb-1">
                {/* Buffered progress */}
                <div 
                  className="absolute top-0 left-0 h-full bg-white/30 transition-all duration-300"
                  style={{ width: `${buffered}%` }}
                />
                {/* Played progress */}
                <div 
                  className="absolute top-0 left-0 h-full bg-gradient-to-r from-red-500 to-orange-500"
                  style={{ width: `${duration ? (currentTime / duration) * 100 : 0}%` }}
                />
                {/* Seekable track */}
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={duration ? (currentTime / duration) * 100 : 0}
                  onChange={(e) => handleSeek(parseFloat(e.target.value) / 100)}
                  className="absolute top-0 left-0 w-full h-full opacity-0 cursor-pointer z-10"
                />
              </div>
              <div className="flex justify-between text-sm text-white/80">
                <span>{formatTime(currentTime)}</span>
                <span>{formatTime(duration)}</span>
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
                  {isPlaying ? (
                    <Pause className="w-6 h-6" />
                  ) : (
                    <Play className="w-6 h-6 ml-0.5" />
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
                    onClick={() => handleVolumeChange(volume === 0 ? 0.5 : 0)}
                    className="p-2 rounded-lg hover:bg-white/10 text-white transition-colors"
                  >
                    {volume === 0 ? (
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
                      value={volume * 100}
                      onChange={(e) => handleVolumeChange(parseFloat(e.target.value) / 100)}
                      className="w-full accent-red-500"
                    />
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                {/* Speed control for non-mobile */}
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
      {(isIOS || isSafari) && !hasUserInteracted && !isPlaying && !isLoading && (
        <div className="absolute bottom-20 left-1/2 transform -translate-x-1/2 px-4 py-2 bg-black/80 text-white text-sm rounded-lg backdrop-blur-sm">
          Tap video to play
        </div>
      )}
    </div>
  )
}