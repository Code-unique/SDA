/**
 * Parse YouTube video ID from various URL formats
 */
export function parseYouTubeUrl(url: string): { videoId: string, embedUrl: string, thumbnailUrl: string } | null {
  if (!url) return null
  
  let videoId = ''
  
  // Handle different YouTube URL formats
  if (url.includes('youtu.be/')) {
    // Short URL format: https://youtu.be/VIDEO_ID
    videoId = url.split('youtu.be/')[1]?.split('?')[0] || ''
  } else if (url.includes('youtube.com/watch')) {
    // Standard URL format: https://www.youtube.com/watch?v=VIDEO_ID
    const urlObj = new URL(url)
    videoId = urlObj.searchParams.get('v') || ''
  } else if (url.includes('youtube.com/embed/')) {
    // Embed URL format: https://www.youtube.com/embed/VIDEO_ID
    videoId = url.split('youtube.com/embed/')[1]?.split('?')[0] || ''
  } else if (/^[a-zA-Z0-9_-]{11}$/.test(url)) {
    // Direct video ID
    videoId = url
  }
  
  if (!videoId || videoId.length !== 11) {
    return null
  }
  
  return {
    videoId,
    embedUrl: `https://www.youtube.com/embed/${videoId}`,
    thumbnailUrl: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`
  }
}

/**
 * Extract YouTube video ID from any YouTube URL
 */
export function extractYouTubeId(url: string): string | null {
  const parsed = parseYouTubeUrl(url)
  return parsed?.videoId || null
}

/**
 * Validate YouTube URL
 */
export function isValidYouTubeUrl(url: string): boolean {
  return parseYouTubeUrl(url) !== null
}

/**
 * Get YouTube thumbnail URLs
 */
export function getYouTubeThumbnails(videoId: string): {
  default: string
  medium: string
  high: string
  standard: string
  maxres: string
} {
  return {
    default: `https://img.youtube.com/vi/${videoId}/default.jpg`,
    medium: `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`,
    high: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
    standard: `https://img.youtube.com/vi/${videoId}/sddefault.jpg`,
    maxres: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`
  }
}