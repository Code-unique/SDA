import { NextRequest, NextResponse } from 'next/server'
import { S3Client, CompleteMultipartUploadCommand } from '@aws-sdk/client-s3'
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

    const { fileKey, uploadId, parts } = await request.json()

    console.log(`📥 Complete request received:`, { 
      fileKey, 
      uploadId, 
      partsCount: parts?.length || 0,
      userId: authResult.user.clerkId 
    })

    // Validate required fields
    if (!fileKey || !uploadId) {
      return NextResponse.json({ 
        error: 'Missing required fields: fileKey and uploadId are required',
        success: false
      }, { status: 400 })
    }

    if (!parts || !Array.isArray(parts) || parts.length === 0) {
      return NextResponse.json({ 
        error: 'Invalid or empty parts array',
        success: false
      }, { status: 400 })
    }

    console.log(`🎯 Completing multipart upload ${uploadId} with ${parts.length} parts`)

    // Validate and prepare parts
    const preparedParts = parts.map((part: any, index: number) => {
      if (!part.ETag || !part.PartNumber) {
        throw new Error(`Invalid part at index ${index}: missing ETag or PartNumber`)
      }
      
      // Clean ETag (remove surrounding quotes if present)
      const cleanETag = part.ETag.replace(/^"|"$/g, '')
      
      // Ensure PartNumber is a number
      const partNumber = parseInt(part.PartNumber)
      if (isNaN(partNumber) || partNumber < 1) {
        throw new Error(`Invalid PartNumber at index ${index}: ${part.PartNumber}`)
      }
      
      return {
        ETag: cleanETag,
        PartNumber: partNumber
      }
    })

    // Sort parts by part number
    const sortedParts = preparedParts.sort((a, b) => a.PartNumber - b.PartNumber)

    // Validate sequential part numbers (optional but recommended)
    for (let i = 0; i < sortedParts.length; i++) {
      if (sortedParts[i].PartNumber !== i + 1) {
        console.warn(`⚠️ Non-sequential part numbers detected. Expected ${i + 1}, got ${sortedParts[i].PartNumber}`)
        // Continue anyway as S3 accepts non-sequential parts
      }
    }

    const command = new CompleteMultipartUploadCommand({
      Bucket: process.env.AWS_S3_BUCKET_NAME!,
      Key: fileKey,
      UploadId: uploadId,
      MultipartUpload: {
        Parts: sortedParts
      }
    })

    const response = await s3Client.send(command)

    // Construct file URL
    const fileUrl = `https://${process.env.AWS_S3_BUCKET_NAME}.s3.${process.env.AWS_REGION || 'eu-north-1'}.amazonaws.com/${fileKey}`

    console.log(`✅ Multipart upload completed successfully:`, {
      fileUrl,
      uploadId,
      eTag: response.ETag?.replace(/"/g, '') || 'unknown',
      duration: `${Date.now() - startTime}ms`
    })

    return NextResponse.json({
      success: true,
      fileUrl,
      eTag: response.ETag?.replace(/"/g, ''),
      bucket: process.env.AWS_S3_BUCKET_NAME,
      key: fileKey,
      uploadId,
      completedAt: new Date().toISOString(),
      s3Response: {
        location: response.Location,
        bucket: response.Bucket,
        key: response.Key
      },
      duration: Date.now() - startTime
    })

  } catch (error: any) {
    console.error('❌ Error completing multipart upload:', error)
    
    let statusCode = 500
    let errorMessage = error.message || 'Failed to complete multipart upload'
    
    // Handle specific S3 errors
    if (error.name === 'NoSuchUpload') {
      statusCode = 404
      errorMessage = 'Upload not found. It may have been aborted or expired.'
    } else if (error.name === 'InvalidPart') {
      statusCode = 400
      errorMessage = 'Invalid part data. Please check ETags and part numbers.'
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