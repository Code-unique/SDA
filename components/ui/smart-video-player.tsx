// components/ui/smart-video-player.tsx
'use client'

import { useEffect, useRef, useState } from 'react'
import videojs from 'video.js'
import 'video.js/dist/video-js.css'
import { Play, Pause, Volume2, VolumeX, Maximize, Loader2, AlertTriangle, RotateCw } from 'lucide-react'
import { Button } from './button'

interface SmartVideoPlayerProps {
  src: string
  poster?: string
  className?: string
  autoplay?: boolean
  onReady?: () => void
  onError?: (error: any) => void
  onPlay?: () => void
  onPause?: () => void
}

export default function SmartVideoPlayer({
  src,
  poster,
  className = '',
  autoplay = false,
  onReady,
  onError,
  onPlay,
  onPause,
}: SmartVideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const playerRef = useRef<any>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [showControls, setShowControls] = useState(false)
  const [retryCount, setRetryCount] = useState(0)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [isMuted, setIsMuted] = useState(false)
  const [volume, setVolume] = useState(1)

  // Initialize video
  useEffect(() => {
    if (!videoRef.current || !src) return

    const videoElement = videoRef.current

    const handleLoadedData = () => {
      setIsLoading(false)
      setDuration(videoElement.duration || 0)
      onReady?.()
    }

    const handleError = (e: Event) => {
      console.error('Video error:', e)
      setError('Failed to load video')
      setIsLoading(false)
      onError?.(e)
    }

    const handlePlay = () => {
      setIsPlaying(true)
      onPlay?.()
    }

    const handlePause = () => {
      setIsPlaying(false)
      onPause?.()
    }

    const handleTimeUpdate = () => {
      setCurrentTime(videoElement.currentTime)
    }

    const handleVolumeChange = () => {
      setIsMuted(videoElement.muted)
      setVolume(videoElement.volume)
    }

    // Set up event listeners
    videoElement.addEventListener('loadeddata', handleLoadedData)
    videoElement.addEventListener('error', handleError)
    videoElement.addEventListener('play', handlePlay)
    videoElement.addEventListener('pause', handlePause)
    videoElement.addEventListener('timeupdate', handleTimeUpdate)
    videoElement.addEventListener('volumechange', handleVolumeChange)
    videoElement.addEventListener('waiting', () => setIsLoading(true))
    videoElement.addEventListener('playing', () => setIsLoading(false))
    videoElement.addEventListener('ended', () => setIsPlaying(false))

    // Set video source
    videoElement.src = src
    videoElement.poster = poster || ''
    videoElement.autoplay = autoplay
    videoElement.preload = 'auto'

    // Cleanup function
    return () => {
      videoElement.removeEventListener('loadeddata', handleLoadedData)
      videoElement.removeEventListener('error', handleError)
      videoElement.removeEventListener('play', handlePlay)
      videoElement.removeEventListener('pause', handlePause)
      videoElement.removeEventListener('timeupdate', handleTimeUpdate)
      videoElement.removeEventListener('volumechange', handleVolumeChange)
      videoElement.removeEventListener('waiting', () => setIsLoading(true))
      videoElement.removeEventListener('playing', () => setIsLoading(false))
      videoElement.removeEventListener('ended', () => setIsPlaying(false))
      
      // Reset video element
      videoElement.src = ''
      videoElement.load()
    }
  }, [src, poster, autoplay, retryCount])

  const togglePlay = () => {
    if (!videoRef.current) return
    if (isPlaying) {
      videoRef.current.pause()
    } else {
      videoRef.current.play().catch(err => {
        console.error('Play error:', err)
        setError('Failed to play video')
      })
    }
  }

  const toggleMute = () => {
    if (!videoRef.current) return
    videoRef.current.muted = !videoRef.current.muted
    setIsMuted(videoRef.current.muted)
  }

  const setVideoVolume = (value: number) => {
    if (!videoRef.current) return
    videoRef.current.volume = value
    setVolume(value)
    if (value > 0) {
      videoRef.current.muted = false
      setIsMuted(false)
    }
  }

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!videoRef.current) return
    const time = parseFloat(e.target.value)
    videoRef.current.currentTime = time
    setCurrentTime(time)
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`
  }

  const toggleFullscreen = () => {
    if (!containerRef.current) return
    
    try {
      if (!document.fullscreenElement) {
        if (containerRef.current.requestFullscreen) {
          containerRef.current.requestFullscreen()
        } else if ((containerRef.current as any).webkitRequestFullscreen) {
          (containerRef.current as any).webkitRequestFullscreen()
        } else if ((containerRef.current as any).msRequestFullscreen) {
          (containerRef.current as any).msRequestFullscreen()
        }
      } else {
        if (document.exitFullscreen) {
          document.exitFullscreen()
        } else if ((document as any).webkitExitFullscreen) {
          (document as any).webkitExitFullscreen()
        } else if ((document as any).msExitFullscreen) {
          (document as any).msExitFullscreen()
        }
      }
    } catch (err) {
      console.error('Fullscreen error:', err)
    }
  }

  const handleRetry = () => {
    setError(null)
    setIsLoading(true)
    setRetryCount(prev => prev + 1)
  }

  const handleFullscreenChange = () => {
    if (!document.fullscreenElement) {
      // Handle exit fullscreen
    }
  }

  useEffect(() => {
    document.addEventListener('fullscreenchange', handleFullscreenChange)
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange)
  }, [])

  if (error) {
    return (
      <div className={`relative w-full aspect-video bg-black rounded-2xl overflow-hidden flex items-center justify-center ${className}`}>
        <div className="text-center p-6">
          <div className="w-16 h-16 bg-gradient-to-br from-red-500/20 to-orange-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4 backdrop-blur-sm">
            <AlertTriangle className="w-8 h-8 text-amber-400" />
          </div>
          <h3 className="text-white text-lg font-semibold mb-2">Video Error</h3>
          <p className="text-white/60 text-sm mb-4">{error}</p>
          <Button
            onClick={handleRetry}
            className="bg-gradient-to-r from-red-600 to-orange-500 hover:from-red-700 hover:to-orange-600 text-white"
          >
            <RotateCw className="w-4 h-4 mr-2" />
            Retry
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div 
      ref={containerRef}
      className={`relative w-full aspect-video bg-black rounded-2xl overflow-hidden ${className}`}
      onMouseEnter={() => setShowControls(true)}
      onMouseLeave={() => setShowControls(false)}
      onClick={() => setShowControls(prev => !prev)}
    >
      {/* Video element */}
      <video
        ref={videoRef}
        className="w-full h-full object-contain"
        playsInline
        controls={false}
      />
      
      {/* Loading overlay */}
      {isLoading && (
        <div className="absolute inset-0 bg-black/80 flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="w-8 h-8 text-white animate-spin mx-auto mb-2" />
            <p className="text-white/80 text-sm">Loading video...</p>
          </div>
        </div>
      )}

      {/* Custom controls overlay */}
      {(showControls || isLoading || error) && (
        <>
          {/* Top gradient overlay */}
          <div className="absolute top-0 left-0 right-0 h-20 bg-gradient-to-b from-black/80 via-black/40 to-transparent pointer-events-none" />
          
          {/* Bottom controls */}
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/70 to-transparent p-4">
            {/* Progress bar */}
            <div className="mb-3">
              <input
                type="range"
                min="0"
                max={duration || 100}
                value={currentTime}
                onChange={handleSeek}
                className="w-full h-1.5 bg-white/30 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white"
              />
              <div className="flex justify-between text-xs text-white/70 mt-1">
                <span>{formatTime(currentTime)}</span>
                <span>{formatTime(duration)}</span>
              </div>
            </div>

            {/* Control buttons */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
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

                <div className="flex items-center gap-2">
                  <Button
                    onClick={toggleMute}
                    className="w-8 h-8 bg-white/10 backdrop-blur-sm hover:bg-white/20 text-white rounded-full p-0 flex items-center justify-center"
                  >
                    {isMuted || volume === 0 ? (
                      <VolumeX className="w-4 h-4" />
                    ) : (
                      <Volume2 className="w-4 h-4" />
                    )}
                  </Button>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.1"
                    value={volume}
                    onChange={(e) => setVideoVolume(parseFloat(e.target.value))}
                    className="w-20 h-1.5 bg-white/30 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white"
                  />
                </div>

                <div className="text-sm text-white/80">
                  {formatTime(currentTime)} / {formatTime(duration)}
                </div>
              </div>

              <Button
                onClick={toggleFullscreen}
                className="w-10 h-10 bg-white/10 backdrop-blur-sm hover:bg-white/20 text-white rounded-full p-0 flex items-center justify-center"
              >
                <Maximize className="w-5 h-5" />
              </Button>
            </div>
          </div>

          {/* Center play button overlay */}
          {!isPlaying && !isLoading && !error && (
            <div 
              className="absolute inset-0 flex items-center justify-center cursor-pointer"
              onClick={togglePlay}
            >
              <div className="w-20 h-20 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center hover:scale-110 transition-transform">
                <Play className="w-10 h-10 text-white ml-1" />
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}