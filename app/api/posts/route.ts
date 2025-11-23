import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { connectToDatabase } from '@/lib/mongodb'
import User from '@/lib/models/User'
import Post from '@/lib/models/Post'
import cloudinary from '@/lib/cloudinary'

// ----------------------------------------------
// CLOUDINARY UPLOAD HELPER
// ----------------------------------------------
async function uploadToCloudinary(buffer: Buffer): Promise<any> {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder: 'sutra_posts' },
      (err, result) => {
        if (err) reject(err)
        else resolve(result)
      }
    )
    stream.end(buffer)
  })
}

// ----------------------------------------------
// GET — Fetch explore posts
// ----------------------------------------------
export async function GET(request: NextRequest) {
  try {
    await connectToDatabase()

    const { searchParams } = new URL(request.url)
    const sort = searchParams.get('sort') || 'recent'
    const page = parseInt(searchParams.get('page') || '1')
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 50)
    const skip = (page - 1) * limit

    let sortOptions: any = {}

    switch (sort) {
      case 'popular':
        sortOptions = { likes: -1, createdAt: -1 }
        break
      case 'trending':
        sortOptions = { engagement: -1, createdAt: -1 }
        break
      default:
        sortOptions = { createdAt: -1 }
    }

    const posts = await Post.find({ isPublic: true })
      .populate('author', 'username firstName lastName avatar isVerified isPro badges followers following')
      .populate('comments.user', 'username firstName lastName avatar isVerified isPro')
      .sort(sortOptions)
      .skip(skip)
      .limit(limit)
      .lean()

    const totalPosts = await Post.countDocuments({ isPublic: true })

    return NextResponse.json({
      success: true,
      posts,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(totalPosts / limit),
        totalItems: totalPosts,
        hasNext: page < Math.ceil(totalPosts / limit),
        hasPrev: page > 1
      }
    })
  } catch (error) {
    console.error('Error fetching posts:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}

// ----------------------------------------------
// POST — Create a new post with image upload
// ----------------------------------------------
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    await connectToDatabase()

    const dbUser = await User.findOne({ clerkId: userId })
    if (!dbUser) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 })
    }

    const formData = await request.formData()
    const caption = formData.get('caption') as string
    const hashtagsString = formData.get('hashtags') as string
    const imageFiles = formData.getAll('images') as Blob[]

    if (!caption.trim()) {
      return NextResponse.json({ success: false, error: 'Caption is required' }, { status: 400 })
    }

    if (imageFiles.length === 0) {
      return NextResponse.json({ success: false, error: 'Images required' }, { status: 400 })
    }

    // Upload all images to Cloudinary
    const uploadedImages = []

    for (const file of imageFiles) {
      const buffer = Buffer.from(await file.arrayBuffer())
      const uploaded = await uploadToCloudinary(buffer)

      uploadedImages.push({
        type: 'image',
        url: uploaded.secure_url,
        publicId: uploaded.public_id
      })
    }

    const hashtags = hashtagsString ? JSON.parse(hashtagsString) : []

    const post = await Post.create({
      author: dbUser._id,
      media: uploadedImages,
      caption,
      hashtags,
      likes: [],
      saves: [],
      comments: [],
      views: 0,
      shares: 0,
      engagement: 0,
      isPublic: true,
    })

    await post.populate('author', 'username firstName lastName avatar isVerified isPro')

    return NextResponse.json({ success: true, data: post })
  } catch (error) {
    console.error('Error creating post:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}
