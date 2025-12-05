import { NextRequest, NextResponse } from 'next/server'
import { currentUser } from '@clerk/nextjs/server'
import { connectToDatabase } from '@/lib/mongodb'
import User from '@/lib/models/User'
import Post from '@/lib/models/Post'
import { SavedItem } from '@/lib/models/UserInteractions'
import mongoose from 'mongoose'

export async function POST(request: NextRequest) {
  try {
    const user = await currentUser()
    if (!user) {
      return NextResponse.json({ 
        success: true, 
        data: { 
          likeStatuses: {}, 
          saveStatuses: {}, 
          followStatuses: {} 
        } 
      })
    }

    await connectToDatabase()
    
    const dbUser = await User.findOne({ clerkId: user.id })
    if (!dbUser) {
      return NextResponse.json({ 
        success: true, 
        data: { 
          likeStatuses: {}, 
          saveStatuses: {}, 
          followStatuses: {} 
        } 
      })
    }

    const { postIds = [], userIds = [] } = await request.json()

    // Validate input arrays
    const validPostIds = postIds.filter((id: string) => id && typeof id === 'string' && mongoose.Types.ObjectId.isValid(id))
    const validUserIds = userIds.filter((id: string) => id && typeof id === 'string' && mongoose.Types.ObjectId.isValid(id))

    // Early return if no valid IDs
    if (validPostIds.length === 0 && validUserIds.length === 0) {
      return NextResponse.json({
        success: true,
        data: {
          likeStatuses: {},
          saveStatuses: {},
          followStatuses: {}
        }
      })
    }

    // Batch fetch all data in parallel
    const promises: Promise<any>[] = []

    // Get like statuses if there are post IDs
    if (validPostIds.length > 0) {
      promises.push(
        Post.find({
          _id: { $in: validPostIds },
          likes: dbUser._id
        }, { _id: 1 }).lean()
      )
    } else {
      promises.push(Promise.resolve([]))
    }

    // Get save statuses if there are post IDs
    if (validPostIds.length > 0) {
      promises.push(
        SavedItem.find({
          user: dbUser._id,
          itemType: 'post',
          itemId: { $in: validPostIds }
        }, { itemId: 1, savedAt: 1 }).lean()
      )
    } else {
      promises.push(Promise.resolve([]))
    }

    // Get follow statuses if there are user IDs
    if (validUserIds.length > 0) {
      promises.push(
        User.findById(dbUser._id, { following: 1 })
          .populate('following', '_id')
          .lean()
      )
    } else {
      promises.push(Promise.resolve({ following: [] }))
    }

    const [likedPosts, savedPosts, followingData] = await Promise.all(promises)

    // Create lookup maps for O(1) access
    const likeStatusMap: Record<string, boolean> = {}
    const likedPostsArray = Array.isArray(likedPosts) ? likedPosts : []
    likedPostsArray.forEach((post: any) => {
      likeStatusMap[post._id.toString()] = true
    })

    const saveStatusMap: Record<string, { saved: boolean; savedAt?: string }> = {}
    const savedPostsArray = Array.isArray(savedPosts) ? savedPosts : []
    savedPostsArray.forEach((item: any) => {
      saveStatusMap[item.itemId] = { 
        saved: true, 
        savedAt: item.savedAt 
      }
    })

    const followStatusMap: Record<string, boolean> = {}
    // Type guard for followingData
    const followingArray = followingData && typeof followingData === 'object' && 'following' in followingData 
      ? (followingData as any).following 
      : []
    
    const followingUserIds = Array.isArray(followingArray) 
      ? followingArray.map((f: any) => f._id?.toString()).filter(Boolean)
      : []

    validUserIds.forEach((userId: string) => {
      followStatusMap[userId] = followingUserIds.includes(userId)
    })

    // Fill in missing post IDs with false status
    validPostIds.forEach((postId: string) => {
      if (!likeStatusMap[postId]) likeStatusMap[postId] = false
      if (!saveStatusMap[postId]) saveStatusMap[postId] = { saved: false }
    })

    // Fill in missing user IDs with false status
    validUserIds.forEach((userId: string) => {
      if (!followStatusMap[userId]) followStatusMap[userId] = false
    })

    return NextResponse.json({
      success: true,
      data: {
        likeStatuses: likeStatusMap,
        saveStatuses: saveStatusMap,
        followStatuses: followStatusMap
      }
    })
  } catch (error) {
    console.error('Error in batch status:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to fetch statuses',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}