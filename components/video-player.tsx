'use client'

import { useState, useRef, useEffect } from 'react'
import { Play, Pause, Volume2, VolumeX, Maximize, Minimize, Settings, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface VideoPlayerProps {
  src: string
  title?: string
  autoPlay?: boolean
  onEnded?: () => void
  onTimeUpdate?: (currentTime: number) => void
  className?: string
}

export function VideoPlayer({ 
  src, 
  title,
  autoPlay = false,
  onEnded,
  onTimeUpdate,
  className = '' 
}: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [volume, setVolume] = useState(1)
  const [isMuted, setIsMuted] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [showControls, setShowControls] = useState(true)
  const [isLoading, setIsLoading] = useState(true)
  const [hasError, setHasError] = useState(false)
  const controlsTimeout = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    const updateTime = () => {
      setCurrentTime(video.currentTime)
      onTimeUpdate?.(video.currentTime)
    }

    const updateDuration = () => {
      setDuration(video.duration)
      setIsLoading(false)
    }

    const handlePlay = () => setIsPlaying(true)
    const handlePause = () => setIsPlaying(false)
    const handleEnded = () => {
      setIsPlaying(false)
      onEnded?.()
    }

    const handleError = () => {
      console.error('Video loading error:', video.error)
      setHasError(true)
      setIsLoading(false)
    }

    const handleLoadStart = () => {
      setIsLoading(true)
      setHasError(false)
    }

    const handleLoad = () => {
      setIsLoading(false)
    }

    video.addEventListener('timeupdate', updateTime)
    video.addEventListener('loadedmetadata', updateDuration)
    video.addEventListener('play', handlePlay)
    video.addEventListener('pause', handlePause)
    video.addEventListener('ended', handleEnded)
    video.addEventListener('error', handleError)
    video.addEventListener('loadstart', handleLoadStart)
    video.addEventListener('loadeddata', handleLoad)

    return () => {
      video.removeEventListener('timeupdate', updateTime)
      video.removeEventListener('loadedmetadata', updateDuration)
      video.removeEventListener('play', handlePlay)
      video.removeEventListener('pause', handlePause)
      video.removeEventListener('ended', handleEnded)
      video.removeEventListener('error', handleError)
      video.removeEventListener('loadstart', handleLoadStart)
      video.removeEventListener('loadeddata', handleLoad)
    }
  }, [onEnded, onTimeUpdate])

  const togglePlay = () => {
    const video = videoRef.current
    if (!video) return

    if (isPlaying) {
      video.pause()
    } else {
      video.play().catch(error => {
        console.error('Error playing video:', error)
        setHasError(true)
      })
    }
  }

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    const video = videoRef.current
    const progressBar = e.currentTarget
    if (!video || !progressBar) return

    const rect = progressBar.getBoundingClientRect()
    const percent = (e.clientX - rect.left) / rect.width
    video.currentTime = percent * duration
  }

  const toggleMute = () => {
    const video = videoRef.current
    if (!video) return

    video.muted = !video.muted
    setIsMuted(video.muted)
  }

  const changeVolume = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(e.target.value)
    const video = videoRef.current
    if (!video) return

    video.volume = newVolume
    setVolume(newVolume)
    setIsMuted(newVolume === 0)
  }

  const toggleFullscreen = () => {
    const container = containerRef.current
    if (!container) return

    if (!document.fullscreenElement) {
      container.requestFullscreen().catch(err => {
        console.error('Error attempting to enable fullscreen:', err)
      })
    } else {
      document.exitFullscreen()
    }
  }

  const showControlsTemporarily = () => {
    setShowControls(true)
    if (controlsTimeout.current) clearTimeout(controlsTimeout.current)
    controlsTimeout.current = setTimeout(() => setShowControls(false), 3000)
  }

  const hideControls = () => {
    if (controlsTimeout.current) clearTimeout(controlsTimeout.current)
    setShowControls(false)
  }

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement)
    }

    document.addEventListener('fullscreenchange', handleFullscreenChange)
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange)
    }
  }, [])

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  if (hasError) {
    return (
      <div className={`w-full bg-slate-200 dark:bg-slate-700 rounded-2xl flex items-center justify-center ${className}`} style={{ minHeight: '400px' }}>
        <div className="text-center p-8">
          <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
            <Settings className="w-8 h-8 text-red-500" />
          </div>
          <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-2">
            Video Failed to Load
          </h3>
          <p className="text-slate-600 dark:text-slate-400 mb-4">
            There was an error loading the video. Please try again.
          </p>
          <Button 
            onClick={() => {
              setHasError(false)
              setIsLoading(true)
              if (videoRef.current) {
                videoRef.current.load()
              }
            }} 
            variant="outline" 
            className="rounded-2xl"
          >
            Retry
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div 
      ref={containerRef}
      className={`relative w-full bg-black rounded-2xl overflow-hidden group ${className}`}
      onMouseMove={showControlsTemporarily}
      onMouseLeave={hideControls}
    >
      {/* Video Element */}
      <video
        ref={videoRef}
        src={src}
        className="w-full h-auto max-h-96 object-contain"
        autoPlay={autoPlay}
        onClick={togglePlay}
        preload="metadata"
        crossOrigin="anonymous"
      >
        Your browser does not support the video tag.
      </video>

      {/* Loading Overlay */}
      {isLoading && (
        <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin text-white mx-auto mb-2" />
            <p className="text-white text-sm">Loading video...</p>
          </div>
        </div>
      )}

      {/* Custom Controls */}
      <div className={`absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4 transition-opacity duration-300 ${
        showControls ? 'opacity-100' : 'opacity-0'
      }`}>
        {/* Progress Bar */}
        <div 
          className="w-full h-2 bg-slate-600 rounded-full mb-4 cursor-pointer group/progress"
          onClick={handleSeek}
        >
          <div 
            className="h-full bg-rose-500 rounded-full transition-all duration-100 relative"
            style={{ width: `${progressPercent}%` }}
          >
            <div className="absolute right-0 top-1/2 transform -translate-y-1/2 w-3 h-3 bg-white rounded-full opacity-0 group-hover/progress:opacity-100 transition-opacity" />
          </div>
        </div>

        {/* Control Buttons */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={togglePlay}
              className="text-white hover:text-rose-400 transition-colors p-1"
              aria-label={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
            </button>

            <button
              onClick={toggleMute}
              className="text-white hover:text-rose-400 transition-colors p-1"
              aria-label={isMuted ? 'Unmute' : 'Mute'}
            >
              {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
            </button>

            <div className="flex items-center space-x-2">
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={volume}
                onChange={changeVolume}
                className="w-20 accent-rose-500 cursor-pointer"
              />
            </div>

            <div className="text-white text-sm font-mono">
              {formatTime(currentTime)} / {formatTime(duration)}
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <button
              onClick={toggleFullscreen}
              className="text-white hover:text-rose-400 transition-colors p-1"
              aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
            >
              {isFullscreen ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Play/Pause Overlay */}
      {!isPlaying && !isLoading && !hasError && (
        <div 
          className="absolute inset-0 flex items-center justify-center bg-black/30 cursor-pointer"
          onClick={togglePlay}
        >
          <div className="bg-white/20 backdrop-blur-sm rounded-full p-6 hover:bg-white/30 transition-all group/play">
            <Play className="w-12 h-12 text-white group-hover/play:scale-110 transition-transform" />
          </div>
        </div>
      )}

      {/* Video Title */}
      {title && (
        <div className="absolute top-4 left-4">
          <div className="bg-black/70 backdrop-blur-sm rounded-lg px-3 py-2">
            <h3 className="text-white text-sm font-medium line-clamp-1">{title}</h3>
          </div>
        </div>
      )}
    </div>
  )
}