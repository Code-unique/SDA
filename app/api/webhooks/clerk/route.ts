// app/api/webhooks/clerk/route.ts
import { Webhook } from 'svix'
import { headers } from 'next/headers'
import { WebhookEvent } from '@clerk/nextjs/server'
import { connectToDatabase } from '@/lib/mongodb'
import User from '@/lib/models/User'

export async function POST(req: Request) {
  const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET

  if (!WEBHOOK_SECRET) {
    throw new Error('Please add CLERK_WEBHOOK_SECRET from Clerk Dashboard to .env')
  }

  // Get the headers
  const headerPayload = req.headers;
const svix_id = headerPayload.get("svix-id");


  const svix_timestamp = headerPayload.get("svix-timestamp")
  const svix_signature = headerPayload.get("svix-signature")

  // If there are no headers, error out
  if (!svix_id || !svix_timestamp || !svix_signature) {
    return new Response('Error occurred -- no svix headers', {
      status: 400
    })
  }

  // Get the body
  const payload = await req.json()
  const body = JSON.stringify(payload)

  // Create a new Svix instance with your secret.
  const wh = new Webhook(WEBHOOK_SECRET)

  let evt: WebhookEvent

  // Verify the payload with the headers
  try {
    evt = wh.verify(body, {
      "svix-id": svix_id,
      "svix-timestamp": svix_timestamp,
      "svix-signature": svix_signature,
    }) as WebhookEvent
  } catch (err) {
    console.error('Error verifying webhook:', err)
    return new Response('Error occurred', {
      status: 400
    })
  }

  // Handle the webhook
  const eventType = evt.type

  if (eventType === 'user.created') {
    const { id, email_addresses, username, first_name, last_name, image_url } = evt.data

    try {
      await connectToDatabase()

      // Check if user already exists
      const existingUser = await User.findOne({ clerkId: id })
      if (existingUser) {
        console.log('User already exists:', existingUser.username)
        return new Response('User already exists', { status: 200 })
      }

      // Create new user
      await User.create({
        clerkId: id,
        email: email_addresses[0]?.email_address || '',
        username: username || `user_${id.slice(0, 8)}`,
        firstName: first_name || 'User',
        lastName: last_name || 'Name',
        avatar: image_url || '',
        banner: '',
        bio: '',
        location: '',
        website: '',
        role: 'user',
        interests: [],
        skills: [],
        isVerified: false,
        followers: [],
        following: [],
        onboardingCompleted: false
      })

      console.log('✅ User created via webhook:', username)
      return new Response('User created successfully', { status: 200 })
    } catch (error) {
      console.error('Error creating user via webhook:', error)
      return new Response('Error creating user', { status: 500 })
    }
  }

  return new Response('Webhook received', { status: 200 })
}