import { NextRequest, NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { connectToDatabase } from '@/lib/mongodb';
import User from '@/lib/models/User';
import { v4 as uuidv4 } from 'uuid';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { writeFile } from 'fs/promises';
import { join } from 'path';
import fs from 'fs';

// Initialize S3 client with error handling
let s3Client: S3Client | null = null;

try {
  if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) {
    s3Client = new S3Client({
      region: process.env.AWS_REGION || 'us-east-1',
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      },
    });
    console.log('✅ S3 client initialized successfully');
  } else {
    console.log('⚠️ AWS credentials not found, using local storage for uploads');
  }
} catch (error) {
  console.error('❌ Error initializing S3 client:', error);
}

export async function POST(request: NextRequest) {
  try {
    console.log('=== PAYMENT PROOF UPLOAD REQUEST STARTED ===');
    
    // Check authentication
    const user = await currentUser();
    if (!user) {
      console.log('❌ No user found, returning 401');
      return NextResponse.json(
        { error: 'Unauthorized. Please log in.' },
        { status: 401 }
      );
    }

    console.log('✅ User authenticated:', user.id);

    // Connect to database
    await connectToDatabase();

    // Get user from database
    const currentUserDoc = await User.findOne({ clerkId: user.id });
    if (!currentUserDoc) {
      console.log('❌ User not found in database:', user.id);
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    console.log('✅ User found in database:', currentUserDoc._id);

    // Get form data
    const formData = await request.formData();
    console.log('📋 FormData keys received:', [...formData.keys()]);

    const file = formData.get('file') as File;
    const courseId = formData.get('courseId') as string;

    console.log('📄 File info:', {
      name: file?.name,
      size: file?.size,
      type: file?.type,
      exists: !!file
    });
    console.log('🎓 Course ID:', courseId);

    // Validate inputs
    if (!file) {
      console.log('❌ No file provided in request');
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    if (!courseId) {
      console.log('❌ No courseId provided');
      return NextResponse.json(
        { error: 'Course ID is required' },
        { status: 400 }
      );
    }

    // Validate file size (max 10MB for payment proofs)
    const MAX_SIZE = 10 * 1024 * 1024; // 10MB
    console.log('📏 File size:', file.size, 'bytes, Max allowed:', MAX_SIZE, 'bytes');
    if (file.size > MAX_SIZE) {
      console.log('❌ File too large:', file.size, 'bytes');
      return NextResponse.json(
        { error: 'File size must be less than 10MB' },
        { status: 400 }
      );
    }

    // Validate file type
    const allowedTypes = [
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/webp',
      'application/pdf'
    ];
    
    console.log('✅ File type check:', {
      fileType: file.type,
      isAllowed: allowedTypes.includes(file.type),
      allowedTypes: allowedTypes
    });
    
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { 
          error: 'File type not allowed. Please upload JPEG, PNG, or PDF.',
          receivedType: file.type,
          allowedTypes 
        },
        { status: 400 }
      );
    }

    // Generate unique file name
    const timestamp = Date.now();
    const randomId = uuidv4().slice(0, 8);
    const originalName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const fileExtension = originalName.split('.').pop()?.toLowerCase() || 
                         (file.type === 'image/jpeg' ? 'jpg' : 
                          file.type === 'image/png' ? 'png' : 
                          file.type === 'application/pdf' ? 'pdf' : 'bin');
    
    const fileName = `payment_proof_${courseId}_${currentUserDoc._id}_${timestamp}_${randomId}.${fileExtension}`;
    const folder = 'payment_proofs';
    const fileKey = `${folder}/${fileName}`;

    console.log('📝 Generated file info:', {
      originalName,
      fileName,
      fileExtension,
      folder,
      fileKey
    });

    // Convert File to Buffer
    console.log('🔄 Converting file to buffer...');
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    console.log('✅ Buffer created:', buffer.length, 'bytes');

    // Try S3 upload if available
    if (s3Client && process.env.AWS_S3_BUCKET_NAME) {
      console.log('☁️ Attempting S3 upload...');
      try {
        const putObjectCommand = new PutObjectCommand({
          Bucket: process.env.AWS_S3_BUCKET_NAME,
          Key: fileKey,
          Body: buffer,
          ContentType: file.type,
          Metadata: {
            userId: currentUserDoc._id.toString(),
            courseId,
            originalName,
            uploadType: 'payment_proof'
          }
        });

        await s3Client.send(putObjectCommand);
        console.log('✅ S3 upload successful');

        // Construct the public URL
        const region = process.env.AWS_REGION || 'us-east-1';
        const bucketName = process.env.AWS_S3_BUCKET_NAME;
        const fileUrl = `https://${bucketName}.s3.${region}.amazonaws.com/${fileKey}`;

        console.log('🔗 Generated file URL:', fileUrl);

        return NextResponse.json({
          success: true,
          fileUrl,
          fileName: originalName,
          fileKey,
          size: file.size,
          type: file.type,
          storage: 's3'
        });
      } catch (s3Error: any) {
        console.error('❌ S3 upload error, falling back to local storage:', s3Error.message);
        console.error('S3 error stack:', s3Error.stack);
        // Fall through to local storage
      }
    }

    // Fallback to local filesystem (for development or when S3 fails)
    console.log('💾 Using local filesystem for upload');
    const uploadDir = join(process.cwd(), 'public', 'uploads', folder);
    console.log('📁 Upload directory:', uploadDir);
    
    // Create directory if it doesn't exist
    if (!fs.existsSync(uploadDir)) {
      console.log('📂 Creating upload directory...');
      fs.mkdirSync(uploadDir, { recursive: true });
      console.log('✅ Directory created');
    }
    
    const filePath = join(uploadDir, fileName);
    console.log('💾 Writing file to:', filePath);
    
    await writeFile(filePath, buffer);
    console.log('✅ File saved locally');
    
    const fileUrl = `/uploads/${folder}/${fileName}`;
    console.log('🔗 Local file URL:', fileUrl);
    
    console.log('✅ Returning success response');
    return NextResponse.json({
      success: true,
      fileUrl,
      fileName: originalName,
      fileKey,
      size: file.size,
      type: file.type,
      storage: process.env.NODE_ENV === 'development' ? 'local_development' : 'local',
      note: process.env.NODE_ENV === 'development' ? 'Saved locally for development' : 'Saved to local storage'
    });

  } catch (error: any) {
    console.error('❌ Error uploading payment proof:', error);
    console.error('Error stack:', error.stack);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to upload payment proof',
        message: error.message,
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}