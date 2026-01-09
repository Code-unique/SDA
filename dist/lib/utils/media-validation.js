export const validateMediaFile = (file) => {
    const errors = [];
    const warnings = [];
    // Check file size (100MB max)
    const MAX_SIZE = 100 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
        errors.push(`File size exceeds ${MAX_SIZE / 1024 / 1024}MB limit`);
    }
    // Check file type
    const isImage = file.type.startsWith('image/');
    const isVideo = file.type.startsWith('video/');
    if (!isImage && !isVideo) {
        errors.push('File must be an image or video');
    }
    // Check image dimensions (optional)
    if (isImage) {
        // Could add dimension validation here
    }
    // Check video duration (will be validated after metadata loads)
    if (isVideo) {
        // Warning for large files
        if (file.size > 50 * 1024 * 1024) {
            warnings.push('Video file is large and may take longer to upload');
        }
    }
    return {
        isValid: errors.length === 0,
        errors,
        warnings
    };
};
export const validateMediaCollection = (files, existingCount = 0) => {
    const errors = [];
    const warnings = [];
    const MAX_TOTAL = 4;
    if (existingCount + files.length > MAX_TOTAL) {
        errors.push(`Cannot add ${files.length} files. Maximum ${MAX_TOTAL} items allowed total.`);
    }
    // Count videos
    const videoCount = files.filter(file => file.type.startsWith('video/')).length;
    if (videoCount > 1) {
        errors.push('Only one video allowed per post');
    }
    // Validate each file
    files.forEach(file => {
        const result = validateMediaFile(file);
        errors.push(...result.errors);
        warnings.push(...result.warnings);
    });
    return {
        isValid: errors.length === 0,
        errors: [...new Set(errors)], // Remove duplicates
        warnings: [...new Set(warnings)]
    };
};
export const formatFileSize = (bytes) => {
    if (bytes === 0)
        return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};
export const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
};
