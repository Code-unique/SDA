import { NextRequest, NextResponse } from 'next/server'
import { S3Client, AbortMultipartUploadCommand } from '@aws-sdk/client-s3'
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
  
  // Declare variables at function scope so they're available in catch block
  let fileKey: string = '';
  let uploadId: string = '';
  
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

    // Extract from request
    const body = await request.json();
    fileKey = body.fileKey;
    uploadId = body.uploadId;

    console.log(`📥 Abort request received:`, { 
      fileKey, 
      uploadId,
      userId: authResult.user.clerkId 
    })

    // Validate required fields
    if (!fileKey || !uploadId) {
      return NextResponse.json({ 
        error: 'Missing required fields: fileKey and uploadId are required',
        success: false
      }, { status: 400 })
    }

    console.log(`🛑 Aborting multipart upload ${uploadId}`)

    const command = new AbortMultipartUploadCommand({
      Bucket: process.env.AWS_S3_BUCKET_NAME!,
      Key: fileKey,
      UploadId: uploadId
    })

    await s3Client.send(command)

    console.log(`✅ Successfully aborted multipart upload ${uploadId}`, {
      duration: `${Date.now() - startTime}ms`,
      fileKey,
      userId: authResult.user.clerkId
    })

    return NextResponse.json({
      success: true,
      message: 'Multipart upload aborted successfully',
      uploadId,
      fileKey,
      abortedAt: new Date().toISOString(),
      duration: Date.now() - startTime
    })

  } catch (error: any) {
    console.error('❌ Error aborting multipart upload:', error)
    
    // Check if upload doesn't exist (NoSuchUpload) - that's okay for abort
    if (error.name === 'NoSuchUpload' || 
        error.message?.includes('NoSuchUpload') || 
        error.message?.includes('not found') ||
        error.message?.includes('404')) {
      
      console.log(`⚠️ Upload ${uploadId || 'unknown'} not found or already aborted`)
      
      return NextResponse.json({
        success: true,
        message: 'Upload already aborted or does not exist',
        uploadId: uploadId || 'unknown',
        fileKey: fileKey || 'unknown',
        warning: 'Upload was not found in S3 (may have been already aborted or completed)',
        duration: Date.now() - startTime
      })
    }
    
    return NextResponse.json(
      { 
        success: false,
        error: error.message || 'Failed to abort multipart upload',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
        duration: Date.now() - startTime
      },
      { status: 500 }
    )
  }
}