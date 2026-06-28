// app/api/users/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { connectToDatabase } from '@/lib/mongodb';
import User from '@/lib/models/User';
import "@/lib/loadmodels";

export async function GET(request: NextRequest) {
  try {
    await connectToDatabase();
    const user = await currentUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const dbUser = await User.findOne({ clerkId: user.id });

    if (!dbUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      ...dbUser.toObject(),
      _id: dbUser._id.toString()
    });
  } catch (error) {
    console.error('Error fetching user:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    await connectToDatabase();
    const user = await currentUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();

    // Validate input
    if (!body.email || !body.username) {
      return NextResponse.json(
        { error: 'Email and username are required' },
        { status: 400 }
      );
    }

    // Check if user already exists
    const existingUser = await User.findOne({
      $or: [
        { clerkId: user.id },
        { email: body.email }
      ]
    });

    if (existingUser) {
      return NextResponse.json({
        ...existingUser.toObject(),
        _id: existingUser._id.toString()
      });
    }

    // Create new user
    const newUser = await User.create({
      clerkId: user.id,
      email: body.email,
      username: body.username,
      firstName: body.firstName || '',
      lastName: body.lastName || '',
      avatar: body.avatar || '',
      isVerified: false,
      onboardingCompleted: false,
    });

    return NextResponse.json({
      ...newUser.toObject(),
      _id: newUser._id.toString()
    });
  } catch (error: any) {
    console.error('Error creating user:', error);

    if (error.code === 11000) {
      return NextResponse.json(
        { error: 'Username or email already exists' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    await connectToDatabase();
    const user = await currentUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();

    // Validate update fields
    const allowedFields = ['username', 'firstName', 'lastName', 'avatar', 'bio', 'location', 'website', 'interests', 'skills'];
    const updateData: any = {};

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        if (field === 'username' && body[field].length < 3) {
          return NextResponse.json(
            { error: 'Username must be at least 3 characters' },
            { status: 400 }
          );
        }
        updateData[field] = body[field];
      }
    }

    const updatedUser = await User.findOneAndUpdate(
      { clerkId: user.id },
      { $set: updateData },
      { new: true, runValidators: true }
    );

    if (!updatedUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      ...updatedUser.toObject(),
      _id: updatedUser._id.toString()
    });
  } catch (error: any) {
    console.error('Error updating user:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}