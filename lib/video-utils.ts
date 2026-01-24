// lib/video-utils.ts
const CLOUDFRONT_DOMAIN = 'd2c1y2391adh81.cloudfront.net';

export function getVideoUrl(videoKey: string): string {
  if (!videoKey) return '';
  
  // If it's already a full URL
  if (videoKey.startsWith('http')) {
    // Convert S3 URLs to CloudFront
    if (videoKey.includes('s3.amazonaws.com') || videoKey.includes('s3.eu-north-1.amazonaws.com')) {
      const keyMatch = videoKey.match(/s3\.amazonaws\.com\/([^?]+)/) || 
                       videoKey.match(/s3\.eu-north-1\.amazonaws\.com\/([^?]+)/);
      if (keyMatch && keyMatch[1]) {
        return `https://${CLOUDFRONT_DOMAIN}/${decodeURIComponent(keyMatch[1])}`;
      }
    }
    return videoKey;
  }
  
  // If it's a key starting with courses/
  if (videoKey.startsWith('courses/')) {
    return `https://${CLOUDFRONT_DOMAIN}/${videoKey}`;
  }
  
  return videoKey;
}

export function extractVideoAsset(videoData: any): any {
  if (!videoData) return undefined;
  
  // Case 1: Already processed with key
  if (videoData.key) {
    return {
      ...videoData,
      url: getVideoUrl(videoData.key),
      cloudFrontUrl: `https://${CLOUDFRONT_DOMAIN}/${videoData.key}`
    };
  }
  
  // Case 2: videoSource.video format
  if (videoData.videoSource?.video?.key) {
    const video = videoData.videoSource.video;
    return {
      ...video,
      url: getVideoUrl(video.key),
      cloudFrontUrl: `https://${CLOUDFRONT_DOMAIN}/${video.key}`,
      source: videoData.videoSource
    };
  }
  
  // Case 3: Direct video object
  if (videoData.video?.key) {
    const video = videoData.video;
    return {
      ...video,
      url: getVideoUrl(video.key),
      cloudFrontUrl: `https://${CLOUDFRONT_DOMAIN}/${video.key}`
    };
  }
  
  // Case 4: Simple URL
  if (videoData.url) {
    return {
      key: '',
      url: getVideoUrl(videoData.url),
      size: videoData.size || 0,
      type: videoData.type || 'video',
      duration: videoData.duration,
      width: videoData.width,
      height: videoData.height
    };
  }
  
  return undefined;
}

// Helper to get CloudFront URL from any video data
export function getCloudFrontUrl(videoData: any): string {
  if (!videoData) return '';
  
  // Direct key
  if (videoData.key) {
    return `https://${CLOUDFRONT_DOMAIN}/${videoData.key}`;
  }
  
  // Nested in videoSource
  if (videoData.videoSource?.video?.key) {
    return `https://${CLOUDFRONT_DOMAIN}/${videoData.videoSource.video.key}`;
  }
  
  // Direct URL - convert if it's S3
  if (videoData.url) {
    return getVideoUrl(videoData.url);
  }
  
  return '';
}