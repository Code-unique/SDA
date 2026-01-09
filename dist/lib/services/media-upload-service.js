import { uploadPostMedia, getVideoDuration, getImageDimensions } from '@/lib/cloudinary';
export class MediaUploadService {
    static async uploadFiles(files, onProgress) {
        const results = [];
        for (const file of files) {
            const fileId = `file-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
            try {
                // Update progress
                onProgress === null || onProgress === void 0 ? void 0 : onProgress({
                    fileId,
                    progress: 0,
                    status: 'uploading'
                });
                // Validate file type
                const isImage = file.type.startsWith('image/');
                const isVideo = file.type.startsWith('video/');
                if (!isImage && !isVideo) {
                    throw new Error(`Invalid file type: ${file.type}`);
                }
                // Get metadata
                let duration;
                let width;
                let height;
                if (isVideo) {
                    try {
                        duration = await getVideoDuration(file);
                        if (duration > 120) {
                            throw new Error('Video duration exceeds 2 minute limit');
                        }
                    }
                    catch (error) {
                        console.warn('Failed to get video duration:', error);
                    }
                }
                else if (isImage) {
                    try {
                        const dimensions = await getImageDimensions(file);
                        width = dimensions.width;
                        height = dimensions.height;
                    }
                    catch (error) {
                        console.warn('Failed to get image dimensions:', error);
                    }
                }
                // Upload to Cloudinary
                const cloudinaryResult = await uploadPostMedia(file, isImage ? 'image' : 'video', (progress) => {
                    onProgress === null || onProgress === void 0 ? void 0 : onProgress({
                        fileId,
                        progress,
                        status: 'uploading'
                    });
                });
                // Create result
                const result = {
                    success: true,
                    url: cloudinaryResult.secure_url,
                    publicId: cloudinaryResult.public_id,
                    thumbnail: isVideo ? cloudinaryResult.thumbnail_url : undefined,
                    duration,
                    width,
                    height,
                    size: file.size,
                    mimetype: file.type
                };
                results.push(result);
                // Update progress
                onProgress === null || onProgress === void 0 ? void 0 : onProgress({
                    fileId,
                    progress: 100,
                    status: 'completed'
                });
            }
            catch (error) {
                console.error('Upload failed:', error);
                // Update progress
                onProgress === null || onProgress === void 0 ? void 0 : onProgress({
                    fileId,
                    progress: 0,
                    status: 'error'
                });
                results.push({
                    success: false,
                    url: '',
                    publicId: '',
                    size: file.size,
                    mimetype: file.type,
                    error: error.message || 'Upload failed'
                });
            }
        }
        return results;
    }
    static validateFileCollection(files, existingCount = 0) {
        const errors = [];
        const warnings = [];
        // Check total count
        const MAX_TOTAL = 4;
        if (existingCount + files.length > MAX_TOTAL) {
            errors.push(`Maximum ${MAX_TOTAL} media items allowed. You have ${existingCount} existing and trying to add ${files.length} more.`);
        }
        // Count videos
        const videoCount = files.filter(file => file.type.startsWith('video/')).length;
        if (videoCount > 1) {
            errors.push('Only one video allowed per post');
        }
        // Validate each file
        files.forEach(file => {
            // Check file size (100MB)
            const MAX_SIZE = 100 * 1024 * 1024;
            if (file.size > MAX_SIZE) {
                errors.push(`${file.name}: File size exceeds ${MAX_SIZE / 1024 / 1024}MB limit`);
            }
            // Check file type
            const isImage = file.type.startsWith('image/');
            const isVideo = file.type.startsWith('video/');
            if (!isImage && !isVideo) {
                errors.push(`${file.name}: Must be an image or video file`);
            }
            // Check video duration warning
            if (isVideo && file.size > 50 * 1024 * 1024) {
                warnings.push(`${file.name}: Large video file may take longer to upload`);
            }
        });
        return {
            isValid: errors.length === 0,
            errors: [...new Set(errors)],
            warnings: [...new Set(warnings)]
        };
    }
    static async validateVideoDuration(file) {
        try {
            const duration = await getVideoDuration(file);
            const MAX_DURATION = 120; // 2 minutes
            if (duration > MAX_DURATION) {
                return {
                    isValid: false,
                    duration,
                    error: `Video duration (${Math.ceil(duration)}s) exceeds ${MAX_DURATION} second limit`
                };
            }
            return {
                isValid: true,
                duration
            };
        }
        catch (error) {
            return {
                isValid: false,
                error: 'Failed to read video duration'
            };
        }
    }
    static formatFileInfo(file) {
        const isImage = file.type.startsWith('image/');
        const isVideo = file.type.startsWith('video/');
        // Format size
        const formatSize = (bytes) => {
            if (bytes === 0)
                return '0 Bytes';
            const k = 1024;
            const sizes = ['Bytes', 'KB', 'MB', 'GB'];
            const i = Math.floor(Math.log(bytes) / Math.log(k));
            return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
        };
        return {
            name: file.name,
            size: formatSize(file.size),
            type: isImage ? 'Image' : isVideo ? 'Video' : 'Unknown',
            isImage,
            isVideo
        };
    }
}
