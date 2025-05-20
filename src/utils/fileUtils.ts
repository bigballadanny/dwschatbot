
/**
 * Utilities for file handling
 */

/**
 * Sanitizes a filename for safe storage
 * Removes special characters and spaces that can cause issues with storage systems
 * 
 * @param filename The original filename to sanitize
 * @returns A sanitized filename that is safe for storage
 */
export function sanitizeFilename(filename: string): string {
  // Replace special characters and spaces with underscores
  return filename
    .replace(/[^\w\s.-]/g, '_') // Replace any non-word chars (except dots, spaces, and hyphens)
    .replace(/\s+/g, '_')      // Replace spaces with underscores
    .replace(/__+/g, '_')      // Replace multiple underscores with single underscore
    .replace(/^-+|-+$/g, '')   // Remove leading/trailing hyphens
    .trim();
}

/**
 * Generates a safe storage path for a file
 * 
 * @param userId The user ID for the file owner
 * @param fileName The filename (will be sanitized)
 * @returns A safe storage path incorporating userId and sanitized filename
 */
export function generateStoragePath(userId: string, fileName: string): string {
  const timestamp = Date.now();
  const fileNameParts = fileName.split('.');
  const extension = fileNameParts.pop()?.toLowerCase() || '';
  const baseName = fileNameParts.join('.'); 
  const sanitized = sanitizeFilename(baseName);
  
  return `${userId}/${timestamp}_${sanitized}.${extension}`;
}

/**
 * Generates a public URL for a file in Supabase storage
 * 
 * @param bucket The bucket name
 * @param filePath The file path inside the bucket
 * @returns A public URL for the file
 */
export function generatePublicUrl(bucket: string, filePath: string): string {
  return `https://bfscrjrjwbzpldamcrbz.supabase.co/storage/v1/object/public/${bucket}/${encodeURIComponent(filePath)}`;
}

/**
 * Gets file extension from filename
 * 
 * @param filename The filename
 * @returns The file extension without the dot
 */
export function getFileExtension(filename: string): string {
  return filename.split('.').pop()?.toLowerCase() || '';
}

/**
 * Enhanced function to detect the source category based on filename patterns and content
 * Uses a more comprehensive pattern matching system
 *
 * @param filename The filename to analyze
 * @param content Optional content to analyze for additional context
 * @returns The detected source category
 */
export function detectSourceCategory(filename: string, content?: string): string {
  const lowercaseFilename = filename.toLowerCase();
  const patterns = {
    summit_2025: ['2025 summit', '2025-summit', 'business_acquisitions_summit_2025'],
    summit: ['summit', 'acquisition summit', 'acquisitions_summit', 'business acquisition'],
    protege: ['protege', 'protégé'],
    foundations: ['foundation', 'foundations_call'],
    mastermind: ['mastermind', 'mastermind_call'],
    rlgl: ['rlgl', 'rich lose', 'get lost', 'rich guys lose'],
    finance: ['finance', 'financial', 'finance_call'],
    reference: ['sba', 'law', 'regulation', 'reference'],
    educational: ['education', 'guide', 'book', 'educational']
  };
  
  // Check filename first
  for (const [category, terms] of Object.entries(patterns)) {
    if (terms.some(term => lowercaseFilename.includes(term))) {
      if (category === 'summit_2025' || (category === 'summit' && lowercaseFilename.includes('2025'))) {
        return 'business_acquisitions_summit_2025';
      } else if (category === 'summit') {
        return 'business_acquisitions_summit';
      } else if (category === 'protege') {
        return 'protege_call';
      } else if (category === 'foundations') {
        return 'foundations_call';
      } else if (category === 'mastermind') {
        return 'mastermind_call';
      } else if (category === 'rlgl') {
        return 'rlgl_call';
      } else if (category === 'finance') {
        return 'finance_call';
      } else if (category === 'reference') {
        return 'reference_material';
      } else if (category === 'educational') {
        return 'educational_material';
      }
    }
  }
  
  // Check content if available and no match found in filename
  if (content) {
    const lowercaseContent = content.toLowerCase();
    for (const [category, terms] of Object.entries(patterns)) {
      if (terms.some(term => lowercaseContent.includes(term))) {
        if (category === 'summit_2025' || (category === 'summit' && lowercaseContent.includes('2025'))) {
          return 'business_acquisitions_summit_2025';
        } else if (category === 'summit') {
          return 'business_acquisitions_summit';
        } else if (category === 'protege') {
          return 'protege_call';
        } else if (category === 'foundations') {
          return 'foundations_call';
        } else if (category === 'mastermind') {
          return 'mastermind_call';
        } else if (category === 'rlgl') {
          return 'rlgl_call';
        } else if (category === 'finance') {
          return 'finance_call';
        } else if (category === 'reference') {
          return 'reference_material';
        } else if (category === 'educational') {
          return 'educational_material';
        }
      }
    }
  }
  
  // Check for specific dates in the filename
  if (filename.match(/2024[-_]0[23][-_][0-9]{2}/)) {
    return 'business_acquisitions_summit';
  }
  
  if (filename.match(/2025[-_]0[23][-_][0-9]{2}/)) {
    return 'business_acquisitions_summit_2025';
  }
  
  // If Year 2025 is mentioned anywhere
  if (filename.includes('2025') || (content && content.includes('2025'))) {
    return 'business_acquisitions_summit_2025';
  }
  
  return 'other';
}

