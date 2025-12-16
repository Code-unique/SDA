import { NextRequest, NextResponse } from 'next/server'
import { S3Client, UploadPartCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
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

    const { fileKey, uploadId, totalParts } = await request.json()

    console.log(`📥 Bulk URL request received:`, { 
      fileKey, 
      uploadId, 
      totalParts,
      userId: authResult.user.clerkId 
    })

    // Validate required fields
    if (!fileKey || !uploadId || !totalParts) {
      return NextResponse.json({ 
        error: 'Missing required fields: fileKey, uploadId, and totalParts are required',
        success: false
      }, { status: 400 })
    }

    // Validate totalParts
    const partsCount = parseInt(totalParts)
    if (isNaN(partsCount) || partsCount < 1 || partsCount > 10000) {
      return NextResponse.json({ 
        error: 'Invalid totalParts. Must be a number between 1 and 10000',
        success: false
      }, { status: 400 })
    }

    console.log(`🔗 Generating ${partsCount} presigned URLs for upload ${uploadId}`)

    // Generate all presigned URLs in parallel
    const urlPromises = Array.from({ length: partsCount }, (_, i) => {
      const partNumber = i + 1
      
      const command = new UploadPartCommand({
        Bucket: process.env.AWS_S3_BUCKET_NAME!,
        Key: fileKey,
        UploadId: uploadId,
        PartNumber: partNumber,
      })
      
      return getSignedUrl(s3Client, command, { 
        expiresIn: 3600, // 1 hour expiration
      })
    })

    const presignedUrls = await Promise.all(urlPromises)

    console.log(`✅ Generated ${presignedUrls.length} presigned URLs successfully`, {
      uploadId,
      duration: `${Date.now() - startTime}ms`
    })

    return NextResponse.json({
      success: true,
      presignedUrls,
      expiresIn: 3600,
      timestamp: Date.now(),
      uploadId,
      fileKey,
      totalParts: partsCount,
      duration: Date.now() - startTime
    })

  } catch (error: any) {
    console.error('❌ Error generating bulk part URLs:', error)
    
    let statusCode = 500
    let errorMessage = error.message || 'Failed to generate part URLs'
    
    if (error.name === 'NoSuchUpload') {
      statusCode = 404
      errorMessage = 'Upload not found. It may have been aborted or expired.'
    }
    
    return NextResponse.json(
      { 
        success: false,
        error: errorMessage,
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
        s3ErrorCode: error.name,
        duration: Date.now() - startTime
      },
      { status: statusCode }
    )
  }
}