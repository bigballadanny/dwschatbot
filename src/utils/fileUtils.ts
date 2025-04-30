
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
 * Detects the source category based on filename patterns
 *
 * @param filename The filename to analyze
 * @returns The detected source category
 */
export function detectSourceCategory(filename: string): string {
  const lowercaseFilename = filename.toLowerCase();
  
  if (lowercaseFilename.includes('summit') || 
      lowercaseFilename.includes('acquisition')) {
    // Check specifically for 2025 summit
    if (lowercaseFilename.includes('2025')) {
      return 'business_acquisitions_summit_2025';
    }
    return 'business_acquisitions_summit';
  } else if (lowercaseFilename.includes('protege')) {
    return 'protege_call';
  } else if (lowercaseFilename.includes('foundation')) {
    return 'foundations_call';
  } else if (lowercaseFilename.includes('mastermind')) {
    return 'mastermind_call';
  } else if (lowercaseFilename.includes('rlgl')) {
    return 'rlgl_call';
  } else if (lowercaseFilename.includes('finance')) {
    return 'finance_call';
  } else if (lowercaseFilename.includes('reference') ||
             lowercaseFilename.includes('sba') ||
             lowercaseFilename.includes('law')) {
    return 'reference_material';
  } else if (lowercaseFilename.includes('education') ||
             lowercaseFilename.includes('guide') ||
             lowercaseFilename.includes('book')) {
    return 'educational_material';
  } else {
    return 'other';
  }
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
