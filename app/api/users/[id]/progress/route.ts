// app/api/users/[id]/progress/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { currentUser } from '@clerk/nextjs/server'
import UserProgress from '@/lib/models/UserProgress'
import Course from '@/lib/models/Course'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> } // ✅ params is now a Promise
) {
  try {
    const user = await currentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // ✅ Await the params to get the actual values
    const { id } = await params

    // Verify the user can only access their own progress
    if (user.id !== id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const progress = await UserProgress.find({ userId: id })
      .populate('courseId', 'title description thumbnail totalLessons')
      .sort({ updatedAt: -1 })

    return NextResponse.json({ progress })
  } catch (error) {
    console.error('Error fetching user progress:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}