// app/api/webhooks/clerk/route.ts
import { Webhook } from 'svix';
import { headers } from 'next/headers';
import { WebhookEvent } from '@clerk/nextjs/server';
import { connectToDatabase } from '@/lib/mongodb';
import User from '@/lib/models/User';
import "@/lib/loadmodels";

export async function POST(req: Request) {
  const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;

  if (!WEBHOOK_SECRET) {
    console.error('Please add CLERK_WEBHOOK_SECRET from Clerk Dashboard to .env');
    return new Response('Webhook secret not configured', {
      status: 500
    });
  }

  // Get the headers
  try {
    const headerPayload = await headers();
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

        // Check if user already exists by clerkId
        const existingUserById = await User.findOne({ clerkId: id });
        if (existingUserById) {
          console.log('User already exists by clerkId:', existingUserById.username);
          return new Response('User already exists', { status: 200 });
        }

        // Validate email
        const email = email_addresses[0]?.email_address || '';
        if (!email) {
          console.error('No email address provided for user:', id);
          return new Response('No email address provided', { status: 400 });
        }

        // Check if email already exists in database
        const existingUserByEmail = await User.findOne({ email: email });
        if (existingUserByEmail) {
          console.log('Email already exists in database:', email);
          
          // Update existing user with new clerkId (this handles case where same user signs up again)
          await User.findOneAndUpdate(
            { email: email },
            { 
              $set: { 
                clerkId: id,
                username: username || existingUserByEmail.username,
                firstName: first_name || existingUserByEmail.firstName,
                lastName: last_name || existingUserByEmail.lastName,
                avatar: image_url || existingUserByEmail.avatar
              }
            },
            { new: true }
          );
          
          console.log('Updated existing user with new clerkId:', email);
          return new Response('User updated with new clerkId', { status: 200 });
        }

        // Create new user
        const newUser = await User.create({
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
          onboardingCompleted: false,
          notificationPreferences: {
            likes: true,
            comments: true,
            follows: true,
            courses: true,
            achievements: true,
            messages: true,
            announcements: true,
            marketing: false
          },
          lastNotificationReadAt: new Date()
        });

        console.log('User created via webhook:', newUser.username);
        return new Response('User created successfully', { status: 200 });
      } catch (error: any) {
        console.error('Error creating user via webhook:', error);
        
        // Handle specific MongoDB duplicate key error
        if (error.code === 11000) {
          console.error('Duplicate key error:', error.keyValue);
          
          // Try to find which field caused the duplicate error
          if (error.keyValue?.email) {
            // Email already exists - update that user
            const existingUser = await User.findOne({ email: error.keyValue.email });
            if (existingUser) {
              await User.findOneAndUpdate(
                { email: error.keyValue.email },
                { 
                  $set: { 
                    clerkId: id,
                    username: username || existingUser.username,
                    firstName: first_name || existingUser.firstName,
                    lastName: last_name || existingUser.lastName,
                    avatar: image_url || existingUser.avatar
                  }
                }
              );
              console.log('Fixed duplicate by updating existing user:', error.keyValue.email);
              return new Response('Duplicate resolved', { status: 200 });
            }
          }
          
          return new Response('Duplicate key error', { status: 400 });
        }
        
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
      } catch (error: any) {
        console.error('Error updating user via webhook:', error);
        
        // Handle duplicate email error on update
        if (error.code === 11000 && error.keyValue?.email) {
          console.error('Cannot update: email already exists:', error.keyValue.email);
          return new Response('Email already exists', { status: 400 });
        }
        
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
    
  } catch (error) {
    console.error('Error processing webhook headers:', error);
    return new Response('Internal server error', {
      status: 500
    });
  }
}