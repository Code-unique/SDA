"use strict";
// scripts/migrate-s3-videos.ts
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
const client_s3_1 = require("@aws-sdk/client-s3");
// ✅ IMPORTANT: use RELATIVE imports (Node-safe)
const mongodb_1 = require("../lib/mongodb");
const VideoLibrary_1 = __importDefault(require("../lib/models/VideoLibrary"));
const User_1 = __importDefault(require("../lib/models/User"));
dotenv_1.default.config();
const s3Client = new client_s3_1.S3Client({
    region: process.env.AWS_REGION || 'eu-north-1',
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
});
async function migrateS3Videos() {
    try {
        console.log('🚀 Starting S3 video migration...');
        console.log('🔗 MongoDB:', process.env.MONGODB_URI);
        await (0, mongodb_1.connectToDatabase)();
        console.log('✅ Connected to database');
        // Get admin user
        const adminUser = await User_1.default.findOne({ role: 'admin' });
        if (!adminUser) {
            console.error('❌ No admin user found');
            process.exit(1);
        }
        console.log(`👤 Using admin user: ${adminUser.email}`);
        const params = {
            Bucket: process.env.AWS_S3_BUCKET_NAME,
            Prefix: 'courses/',
        };
        console.log('📂 Listing S3 objects with prefix:', params.Prefix);
        let continuationToken;
        let totalVideos = 0;
        let importedVideos = 0;
        let skippedVideos = 0;
        do {
            const command = new client_s3_1.ListObjectsV2Command({
                ...params,
                ContinuationToken: continuationToken,
            });
            const response = await s3Client.send(command);
            const objects = response.Contents ?? [];
            console.log(`📊 Found ${objects.length} objects in this batch`);
            for (const object of objects) {
                if (!object.Key)
                    continue;
                totalVideos++;
                // Skip non-video files
                if (!object.Key.match(/\.(mp4|webm|mov|avi|mkv)$/i)) {
                    continue;
                }
                // Skip if already imported
                const existingVideo = await VideoLibrary_1.default.findOne({
                    'video.key': object.Key,
                });
                if (existingVideo) {
                    console.log(`⏭️ Skipping already imported: ${object.Key}`);
                    skippedVideos++;
                    continue;
                }
                const keyParts = object.Key.split('/');
                const fileName = keyParts[keyParts.length - 1];
                const folder = keyParts[1]; // courses/[folder]/...
                if (folder === 'thumbnails')
                    continue;
                let category = 'other';
                if (folder === 'lessonVideos')
                    category = 'lesson';
                if (folder === 'previewVideos')
                    category = 'preview';
                const title = fileName
                    .replace(/\.[^/.]+$/, '')
                    .replace(/[_-]/g, ' ')
                    .replace(/[^a-zA-Z0-9\s]/g, '')
                    .trim()
                    .substring(0, 200) || 'Untitled Video';
                console.log(`📝 Importing: ${fileName}`);
                try {
                    const videoEntry = await VideoLibrary_1.default.create({
                        title,
                        description: `Imported from S3: ${fileName}`,
                        video: {
                            key: object.Key,
                            url: `https://${process.env.AWS_S3_BUCKET_NAME}.s3.${process.env.AWS_REGION || 'eu-north-1'}.amazonaws.com/${object.Key}`,
                            size: object.Size ?? 0,
                            type: 'video',
                            originalFileName: fileName,
                            mimeType: 'video/mp4',
                        },
                        uploadedBy: adminUser._id,
                        categories: [category],
                        tags: ['imported', 's3-migrated'],
                        isPublic: true,
                        uploadDate: object.LastModified ?? new Date(),
                    });
                    console.log(`✅ Imported: ${videoEntry.title}`);
                    importedVideos++;
                }
                catch (err) {
                    console.error(`❌ Failed to import ${fileName}:`, err.message);
                }
            }
            continuationToken = response.NextContinuationToken;
        } while (continuationToken);
        console.log('\n🎉 Migration completed!');
        console.log(`📊 Total scanned: ${totalVideos}`);
        console.log(`✅ Imported: ${importedVideos}`);
        console.log(`⏭️ Skipped: ${skippedVideos}`);
    }
    catch (error) {
        console.error('❌ Migration failed:', error);
        process.exit(1);
    }
}
// Run migration
migrateS3Videos();
