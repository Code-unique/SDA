import { NextRequest, NextResponse } from 'next/server'
import { connectToDatabase } from '@/lib/mongodb'
import User from '@/lib/models/User'

export async function GET(request: NextRequest) {
  try {
    await connectToDatabase()

    const { searchParams } = new URL(request.url)
    const query = searchParams.get('q') || ''
    const limit = parseInt(searchParams.get('limit') || '20')

    let users = []

    if (query) {
      users = await User.find({
        $or: [
          { username: { $regex: query, $options: 'i' } },
          { firstName: { $regex: query, $options: 'i' } },
          { lastName: { $regex: query, $options: 'i' } },
          { bio: { $regex: query, $options: 'i' } },
          { skills: { $in: [new RegExp(query, 'i')] } },
          { interests: { $in: [new RegExp(query, 'i')] } }
        ]
      })
      .select('-email -clerkId')
      .sort({ followers: -1, createdAt: -1 })
      .limit(limit)
    } else {
      users = await User.find({})
        .select('-email -clerkId')
        .sort({ followers: -1, createdAt: -1 })
        .limit(limit)
    }

    return NextResponse.json({ users })
  } catch (error: any) {
    console.error('Error searching users:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}