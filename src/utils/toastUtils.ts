
import { success, error, warning, info } from "@/hooks/use-toast";

/**
 * Toast utility functions to provide a consistent notification experience
 */

/**
 * Show a success toast message
 * @param title - The title of the toast
 * @param description - Optional description text
 * @param duration - Optional duration in milliseconds (default: 5000ms)
 */
export const showSuccess = (title: string, description?: string, duration: number = 5000) => {
  success({ 
    title, 
    description,
    duration,
  });
};

/**
 * Show an error toast message
 * @param title - The title of the toast
 * @param description - Optional description text
 * @param error - Optional error object for logging
 * @param duration - Optional duration in milliseconds (default: 7000ms)
 */
export const showError = (title: string, description?: string, error?: any, duration: number = 7000) => {
  if (error) {
    console.error(title, error);
  }
  
  error({ 
    title, 
    description: description || "Please try again or contact support if the issue persists.",
    duration,
  });
};

/**
 * Show a warning toast message
 * @param title - The title of the toast
 * @param description - Optional description text
 * @param duration - Optional duration in milliseconds (default: 5000ms)
 */
export const showWarning = (title: string, description?: string, duration: number = 5000) => {
  warning({ 
    title, 
    description,
    duration,
  });
};

/**
 * Show an info toast message
 * @param title - The title of the toast
 * @param description - Optional description text
 * @param duration - Optional duration in milliseconds (default: 5000ms)
 */
export const showInfo = (title: string, description?: string, duration: number = 5000) => {
  info({ 
    title, 
    description,
    duration,
  });
};

/**
 * Show a tag management notification
 * @param action - The action performed (added, updated, deleted)
 * @param tagName - The name of the tag
 */
export const showTagAction = (action: 'added' | 'updated' | 'deleted', tagName: string) => {
  switch (action) {
    case 'added':
      success({
        title: 'Tag Added',
        description: `Tag "${tagName}" has been added successfully.`,
        duration: 3000,
      });
      break;
    case 'updated':
      info({
        title: 'Tag Updated',
        description: `Tag "${tagName}" has been updated successfully.`,
        duration: 3000,
      });
      break;
    case 'deleted':
      info({
        title: 'Tag Removed',
        description: `Tag "${tagName}" has been removed.`,
        duration: 3000,
      });
      break;
  }
};

/**
 * Show an upload progress notification
 * @param title - The title of the toast
 * @param progress - Progress percentage (0-100)
 * @param description - Optional description text
 */
export const showUploadProgress = (title: string, progress: number, description?: string) => {
  info({ 
    title, 
    description: description || `Upload progress: ${progress}%`,
    duration: 3000,
  });
};

/**
 * Show a processing file notification
 * @param title - The title of the toast
 * @param fileType - Type of file being processed
 * @param description - Optional description text
 */
export const showProcessingFile = (title: string, fileType: string, description?: string) => {
  info({ 
    title, 
    description: description || `Processing ${fileType} file. Please wait...`,
    duration: 3000,
  });
};
