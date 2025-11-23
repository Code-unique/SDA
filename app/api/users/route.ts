// app/api/users/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { currentUser } from '@clerk/nextjs/server'
import dbConnect from '@/lib/db'
import User from '@/lib/models/User'

export async function GET(request: NextRequest) {
  try {
    await dbConnect()
    const user = await currentUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const dbUser = await User.findOne({ clerkId: user.id })

    if (!dbUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    return NextResponse.json(dbUser)
  } catch (error) {
    console.error('Error fetching user:', error)
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    await dbConnect()
    const user = await currentUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()

    // Check if user already exists
    const existingUser = await User.findOne({ 
      $or: [
        { clerkId: user.id },
        { email: body.email }
      ]
    })

    if (existingUser) {
      return NextResponse.json(existingUser)
    }

    // Create new user
    const newUser = await User.create({
      clerkId: user.id,
      email: body.email,
      username: body.username,
      firstName: body.firstName,
      lastName: body.lastName,
      avatar: body.avatar,
      isVerified: false,
      onboardingCompleted: false,
    })

    return NextResponse.json(newUser)
  } catch (error: any) {
    console.error('Error creating user:', error)
    
    if (error.code === 11000) {
      return NextResponse.json(
        { error: 'Username or email already exists' }, 
        { status: 400 }
      )
    }
    
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    )
  }
}

export async function PATCH(request: NextRequest) {
  try {
    await dbConnect()
    const user = await currentUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()

    const updatedUser = await User.findOneAndUpdate(
      { clerkId: user.id },
      { $set: body },
      { new: true, runValidators: true }
    )

    if (!updatedUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    return NextResponse.json(updatedUser)
  } catch (error: any) {
    console.error('Error updating user:', error)
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    )
  }
}