/**
 * Checks if a file is a supported text-based document
 * 
 * @param filename The filename to check
 * @returns True if supported document type
 */
export function isTextDocument(filename: string): boolean {
  const ext = getFileExtension(filename);
  return ['txt', 'pdf', 'doc', 'docx', 'rtf', 'md'].includes(ext);
}

/**
 * Checks if a file is a supported media file
 * 
 * @param filename The filename to check
 * @returns True if supported media type
 */
export function isMediaFile(filename: string): boolean {
  const ext = getFileExtension(filename);
  return ['mp3', 'mp4', 'wav', 'm4a', 'ogg', 'mpeg', 'avi', 'mov'].includes(ext);
}

/**
 * Gets a human-readable file size
 * 
 * @param bytes The file size in bytes
 * @param decimals Number of decimal places to display
 * @returns A formatted string representing the file size
 */
export function formatFileSize(bytes: number, decimals: number = 2): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(decimals)) + ' ' + sizes[i];
}

// Supported file types and size limits
export const SUPPORTED_FILE_TYPES = {
  document: ['txt', 'pdf', 'doc', 'docx', 'rtf', 'csv', 'xls', 'xlsx'],
  image: ['jpg', 'jpeg', 'png', 'gif', 'webp'],
  audio: ['mp3', 'wav', 'm4a', 'ogg'],
  video: ['mp4', 'mpeg', 'avi', 'mov', 'webm']
};

// File size limits
export const FILE_SIZE_LIMITS = {
  document: 15 * 1024 * 1024, // 15MB
  image: 10 * 1024 * 1024,    // 10MB
  audio: 40 * 1024 * 1024,    // 40MB
  video: 100 * 1024 * 1024    // 100MB
};

/**
 * Validates if a file meets the allowed criteria with improved type detection and handling
 * 
 * @param file The file to validate
 * @param specificExtensions Optional array of specific allowed extensions
 * @param customMaxSize Optional specific maximum file size in bytes
 * @returns An object with validation result, error message, and detected file type
 */
