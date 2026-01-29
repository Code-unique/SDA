// components/video/CloudFrontVideoPlayer.tsx - UPDATED
'use client'

import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react'
import { 
  Play, Pause, Volume2, VolumeX, Maximize2, Loader2,
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
  onEnded
}: CloudFrontVideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  
  // Use a unique ID to prevent remounting issues
  const playerId = useMemo(() => `video-player-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`, [])
  
  const [isPlaying, setIsPlaying] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [volume, setVolume] = useState(muted ? 0 : 1)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [buffered, setBuffered] = useState(0)
  const [showControls, setShowControls] = useState(true)
  
  // Build video URL
  // In the videoUrl memo function, add this:
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
  
  // FORCE .mov to .mp4 conversion
  if (url.toLowerCase().includes('.mov')) {
    console.log('Converting .mov URL to .mp4:', url)
    // Replace .mov with .mp4 in the URL
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
  
  // Initialize video - FIXED with proper cleanup
  useEffect(() => {
    // Skip if no video element or URL
    if (!videoRef.current || !videoUrl) {
      return
    }
    
    setIsLoading(true)
    setError(null)
    
    const video = videoRef.current
    let isMounted = true
    let playAttempted = false
    
    // Set video attributes
    video.src = videoUrl
    video.poster = poster || ''
    video.loop = loop
    video.playsInline = playsInline
    video.preload = 'metadata'
    video.crossOrigin = 'anonymous'
    
    // iOS specific attributes
    if (/iPad|iPhone|iPod/.test(navigator.userAgent)) {
      video.setAttribute('webkit-playsinline', 'true')
      video.setAttribute('playsinline', 'true')
      video.setAttribute('x-webkit-airplay', 'allow')
    }
    
    // Event handlers
    const handleLoadedData = () => {
      if (!isMounted) return
      setIsLoading(false)
      onReady?.()
      
      // Only autoplay if not already attempted
      if (autoplay && !playAttempted) {
        playAttempted = true
        video.play().catch(err => {
          if (isMounted) {
            console.log('Autoplay prevented:', err)
            // Don't show error for autoplay restrictions
            if (!err.message.includes('user gesture')) {
              setError(err.message)
              onError?.(err.message)
            }
          }
        })
      }
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
      setCurrentTime(video.currentTime)
      setDuration(video.duration || 0)
      onProgress?.(video.currentTime / (video.duration || 1))
      
      // Calculate buffered amount
      if (video.buffered.length > 0) {
        const bufferedEnd = video.buffered.end(video.buffered.length - 1)
        setBuffered((bufferedEnd / video.duration) * 100)
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
      
      setError(errorMsg)
      onError?.(errorMsg)
    }
    
    // Add event listeners
    video.addEventListener('loadeddata', handleLoadedData)
    video.addEventListener('playing', handlePlaying)
    video.addEventListener('pause', handlePauseEvent)
    video.addEventListener('timeupdate', handleTimeUpdate)
    video.addEventListener('ended', handleEnded)
    video.addEventListener('error', handleError)
    
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
    
    // Cleanup function
    return () => {
      isMounted = false
      playAttempted = false
      
      // Remove event listeners
      video.removeEventListener('loadeddata', handleLoadedData)
      video.removeEventListener('playing', handlePlaying)
      video.removeEventListener('pause', handlePauseEvent)
      video.removeEventListener('timeupdate', handleTimeUpdate)
      video.removeEventListener('ended', handleEnded)
      video.removeEventListener('error', handleError)
      
      containerRef.current?.removeEventListener('mousemove', resetControlsTimer)
      containerRef.current?.removeEventListener('touchstart', resetControlsTimer)
      
      clearTimeout(controlsTimer)
      
      // Pause video and reset src
      if (!video.paused) {
        video.pause()
      }
      
      // Only clear src if component is truly unmounting
      // This prevents the "media removed from document" error
      video.src = ''
      video.load()
    }
  }, [videoUrl, poster, autoplay, loop, playsInline, onReady, onPlay, onPause, onProgress, onEnded, onError])
  
  // Separate effect for autoplay/muted changes
  useEffect(() => {
    const video = videoRef.current
    if (!video) return
    
    video.muted = muted
    
    // If autoplay changes to true and we're not playing, attempt play
    if (autoplay && !isPlaying && !video.paused) {
      video.play().catch(err => {
        console.log('Autoplay change prevented:', err)
      })
    }
  }, [autoplay, muted, isPlaying])
  
  // Play/Pause toggle
  const togglePlay = useCallback(() => {
    const video = videoRef.current
    if (!video) return
    
    if (isPlaying) {
      video.pause()
    } else {
      video.play().catch(err => {
        console.error('Play failed:', err)
        // Try with muted for autoplay restrictions
        if (err.name === 'NotAllowedError') {
          video.muted = true
          video.play().catch(console.error)
        }
      })
    }
    setShowControls(true)
  }, [isPlaying])
  
  // Seek handler
  const handleSeek = useCallback((percentage: number) => {
    const video = videoRef.current
    if (!video || !duration) return
    
    const time = duration * Math.max(0, Math.min(1, percentage))
    video.currentTime = time
    setCurrentTime(time)
    setShowControls(true)
  }, [duration])
  
  // Volume control
  const handleVolumeChange = useCallback((newVolume: number) => {
    const video = videoRef.current
    if (!video) return
    
    const volumeValue = Math.max(0, Math.min(1, newVolume))
    video.volume = volumeValue
    video.muted = volumeValue === 0
    setVolume(volumeValue)
    setShowControls(true)
  }, [])
  
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
    setShowControls(true)
  }, [])
  
  // Skip forward/backward
  const skip = useCallback((seconds: number) => {
    const video = videoRef.current
    if (!video) return
    
    video.currentTime = Math.max(0, Math.min(duration, video.currentTime + seconds))
    setShowControls(true)
  }, [duration])
  
  // Error state
  if (error) {
    return (
      <div className={cn("relative bg-black rounded-xl overflow-hidden flex flex-col items-center justify-center aspect-video p-6", className)}>
        <div className="text-center">
          <div className="text-red-400 mb-4 text-4xl">⚠️</div>
          <h3 className="text-white text-lg font-semibold mb-2">Video Error</h3>
          <p className="text-white/80 mb-6 max-w-md">{error}</p>
          <button
            onClick={() => {
              setError(null)
              setIsLoading(true)
              if (videoRef.current) {
                videoRef.current.load()
              }
            }}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
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
      id={playerId}
      className={cn(
        "relative bg-black rounded-xl overflow-hidden group aspect-video",
        isFullscreen && "fixed inset-0 z-50",
        className
      )}
      onMouseMove={() => setShowControls(true)}
      onMouseLeave={() => {
        if (isPlaying) setTimeout(() => setShowControls(false), 2000)
      }}
    >
      {/* Video element with key to prevent React reuse */}
      <video
        key={`video-${playerId}`}
        ref={videoRef}
        className="w-full h-full object-contain"
        playsInline={playsInline}
        webkit-playsinline="true"
        x-webkit-airplay="allow"
        preload="metadata"
      />
      
      {/* Loading overlay */}
      {isLoading && (
        <div className="absolute inset-0 bg-black/80 flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="w-12 h-12 text-white animate-spin mx-auto mb-4" />
            <p className="text-white/80">Loading video...</p>
          </div>
        </div>
      )}
      
      {/* Center play button overlay */}
      {!isPlaying && !isLoading && !error && (
        <div className="absolute inset-0 flex items-center justify-center">
          <button
            onClick={togglePlay}
            className="w-20 h-20 bg-black/60 rounded-full flex items-center justify-center hover:bg-black/80 transition-all hover:scale-105"
          >
            <Play className="w-10 h-10 text-white ml-1" />
          </button>
        </div>
      )}
      
      {/* Custom Controls */}
      {controls && showControls && (
        <>
          {/* Bottom controls */}
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 to-transparent p-4">
            {/* Progress bar */}
            <div className="mb-4">
              <div className="relative h-2 bg-white/20 rounded-full overflow-hidden mb-1">
                {/* Buffered progress */}
                <div 
                  className="absolute top-0 left-0 h-full bg-white/30"
                  style={{ width: `${buffered}%` }}
                />
                {/* Played progress */}
                <div 
                  className="absolute top-0 left-0 h-full bg-red-500"
                  style={{ width: `${(currentTime / duration) * 100}%` }}
                />
                {/* Seekable track */}
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={(currentTime / duration) * 100 || 0}
                  onChange={(e) => handleSeek(parseFloat(e.target.value) / 100)}
                  className="absolute top-0 left-0 w-full h-full opacity-0 cursor-pointer"
                />
              </div>
              <div className="flex justify-between text-sm text-white/80">
                <span>{formatTime(currentTime)}</span>
                <span>{formatTime(duration)}</span>
              </div>
            </div>
            
            {/* Control buttons */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <button
                  onClick={() => skip(-10)}
                  className="p-2 rounded-lg hover:bg-white/10 text-white"
                  title="Skip -10s"
                >
                  <SkipBack className="w-5 h-5" />
                </button>
                <button
                  onClick={togglePlay}
                  className="p-3 rounded-full bg-white hover:bg-white/90 text-black"
                >
                  {isPlaying ? (
                    <Pause className="w-6 h-6" />
                  ) : (
                    <Play className="w-6 h-6 ml-0.5" />
                  )}
                </button>
                <button
                  onClick={() => skip(10)}
                  className="p-2 rounded-lg hover:bg-white/10 text-white"
                  title="Skip +10s"
                >
                  <SkipForward className="w-5 h-5" />
                </button>
                
                {/* Volume control */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleVolumeChange(volume === 0 ? 1 : 0)}
                    className="p-2 rounded-lg hover:bg-white/10 text-white"
                  >
                    {volume === 0 ? (
                      <VolumeX className="w-5 h-5" />
                    ) : (
                      <Volume2 className="w-5 h-5" />
                    )}
                  </button>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={volume * 100}
                    onChange={(e) => handleVolumeChange(parseFloat(e.target.value) / 100)}
                    className="w-20 accent-red-500"
                  />
                </div>
              </div>
              
              <button
                onClick={toggleFullscreen}
                className="p-2 rounded-lg hover:bg-white/10 text-white"
              >
                <Maximize2 className="w-5 h-5" />
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}