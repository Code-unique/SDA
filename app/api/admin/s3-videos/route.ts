import { NextRequest, NextResponse } from 'next/server'
import { S3Client, ListObjectsV2Command } from '@aws-sdk/client-s3'
import { authenticateAdmin } from '@/app/api/_lib/auth-utils'

const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'eu-north-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
})

export async function GET(request: NextRequest) {
  try {
    // Authenticate admin user
    const authResult = await authenticateAdmin()
    if (!authResult.success) {
      return NextResponse.json(
        { error: authResult.error, success: false },
        { status: authResult.status }
      )
    }

    const { searchParams } = new URL(request.url)
    const prefix = searchParams.get('prefix') || 'courses/'
    const maxKeys = Math.min(100, parseInt(searchParams.get('limit') || '50'))
    
    console.log('🔍 Listing S3 objects with prefix:', prefix)

    // List objects from S3
    const command = new ListObjectsV2Command({
      Bucket: process.env.AWS_S3_BUCKET_NAME!,
      Prefix: prefix,
      MaxKeys: maxKeys,
    })

    const response = await s3Client.send(command)
    
    // Filter for video files and format response
    const videos = (response.Contents || [])
      .filter(object => {
        const key = object.Key || ''
        return (
          !key.endsWith('/') && // Not a folder
          key.includes('lessonVideos/') && // Only from lessonVideos folder
          key.match(/\.(mp4|mov|avi|mkv|webm|flv|wmv|m4v|mpg|mpeg)$/i) // Video extensions
        )
      })
      .map(object => {
        const key = object.Key || ''
        const fileName = key.split('/').pop() || 'unknown'
        const folder = key.split('/')[1] || 'unknown'
        
        return {
          key: key,
          fileName: fileName,
          folder: folder,
          size: object.Size || 0,
          lastModified: object.LastModified?.toISOString() || new Date().toISOString(),
          url: `https://${process.env.AWS_S3_BUCKET_NAME}.s3.${process.env.AWS_REGION || 'eu-north-1'}.amazonaws.com/${key}`,
          formattedSize: formatFileSize(object.Size || 0),
          isInLibrary: false, // We'll check this later
          uploadDate: object.LastModified || new Date()
        }
      })
      .sort((a, b) => new Date(b.uploadDate).getTime() - new Date(a.uploadDate).getTime())

    console.log(`✅ Found ${videos.length} videos in S3`)

    return NextResponse.json({
      success: true,
      videos: videos,
      total: videos.length,
      bucket: process.env.AWS_S3_BUCKET_NAME,
      region: process.env.AWS_REGION || 'eu-north-1',
      timestamp: Date.now()
    })

  } catch (error: any) {
    console.error('❌ Error listing S3 videos:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to list S3 videos',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      },
      { status: 500 }
    )
  }
}

// Helper function to format file size
function formatFileSize(bytes: number): string {
  if (bytes >= 1024 * 1024 * 1024) {
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`
  }
  if (bytes >= 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
  }
  if (bytes >= 1024) {
    return `${(bytes / 1024).toFixed(2)} KB`
  }
  return `${bytes} B`
}