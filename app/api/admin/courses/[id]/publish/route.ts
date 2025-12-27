import { NextRequest, NextResponse } from 'next/server'
import { currentUser } from '@clerk/nextjs/server'
import { connectToDatabase } from '@/lib/mongodb'
import User from '@/lib/models/User'
import Post from '@/lib/models/Post'
import '@/lib/loadmodels'

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await currentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    await connectToDatabase()

    const adminUser = await User.findOne({ clerkId: user.id })
    if (!adminUser || adminUser.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { id } = params

    const post = await Post.findById(id)
    if (!post) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 })
    }

    // ✅ Toggle publish state automatically
    post.isPublic = !post.isPublic
    await post.save()

    await post.populate('author', 'username firstName lastName avatar')

    return NextResponse.json(post)
  } catch (error) {
    console.error('Error updating post visibility:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
