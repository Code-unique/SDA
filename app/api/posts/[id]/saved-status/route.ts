// app/api/posts/[id]/saved-status/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { currentUser } from '@clerk/nextjs/server'
import { connectToDatabase } from '@/lib/mongodb'
import User from '@/lib/models/User'
import { SavedItem } from '@/lib/models/UserInteractions'
import "@/lib/loadmodels";
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await currentUser()
    if (!user) {
      return NextResponse.json({ saved: false })
    }

    await connectToDatabase()
    
    const dbUser = await User.findOne({ clerkId: user.id })
    if (!dbUser) {
      return NextResponse.json({ saved: false })
    }

    const { id } = await params

    // Check if saved
    const savedItem = await SavedItem.findOne({
      user: dbUser._id,
      itemType: 'post',
      itemId: id
    })

    return NextResponse.json({ 
      saved: !!savedItem,
      savedAt: savedItem?.savedAt 
    })
  } catch (error) {
    console.error('Error checking saved status:', error)
    return NextResponse.json({ saved: false })
  }
}