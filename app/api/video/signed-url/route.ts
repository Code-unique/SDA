// app/api/video/signed-url/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { currentUser } from '@clerk/nextjs/server'

// Initialize S3 client
const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'eu-north-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
})

// Cache for signed URLs (5 minutes)
const urlCache = new Map<string, { url: string; expires: number }>()
const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes

export async function GET(request: NextRequest) {
  const startTime = Date.now()
  
  try {
    // 1. Authenticate user
    const user = await currentUser()
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized', success: false },
        { status: 401 }
      )
    }

    // 2. Get video key from query params
    const { searchParams } = new URL(request.url)
    const videoKey = searchParams.get('key')
    
    if (!videoKey) {
      return NextResponse.json(
        { error: 'Video key is required', success: false },
        { status: 400 }
      )
    }

    // 3. Validate video key format (security)
    if (!videoKey.startsWith('courses/') || 
        (!videoKey.includes('lessonVideos') && 
         !videoKey.includes('previewVideos'))) {
      return NextResponse.json(
        { error: 'Invalid video key', success: false },
        { status: 400 }
      )
    }

    // 4. Check cache first
    const cacheKey = `${user.id}:${videoKey}`
    const cached = urlCache.get(cacheKey)
    
    if (cached && cached.expires > Date.now()) {
      console.log('✅ Serving from cache:', {
        videoKey,
        userId: user.id,
        duration: `${Date.now() - startTime}ms`
      })
      
      return NextResponse.json({
        success: true,
        signedUrl: cached.url,
        expiresAt: cached.expires,
        cached: true,
        duration: Date.now() - startTime
      })
    }

    // 5. Generate signed URL
    console.log('🔐 Generating new signed URL:', {
      videoKey,
      userId: user.id,
      bucket: process.env.AWS_S3_BUCKET_NAME
    })

    const command = new GetObjectCommand({
      Bucket: process.env.AWS_S3_BUCKET_NAME!,
      Key: videoKey,
      ResponseContentType: 'video/mp4', // Force mp4 for .mov files
      ResponseContentDisposition: 'inline', // Play in browser, not download
    })

    // Generate URL that expires in 1 hour
    const signedUrl = await getSignedUrl(s3Client, command, {
      expiresIn: 3600, // 1 hour
    })

    // 6. Cache the URL
    const expiresAt = Date.now() + CACHE_DURATION
    urlCache.set(cacheKey, { url: signedUrl, expires: expiresAt })
    
    // Clean old cache entries
    for (const [key, value] of urlCache.entries()) {
      if (value.expires < Date.now()) {
        urlCache.delete(key)
      }
    }

    console.log('✅ Signed URL generated:', {
      videoKey,
      userId: user.id,
      expiresAt: new Date(expiresAt).toISOString(),
      duration: `${Date.now() - startTime}ms`
    })

    return NextResponse.json({
      success: true,
      signedUrl,
      expiresAt,
      cached: false,
      videoKey,
      bucket: process.env.AWS_S3_BUCKET_NAME,
      duration: Date.now() - startTime
    })

  } catch (error: any) {
    console.error('❌ Error generating signed URL:', error)
    
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to generate signed URL',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
        duration: Date.now() - startTime
      },
      { status: 500 }
    )
  }
}