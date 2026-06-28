// app/api/batch-status/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { currentUser } from '@clerk/nextjs/server'
import { connectToDatabase } from '@/lib/mongodb'
import User from '@/lib/models/User'
import Post from '@/lib/models/Post'
import { SavedItem } from '@/lib/models/UserInteractions'
import mongoose from 'mongoose'
import '@/lib/loadmodels'


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

    const { postIds = [], userIds = [] } = await request.json()

    // Validate ObjectIds early
    const validPostIds = postIds.filter(
      (id: string) => mongoose.Types.ObjectId.isValid(id)
    )

    const validUserIds = userIds.filter(
      (id: string) => mongoose.Types.ObjectId.isValid(id)
    )

    // 🚀 EARLY EXIT — prevents useless DB work
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

    await connectToDatabase()

    const dbUser = await User.findOne(
      { clerkId: user.id },
      { _id: 1, following: 1 } // ⚡ only fields needed
    ).lean()

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

    // Type assertion for dbUser to ensure TypeScript knows it's a single document
    const dbUserId = (dbUser as any)._id as mongoose.Types.ObjectId;
    const dbUserFollowing = (dbUser as any).following || [];

    // ================== PARALLEL QUERIES ==================
    const [likedPosts, savedPosts] = await Promise.all([
      validPostIds.length
        ? Post.find(
            { _id: { $in: validPostIds }, likes: dbUserId },
            { _id: 1 }
          ).lean()
        : [],

      validPostIds.length
        ? SavedItem.find(
            {
              user: dbUserId,
              itemType: 'post',
              itemId: { $in: validPostIds }
            },
            { itemId: 1, savedAt: 1 }
          ).lean()
        : []
    ])

    // ================== LIKE STATUS MAP ==================
    const likeStatuses: Record<string, boolean> = {}
    for (const post of likedPosts) {
      likeStatuses[(post as any)._id.toString()] = true
    }

    // ================== SAVE STATUS MAP ==================
    const saveStatuses: Record<string, { saved: boolean; savedAt?: string }> = {}
    for (const item of savedPosts) {
      const savedItem = item as any
      saveStatuses[savedItem.itemId] = {
        saved: true,
        savedAt: savedItem.savedAt
      }
    }

    // Fill missing posts
    for (const postId of validPostIds) {
      if (!(postId in likeStatuses)) likeStatuses[postId] = false
      if (!(postId in saveStatuses)) saveStatuses[postId] = { saved: false }
    }

    // ================== FOLLOW STATUS (⚡ FAST) ==================
    const followStatuses: Record<string, boolean> = {}

    const followingSet = new Set(
      dbUserFollowing.map((id: any) => id.toString())
    )

    for (const userId of validUserIds) {
      followStatuses[userId] = followingSet.has(userId)
    }

    return NextResponse.json({
      success: true,
      data: {
        likeStatuses,
        saveStatuses,
        followStatuses
      }
    })
  } catch (error) {
    console.error('Error in batch status:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch statuses'
      },
      { status: 500 }
    )
  }
}