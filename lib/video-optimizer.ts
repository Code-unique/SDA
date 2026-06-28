// lib/video-optimizer.ts
export interface VideoOptimizationConfig {
  maxBitrate: number // Maximum bitrate in kbps
  minBitrate: number // Minimum bitrate for fallback
  enableHLS: boolean // Enable HLS streaming
  enableDASH: boolean // Enable DASH streaming
  cacheStrategy: 'memory' | 'disk' | 'hybrid'
  prefetchSegments: number // Number of segments to prefetch
}

export class VideoOptimizer {
  private static instance: VideoOptimizer
  private cache: Map<string, ArrayBuffer> = new Map()
  private networkSpeed: number = 5 // Default to 5 Mbps

  private constructor() {
    this.detectNetworkSpeed()
  }

  static getInstance(): VideoOptimizer {
    if (!VideoOptimizer.instance) {
      VideoOptimizer.instance = new VideoOptimizer()
    }
    return VideoOptimizer.instance
  }

  private async detectNetworkSpeed(): Promise<void> {
    if ('connection' in navigator) {
      const connection = (navigator as any).connection
      if (connection?.downlink) {
        this.networkSpeed = connection.downlink
      }
    }

    // Fallback speed test
    try {
      const testStart = performance.now()
      await fetch('/api/ping?t=' + Date.now())
      const testEnd = performance.now()
      const speed = 1000 / (testEnd - testStart) // Rough estimate
      this.networkSpeed = Math.max(this.networkSpeed, speed)
    } catch (error) {
      console.warn('Network speed detection failed')
    }
  }

  async optimizeVideoSource(
    originalSrc: string,
    config: Partial<VideoOptimizationConfig> = {}
  ): Promise<{
    primarySource: string
    fallbackSources: string[]
    shouldUseHLS: boolean
    estimatedLoadTime: number
  }> {
    const fullConfig: VideoOptimizationConfig = {
      maxBitrate: 5000,
      minBitrate: 300,
      enableHLS: true,
      enableDASH: false,
      cacheStrategy: 'hybrid',
      prefetchSegments: 3,
      ...config
    }

    // Check if video is already in cache
    const cached = this.cache.get(originalSrc)
    if (cached) {
      return {
        primarySource: URL.createObjectURL(new Blob([cached])),
        fallbackSources: [],
        shouldUseHLS: false,
        estimatedLoadTime: 0
      }
    }

    // Determine optimal quality based on network speed
    let targetBitrate = this.networkSpeed * 100
    targetBitrate = Math.min(
      Math.max(targetBitrate, fullConfig.minBitrate),
      fullConfig.maxBitrate
    )

    // Check if we should use HLS
    const shouldUseHLS = fullConfig.enableHLS && 
      (this.networkSpeed < 2 || originalSrc.includes('.m3u8'))

    // Generate optimized sources
    const optimizedSources = await this.generateOptimizedSources(
      originalSrc,
      targetBitrate,
      shouldUseHLS
    )

    // Calculate estimated load time
    const videoSizeKB = 5000 // Assume 5MB for calculation
    const estimatedLoadTime = (videoSizeKB * 8) / (this.networkSpeed * 1000)

    return {
      primarySource: optimizedSources.primary,
      fallbackSources: optimizedSources.fallbacks,
      shouldUseHLS,
      estimatedLoadTime: Math.round(estimatedLoadTime)
    }
  }

  private async generateOptimizedSources(
    src: string,
    targetBitrate: number,
    useHLS: boolean
  ): Promise<{ primary: string; fallbacks: string[] }> {
    const sources = {
      primary: src,
      fallbacks: [] as string[]
    }

    // If source already has quality variants in URL, use them
    if (src.includes('quality=')) {
      return sources
    }

    // Create quality variants based on target bitrate
    const qualities = [
      { label: 'high', bitrate: Math.min(targetBitrate * 2, 5000) },
      { label: 'medium', bitrate: targetBitrate },
      { label: 'low', bitrate: Math.max(targetBitrate / 2, 300) }
    ]

    // For HLS, modify the playlist URL
    if (useHLS && src.includes('.m3u8')) {
      const hlsUrl = new URL(src, window.location.origin)
      hlsUrl.searchParams.set('max_bitrate', String(targetBitrate * 1000))
      sources.primary = hlsUrl.toString()
    }

    // Generate fallback sources
    qualities.forEach(quality => {
      if (quality.bitrate !== targetBitrate) {
        const fallbackUrl = new URL(src, window.location.origin)
        fallbackUrl.searchParams.set('quality', quality.label)
        fallbackUrl.searchParams.set('bitrate', String(quality.bitrate))
        sources.fallbacks.push(fallbackUrl.toString())
      }
    })

    return sources
  }

  async preloadVideoSegment(videoElement: HTMLVideoElement, secondsAhead: number): Promise<void> {
    if (!videoElement.src || videoElement.readyState >= 4) return

    try {
      const currentTime = videoElement.currentTime
      const targetTime = currentTime + secondsAhead
      
      // Create a temporary video element to preload
      const tempVideo = document.createElement('video')
      tempVideo.src = videoElement.src
      tempVideo.currentTime = targetTime
      tempVideo.preload = 'auto'
      
      // Load and discard
      await new Promise((resolve) => {
        tempVideo.onloadeddata = resolve
        setTimeout(resolve, 1000) // Timeout after 1 second
      })
      
      tempVideo.remove()
    } catch (error) {
      console.warn('Preloading failed:', error)
    }
  }

  clearCache(): void {
    this.cache.clear()
  }

  getNetworkSpeed(): number {
    return this.networkSpeed
  }
}