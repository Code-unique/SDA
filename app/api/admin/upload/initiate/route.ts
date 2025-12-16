import { NextRequest, NextResponse } from 'next/server'
import { S3Client, CreateMultipartUploadCommand } from '@aws-sdk/client-s3'
import { authenticateAdmin } from '@/app/api/_lib/auth-utils'

const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'eu-north-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
})

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

    console.log(`✅ Authenticated admin: ${authResult.user.email}`)

    const { fileName, fileType, folder } = await request.json()

    console.log('📥 Initiate request received:', { 
      fileName, 
      fileType, 
      folder,
      userId: authResult.user.clerkId 
    })

    // Validate required fields
    if (!fileName || !fileType || !folder) {
      return NextResponse.json({ 
        error: 'Missing required fields: fileName, fileType, and folder are required',
        success: false
      }, { status: 400 })
    }

    // Validate folder name (security)
    const validFolders = ['thumbnails', 'previewVideos', 'lessonVideos', 'moduleThumbnails']
    if (!validFolders.includes(folder)) {
      return NextResponse.json({ 
        error: `Invalid folder. Must be one of: ${validFolders.join(', ')}`,
        success: false
      }, { status: 400 })
    }

    // Generate unique, safe file key
    const timestamp = Date.now()
    const randomString = Math.random().toString(36).substring(2, 10)
    const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_')
    const fileExtension = sanitizedFileName.split('.').pop()?.toLowerCase() || 'bin'
    
    const fileKey = `courses/${folder}/${timestamp}-${randomString}.${fileExtension}`
    
    console.log('🚀 Initiating multipart upload for:', fileKey)

    // Create multipart upload
    const command = new CreateMultipartUploadCommand({
      Bucket: process.env.AWS_S3_BUCKET_NAME!,
      Key: fileKey,
      ContentType: fileType,
      CacheControl: 'max-age=31536000, public',
      Metadata: {
        originalFileName: fileName,
        uploadedBy: authResult.user.email || 'unknown',
        uploadedAt: new Date().toISOString(),
        uploadType: 'multipart',
        folder: folder
      }
    })

    const response = await s3Client.send(command)

    if (!response.UploadId) {
      throw new Error('S3 did not return an UploadId')
    }

    const fileUrl = `https://${process.env.AWS_S3_BUCKET_NAME}.s3.${process.env.AWS_REGION || 'eu-north-1'}.amazonaws.com/${fileKey}`

    console.log('✅ Multipart upload initiated successfully:', {
      uploadId: response.UploadId,
      fileKey,
      fileUrl,
      duration: `${Date.now() - startTime}ms`
    })

    return NextResponse.json({
      success: true,
      uploadId: response.UploadId,
      fileKey,
      fileUrl,
      bucket: process.env.AWS_S3_BUCKET_NAME,
      region: process.env.AWS_REGION || 'eu-north-1',
      timestamp: Date.now(),
      expiresAt: Date.now() + (7 * 24 * 60 * 60 * 1000), // 7 days for completion
      duration: Date.now() - startTime
    })

  } catch (error: any) {
    console.error('❌ Error initiating multipart upload:', error)
    
    let statusCode = 500
    let errorMessage = error.message || 'Failed to initiate multipart upload'
    
    // Handle AWS credential errors
    if (error.name === 'CredentialsProviderError') {
      statusCode = 503
      errorMessage = 'AWS credentials not configured. Please contact administrator.'
    } else if (error.name === 'NoSuchBucket') {
      statusCode = 404
      errorMessage = 'S3 bucket not found. Please check configuration.'
    }
    
    return NextResponse.json(
      { 
        success: false,
        error: errorMessage,
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
        awsError: error.name,
        duration: Date.now() - startTime
      },
      { status: statusCode }
    )
  }
}