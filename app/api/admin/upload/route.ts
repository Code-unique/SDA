
// app/api/admin/upload/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { currentUser } from '@clerk/nextjs/server'
import { connectToDatabase } from '@/lib/mongodb'
import User from '@/lib/models/User'
import "@/lib/loadmodels";
const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'eu-north-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
})

// Rate limiting store
const uploadLimits = new Map()

function checkRateLimit(userId: string): { allowed: boolean; resetTime: number } {
  const now = Date.now()
  const windowMs = 15 * 60 * 1000 // 15 minutes
  const maxUploads = 10 // Max 10 uploads per 15 minutes
  
  const userLimit = uploadLimits.get(userId) || { count: 0, resetTime: now + windowMs }
  
  if (now > userLimit.resetTime) {
    userLimit.count = 0
    userLimit.resetTime = now + windowMs
  }
  
  if (userLimit.count >= maxUploads) {
    return { allowed: false, resetTime: userLimit.resetTime }
  }
  
  userLimit.count++
  uploadLimits.set(userId, userLimit)
  
  return { allowed: true, resetTime: userLimit.resetTime }
}

export async function POST(request: NextRequest) {
  try {
    const user = await currentUser()
    
    console.log('🔐 Auth check - User:', user ? user.id : 'No user')
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is admin in MongoDB
    await connectToDatabase()
    const dbUser = await User.findOne({ clerkId: user.id })
    
    if (!dbUser || dbUser.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 })
    }

    const { fileName, fileType, fileSize, folder } = await request.json()

    console.log('📁 Upload request:', { fileName, fileType, fileSize, folder })

    // Validate required fields
    if (!fileName || !fileType || !fileSize || !folder) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Generate unique file key
    const timestamp = Date.now()
    const randomString = Math.random().toString(36).substring(2, 15)
    const fileExtension = fileName.split('.').pop()?.toLowerCase()
    
    if (!fileExtension) {
      return NextResponse.json({ error: 'Invalid file name' }, { status: 400 })
    }

    const fileKey = `courses/${folder}/${timestamp}-${randomString}.${fileExtension}`

    console.log('🔑 Generated file key:', fileKey)

    // Generate presigned URL WITHOUT ACL (since ACLs are blocked)
    const command = new PutObjectCommand({
      Bucket: process.env.AWS_S3_BUCKET_NAME!,
      Key: fileKey,
      ContentType: fileType,
      // REMOVED: ACL: 'public-read' - because ACLs are blocked
      CacheControl: 'max-age=31536000',
    })

    const presignedUrl = await getSignedUrl(s3Client, command, {
      expiresIn: 3600, // 1 hour expiration
    })

    const fileUrl = `https://${process.env.AWS_S3_BUCKET_NAME}.s3.${process.env.AWS_REGION || 'eu-north-1'}.amazonaws.com/${fileKey}`

    console.log('✅ Presigned URL generated successfully (no ACL)')
    console.log('📝 File will be accessible at:', fileUrl)

    return NextResponse.json({
      presignedUrl,
      fileUrl,
      fileKey,
      expiresIn: 3600
    })

  } catch (error) {
    console.error('❌ Error generating presigned URL:', error)
    return NextResponse.json(
      { error: 'Failed to generate upload URL' },
      { status: 500 }
    )
  }
}