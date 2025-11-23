import { NextRequest, NextResponse } from 'next/server'
import { currentUser } from '@clerk/nextjs/server'
import { connectToDatabase } from '@/lib/mongodb'
import User from '@/lib/models/User'
import { Conversation, Message } from '@/lib/models/Message'

export async function GET(request: NextRequest) {
  try {
    const user = await currentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    await connectToDatabase()
    
    const dbUser = await User.findOne({ clerkId: user.id })
    if (!dbUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '20')

    const conversations = await Conversation.find({
      participants: dbUser._id
    })
    .populate('participants', 'username firstName lastName avatar')
    .populate('lastMessage')
    .sort({ updatedAt: -1 })
    .limit(limit)
    .lean()

    return NextResponse.json({ conversations })
  } catch (error) {
    console.error('Error fetching messages:', error)
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await currentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    await connectToDatabase()
    
    const dbUser = await User.findOne({ clerkId: user.id })
    if (!dbUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const { receiverId, content, messageType = 'text' } = await request.json()

    if (!receiverId || !content) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const receiver = await User.findById(receiverId)
    if (!receiver) {
      return NextResponse.json({ error: 'Receiver not found' }, { status: 404 })
    }

    // Find or create conversation
    let conversation = await Conversation.findOne({
      participants: { $all: [dbUser._id, receiverId] }
    })

    if (!conversation) {
      conversation = await Conversation.create({
        participants: [dbUser._id, receiverId]
      })
    }

    // Create message
    const message = await Message.create({
      conversation: conversation._id,
      sender: dbUser._id,
      receiver: receiverId,
      content,
      messageType
    })

    // Update conversation
    conversation.lastMessage = message._id
    conversation.unreadCount += 1
    await conversation.save()

    await message.populate('sender', 'username firstName lastName avatar')
    await message.populate('receiver', 'username firstName lastName avatar')

    return NextResponse.json({ message, conversation })
  } catch (error) {
    console.error('Error sending message:', error)
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    )
  }
}