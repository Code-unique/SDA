import { NextRequest, NextResponse } from 'next/server'
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { authenticateAdmin } from '@/app/api/_lib/auth-utils'
import { connectToDatabase } from '@/lib/mongodb'
import User from '@/lib/models/User'
import VideoLibrary from '@/lib/models/VideoLibrary'
import mongoose from 'mongoose'

const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'eu-north-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
})

// In-memory rate limiting (consider using Redis in production)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>()
const RATE_LIMIT_WINDOW = 15 * 60 * 1000 // 15 minutes
const MAX_UPLOADS_PER_WINDOW = 20

function checkRateLimit(userId: string): { allowed: boolean; resetTime: number; remaining: number } {
  const now = Date.now()
  const userKey = `rate_limit_${userId}`
  
  let userData = rateLimitStore.get(userKey)
  
  if (!userData || now > userData.resetTime) {
    userData = { count: 0, resetTime: now + RATE_LIMIT_WINDOW }
  }
  
  const remaining = MAX_UPLOADS_PER_WINDOW - userData.count
  
  if (userData.count >= MAX_UPLOADS_PER_WINDOW) {
    return { allowed: false, resetTime: userData.resetTime, remaining: 0 }
  }
  
  userData.count++
  rateLimitStore.set(userKey, userData)
  
  return { allowed: true, resetTime: userData.resetTime, remaining: remaining - 1 }
}

// Helper function to convert string to ObjectId if needed
function toObjectId(id?: string): mongoose.Types.ObjectId | undefined {
  if (!id) return undefined;
  if (mongoose.Types.ObjectId.isValid(id)) {
    return new mongoose.Types.ObjectId(id);
  }
  return undefined;
}

// ================ ADD VIDEO TO LIBRARY FUNCTION ================
async function addVideoToLibrary(
  videoData: any,
  user: any,
  metadata: {
    fileName: string;
    fileType: string;
    folder: string;
    courseId?: string;
    courseTitle?: string;
    moduleId?: string;
    chapterId?: string;
    lessonId?: string;
  }
) {
  try {
    console.log('📚 Adding video to library:', {
      fileName: metadata.fileName,
      key: videoData.key,
      user: user.id
    })
    
    await connectToDatabase()
    
    const adminUser = await User.findOne({ clerkId: user.id })
    if (!adminUser) {
      console.log('❌ Admin user not found')
      return null
    }
    
    // Check if video already exists in library
    const existingVideo = await VideoLibrary.findOne({
      'video.key': videoData.key
    })
    
    if (existingVideo) {
      console.log('✅ Video already exists in library:', existingVideo.title)
      
      // If this is being used in a course, add usage record
      if (metadata.courseId && metadata.courseTitle) {
        try {
          // Convert string IDs to ObjectId if needed
          const moduleObjectId = toObjectId(metadata.moduleId);
          const chapterObjectId = toObjectId(metadata.chapterId);
          const lessonObjectId = toObjectId(metadata.lessonId);
          
          await (existingVideo as any).addUsage?.(
            metadata.courseId,
            metadata.courseTitle,
            moduleObjectId,
            chapterObjectId,
            lessonObjectId
          )
          console.log('📈 Added usage record for existing video')
        } catch (usageError) {
          console.warn('⚠️ Failed to add usage record:', usageError)
        }
      }
      return existingVideo
    }
    
    // Create title from filename
    const title = metadata.fileName
      .replace(/\.[^/.]+$/, '') // Remove extension
      .replace(/[_-]/g, ' ') // Replace underscores and hyphens with spaces
      .replace(/[^a-zA-Z0-9\s]/g, '') // Remove special characters
      .trim()
      .substring(0, 200) || 'Untitled Video'
    
    console.log('📝 Creating video library entry:', {
      title,
      key: videoData.key,
      size: videoData.size,
      type: metadata.fileType
    })
    
    // Determine mime type from file extension
    const getMimeType = (filename: string): string => {
      const ext = filename.toLowerCase().split('.').pop()
      const mimeTypes: Record<string, string> = {
        'mp4': 'video/mp4',
        'mov': 'video/quicktime',
        'avi': 'video/x-msvideo',
        'mkv': 'video/x-matroska',
        'webm': 'video/webm',
        'flv': 'video/x-flv',
        'wmv': 'video/x-ms-wmv',
        'm4v': 'video/x-m4v',
        'mpeg': 'video/mpeg',
        'mpg': 'video/mpeg'
      }
      return mimeTypes[ext || ''] || 'video/mp4'
    }
    
    // Create video library entry
    const videoEntry = await VideoLibrary.create({
      title,
      video: {
        ...videoData,
        type: 'video' as const,
        originalFileName: metadata.fileName,
        mimeType: getMimeType(metadata.fileName),
        duration: 0 // You can extract this from video metadata if needed
      },
      uploadedBy: adminUser._id,
      categories: [metadata.folder.replace(/s$/, '').replace('Video', '')], // Convert "lessonVideos" to "lesson"
      tags: ['uploaded', 'course-video'],
      isPublic: true,
      usageCount: 0,
      courses: [],
      previews: []
    })
    
    console.log('✅ Video added to library:', {
      id: videoEntry._id,
      title: videoEntry.title,
      key: videoEntry.video.key
    })
    
    // If this is from a course upload, add initial usage
    if (metadata.courseId && metadata.courseTitle) {
      try {
        // Convert string IDs to ObjectId if needed
        const moduleObjectId = toObjectId(metadata.moduleId);
        const chapterObjectId = toObjectId(metadata.chapterId);
        const lessonObjectId = toObjectId(metadata.lessonId);
        
        await (videoEntry as any).addUsage?.(
          metadata.courseId,
          metadata.courseTitle,
          moduleObjectId,
          chapterObjectId,
          lessonObjectId
        )
        console.log('📈 Added initial usage record')
      } catch (usageError) {
        console.warn('⚠️ Failed to add initial usage record:', usageError)
      }
    }
    
    await videoEntry.populate('uploadedBy', 'firstName lastName username avatar email')
    
    return videoEntry
    
  } catch (error: any) {
    console.error('❌ Error adding video to library:', error)
    console.error('Stack:', error.stack)
    return null
  }
}
// ===============================================================

