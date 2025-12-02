// app/api/webhooks/clerk/route.ts
import { Webhook } from 'svix';
import { headers } from 'next/headers';
import { WebhookEvent } from '@clerk/nextjs/server';
import { connectToDatabase } from '@/lib/mongodb';
import User from '@/lib/models/User';

export async function POST(req: Request) {
  const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;

  if (!WEBHOOK_SECRET) {
    console.error('Please add CLERK_WEBHOOK_SECRET from Clerk Dashboard to .env');
    return new Response('Webhook secret not configured', {
      status: 500
    });
  }

  // Get the headers - ADDED AWAIT HERE
  const headerPayload = await headers(); // <-- Fixed
  const svix_id = headerPayload.get("svix-id");
  const svix_timestamp = headerPayload.get("svix-timestamp");
  const svix_signature = headerPayload.get("svix-signature");

  // If there are no headers, error out
  if (!svix_id || !svix_timestamp || !svix_signature) {
    console.error('Error occurred -- no svix headers');
    return new Response('Error occurred -- no svix headers', {
      status: 400
    });
  }

  // Get the body
  let payload;
  try {
    payload = await req.json();
  } catch (error) {
    console.error('Error parsing webhook payload:', error);
    return new Response('Error parsing webhook payload', {
      status: 400
    });
  }

  const body = JSON.stringify(payload);

  // Create a new Svix instance with your secret.
  const wh = new Webhook(WEBHOOK_SECRET);

  let evt: WebhookEvent;

  // Verify the payload with the headers
  try {
    evt = wh.verify(body, {
      "svix-id": svix_id,
      "svix-timestamp": svix_timestamp,
      "svix-signature": svix_signature,
    }) as WebhookEvent;
  } catch (err) {
    console.error('Error verifying webhook:', err);
    return new Response('Error occurred', {
      status: 400
    });
  }

  // Handle the webhook
  const eventType = evt.type;

  if (eventType === 'user.created') {
    const { id, email_addresses, username, first_name, last_name, image_url } = evt.data;

    try {
      await connectToDatabase();

      // Check if user already exists
      const existingUser = await User.findOne({ clerkId: id });
      if (existingUser) {
        console.log('User already exists:', existingUser.username);
        return new Response('User already exists', { status: 200 });
      }

      // Validate email
      const email = email_addresses[0]?.email_address || '';
      if (!email) {
        console.error('No email address provided for user:', id);
        return new Response('No email address provided', { status: 400 });
      }

      // Create new user
      await User.create({
        clerkId: id,
        email: email,
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
      });

      console.log('User created via webhook:', username || id);
      return new Response('User created successfully', { status: 200 });
    } catch (error) {
      console.error('Error creating user via webhook:', error);
      return new Response('Error creating user', { status: 500 });
    }
  }

  if (eventType === 'user.updated') {
    const { id, email_addresses, username, first_name, last_name, image_url } = evt.data;

    try {
      await connectToDatabase();

      const updateData: any = {};
      if (email_addresses?.[0]?.email_address) {
        updateData.email = email_addresses[0].email_address;
      }
      if (username) updateData.username = username;
      if (first_name) updateData.firstName = first_name;
      if (last_name) updateData.lastName = last_name;
      if (image_url) updateData.avatar = image_url;

      await User.findOneAndUpdate(
        { clerkId: id },
        { $set: updateData },
        { new: true }
      );

      console.log('User updated via webhook:', id);
      return new Response('User updated successfully', { status: 200 });
    } catch (error) {
      console.error('Error updating user via webhook:', error);
      return new Response('Error updating user', { status: 500 });
    }
  }

  if (eventType === 'user.deleted') {
    const { id } = evt.data;

    try {
      await connectToDatabase();
      await User.findOneAndDelete({ clerkId: id });

      console.log('User deleted via webhook:', id);
      return new Response('User deleted successfully', { status: 200 });
    } catch (error) {
      console.error('Error deleting user via webhook:', error);
      return new Response('Error deleting user', { status: 500 });
    }
  }

  return new Response('Webhook received', { status: 200 });
}