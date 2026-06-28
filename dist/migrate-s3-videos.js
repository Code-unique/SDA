// /scripts/migrate-s3-videos.ts
import { S3Client, ListObjectsV2Command } from '@aws-sdk/client-s3';
import { connectToDatabase } from '@/lib/mongodb';
import VideoLibrary from '@/lib/models/VideoLibrary';
import User from '@/lib/models/User';
import dotenv from 'dotenv';
dotenv.config();
const s3Client = new S3Client({
    region: process.env.AWS_REGION || 'eu-north-1',
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
});
async function migrateS3Videos() {
    var _a;
    try {
        console.log('🚀 Starting S3 video migration...');
        await connectToDatabase();
        console.log('✅ Connected to database');
        // Get an admin user to associate with migrated videos
        const adminUser = await User.findOne({ role: 'admin' });
        if (!adminUser) {
            console.error('❌ No admin user found');
            return;
        }
        console.log(`👤 Using admin user: ${adminUser.email}`);
        // List all objects in the courses bucket
        const params = {
            Bucket: process.env.AWS_S3_BUCKET_NAME,
            Prefix: 'courses/'
        };
        console.log('📂 Listing S3 objects with prefix:', params.Prefix);
        let continuationToken;
        let totalVideos = 0;
        let importedVideos = 0;
        let skippedVideos = 0;
        do {
            const command = new ListObjectsV2Command(Object.assign(Object.assign({}, params), { ContinuationToken: continuationToken }));
            const response = await s3Client.send(command);
            const objects = response.Contents || [];
            console.log(`📊 Found ${objects.length} objects in this batch`);
            for (const object of objects) {
                totalVideos++;
                // Skip if not a video file
                if (!((_a = object.Key) === null || _a === void 0 ? void 0 : _a.match(/\.(mp4|webm|mov|avi|mkv)$/i))) {
                    continue;
                }
                // Check if video already exists in library
                const existingVideo = await VideoLibrary.findOne({
                    'video.key': object.Key
                });
                if (existingVideo) {
                    console.log(`⏭️ Skipping already imported: ${object.Key}`);
                    skippedVideos++;
                    continue;
                }
                // Extract metadata from key
                const keyParts = object.Key.split('/');
                const fileName = keyParts[keyParts.length - 1];
                const folder = keyParts[1]; // courses/[folder]/...
                // Create title from filename
                const title = fileName
                    .replace(/\.[^/.]+$/, '')
                    .replace(/[_-]/g, ' ')
                    .replace(/[^a-zA-Z0-9\s]/g, '')
                    .trim()
                    .substring(0, 200) || 'Untitled Video';
                // Determine category based on folder
                let category = 'other';
                if (folder === 'lessonVideos')
                    category = 'lesson';
                if (folder === 'previewVideos')
                    category = 'preview';
                if (folder === 'thumbnails')
                    continue; // Skip thumbnails
                console.log(`📝 Importing: ${fileName}`);
                console.log(`   Key: ${object.Key}`);
                console.log(`   Size: ${object.Size} bytes`);
                console.log(`   Folder: ${folder}`);
                console.log(`   Category: ${category}`);
                try {
                    const videoEntry = await VideoLibrary.create({
                        title,
                        description: `Imported from S3: ${fileName}`,
                        video: {
                            key: object.Key,
                            url: `https://${process.env.AWS_S3_BUCKET_NAME}.s3.${process.env.AWS_REGION || 'eu-north-1'}.amazonaws.com/${object.Key}`,
                            size: object.Size || 0,
                            type: 'video',
                            originalFileName: fileName,
                            mimeType: 'video/mp4' // Default, you might want to detect actual type
                        },
                        uploadedBy: adminUser._id,
                        categories: [category],
                        tags: ['imported', 's3-migrated'],
                        isPublic: true,
                        uploadDate: object.LastModified || new Date()
                    });
                    console.log(`✅ Imported: ${videoEntry.title} (ID: ${videoEntry._id})`);
                    importedVideos++;
                }
                catch (error) {
                    console.error(`❌ Failed to import ${fileName}:`, error.message);
                }
            }
            continuationToken = response.NextContinuationToken;
        } while (continuationToken);
        console.log('\n🎉 Migration completed!');
        console.log(`📊 Total S3 objects scanned: ${totalVideos}`);
        console.log(`✅ Videos imported: ${importedVideos}`);
        console.log(`⏭️ Videos skipped (already in library): ${skippedVideos}`);
    }
    catch (error) {
        console.error('❌ Migration failed:', error);
        console.error('Stack:', error.stack);
    }
}
// Run migration
migrateS3Videos();
