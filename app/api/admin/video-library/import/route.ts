import { NextRequest, NextResponse } from 'next/server'
import { connectToDatabase } from '@/lib/mongodb'
import VideoLibrary from '@/lib/models/VideoLibrary'
import { currentUser } from '@clerk/nextjs/server'
import User from '@/lib/models/User'

export async function POST(request: NextRequest) {
  try {
    const user = await currentUser()
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    await connectToDatabase()

    const adminUser = await User.findOne({ clerkId: user.id })
    if (!adminUser || adminUser.role !== 'admin') {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { s3Key, fileName, size, folder } = body

    if (!s3Key) {
      return NextResponse.json(
        { error: 'S3 key is required' },
        { status: 400 }
      )
    }

    // Check if video already exists
    const existingVideo = await VideoLibrary.findOne({ 'video.key': s3Key })
    if (existingVideo) {
      return NextResponse.json(
        { 
          error: 'Video already imported',
          videoId: existingVideo._id 
        },
        { status: 400 }
      )
    }

    const title = fileName.replace(/\.[^/.]+$/, '').replace(/[_-]/g, ' ')
    
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

    // Helper functions for formatting
    const formatSize = (bytes: number): string => {
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

    const video = new VideoLibrary({
      title,
      description: `Imported from S3: ${folder || 'Videos'}`,
      video: {
        key: s3Key,
        url: `https://${process.env.AWS_S3_BUCKET_NAME}.s3.amazonaws.com/${s3Key}`,
        size,
        originalFileName: fileName,
        type: 'video',
        mimeType: getMimeType(fileName),
        duration: 0
      },
      uploadedBy: adminUser._id,
      categories: folder ? [folder.replace('Videos/', '').split('/')[0] || 'uncategorized'] : ['uncategorized'],
      tags: ['s3-import'],
      uploadDate: new Date(),
      usageCount: 0,
      courses: [],
      // Note: formattedSize and formattedDuration are virtuals, don't store them
      thumbnail: `https://${process.env.AWS_S3_BUCKET_NAME}.s3.amazonaws.com/${s3Key.replace(/\.[^/.]+$/, '')}.jpg`,
      isPublic: true
    })

    await video.save()

    // Cast to any to access virtuals
    const videoObj = video.toObject() as any;

    return NextResponse.json({
      success: true,
      video: {
        _id: video._id,
        title: video.title,
        description: video.description,
        video: video.video,
        categories: video.categories,
        uploadDate: video.uploadDate,
        usageCount: video.usageCount,
        formattedSize: formatSize(video.video.size), // Use helper function
        formattedDuration: '0:00'
      },
      message: 'Video imported successfully',
    })
  } catch (error: any) {
    console.error('❌ Import error:', error)
    console.error('❌ Validation errors:', error.errors)
    
    return NextResponse.json(
      { 
        error: 'Failed to import video',
        details: error.message,
        validationErrors: error.errors
      },
      { status: 500 }
    )
  }
}