export async function POST(request: NextRequest) {
  const startTime = Date.now()
  
  try {
    // Authenticate admin user
    const authResult = await authenticateAdmin()
    if (!authResult.success) {
      console.log(`❌ Auth failed: ${authResult.error}`)
      return NextResponse.json({ 
        error: authResult.error,
        success: false 
      }, { status: authResult.status })
    }

    const body = await request.json()
    const { fileName, fileType, fileSize, folder } = body

    console.log('📁 Upload request received:', { 
      fileName, 
      fileType, 
      fileSize: fileSize ? `${Math.round(fileSize / (1024 * 1024))}MB` : 'unknown',
      folder,
      userId: authResult.user.clerkId 
    })

    // Validate required fields
    const missingFields = []
    if (!fileName) missingFields.push('fileName')
    if (!fileType) missingFields.push('fileType')
    if (!fileSize) missingFields.push('fileSize')
    if (!folder) missingFields.push('folder')
    
    if (missingFields.length > 0) {
      return NextResponse.json({ 
        error: `Missing required fields: ${missingFields.join(', ')}`,
        success: false
      }, { status: 400 })
    }

    // Validate file size (100MB max for single upload)
    const MAX_SINGLE_UPLOAD_SIZE = 100 * 1024 * 1024 // 100MB
    if (fileSize > MAX_SINGLE_UPLOAD_SIZE) {
      return NextResponse.json({ 
        error: `File size ${Math.round(fileSize / (1024 * 1024))}MB exceeds maximum of 100MB for single upload. Use multipart upload for larger files.`,
        success: false,
        maxSize: MAX_SINGLE_UPLOAD_SIZE,
        yourSize: fileSize
      }, { status: 400 })
    }

    // Check rate limit
    const rateLimit = checkRateLimit(authResult.user.clerkId)
    if (!rateLimit.allowed) {
      const resetTime = new Date(rateLimit.resetTime).toLocaleTimeString()
      return NextResponse.json({
        error: `Rate limit exceeded. Maximum ${MAX_UPLOADS_PER_WINDOW} uploads per 15 minutes. Try again after ${resetTime}`,
        success: false,
        resetTime: rateLimit.resetTime
      }, { status: 429 })
    }

    // Generate unique file key
    const timestamp = Date.now()
    const randomString = Math.random().toString(36).substring(2, 10)
    const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_')
    const fileExtension = sanitizedFileName.split('.').pop()?.toLowerCase() || 'bin'
    
    const fileKey = `courses/${folder}/${timestamp}-${randomString}.${fileExtension}`
    console.log('🔑 Generated file key:', fileKey)

    // Generate presigned URL
    const command = new PutObjectCommand({
      Bucket: process.env.AWS_S3_BUCKET_NAME!,
      Key: fileKey,
      ContentType: fileType,
      CacheControl: 'max-age=31536000, public',
      Metadata: {
        originalFileName: fileName,
        fileSize: fileSize.toString(),
        uploadedBy: authResult.user.email || 'unknown',
        uploadedAt: new Date().toISOString(),
        uploadType: 'single'
      }
    })

    const presignedUrl = await getSignedUrl(s3Client, command, {
      expiresIn: 3600, // 1 hour expiration
    })

    const fileUrl = `https://${process.env.AWS_S3_BUCKET_NAME}.s3.${process.env.AWS_REGION || 'eu-north-1'}.amazonaws.com/${fileKey}`

    console.log('✅ Presigned URL generated successfully', {
      key: fileKey,
      url: fileUrl,
      expiresIn: '1 hour',
      duration: `${Date.now() - startTime}ms`
    })

    // Prepare response data
    const responseData = {
      success: true,
      presignedUrl,
      fileUrl,
      fileKey,
      expiresIn: 3600,
      bucket: process.env.AWS_S3_BUCKET_NAME,
      region: process.env.AWS_REGION || 'eu-north-1',
      timestamp: Date.now(),
      rateLimit: {
        remaining: rateLimit.remaining,
        resetTime: rateLimit.resetTime
      }
    }

    // ================ ADD VIDEO TO LIBRARY IN BACKGROUND ================
    // Add video to library in background (don't wait for it)
    if (folder === 'lessonVideos' || folder === 'previewVideos') {
      console.log('📚 Queueing video for library addition:', {
        fileName,
        fileKey,
        folder
      })
      
      // Add to library asynchronously
      setTimeout(async () => {
        try {
          const videoData = {
            key: fileKey,
            url: fileUrl,
            size: fileSize,
            type: 'video' as const,
            mimeType: fileType
          }
          
          await addVideoToLibrary(videoData, authResult.user, {
            fileName,
            fileType,
            folder,
            // You might want to pass course context here if available
          })
          
          console.log('✅ Video successfully added to library in background')
        } catch (error) {
          console.error('❌ Failed to add video to library in background:', error)
        }
      }, 1000) // Delay 1 second to avoid blocking the response
    }
    // =====================================================================

    return NextResponse.json(responseData)

  } catch (error) {
    console.error('❌ Error generating presigned URL:', error)
    
    const errorMessage = error instanceof Error ? error.message : 'Failed to generate upload URL'
    return NextResponse.json(
      { 
        success: false,
        error: errorMessage,
        details: process.env.NODE_ENV === 'development' && error instanceof Error ? error.stack : undefined,
        duration: `${Date.now() - startTime}ms`
      },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const authResult = await authenticateAdmin()
    if (!authResult.success) {
      return NextResponse.json({ 
        error: authResult.error,
        success: false 
      }, { status: authResult.status })
    }

    return NextResponse.json({
      success: true,
      message: 'Upload API is operational',
      user: {
        id: authResult.user.clerkId,
        email: authResult.user.email,
        role: authResult.user.role
      },
      s3: {
        bucket: process.env.AWS_S3_BUCKET_NAME ? 'Configured' : 'Not configured',
        region: process.env.AWS_REGION || 'eu-north-1'
      },
      limits: {
        maxSingleUpload: '100MB',
        supportsMultipart: true,
        maxMultipartSize: '10GB',
        rateLimit: `${MAX_UPLOADS_PER_WINDOW} uploads per 15 minutes`
      },
      features: {
        videoLibraryIntegration: 'Enabled - Videos are automatically added to library in background',
        supportedFolders: ['lessonVideos', 'previewVideos', 'thumbnails', 'moduleThumbnails']
      },
      timestamp: Date.now()
    })
  } catch (error) {
    console.error('GET error:', error)
    return NextResponse.json({ 
      success: false,
      error: 'Service error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}