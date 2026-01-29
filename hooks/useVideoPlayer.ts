// hooks/useVideoPlayer.ts
import { useState, useCallback, useEffect, useRef } from 'react'

interface UseVideoPlayerProps {
  autoplay?: boolean
  muted?: boolean
  loop?: boolean
  onReady?: () => void
  onError?: (error: string) => void
  onProgress?: (progress: number) => void
}

export function useVideoPlayer({
  autoplay = false,
  muted = false,
  loop = false,
  onReady,
  onError,
  onProgress
}: UseVideoPlayerProps = {}) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [volume, setVolume] = useState(muted ? 0 : 1)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [error, setError] = useState<string>('')
  const [playbackRate, setPlaybackRate] = useState(1)
  const [buffered, setBuffered] = useState(0)

  const togglePlay = useCallback(() => {
    if (!videoRef.current) return

    if (isPlaying) {
      videoRef.current.pause()
    } else {
      videoRef.current.play().catch(err => {
        setError(err.message)
        onError?.(err.message)
      })
    }
  }, [isPlaying, onError])

  const seek = useCallback((time: number) => {
    if (!videoRef.current) return
    videoRef.current.currentTime = time
  }, [])

  const setPlayback = useCallback((rate: number) => {
    if (!videoRef.current) return
    videoRef.current.playbackRate = rate
    setPlaybackRate(rate)
  }, [])

  const setVolumeLevel = useCallback((level: number) => {
    if (!videoRef.current) return
    const volumeValue = Math.max(0, Math.min(1, level))
    videoRef.current.volume = volumeValue
    videoRef.current.muted = volumeValue === 0
    setVolume(volumeValue)
  }, [])

  const toggleFullscreen = useCallback(async () => {
    if (!videoRef.current) return

    try {
      if (!document.fullscreenElement) {
        await videoRef.current.requestFullscreen()
        setIsFullscreen(true)
      } else {
        await document.exitFullscreen()
        setIsFullscreen(false)
      }
    } catch (err) {
      console.error('Fullscreen error:', err)
    }
  }, [])

  const skip = useCallback((seconds: number) => {
    if (!videoRef.current) return
    videoRef.current.currentTime += seconds
  }, [])

  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    const handleLoadedMetadata = () => {
      setDuration(video.duration)
      onReady?.()
    }

    const handleTimeUpdate = () => {
      setCurrentTime(video.currentTime)
      onProgress?.(video.currentTime / video.duration)
      
      if (video.buffered.length > 0) {
        const bufferedEnd = video.buffered.end(video.buffered.length - 1)
        setBuffered(bufferedEnd / video.duration)
      }
    }

    const handlePlay = () => setIsPlaying(true)
    const handlePause = () => setIsPlaying(false)
    const handleError = () => {
      const errorMsg = video.error?.message || 'Video error'
      setError(errorMsg)
      onError?.(errorMsg)
    }

    video.addEventListener('loadedmetadata', handleLoadedMetadata)
    video.addEventListener('timeupdate', handleTimeUpdate)
    video.addEventListener('play', handlePlay)
    video.addEventListener('pause', handlePause)
    video.addEventListener('error', handleError)
    video.addEventListener('ended', () => setIsPlaying(false))

    return () => {
      video.removeEventListener('loadedmetadata', handleLoadedMetadata)
      video.removeEventListener('timeupdate', handleTimeUpdate)
      video.removeEventListener('play', handlePlay)
      video.removeEventListener('pause', handlePause)
      video.removeEventListener('error', handleError)
      video.removeEventListener('ended', () => setIsPlaying(false))
    }
  }, [onReady, onProgress, onError])

  return {
    videoRef,
    isPlaying,
    currentTime,
    duration,
    volume,
    isFullscreen,
    error,
    playbackRate,
    buffered,
    togglePlay,
    seek,
    setPlayback,
    setVolumeLevel,
    toggleFullscreen,
    skip
  }
}