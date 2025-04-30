
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
  const sanitized = sanitizeFilename(fileName);
  const timestamp = Date.now();
  
  return `transcripts/${userId}/${timestamp}_${sanitized}`;
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
