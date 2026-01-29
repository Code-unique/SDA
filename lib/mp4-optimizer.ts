// lib/mp4-optimizer.ts
export class MP4Optimizer {
  static async optimizeMP4Playback(videoElement: HTMLVideoElement): Promise<void> {
    if (!videoElement.src) return
    
    // Preload metadata
    videoElement.preload = 'metadata'
    
    // Set optimal buffer settings
    videoElement.addEventListener('progress', () => {
      if (videoElement.buffered.length > 0) {
        const bufferEnd = videoElement.buffered.end(videoElement.buffered.length - 1)
        const bufferAhead = bufferEnd - videoElement.currentTime
        
        // If buffer is less than 10 seconds, preload more
        if (bufferAhead < 10 && videoElement.networkState === HTMLMediaElement.NETWORK_IDLE) {
          videoElement.preload = 'auto'
        }
      }
    })
    
    // Handle network conditions
    videoElement.addEventListener('waiting', () => {
      // Reduce quality or show buffering
      console.log('Video is buffering...')
    })
    
    videoElement.addEventListener('playing', () => {
      // Restore normal playback
      console.log('Video resumed playing')
    })
  }
  
  static getOptimalBitrate(networkSpeedMbps: number): string {
    if (networkSpeedMbps > 10) return '1080p'
    if (networkSpeedMbps > 5) return '720p'
    if (networkSpeedMbps > 2) return '480p'
    return '360p'
  }
  
  static async detectNetworkSpeed(): Promise<number> {
    return new Promise((resolve) => {
      if ('connection' in navigator) {
        const connection = (navigator as any).connection
        if (connection?.downlink) {
          resolve(connection.downlink)
          return
        }
      }
      
      // Fallback to 5 Mbps
      resolve(5)
    })
  }
}