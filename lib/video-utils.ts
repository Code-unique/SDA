// lib/video-utils.ts - SIMPLIFIED VERSION
const CLOUDFRONT_DOMAIN = 'd2c1y2391adh81.cloudfront.net'

export function getVideoUrl(videoData: any): string {
  if (!videoData) return ''
  
  // If it's already a URL string
  if (typeof videoData === 'string') {
    return convertToCloudFrontUrl(videoData)
  }
  
  // If it's an object with URL
  if (videoData.url) {
    return convertToCloudFrontUrl(videoData.url)
  }
  
  // If it's an object with key
  if (videoData.key) {
    return `https://${CLOUDFRONT_DOMAIN}/${videoData.key}`
  }
  
  return ''
}

function convertToCloudFrontUrl(url: string): string {
  // Already CloudFront
  if (url.includes('cloudfront.net')) return url
  
  // S3 URL - convert to CloudFront
  if (url.includes('amazonaws.com')) {
    const keyMatch = url.match(/amazonaws\.com\/([^?]+)/)
    if (keyMatch && keyMatch[1]) {
      const s3Key = decodeURIComponent(keyMatch[1])
      return `https://${CLOUDFRONT_DOMAIN}/${s3Key}`
    }
  }
  
  // Return original if not S3
  return url
}

export function extractVideoAsset(videoData: any): any {
  if (!videoData) return undefined
  
  // If it's already in the right format
  if (videoData.key && videoData.url && videoData.type) {
    return {
      ...videoData,
      url: convertToCloudFrontUrl(videoData.url)
    }
  }
  
  // Extract from nested structure
  const key = videoData.key || 
              videoData.video?.key || 
              videoData.videoSource?.video?.key
  
  const url = videoData.url || 
              videoData.video?.url || 
              videoData.videoSource?.video?.url ||
              videoData.secure_url
  
  const size = videoData.size || videoData.bytes || 0
  const type = videoData.type || 
               (url?.includes('.mp4') || url?.includes('.mov') ? 'video' : 'image')
  
  if (!key && !url) return undefined
  
  return {
    key: key || '',
    url: convertToCloudFrontUrl(url || ''),
    size,
    type,
    duration: videoData.duration,
    width: videoData.width,
    height: videoData.height
  }
}

export function getCloudFrontUrl(videoData: any): string {
  return getVideoUrl(videoData)
}