export function validateFile(
  file: File,
  specificExtensions?: string[],
  customMaxSize?: number
): { 
  isValid: boolean; 
  errorMessage?: string; 
  fileType?: 'document' | 'image' | 'audio' | 'video' | 'unknown';
  shouldCompress?: boolean;
} {
  const ext = getFileExtension(file.name);
  let fileType: 'document' | 'image' | 'audio' | 'video' | 'unknown' = 'unknown';
  let maxSize = customMaxSize || FILE_SIZE_LIMITS.document; // Default size limit
  let shouldCompress = false;
  
  // Determine file type by extension
  if (SUPPORTED_FILE_TYPES.document.includes(ext)) {
    fileType = 'document';
    maxSize = FILE_SIZE_LIMITS.document;
  } else if (SUPPORTED_FILE_TYPES.image.includes(ext)) {
    fileType = 'image';
    maxSize = FILE_SIZE_LIMITS.image;
    shouldCompress = true; // Images can be compressed
  } else if (SUPPORTED_FILE_TYPES.audio.includes(ext)) {
    fileType = 'audio';
    maxSize = FILE_SIZE_LIMITS.audio;
  } else if (SUPPORTED_FILE_TYPES.video.includes(ext)) {
    fileType = 'video';
    maxSize = FILE_SIZE_LIMITS.video;
  }
  
  // Check if extension is allowed
  const allowedExtensions = specificExtensions || [
    ...SUPPORTED_FILE_TYPES.document,
    ...SUPPORTED_FILE_TYPES.image,
    ...SUPPORTED_FILE_TYPES.audio,
    ...SUPPORTED_FILE_TYPES.video
  ];
  
  if (!allowedExtensions.includes(ext)) {
    return { 
      isValid: false, 
      errorMessage: `Invalid file type. Allowed types: ${allowedExtensions.join(', ')}`,
      fileType
    };
  }
  
  // Check file size
  if (file.size > maxSize) {
    // Special case for images - they can be compressed
    if (fileType === 'image' && file.size < maxSize * 2) { // If less than 2x the limit, we can try compression
      return { 
        isValid: true, 
        fileType,
        shouldCompress: true
      };
    }
    
    return { 
      isValid: false, 
      errorMessage: `File too large. Maximum size for ${fileType} files: ${formatFileSize(maxSize)}`,
      fileType
    };
  }
  
  return { isValid: true, fileType, shouldCompress };
}

/**
 * Compresses an image file to reduce size while maintaining quality
 * @param file Original image file
 * @param maxWidth Maximum width in pixels
 * @param quality Compression quality (0.1 to 1.0)
 * @returns Promise with compressed file or original if compression fails
 */
export async function compressImage(
  file: File, 
  maxWidth: number = 1600, 
  quality: number = 0.7
): Promise<File> {
  // Only compress supported image formats
  if (!file.type.startsWith('image/') || file.type === 'image/gif') {
    return file;
  }
  
  return new Promise((resolve, reject) => {
    try {
      const img = new Image();
      img.onload = () => {
        // Create canvas and resize image
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        
        // Calculate new dimensions to maintain aspect ratio
        if (width > maxWidth) {
          const scaleFactor = maxWidth / width;
          width = maxWidth;
          height = height * scaleFactor;
        }
        
        // Set canvas dimensions and draw image
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        
        if (!ctx) {
          console.error('Could not get canvas context for image compression');
          resolve(file); // Return original file if compression fails
          return;
        }
        
        ctx.drawImage(img, 0, 0, width, height);
        
        // Convert to blob and create new file
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              resolve(file); // Return original file if compression fails
              return;
            }
            
            // Create new file with same name but compressed content
            const newFile = new File([blob], file.name, {
              type: file.type,
              lastModified: Date.now(),
            });
            
            console.log(`Image compressed: ${(file.size / 1024).toFixed(2)}KB → ${(newFile.size / 1024).toFixed(2)}KB`);
            resolve(newFile);
          },
          file.type,
          quality
        );
      };
      
      img.onerror = () => {
        console.error('Error loading image for compression');
        resolve(file); // Return original file if compression fails
      };
      
      // Load image from file
      img.src = URL.createObjectURL(file);
    } catch (error) {
      console.error('Error during image compression:', error);
      resolve(file); // Return original file if compression fails
    }
  });
}

/**
 * Processes a file for upload, applying compression if possible
 * @param file Original file
 * @returns Promise with processed file and validation result
 */
export async function processFileForUpload(file: File): Promise<{ 
  file: File; 
  validation: { isValid: boolean; errorMessage?: string; fileType?: string; }
}> {
  const validation = validateFile(file);
  
  if (!validation.isValid) {
    return { file, validation };
  }
  
  // Apply compression for images that need it
  if (validation.fileType === 'image' && validation.shouldCompress) {
    const compressedFile = await compressImage(file);
    return { file: compressedFile, validation };
  }
  
  // For other file types, just return the original
  return { file, validation };
}
