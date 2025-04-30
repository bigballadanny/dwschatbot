
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

/**
 * Validates if a file meets the allowed criteria
 * 
 * @param file The file to validate
 * @param allowedExtensions Array of allowed extensions
 * @param maxSize Maximum file size in bytes
 * @returns An object with validation result and any error message
 */
export function validateFile(
  file: File,
  allowedExtensions: string[] = ['txt', 'pdf', 'doc', 'docx'],
  maxSize: number = 10485760 // 10MB default
): { isValid: boolean; errorMessage?: string } {
  const ext = getFileExtension(file.name);
  
  if (!allowedExtensions.includes(ext)) {
    return { 
      isValid: false, 
      errorMessage: `Invalid file type. Allowed types: ${allowedExtensions.join(', ')}` 
    };
  }
  
  if (file.size > maxSize) {
    return { 
      isValid: false, 
      errorMessage: `File too large. Maximum size: ${formatFileSize(maxSize)}` 
    };
  }
  
  return { isValid: true };
}
