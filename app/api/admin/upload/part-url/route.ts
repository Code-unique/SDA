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
  try {
    // Authenticate admin user
    const authResult = await authenticateAdmin()
    if (!authResult.success) {
      return NextResponse.json({ 
        error: authResult.error,
        success: false 
      }, { status: authResult.status })
    }

    const { fileKey, uploadId, partNumber } = await request.json()

    if (!fileKey || !uploadId || !partNumber) {
      return NextResponse.json({ 
        error: 'Missing required fields',
        success: false
      }, { status: 400 })
    }

    const command = new UploadPartCommand({
      Bucket: process.env.AWS_S3_BUCKET_NAME!,
      Key: fileKey,
      UploadId: uploadId,
      PartNumber: partNumber,
    })

    const presignedUrl = await getSignedUrl(s3Client, command, {
      expiresIn: 3600,
    })

    return NextResponse.json({
      success: true,
      presignedUrl,
      partNumber,
      expiresIn: 3600,
    })

  } catch (error) {
    console.error('Error generating part URL:', error)
    return NextResponse.json({ 
      success: false,
      error: error instanceof Error ? error.message : 'Failed to generate URL'
    }, { status: 500 })
  }
}