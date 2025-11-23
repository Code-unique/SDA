// lib/cloudinary.ts
import { v2 as cloudinary } from 'cloudinary'

cloudinary.config({
  cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  api_key: process.env.NEXT_PUBLIC_CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
})

export default cloudinary

// Client-side upload configuration
export const CLOUDINARY_CONFIG = {
  cloudName: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME!,
  uploadPreset: 'sutra_courses',
}

// Upload utility for client-side direct uploads
export const uploadToCloudinary = async (
  file: File, 
  type: 'thumbnail' | 'previewVideo' | 'lessonVideo',
  onProgress?: (progress: number) => void
): Promise<any> => {
  return new Promise((resolve, reject) => {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('upload_preset', CLOUDINARY_CONFIG.uploadPreset)
    formData.append('folder', `sutra-courses/${type}s`)
    
    // Set resource type
    if (type !== 'thumbnail') {
      formData.append('resource_type', 'video')
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
      `https://api.cloudinary.com/v1_1/${CLOUDINARY_CONFIG.cloudName}/${
        type === 'thumbnail' ? 'image' : 'video'
      }/upload`
    )
    xhr.send(formData)
  })
}

// Server-side utility for small files
export const uploadSmallFile = async (file: Buffer, type: 'thumbnail' | 'previewVideo') => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: `sutra-courses/${type}s`,
        resource_type: type === 'thumbnail' ? 'image' : 'video',
      },
      (error, result) => {
        if (error) reject(error)
        else resolve(result)
      }
    )
    uploadStream.end(file)
  })
}