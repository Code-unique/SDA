import { v2 as cloudinary } from 'cloudinary'

cloudinary.config({
  cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  api_key: process.env.NEXT_PUBLIC_CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
})

export default cloudinary

// Client-side upload configuration for posts
export const POSTS_CLOUDINARY_CONFIG = {
  cloudName: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME!,
  uploadPreset: 'sutra_posts',
  maxFileSize: 100 * 1024 * 1024, // 100MB
  maxVideoDuration: 120, // 2 minutes
  allowedFormats: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'mp4', 'mov', 'avi', 'mkv']
}

// Upload utility for post media
export const uploadPostMedia = async (
  file: File, 
  type: 'image' | 'video',
  onProgress?: (progress: number) => void
): Promise<any> => {
  return new Promise((resolve, reject) => {
    // Validate file size
    if (file.size > POSTS_CLOUDINARY_CONFIG.maxFileSize) {
      reject(new Error(`File size exceeds ${POSTS_CLOUDINARY_CONFIG.maxFileSize / 1024 / 1024}MB limit`));
      return;
    }

    // Validate file type
    const fileExtension = file.name.split('.').pop()?.toLowerCase();
    if (!fileExtension || !POSTS_CLOUDINARY_CONFIG.allowedFormats.includes(fileExtension)) {
      reject(new Error(`File type not supported. Allowed formats: ${POSTS_CLOUDINARY_CONFIG.allowedFormats.join(', ')}`));
      return;
    }

    const formData = new FormData()
    formData.append('file', file)
    formData.append('upload_preset', POSTS_CLOUDINARY_CONFIG.uploadPreset)
    formData.append('folder', `posts/${type}s`)
    
    if (type === 'video') {
      formData.append('resource_type', 'video')
      formData.append('eager', 'w_400,h_300,c_fill')
      formData.append('eager_async', 'true')
    } else {
      formData.append('transformation', 'w_1080,h_1080,c_fill,q_auto,f_auto')
    }

    const xhr = new XMLHttpRequest()

    // Progress tracking
    xhr.upload.addEventListener('progress', (event) => {
      if (event.lengthComputable && onProgress) {
        const progress = (event.loaded / event.total) * 100
        onProgress(Math.round(progress))
      }
    })

    // Load completion
    xhr.addEventListener('load', () => {
      if (xhr.status === 200) {
        const response = JSON.parse(xhr.responseText)
        resolve(response)
      } else {
        reject(new Error('Upload failed'))
      }
    })

    // Error handling
    xhr.addEventListener('error', () => {
      reject(new Error('Upload failed'))
    })

    xhr.open(
      'POST',
      `https://api.cloudinary.com/v1_1/${POSTS_CLOUDINARY_CONFIG.cloudName}/${type === 'image' ? 'image' : 'video'}/upload`
    )
    xhr.send(formData)
  })
}

// Utility to extract video duration
export const getVideoDuration = (file: File): Promise<number> => {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video')
    video.preload = 'metadata'
    
    video.onloadedmetadata = () => {
      window.URL.revokeObjectURL(video.src)
      resolve(video.duration)
    }
    
    video.onerror = () => {
      reject(new Error('Failed to load video metadata'))
    }
    
    video.src = URL.createObjectURL(file)
  })
}

// Utility to extract image dimensions
export const getImageDimensions = (file: File): Promise<{ width: number, height: number }> => {
  return new Promise((resolve, reject) => {
    const img = new Image()
    
    img.onload = () => {
      window.URL.revokeObjectURL(img.src)
      resolve({ width: img.width, height: img.height })
    }
    
    img.onerror = () => {
      reject(new Error('Failed to load image'))
    }
    
    img.src = URL.createObjectURL(file)
  })
}

// Server-side utility for media processing
export const processPostMedia = async (fileBuffer: Buffer, fileName: string, type: 'image' | 'video') => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: `posts/${type}s`,
        resource_type: type === 'image' ? 'image' : 'video',
        transformation: type === 'image' ? 'w_1080,h_1080,c_fill,q_auto,f_auto' : undefined,
        eager: type === 'video' ? 'w_400,h_300,c_fill' : undefined,
        eager_async: type === 'video'
      },
      (error, result) => {
        if (error) reject(error)
        else resolve(result)
      }
    )
    uploadStream.end(fileBuffer)
  })
}