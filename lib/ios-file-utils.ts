// lib/ios-file-utils.ts
export class IOSFileUtils {
  private static instance: IOSFileUtils;
  
  private constructor() {}
  
  static getInstance(): IOSFileUtils {
    if (!IOSFileUtils.instance) {
      IOSFileUtils.instance = new IOSFileUtils();
    }
    return IOSFileUtils.instance;
  }
  
  async processIOSVideoFile(file: File): Promise<{ 
    processedFile: File; 
    needsProcessing: boolean;
    originalSize: number;
    processedSize: number;
  }> {
    // Check if we're on iOS
    const isIOS = /iPhone|iPad|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    
    if (!isIOS || !file.type.startsWith('video/')) {
      return {
        processedFile: file,
        needsProcessing: false,
        originalSize: file.size,
        processedSize: file.size
      };
    }
    
    console.log(`📱 iOS video file detected: ${file.name} (${this.formatFileSize(file.size)})`);
    
    try {
      // For iOS, we need to handle the file differently due to memory constraints
      if (file.size > 100 * 1024 * 1024) { // > 100MB
        console.log('🔄 iOS: Large video file detected, using optimized processing');
        return await this.processLargeIOSVideo(file);
      }
      
      // For smaller files, we can process normally
      return {
        processedFile: file,
        needsProcessing: false,
        originalSize: file.size,
        processedSize: file.size
      };
    } catch (error) {
      console.error('❌ iOS file processing failed:', error);
      // Fallback to original file
      return {
        processedFile: file,
        needsProcessing: false,
        originalSize: file.size,
        processedSize: file.size
      };
    }
  }
  
  private async processLargeIOSVideo(file: File): Promise<{ 
    processedFile: File; 
    needsProcessing: boolean;
    originalSize: number;
    processedSize: number;
  }> {
    // Create a video element to get metadata without loading entire file
    const video = document.createElement('video');
    video.preload = 'metadata';
    
    return new Promise((resolve, reject) => {
      video.onloadedmetadata = () => {
        URL.revokeObjectURL(video.src);
        
        // Create a new file with optimized metadata
        const optimizedFile = new File([file], file.name, {
          type: file.type,
          lastModified: file.lastModified
        });
        
        console.log(`✅ iOS: Video metadata loaded - Duration: ${video.duration}s`);
        
        resolve({
          processedFile: optimizedFile,
          needsProcessing: true,
          originalSize: file.size,
          processedSize: file.size
        });
      };
      
      video.onerror = () => {
        URL.revokeObjectURL(video.src);
        console.warn('⚠️ iOS: Could not load video metadata, using original file');
        resolve({
          processedFile: file,
          needsProcessing: false,
          originalSize: file.size,
          processedSize: file.size
        });
      };
      
      video.src = URL.createObjectURL(file);
    });
  }
  
  async createIOSOptimizedChunks(file: File, chunkSize: number): Promise<Blob[]> {
    const chunks: Blob[] = [];
    let start = 0;
    
    while (start < file.size) {
      const end = Math.min(start + chunkSize, file.size);
      const chunk = file.slice(start, end);
      chunks.push(chunk);
      start = end;
    }
    
    return chunks;
  }
  
  getIOSOptimalChunkSize(fileSize: number): number {
    const deviceMemory = (navigator as any).deviceMemory || 2;
    
    if (deviceMemory < 2) {
      return 5 * 1024 * 1024; // 5MB for low memory devices
    } else if (deviceMemory < 4) {
      return 10 * 1024 * 1024; // 10MB for medium memory
    } else {
      return 20 * 1024 * 1024; // 20MB for high memory
    }
  }
  
  private formatFileSize(bytes: number): string {
    if (bytes >= 1024 * 1024 * 1024) {
      return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
    }
    if (bytes >= 1024 * 1024) {
      return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
    }
    return `${(bytes / 1024).toFixed(2)} KB`;
  }
  
  // iOS-specific upload optimization
  async optimizeForIOSUpload(file: File, uploadType: string): Promise<{
    optimizedFile: File;
    chunkSize: number;
    useDirectUpload: boolean;
  }> {
    const isIOS = /iPhone|iPad|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    
    if (!isIOS) {
      return {
        optimizedFile: file,
        chunkSize: this.getIOSOptimalChunkSize(file.size),
        useDirectUpload: false
      };
    }
    
    console.log(`📱 iOS Optimization for: ${file.name}`);
    
    // For iOS, we need to check file size and type
    const MAX_DIRECT_UPLOAD_SIZE = 50 * 1024 * 1024; // 50MB
    
    if (file.size <= MAX_DIRECT_UPLOAD_SIZE) {
      // Small files can be uploaded directly
      return {
        optimizedFile: file,
        chunkSize: file.size, // Single chunk
        useDirectUpload: true
      };
    }
    
    // Large files need special handling
    const chunkSize = this.getIOSOptimalChunkSize(file.size);
    
    return {
      optimizedFile: file,
      chunkSize,
      useDirectUpload: false
    };
  }
}