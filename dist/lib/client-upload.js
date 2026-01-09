// lib/client-upload.ts
export const uploadToCloudinaryClient = async (file, type = 'thumbnail', onProgress) => {
    return new Promise((resolve, reject) => {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('upload_preset', process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || 'sutra_courses');
        formData.append('folder', `products/${type}s`);
        // Set resource type
        if (type !== 'thumbnail') {
            formData.append('resource_type', 'video');
        }
        const xhr = new XMLHttpRequest();
        // Progress tracking
        xhr.upload.addEventListener('progress', (event) => {
            if (event.lengthComputable && onProgress) {
                const progress = (event.loaded / event.total) * 100;
                onProgress(Math.round(progress));
            }
        });
        // Load completion
        xhr.addEventListener('load', () => {
            if (xhr.status === 200) {
                const response = JSON.parse(xhr.responseText);
                resolve(response);
            }
            else {
                reject(new Error('Upload failed'));
            }
        });
        // Error handling
        xhr.addEventListener('error', () => {
            reject(new Error('Upload failed'));
        });
        xhr.open('POST', `https://api.cloudinary.com/v1_1/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/${type === 'thumbnail' ? 'image' : 'video'}/upload`);
        xhr.send(formData);
    });
};
