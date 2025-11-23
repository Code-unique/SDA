// app/api/upload/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { currentUser } from '@clerk/nextjs/server'
import { connectToDatabase } from '@/lib/mongodb'
import User from '@/lib/models/User'
import { uploadSmallFile } from '@/lib/cloudinary'

export const maxDuration = 30

export async function POST(request: NextRequest) {
  try {
    const user = await currentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    await connectToDatabase()
    
    const dbUser = await User.findOne({ clerkId: user.id })
    if (!dbUser || dbUser.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File
    const type = formData.get('type') as 'thumbnail' | 'previewVideo'

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    // Only handle small files in API route
    const maxSize = 4 * 1024 * 1024 // 4MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: 'File too large for API upload. Use direct Cloudinary upload for larger files.' }, 
        { status: 400 }
      )
    }

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    const result: any = await uploadSmallFile(buffer, type)

    const responseData = {
      success: true,
      asset: {
        public_id: result.public_id,
        secure_url: result.secure_url,
        format: result.format,
        resource_type: type === 'thumbnail' ? 'image' : 'video',
        width: result.width,
        height: result.height,
        duration: result.duration,
        bytes: result.bytes
      }
    }

    return NextResponse.json(responseData)

  } catch (error: any) {
    console.error('Error uploading file:', error)
    return NextResponse.json(
      { error: 'Upload failed' }, 
      { status: 500 }
    )
  }
}